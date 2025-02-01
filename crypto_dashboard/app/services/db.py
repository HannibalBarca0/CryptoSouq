from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from datetime import datetime
from elasticsearch import Elasticsearch
import json
import logging
import time

# PostgreSQL Database URL
DATABASE_URL = "postgresql://codespace:codespace@localhost:5432/cryptosouq"

# Create SQLAlchemy engine with optimized pool settings
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,  # Increased from default 5
    max_overflow=30,  # Increased from default 10
    pool_timeout=60,  # Increased timeout
    pool_pre_ping=True,  # Enable connection health checks
    pool_recycle=3600  # Recycle connections after 1 hour
)

# Configure session factory
SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine,
    expire_on_commit=False  # Prevent expired object issues
)

Base = declarative_base()

# Define models
class CryptoPrice(Base):
    __tablename__ = "crypto_prices"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    price = Column(Float)
    volume = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    def to_es_doc(self):
        return {
            "symbol": self.symbol,
            "price": self.price,
            "volume": self.volume,
            "timestamp": self.timestamp.isoformat()
        }

class News(Base):
    __tablename__ = "news"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    url = Column(String)
    source = Column(String)
    sentiment = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    currency = Column(String, index=True)
    
    def to_es_doc(self):
        return {
            "title": self.title,
            "url": self.url,
            "source": self.source,
            "sentiment": self.sentiment,
            "timestamp": self.timestamp.isoformat(),
            "currency": self.currency
        }

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_latest_prices(db: Session, symbol: str, limit: int = 100):
    """Get latest prices for a symbol"""
    return db.query(CryptoPrice)\
             .filter(CryptoPrice.symbol == symbol)\
             .order_by(CryptoPrice.timestamp.desc())\
             .limit(limit)\
             .all()

def get_latest_news(db: Session, currency: str = None, limit: int = 25):
    """Get latest news articles"""
    query = db.query(News).order_by(News.timestamp.desc())
    if currency:
        query = query.filter(News.currency == currency)
    return query.limit(limit).all()

# Elasticsearch setup
es_client = Elasticsearch(
    "http://localhost:9200",
    verify_certs=False,
    retry_on_timeout=True,
    max_retries=3
)

# Define Elasticsearch indices
NEWS_INDEX = "crypto_news"
PRICE_INDEX = "crypto_prices"

# Elasticsearch mappings
NEWS_MAPPING = {
    "mappings": {
        "properties": {
            "title": {"type": "text", "analyzer": "english"},
            "url": {"type": "keyword"},
            "source": {"type": "keyword"},
            "sentiment": {"type": "keyword"},
            "timestamp": {"type": "date"},
            "currency": {"type": "keyword"}
        }
    }
}

PRICE_MAPPING = {
    "mappings": {
        "properties": {
            "symbol": {"type": "keyword"},
            "price": {"type": "float"},
            "volume": {"type": "float"},
            "timestamp": {"type": "date"}
        }
    }
}

def init_elasticsearch():
    """Initialize Elasticsearch with retry logic"""
    retries = 3
    while retries > 0:
        try:
            if not es_client.indices.exists(index=NEWS_INDEX):
                es_client.indices.create(
                    index=NEWS_INDEX,
                    body=NEWS_MAPPING,
                    wait_for_active_shards=1
                )
            if not es_client.indices.exists(index=PRICE_INDEX):
                es_client.indices.create(
                    index=PRICE_INDEX,
                    body=PRICE_MAPPING,
                    wait_for_active_shards=1
                )
            return True
        except Exception as e:
            logging.warning(f"Elasticsearch retry {3-retries}: {e}")
            retries -= 1
            time.sleep(5)
    return False

# Index price data
def index_price(price: CryptoPrice):
    """Index price data in Elasticsearch"""
    try:
        es_client.index(
            index=PRICE_INDEX,
            id=f"{price.symbol}-{price.timestamp.isoformat()}",
            document=price.to_es_doc()
        )
    except Exception as e:
        logging.warning(f"Failed to index price in Elasticsearch: {e}")

def index_news(news: News):
    """Index news data in Elasticsearch"""
    try:
        es_client.index(
            index=NEWS_INDEX,
            id=str(news.id),
            document=news.to_es_doc()
        )
    except Exception as e:
        logging.warning(f"Failed to index news in Elasticsearch: {e}")

# Search news with filters
def search_news(query: str, currency: str = None, limit: int = 25):
    must_conditions = [{"match": {"title": query}}]
    if currency:
        must_conditions.append({"term": {"currency": currency}})
    
    body = {
        "query": {
            "bool": {
                "must": must_conditions
            }
        },
        "sort": [{"timestamp": "desc"}],
        "size": limit
    }

    try:
        results = es_client.search(index=NEWS_INDEX, body=body)
        return [hit["_source"] for hit in results["hits"]["hits"]]
    except Exception as e:
        logging.warning(f"Elasticsearch search failed: {e}. Falling back to PostgreSQL.")
        # Fallback to PostgreSQL
        db = next(get_db())
        try:
            return get_latest_news(db, currency, limit)
        finally:
            db.close()

# Add this to db.py
def get_price_analytics(symbol: str):
    body = {
        "aggs": {
            "avg_price": { "avg": { "field": "price" }},
            "max_price": { "max": { "field": "price" }},
            "min_price": { "min": { "field": "price" }},
            "volume_stats": { "stats": { "field": "volume" }}
        },
        "query": {
            "term": { "symbol.keyword": symbol }
        }
    }
    return es_client.search(index=PRICE_INDEX, body=body)

# Add to db.py
def get_price_history(symbol: str, interval: str = "1d"):
    body = {
        "query": {
            "bool": {
                "must": [
                    {"term": {"symbol.keyword": symbol}},
                    {"range": {
                        "timestamp": {
                            "gte": "now-" + interval
                        }
                    }}
                ]
            }
        },
        "sort": [{"timestamp": "asc"}]
    }
    return es_client.search(index=PRICE_INDEX, body=body)

# Add to db.py
def get_sentiment_distribution(currency: str = None):
    body = {
        "aggs": {
            "sentiment_dist": {
                "terms": { "field": "sentiment.keyword" }
            }
        }
    }
    if currency:
        body["query"] = {"term": {"currency.keyword": currency}}
    return es_client.search(index=NEWS_INDEX, body=body)

# Initialize database
def init_db():
    """Initialize database and optionally Elasticsearch"""
    try:
        # Initialize PostgreSQL
        Base.metadata.create_all(bind=engine)
        logging.info("PostgreSQL database initialized successfully")
        
        # Try to initialize Elasticsearch but continue if it fails
        try:
            init_elasticsearch()
        except Exception as es_error:
            logging.warning(f"Elasticsearch initialization failed: {es_error}. Continuing with PostgreSQL only.")
            return
            
    except Exception as e:
        logging.error(f"Error initializing PostgreSQL database: {e}")
        raise
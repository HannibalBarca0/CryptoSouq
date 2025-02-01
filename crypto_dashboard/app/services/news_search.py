from elasticsearch import Elasticsearch
from typing import List, Dict, Any
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.services.db import get_db, News

logger = logging.getLogger(__name__)

es = Elasticsearch("http://localhost:9200")

def search_news(query: str, currency: str = None, limit: int = 25) -> List[Dict[str, Any]]:
    """
    Search news articles using Elasticsearch
    """
    try:
        # Build the search query
        must_conditions = [
            {"match": {"title": {"query": query, "operator": "and"}}}
        ]
        
        if currency:
            must_conditions.append({"term": {"currency.keyword": currency}})

        body = {
            "query": {
                "bool": {
                    "must": must_conditions
                }
            },
            "sort": [
                {"timestamp": {"order": "desc"}}
            ],
            "size": limit
        }

        # Try Elasticsearch first
        try:
            response = es.search(index="crypto_news", body=body)
            results = [hit["_source"] for hit in response["hits"]["hits"]]
            if results:
                return results
        except Exception as es_error:
            logger.warning(f"Elasticsearch search failed: {es_error}")

        # Fallback to database search if Elasticsearch fails or returns no results
        db = next(get_db())
        try:
            query_obj = db.query(News)
            
            if currency:
                query_obj = query_obj.filter(News.currency == currency)
            
            # Basic text search on title
            query_obj = query_obj.filter(News.title.ilike(f"%{query}%"))
            
            # Get latest news first
            query_obj = query_obj.order_by(News.timestamp.desc())
            
            # Limit results
            query_obj = query_obj.limit(limit)
            
            return [
                {
                    "title": news.title,
                    "url": news.url,
                    "source": news.source,
                    "sentiment": news.sentiment,
                    "timestamp": news.timestamp.isoformat(),
                    "currency": news.currency
                }
                for news in query_obj.all()
            ]
            
        finally:
            db.close()

    except Exception as e:
        logger.error(f"News search error: {e}")
        return []

def index_news(news_item: Dict[str, Any]):
    """
    Index a news article in Elasticsearch
    """
    try:
        es.index(
            index="crypto_news",
            document=news_item,
            id=f"{news_item['currency']}-{news_item['timestamp']}"
        )
    except Exception as e:
        logger.error(f"Failed to index news: {e}")
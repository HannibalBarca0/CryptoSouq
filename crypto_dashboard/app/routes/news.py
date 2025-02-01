from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.services.db import get_db, News
from app.services.fetch_news import NewsAggregator
from app.services.sentiment_model import analyze_sentiment
from datetime import datetime
import asyncio
from app.services.news_search import search_news, index_news  # Import the search_news and index_news functions

router = APIRouter()
news_aggregator = NewsAggregator()

@router.get("/news")
async def get_news(
    currencies: str = "BTC,ETH,XRP,DOGE,SOL",
    filter: str = "important",
    kind: str = "news",
    public: bool = True,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Fetch crypto news from Google News"""
    try:
        # Get primary currency for search
        primary_currency = currencies.split(",")[0]
        
        # Fetch news
        articles = await news_aggregator.get_crypto_news(primary_currency)
        
        # Add sentiment analysis
        results = []
        for article in articles:
            sentiment_result = analyze_sentiment(article["title"])
            article["sentiment"] = sentiment_result["sentiment"]
            article["confidence"] = sentiment_result["confidence"]
            results.append(article)
            
            # Store in database
            db_news = News(
                title=article["title"],
                url=article["url"],
                source=article["source"]["title"],
                sentiment=sentiment_result["sentiment"],
                timestamp=datetime.utcnow(),
                currency=primary_currency
            )
            db.add(db_news)
            
            # Index in Elasticsearch
            index_news({
                "title": article["title"],
                "url": article["url"],
                "source": article["source"]["title"],
                "sentiment": sentiment_result["sentiment"],
                "timestamp": datetime.utcnow().isoformat(),
                "currency": primary_currency
            })
        
        db.commit()
        
        return {
            "results": results,
            "count": len(results)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch news: {str(e)}"
        )

@router.get("/news/search")
async def search_news_endpoint(
    query: str,
    currency: str = None,
    limit: int = 25
):
    """Search news articles"""
    results = search_news(query, currency, limit)
    return {"results": results, "count": len(results)}
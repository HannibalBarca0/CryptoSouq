from fastapi import APIRouter, WebSocket, HTTPException, Depends
from sqlalchemy.orm import Session
from app.services.fetch_crypto import get_crypto_price, get_live_price
from app.services.db import (
    get_db, 
    CryptoPrice, 
    get_latest_prices,
    get_price_history, 
    get_sentiment_distribution,
    get_latest_news
)
from datetime import datetime
import asyncio
import json
from app.services.auth import get_current_user, User
from app.services.lstm_prediction import CryptoPricePredictor

router = APIRouter()

VALID_SYMBOLS = {
    "BTCUSDT": "bitcoin",
    "ETHUSDT": "ethereum",
    "XRPUSDT": "ripple",
    "DOGEUSDT": "dogecoin",
    "SOLUSDT": "solana"
}

predictor = CryptoPricePredictor()

@router.get("/price/{crypto}")
async def get_price(
    crypto: str, 
    vs_currency: str = "usd", 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Add this
):
    crypto = crypto.upper()
    if crypto not in VALID_SYMBOLS:
        raise HTTPException(status_code=400, detail="Invalid trading pair")
    
    normalized_name = VALID_SYMBOLS[crypto]
    price_data = get_crypto_price(normalized_name, vs_currency)
    
    # Store price data in both PostgreSQL and Elasticsearch
    db_price = CryptoPrice(
        symbol=crypto,
        price=price_data[normalized_name][vs_currency],
        volume=price_data[normalized_name].get('volume', 0),
        timestamp=datetime.utcnow()
    )
    db.add(db_price)
    db.commit()
    
    # Index in Elasticsearch
    from app.services.db import index_price
    index_price(db_price)
    
    return price_data

@router.get("/historical/{symbol}")
async def get_historical_prices(symbol: str, db: Session = Depends(get_db)):
    prices = get_latest_prices(db, symbol.upper())
    return {
        "prices": [
            {
                "price": price.price,
                "volume": price.volume,
                "timestamp": price.timestamp.isoformat(),
                "symbol": price.symbol
            }
            for price in prices
        ]
    }

@router.get("/news/history")
async def get_historical_news(currency: str = None, db: Session = Depends(get_db)):
    news_items = get_latest_news(db, currency)
    return {
        "news": [
            {
                "title": news.title,
                "url": news.url,
                "source": news.source,
                "sentiment": news.sentiment,
                "timestamp": news.timestamp.isoformat(),
                "currency": news.currency
            }
            for news in news_items
        ]
    }

@router.websocket("/ws/price/{symbol}")
async def websocket_price(websocket: WebSocket, symbol: str):
    try:
        # Validate and normalize the symbol
        symbol = symbol.upper()
        if symbol not in VALID_SYMBOLS:
            await websocket.close(code=1008, reason="Invalid trading pair")
            return

        await websocket.accept()
        
        # Start live price updates for the specific symbol
        await get_live_price(websocket, symbol)
    except Exception as e:
        print(f"WebSocket error for {symbol}: {e}")
        await websocket.close(code=1011)

@router.get("/search/prices/{symbol}")
async def search_prices(
    symbol: str, 
    interval: str = "1d",
    db: Session = Depends(get_db)
):
    """Search price history"""
    try:
        results = get_price_history(symbol, interval)
        return {
            "symbol": symbol,
            "prices": [hit["_source"] for hit in results["hits"]["hits"]]
        }
    except Exception as e:
        # Fallback to PostgreSQL
        prices = get_latest_prices(db, symbol)
        return {
            "symbol": symbol,
            "prices": [
                {
                    "price": p.price,
                    "volume": p.volume,
                    "timestamp": p.timestamp.isoformat()
                } for p in prices
            ]
        }

@router.get("/search/sentiment/{currency}")
async def search_sentiment(currency: str = None):
    """Get sentiment distribution"""
    try:
        results = get_sentiment_distribution(currency)
        return {
            "currency": currency,
            "distribution": results["aggregations"]["sentiment_dist"]["buckets"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/price/{symbol}/predict")
async def get_price_prediction(
    symbol: str,
    current_user: User = Depends(get_current_user)
):
    """Get LSTM price predictions"""
    try:
        predictions = predictor.predict(symbol)
        if not predictions:
            raise HTTPException(
                status_code=400,
                detail="Insufficient data for prediction"
            )
        return predictions
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction error: {str(e)}"
        )


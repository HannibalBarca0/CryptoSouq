from fastapi import FastAPI, WebSocket, APIRouter, HTTPException
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from app.services.fetch_crypto import get_crypto_price
from app.services.sentiment_model import analyze_sentiment
from app.routes import price, news, sentiment, auth
from typing import Dict, Any
from datetime import datetime, timedelta
import aiohttp
from app.services.db import init_db
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    try:
        init_db()
        logger.info("Application started successfully")
    except Exception as e:
        logger.error(f"Error during startup: {e}")
        raise

# Register the routers
app.include_router(price.router, prefix="/api")
app.include_router(news.router, prefix="/api")
app.include_router(sentiment.router, prefix="/api")
app.include_router(auth.router, prefix="/api/auth")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/test")
async def test_endpoint():
    return {"message": "Hello, world!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
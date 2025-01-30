from fastapi import FastAPI, WebSocket, APIRouter, HTTPException
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from app.services.fetch_crypto import get_crypto_price
from app.services.sentiment_model import analyze_sentiment
from app.routes import price, news, sentiment
from typing import Dict, Any
from datetime import datetime, timedelta
import aiohttp

app = FastAPI()

# Register the routers
app.include_router(price.router, prefix="/api")
app.include_router(news.router, prefix="/api")
app.include_router(sentiment.router, prefix="/api")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
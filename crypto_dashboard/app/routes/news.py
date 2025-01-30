from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from datetime import datetime, timedelta
import aiohttp
import asyncio

router = APIRouter()

API_KEY = "8f879ae3e7bded2246a3d183e888898975d1692a"
CRYPTOPANIC_BASE_URL = "https://cryptopanic.com/api/v1/posts/"

# Cache for rate limiting
last_request_time = datetime.now()
MIN_REQUEST_INTERVAL = timedelta(seconds=30)

@router.get("/news")
async def get_news(
    currencies: str = "BTC,ETH,XRP,DOGE,SOL",
    filter: str = "important",
    kind: str = "news",
    public: bool = True
) -> Dict[str, Any]:
    """Fetch crypto news from CryptoPanic API"""
    global last_request_time
    
    # Rate limiting
    current_time = datetime.now()
    if current_time - last_request_time < MIN_REQUEST_INTERVAL:
        await asyncio.sleep((MIN_REQUEST_INTERVAL - (current_time - last_request_time)).total_seconds())
    
    try:
        headers = {
            "Accept": "application/json",
            "User-Agent": "CryptoSouq/1.0"
        }
        
        params = {
            "auth_token": API_KEY,
            "currencies": currencies,
            "filter": filter,
            "kind": kind,
            "public": "true" if public else "false"
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(CRYPTOPANIC_BASE_URL, params=params, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"CryptoPanic API error: {error_text}"
                    )
                
                data = await response.json()
                last_request_time = datetime.now()
                
                return {
                    "results": data.get("results", []),
                    "count": data.get("count", 0),
                    "next": data.get("next", None)
                }
                
    except aiohttp.ClientError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch news: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )
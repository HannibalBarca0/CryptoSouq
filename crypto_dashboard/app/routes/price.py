from fastapi import APIRouter, WebSocket, HTTPException
from app.services.fetch_crypto import get_crypto_price, get_live_price
import asyncio
import json

router = APIRouter()

VALID_SYMBOLS = {
    "BTCUSDT": "bitcoin",
    "ETHUSDT": "ethereum",
    "XRPUSDT": "ripple",
    "DOGEUSDT": "dogecoin",
    "SOLUSDT": "solana"
}

@router.get("/price/{crypto}")
async def get_price(crypto: str, vs_currency: str = "usd"):
    # Validate and normalize the crypto symbol
    crypto = crypto.upper()
    if crypto not in VALID_SYMBOLS:
        raise HTTPException(status_code=400, detail="Invalid trading pair")
    
    # Get the normalized name for the crypto
    normalized_name = VALID_SYMBOLS[crypto]
    price_data = get_crypto_price(normalized_name, vs_currency)
    
    # Add logging to debug the response
    print(f"Price data for {crypto}: {price_data}")
    return price_data

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


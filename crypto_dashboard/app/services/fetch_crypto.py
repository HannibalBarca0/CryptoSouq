import requests
from typing import Dict
from fastapi import FastAPI, WebSocket
import asyncio
import json
import websockets

app = FastAPI()

BINANCE_API_BASE = "https://api.binance.com/api/v3"

def get_crypto_data(symbol: str = "BTCUSDT") -> Dict:
    """Get price and volume from Binance"""
    try:
        # Get 24h ticker data
        ticker_response = requests.get(f"{BINANCE_API_BASE}/ticker/24hr?symbol={symbol}")
        ticker_response.raise_for_status()
        ticker_data = ticker_response.json()
        
        return {
            "price": float(ticker_data['lastPrice']),
            "volume": float(ticker_data['volume']),
            "symbol": symbol
        }
    except requests.RequestException as e:
        print(f"Error fetching from Binance: {e}")
        return {"price": 0, "volume": 0, "symbol": symbol}

def get_crypto_price(crypto: str = "bitcoin", vs_currency: str = "usd") -> Dict:
    crypto_symbols = {
        "bitcoin": "BTCUSDT",
        "ethereum": "ETHUSDT",
        "ripple": "XRPUSDT",
        "dogecoin": "DOGEUSDT",
        "solana": "SOLUSDT"
    }
    
    symbol = crypto_symbols.get(crypto.lower(), "BTCUSDT")
    
    try:
        # Get ticker data which includes both price and volume
        response = requests.get(f"{BINANCE_API_BASE}/ticker/24hr?symbol={symbol}")
        response.raise_for_status()
        data = response.json()
        
        return {
            crypto: {
                vs_currency: float(data['lastPrice']),
                'volume': float(data['volume'])
            }
        }
    except requests.RequestException as e:
        print(f"Error fetching from Binance: {e}")
        return {crypto: {vs_currency: 0, 'volume': 0}}

async def get_live_price(websocket: WebSocket, symbol: str):
    binance_ws_url = f"wss://stream.binance.com:9443/ws/{symbol.lower()}@trade"
    
    async with websockets.connect(binance_ws_url) as ws:
        while True:
            try:
                data = await ws.recv()
                parsed_data = json.loads(data)
                formatted_data = {
                    symbol: {
                        "usd": float(parsed_data['p']),
                        "volume": float(parsed_data['q'])
                    }
                }
                await websocket.send_json(formatted_data)
            except Exception as e:
                print(f"Error in WebSocket: {e}")
                break

@app.websocket("/ws/price/{crypto}")
async def websocket_price(websocket: WebSocket, crypto: str):
    await websocket.accept()
    try:
        await get_live_price(websocket, crypto)
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()
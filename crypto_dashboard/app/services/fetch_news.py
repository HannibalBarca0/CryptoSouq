import requests

NEWS_API = "https://cryptopanic.com/api/v1/posts/"
API_KEY = "YOUR_API_KEY"

def get_crypto_news():
    response = requests.get(f"{NEWS_API}?auth_token={API_KEY}")
    return response.json()

import os
from dotenv import load_dotenv
from gnews import GNews
from datetime import datetime, timedelta

load_dotenv()

class NewsAggregator:
    def __init__(self):
        self.google_news = GNews(
            language='en',
            country='US',
            period='1d',  # Last 24 hours
            max_results=10
        )
        
    async def get_crypto_news(self, currency: str) -> list:
        try:
            # Search for cryptocurrency news
            search_term = f"{currency} cryptocurrency"
            articles = self.google_news.get_news(search_term)
            
            # Format articles
            formatted_news = []
            for article in articles:
                formatted_news.append({
                    'title': article['title'],
                    'url': article['url'],
                    'published_at': article['published date'],
                    'source': {
                        'title': article['publisher']['title']
                    },
                    'description': article['description']
                })
            
            return formatted_news
            
        except Exception as e:
            print(f"Error fetching Google News: {e}")
            return []

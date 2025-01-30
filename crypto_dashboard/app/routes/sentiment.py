from fastapi import APIRouter
from app.services.sentiment_model import analyze_sentiment
from pydantic import BaseModel

router = APIRouter()

class SentimentRequest(BaseModel):
    text: str

@router.post("/sentiment")
async def get_sentiment(request: SentimentRequest):
    sentiment = analyze_sentiment(request.text)
    return {"sentiment": sentiment}
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

analyzer = SentimentIntensityAnalyzer()

def analyze_sentiment(text: str) -> str:
    sentiment = analyzer.polarity_scores(text)
    if sentiment["compound"] >= 0.05:
        return "Bullish"
    elif sentiment["compound"] <= -0.05:
        return "Bearish"
    else:
        return "Neutral"
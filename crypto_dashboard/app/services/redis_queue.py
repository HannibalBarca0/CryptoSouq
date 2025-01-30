from celery import Celery

app = Celery(
    'tasks',
    backend='redis://localhost',
    broker='redis://localhost:6379/0'
)

@app.task
def process_sentiment(text):
    from sentiment_model import analyze_sentiment
    return analyze_sentiment(text)

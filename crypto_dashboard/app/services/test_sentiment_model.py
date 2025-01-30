from sentiment_model import analyze_sentiment

def test_analyze_sentiment():
    # Test analyzing sentiment of a positive text
    positive_text = "VADER is smart, handsome, and funny."
    positive_result = analyze_sentiment(positive_text)
    assert positive_result == "Bullish", f"Expected 'Bullish', got {positive_result}"

    # Test analyzing sentiment of a negative text
    negative_text = "ADER is not smart, handsome, nor funny."
    negative_result = analyze_sentiment(negative_text)
    assert negative_result == "Bearish", f"Expected 'Bearish', got {negative_result}"

    # Test analyzing sentiment of a neutral text
    neutral_text = "The book was kind of good."
    neutral_result = analyze_sentiment(neutral_text)
    assert neutral_result == "Neutral", f"Expected 'Neutral', got {neutral_result}"

    print(f"Sentiment of '{positive_text}': {positive_result}")
    print(f"Sentiment of '{negative_text}': {negative_result}")
    print(f"Sentiment of '{neutral_text}': {neutral_result}")

if __name__ == "__main__":
    test_analyze_sentiment()
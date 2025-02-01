import tensorflow as tf
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.utils import pad_sequences
import numpy as np
import pickle
import os

class LSTMSentimentAnalyzer:
    def __init__(self):
        self.model = None
        self.tokenizer = Tokenizer(num_words=10000)
        self.max_length = 100
        self.labels = ['Bearish', 'Neutral', 'Bullish']
        
        # Initialize with training data
        self._initialize_model()
    
    def _initialize_model(self):
        # Crypto-specific training data
        training_data = [
            ("Bitcoin price crashes 10% in major selloff", "Bearish"),
            ("Ethereum reaches new all-time high as adoption grows", "Bullish"),
            ("Cryptocurrency market shows steady trading volume", "Neutral"),
            ("Major bank announces Bitcoin investment", "Bullish"),
            ("Regulatory concerns impact crypto prices", "Bearish"),
            ("Bitcoin dominance remains stable", "Neutral")
        ]
        
        texts = [text for text, _ in training_data]
        labels = [self.labels.index(label) for _, label in training_data]
        
        # Fit tokenizer
        self.tokenizer.fit_on_texts(texts)
        sequences = self.tokenizer.texts_to_sequences(texts)
        padded_sequences = pad_sequences(sequences, maxlen=self.max_length)
        
        # Create and train model
        self.model = tf.keras.Sequential([
            tf.keras.layers.Embedding(10000, 32),
            tf.keras.layers.LSTM(64, return_sequences=True),
            tf.keras.layers.LSTM(32),
            tf.keras.layers.Dense(64, activation='relu'),
            tf.keras.layers.Dropout(0.5),
            tf.keras.layers.Dense(3, activation='softmax')
        ])
        
        self.model.compile(
            optimizer='adam',
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        # Train model
        self.model.fit(
            padded_sequences,
            np.array(labels),
            epochs=10,
            verbose=0
        )
    
    def analyze_sentiment(self, text: str) -> dict:
        sequences = self.tokenizer.texts_to_sequences([text])
        padded = pad_sequences(sequences, maxlen=self.max_length)
        prediction = self.model.predict(padded, verbose=0)
        predicted_class = np.argmax(prediction[0])
        confidence = float(prediction[0][predicted_class])
        
        return {
            'sentiment': self.labels[predicted_class],
            'confidence': confidence
        }

# Create global instance
analyzer = LSTMSentimentAnalyzer()

def analyze_sentiment(text: str) -> dict:
    """Analyze sentiment of crypto news text"""
    return analyzer.analyze_sentiment(text)
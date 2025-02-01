import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TF logging
import tensorflow as tf
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from tensorflow import keras
from app.services.db import get_db, CryptoPrice
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import io
import base64

# Configure TensorFlow to use CPU only
tf.config.set_visible_devices([], 'GPU')

class CryptoPricePredictor:
    def __init__(self):
        self.scaler = MinMaxScaler()
        self.model = None
        self.lookback = 60  # 60 minutes lookback
        
    def prepare_data(self, prices_df):
        # Convert prices to numpy array
        data = prices_df['price'].values.reshape(-1, 1)
        scaled_data = self.scaler.fit_transform(data)
        
        X, y = [], []
        for i in range(len(scaled_data) - self.lookback):
            X.append(scaled_data[i:i+self.lookback])
            y.append(scaled_data[i+self.lookback])
            
        return np.array(X), np.array(y)
        
    def train(self, symbol):
        db = next(get_db())
        try:
            # Get historical data with limit
            prices = db.query(CryptoPrice)\
                .filter(CryptoPrice.symbol == symbol)\
                .order_by(CryptoPrice.timestamp.desc())\
                .limit(1000)\
                .all()
            
            if len(prices) < self.lookback + 24:
                return False
                
            df = pd.DataFrame([{
                'timestamp': p.timestamp,
                'price': p.price
            } for p in prices])
            
            # Process data and train model
            X, y = self.prepare_data(df)
            
            # Build LSTM model with proper input layer
            inputs = tf.keras.Input(shape=(self.lookback, 1))
            x = tf.keras.layers.LSTM(50, return_sequences=True)(inputs)
            x = tf.keras.layers.LSTM(50)(x)
            outputs = tf.keras.layers.Dense(1)(x)
            
            self.model = tf.keras.Model(inputs=inputs, outputs=outputs)
            
            # Compile and train
            self.model.compile(
                optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
                loss='mse'
            )
            
            early_stop = tf.keras.callbacks.EarlyStopping(
                monitor='loss',
                patience=5,
                restore_best_weights=True
            )
            
            self.model.fit(
                X, y,
                epochs=50,
                batch_size=32,
                callbacks=[early_stop],
                verbose=0
            )
            
            return True
        finally:
            db.close()  # Ensure connection is returned to pool
            
    def predict(self, symbol, steps=24):
        if not self.model:
            self.train(symbol)
            
        db = next(get_db())
        try:
            # Get latest data
            latest = db.query(CryptoPrice)\
                .filter(CryptoPrice.symbol == symbol)\
                .order_by(CryptoPrice.timestamp.desc())\
                .limit(self.lookback)\
                .all()
            
            prices = np.array([p.price for p in latest]).reshape(-1, 1)
            scaled = self.scaler.transform(prices)
            
            # Make predictions
            current_batch = scaled[-self.lookback:]
            future_preds = []
            
            for _ in range(steps):
                current_pred = self.model.predict(current_batch.reshape(1, self.lookback, 1))
                future_preds.append(current_pred[0])
                current_batch = np.roll(current_batch, -1)
                current_batch[-1] = current_pred
                
            future_prices = self.scaler.inverse_transform(future_preds)
            
            # Generate plot
            plt.figure(figsize=(12, 6))
            plt.plot(range(steps), future_prices, 'b-', label='Predicted')
            plt.title(f'{symbol} Price Prediction')
            plt.xlabel('Hours')
            plt.ylabel('Price (USD)')
            plt.legend()
            plt.grid(True)
            
            # Convert plot to base64
            buf = io.BytesIO()
            plt.savefig(buf, format='png')
            buf.seek(0)
            plot_data = base64.b64encode(buf.getvalue()).decode()
            plt.close()
            
            return {
                'predictions': future_prices.flatten().tolist(),
                'plot': plot_data,
                'current_price': latest[0].price,
                'prediction_times': [
                    (datetime.utcnow() + timedelta(hours=i)).isoformat()
                    for i in range(steps)
                ]
            }
            
        finally:
            db.close()
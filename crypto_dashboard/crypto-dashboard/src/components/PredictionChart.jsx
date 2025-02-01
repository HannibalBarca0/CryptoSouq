import React from 'react';
import './PredictionChart.css';

const PredictionChart = ({ predictions }) => {
    // Add null check and validation
    if (!predictions || !predictions.current_price || !predictions.predictions || !predictions.predictions.length) {
        return (
            <div className="prediction-container">
                <h3>Price Predictions (24h)</h3>
                <div className="prediction-error">
                    <p>Insufficient data for predictions</p>
                    <p>Please try again later or select a different currency</p>
                </div>
            </div>
        );
    }

    // Calculate prediction percentage safely
    const lastPrediction = predictions.predictions[predictions.predictions.length - 1];
    const predictionChange = ((lastPrediction - predictions.current_price) / predictions.current_price * 100);

    return (
        <div className="prediction-container">
            <h3>Price Predictions (24h)</h3>
            <img 
                src={`data:image/png;base64,${predictions.plot}`} 
                alt="Price Predictions"
                className="prediction-plot"
            />
            <div className="prediction-stats">
                <div>
                    Current: ${predictions.current_price.toFixed(2)}
                </div>
                <div>
                    Predicted (24h): ${lastPrediction.toFixed(2)}
                    <span className={predictionChange > 0 ? 'positive' : 'negative'}>
                        ({predictionChange.toFixed(2)}%)
                    </span>
                </div>
            </div>
        </div>
    );
};

export default PredictionChart;
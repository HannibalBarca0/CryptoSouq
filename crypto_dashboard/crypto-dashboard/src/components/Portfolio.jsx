import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Portfolio.css';

const Portfolio = () => {
    const [portfolio, setPortfolio] = useState([]);
    const [totalValue, setTotalValue] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState({
        symbol: 'BTC',
        amount: '',
        purchasePrice: ''
    });

    // Define fetchPortfolio before using it
    const fetchPortfolio = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await axios.get('/api/portfolio', {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            // Add error handling for missing data
            if (!response.data?.assets) {
                throw new Error('Invalid portfolio data');
            }
            
            setPortfolio(response.data.assets);
            setTotalValue(response.data.total_value || 0);
        } catch (error) {
            console.error('Error fetching portfolio:', error);
            setPortfolio([]);
            setTotalValue(0);
        } finally {
            setIsLoading(false);
        }
    };

    // Use fetchPortfolio in useEffect
    useEffect(() => {
        fetchPortfolio();
        const interval = setInterval(fetchPortfolio, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('auth_token');
            await axios.post('/api/portfolio/add', formData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Reset form and refresh portfolio
            setFormData({ symbol: 'BTC', amount: '', purchasePrice: '' });
            fetchPortfolio();
        } catch (error) {
            console.error('Error adding asset:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="portfolio-section">
                <h2>Portfolio</h2>
                <div className="loading">Loading portfolio...</div>
            </div>
        );
    }

    return (
        <div className="portfolio-section">
            <div className="portfolio-header">
                <h2>Portfolio</h2>
                <div className="portfolio-total">
                    Total Value: ${totalValue.toLocaleString()}
                </div>
            </div>

            <div className="portfolio-assets">
                {portfolio.map((asset) => (
                    <div key={asset.symbol} className="portfolio-asset">
                        <img 
                            src={`https://cryptologos.cc/logos/${asset.symbol.toLowerCase()}-logo.svg`}
                            alt={asset.symbol}
                            className="asset-icon"
                        />
                        <div className="asset-name">{asset.symbol}</div>
                        <div className="asset-amount">{asset.amount}</div>
                        <div className="asset-value">
                            ${(asset.amount * asset.currentPrice).toFixed(2)}
                        </div>
                        <div className={`asset-change ${asset.priceChange >= 0 ? 'positive' : 'negative'}`}>
                            {asset.priceChange > 0 ? '+' : ''}{asset.priceChange.toFixed(2)}%
                        </div>
                    </div>
                ))}
            </div>

            <div className="add-asset-form">
                <h3>Add Asset</h3>
                <form onSubmit={handleSubmit}>
                    <select
                        value={formData.symbol}
                        onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                    >
                        <option value="BTC">Bitcoin (BTC)</option>
                        <option value="ETH">Ethereum (ETH)</option>
                        <option value="XRP">Ripple (XRP)</option>
                        <option value="DOGE">Dogecoin (DOGE)</option>
                        <option value="SOL">Solana (SOL)</option>
                    </select>
                    <input
                        type="number"
                        placeholder="Amount"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        step="0.000001"
                    />
                    <input
                        type="number"
                        placeholder="Purchase Price (USD)"
                        value={formData.purchasePrice}
                        onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})}
                        step="0.01"
                    />
                    <button type="submit">Add Asset</button>
                </form>
            </div>
        </div>
    );
};

export default Portfolio;
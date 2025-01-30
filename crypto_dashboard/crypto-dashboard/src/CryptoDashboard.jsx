import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './CryptoDashboard.css';

const TRADING_PAIRS = [
    { symbol: "BTCUSDT", name: "Bitcoin" },
    { symbol: "ETHUSDT", name: "Ethereum" },
    { symbol: "XRPUSDT", name: "Ripple" },
    { symbol: "DOGEUSDT", name: "Dogecoin" },
    { symbol: "SOLUSDT", name: "Solana" }
];

const CRYPTO_DATA = [
    { symbol: "BTCUSDT", name: "Bitcoin", logo: "https://cryptologos.cc/logos/bitcoin-btc-logo.svg" },
    { symbol: "ETHUSDT", name: "Ethereum", logo: "https://cryptologos.cc/logos/ethereum-eth-logo.svg" },
    { symbol: "XRPUSDT", name: "Ripple", logo: "https://cryptologos.cc/logos/xrp-xrp-logo.svg" },
    { symbol: "DOGEUSDT", name: "Dogecoin", logo: "https://cryptologos.cc/logos/dogecoin-doge-logo.svg" },
    { symbol: "SOLUSDT", name: "Solana", logo: "https://cryptologos.cc/logos/solana-sol-logo.svg" }
];

const VALID_SYMBOLS = {
    "BTCUSDT": "bitcoin",
    "ETHUSDT": "ethereum",
    "XRPUSDT": "ripple",
    "DOGEUSDT": "dogecoin",
    "SOLUSDT": "solana"
};

const CryptoDashboard = () => {
    const [selectedPair, setSelectedPair] = useState(TRADING_PAIRS[0]);
    const [price, setPrice] = useState('Loading...');
    const [volume, setVolume] = useState('Loading...');
    const [sentiment, setSentiment] = useState('Loading...');
    const [prevPrice, setPrevPrice] = useState(null);
    const [news, setNews] = useState([]);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        document.body.appendChild(script);

        script.onload = () => {
            const viewportHeight = window.innerHeight;
            const chartHeight = Math.floor(viewportHeight * 0.7);

            new window.TradingView.widget({
                "width": "100%",
                "height": chartHeight,
                "symbol": `BINANCE:${selectedPair.symbol}`,
                "interval": "D",
                "timezone": "Etc/UTC",
                "theme": "dark",
                "style": "1",
                "locale": "en",
                "toolbar_bg": "#f1f3f6",
                "enable_publishing": false,
                "hide_side_toolbar": false,
                "allow_symbol_change": true,
                "container_id": "tradingview_chart",
                "autosize": true
            });

            // Add resize listener
            window.addEventListener('resize', () => {
                const newHeight = Math.floor(window.innerHeight * 0.7);
                document.getElementById('tradingview_chart').style.height = `${newHeight}px`;
            });
        };

        const fetchSentiment = async () => {
            try {
                const response = await axios.post('/api/sentiment', {
                    text: `${selectedPair.name} is the future!`
                });
                console.log('Sentiment Response:', response);
                setSentiment(response.data.sentiment);
            } catch (error) {
                console.error('Sentiment Error:', error);
                setSentiment('Error fetching sentiment');
            }
        };

        fetchSentiment();

        return () => {
            document.body.removeChild(script);
        };
    }, [selectedPair]);

    useEffect(() => {
        let ws;
        let refreshInterval;

        const fetchData = async () => {
            try {
                const response = await axios.get(`/api/price/${selectedPair.symbol}`);
                console.log('API Response:', response.data);
                
                // Access nested data structure based on API response
                const cryptoName = VALID_SYMBOLS[selectedPair.symbol.toUpperCase()];
                const cryptoData = response.data[cryptoName];
                
                if (cryptoData && cryptoData.usd !== undefined) {
                    setPrice(parseFloat(cryptoData.usd).toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }));
                    
                    if (cryptoData.volume !== undefined) {
                        setVolume(parseFloat(cryptoData.volume).toLocaleString('en-US'));
                    }
                }
            } catch (error) {
                console.error('Fetch Error:', error);
                setPrice('Error fetching price');
                setVolume('Error fetching volume');
            }
        };

        fetchData();

        // Set up refresh interval
        refreshInterval = setInterval(fetchData, 1000);

        return () => {
            if (refreshInterval) clearInterval(refreshInterval);
        };
    }, [selectedPair]);

    const getSentimentIcon = (sentiment) => {
        switch(sentiment) {
            case 'Bullish':
                return <i className="fas fa-arrow-up" style={{color: '#00ff88'}}></i>;
            case 'Bearish':
                return <i className="fas fa-arrow-down" style={{color: '#ff4444'}}></i>;
            case 'Neutral':
                return <i className="fas fa-minus" style={{color: '#ffbb00'}}></i>;
            default:
                return null;
        }
    };

    const formatPriceWithColor = (price) => {
        if (!price) return '';
        const formattedPrice = parseFloat(price).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
        });
        const lastDigit = formattedPrice.slice(-1);
        const restOfPrice = formattedPrice.slice(0, -1);
        const direction = prevPrice && price > prevPrice ? 'up' : 'down';
        
        return (
            <>
                {restOfPrice}
                <span className={`last-digit ${direction}`}>{lastDigit}</span>
            </>
        );
    };

    const fetchNews = async () => {
        try {
            const symbol = selectedPair.symbol.replace('USDT', '');
            const response = await axios.get('/api/news', {
                params: {
                    currencies: symbol,
                    filter: 'important',
                    kind: 'news',
                    public: true
                }
            });
            
            console.log('News Response:', response.data);  // Debug log
            
            if (response.data && response.data.results) {
                setNews(response.data.results);
            } else {
                console.error('Invalid news data format:', response.data);
                setNews([]);
            }
        } catch (error) {
            console.error('News fetch error:', error);
            setNews([]);
        }
    };

    useEffect(() => {
        fetchNews();
        const newsInterval = setInterval(fetchNews, 300000); // 5 minutes
        return () => clearInterval(newsInterval);
    }, [selectedPair]);

    const newsSection = () => (
        <div className="news-panel">
            <h2>Latest News</h2>
            {news.length > 0 ? (
                news.map((item, index) => (
                    <div key={index} className="news-item">
                        <h3>{item.title}</h3>
                        <p className="news-meta">
                            <span className="news-date">
                                {new Date(item.published_at).toLocaleDateString()}
                            </span>
                            {item.currencies && (
                                <span className="news-currencies">
                                    {item.currencies.map(c => c.code).join(', ')}
                                </span>
                            )}
                        </p>
                        {item.source && (
                            <p className="news-source">{item.source.title}</p>
                        )}
                        <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="news-link"
                        >
                            Read More
                        </a>
                    </div>
                ))
            ) : (
                <div className="news-empty">No news available</div>
            )}
        </div>
    );

    return (
        <div className="dashboard-layout">
            <div className="main-content">
                <div className="dashboard-container">
                    <div className="dashboard-header">
                        <h1>Crypto Dashboard</h1>
                        <div className="crypto-logos">
                            {CRYPTO_DATA.map((crypto) => (
                                <img
                                    key={crypto.symbol}
                                    src={crypto.logo}
                                    alt={crypto.name}
                                    className={`crypto-logo ${selectedPair.symbol === crypto.symbol ? 'active' : ''}`}
                                    onClick={() => setSelectedPair(crypto)}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="dashboard-cards">
                        <div className="dashboard-card price-card">
                            <div className="card-content">
                                <h2>{selectedPair.name} Price</h2>
                                <div className="price-value">{price}</div>
                            </div>
                            <div className="card-icon">
                                <i className="fab fa-bitcoin price-icon"></i>
                            </div>
                        </div>
                        <div className="dashboard-card volume-card">
                            <div className="card-content">
                                <h2>24h Volume</h2>
                                <div className="volume-value">{volume}</div>
                            </div>
                            <div className="card-icon">
                                <i className="fas fa-chart-line"></i>
                            </div>
                        </div>
                        <div className="dashboard-card sentiment-card">
                            <div className="card-content">
                                <h2>Market Sentiment</h2>
                                <div className={`sentiment-value ${sentiment?.toLowerCase()}`}>
                                    {sentiment}
                                </div>
                            </div>
                            <div className="card-icon">
                                {getSentimentIcon(sentiment)}
                            </div>
                        </div>
                    </div>
                    <div className="chart-container">
                        <div id="tradingview_chart"></div>
                    </div>
                </div>
            </div>
            {newsSection()}
        </div>
    );
};

export default CryptoDashboard;



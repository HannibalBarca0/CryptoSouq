import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './CryptoDashboard.css';
import Auth from './components/Auth';
import PredictionChart from './components/PredictionChart';
import Portfolio from './components/Portfolio';

// Add responsive grid layout constants
const GRID_LAYOUTS = {
  mobile: {
    cards: '1fr',
    charts: '1fr',
    gap: '1rem',
    padding: '1rem',
    cardHeight: '120px',
    chartHeight: '300px',
    fontSize: {
      title: '1.2rem',
      price: '1.5rem',
      text: '0.9rem'
    }
  },
  tablet: {
    cards: 'repeat(2, 1fr)',
    charts: 'repeat(2, 1fr)',
    gap: '1.5rem',
    padding: '1.5rem',
    cardHeight: '150px',
    chartHeight: '400px',
    fontSize: {
      title: '1.4rem',
      price: '1.8rem',
      text: '1rem'
    }
  },
  desktop: {
    cards: 'repeat(3, 1fr)',
    charts: 'repeat(2, 1fr)',
    gap: '2rem',
    padding: '2rem',
    cardHeight: '180px',
    chartHeight: '500px',
    fontSize: {
      title: '1.6rem',
      price: '2rem',
      text: '1.1rem'
    }
  }
};

// Add this at the top, after the imports
function getInitialLayout() {
    const width = window.innerWidth;
    if (width < 768) {
        return GRID_LAYOUTS.mobile;
    } else if (width < 1024) {
        return GRID_LAYOUTS.tablet;
    }
    return GRID_LAYOUTS.desktop;
}

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

// Replace the select dropdown with this crypto logo bar
const CryptoSelector = ({ selectedPair, onPairChange }) => (
    <div className="crypto-selector">
        {TRADING_PAIRS.map(pair => (
            <div 
                key={pair.symbol}
                className={`crypto-item ${selectedPair.symbol === pair.symbol ? 'active' : ''}`}
                onClick={() => onPairChange(pair.symbol)}
            >
                <img 
                    src={`https://cryptologos.cc/logos/${pair.name.toLowerCase()}-${pair.symbol.replace('USDT', '').toLowerCase()}-logo.svg`}
                    alt={pair.name}
                    className="crypto-logo"
                />
                <span className="crypto-name">{pair.name}</span>
            </div>
        ))}
    </div>
);

function CryptoDashboard() {
    const [selectedPair, setSelectedPair] = useState(TRADING_PAIRS[0]);
    const [price, setPrice] = useState('Loading...');
    const [volume, setVolume] = useState('Loading...');
    const [prevPrice, setPrevPrice] = useState(null);
    const [numericPrice, setNumericPrice] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [predictions, setPredictions] = useState(null);
    const [news, setNews] = useState([]);
    const [newsLoading, setNewsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5);
    
    // Add missing state variables

    // Define TradingView at the component level
    const [tradingView, setTradingView] = useState(window.TradingView);
    const [tradingViewLoaded, setTradingViewLoaded] = useState(false);

    // Add responsive layout state
    const [layout, setLayout] = useState(getInitialLayout());

    // Detect screen size changes
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width < 768) {
                setLayout(GRID_LAYOUTS.mobile);
            } else if (width < 1024) {
                setLayout(GRID_LAYOUTS.tablet);
            } else {
                setLayout(GRID_LAYOUTS.desktop);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Add adaptive styling
    const dashboardStyle = {
        display: 'grid',
        gridTemplateColumns: layout.cards,
        gap: layout.gap,
        padding: layout.padding,
        maxWidth: '1800px',
        margin: '0 auto',
        transition: 'all 0.3s ease'
    };

    // Add smooth animations for price updates
    const [priceAnimation, setPriceAnimation] = useState('');
    
    useEffect(() => {
        if (numericPrice !== null && prevPrice !== null) {
            setPriceAnimation(numericPrice > prevPrice ? 'slide-up' : 'slide-down');
            const timer = setTimeout(() => setPriceAnimation(''), 500);
            return () => clearTimeout(timer);
        }
    }, [numericPrice, prevPrice]);

    useEffect(() => {
        // Update TradingView when the window object has it
        if (window.TradingView && !tradingView) {
            setTradingView(window.TradingView);
        }
    }, [tradingView]);

    // Add handler for pair selection
    const handlePairChange = (symbolValue) => {
        const newPair = TRADING_PAIRS.find(pair => pair.symbol === symbolValue);
        if (newPair) {
            setSelectedPair(newPair);
        }
    };

    // Add price change helpers
    const getPriceChangeClass = () => {
        if (!prevPrice || !numericPrice) return '';
        return numericPrice > prevPrice ? 'positive' : 'negative';
    };

    const getPriceChange = () => {
        if (!prevPrice || !numericPrice) return '';
        const change = ((numericPrice - prevPrice) / prevPrice) * 100;
        const prefix = change > 0 ? '+' : '';
        return `${prefix}${change.toFixed(2)}%`;
    };

    // Add predictions fetch
    useEffect(() => {
        const fetchPredictions = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                const response = await fetch(`/api/price/${selectedPair.symbol}/predict`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
                setPredictions(data);
            } catch (error) {
                console.error('Prediction error:', error);
            }
        };

        if (isAuthenticated) {
            fetchPredictions();
            const interval = setInterval(fetchPredictions, 300000); // 5min
            return () => clearInterval(interval);
        }
    }, [selectedPair, isAuthenticated]);

    // Fix TradingView initialization
    useEffect(() => {
        const loadTradingViewScript = () => {
            return new Promise((resolve, reject) => {
                if (window.TradingView) {
                    resolve(window.TradingView);
                    return;
                }

                const script = document.createElement('script');
                script.src = 'https://s3.tradingview.com/tv.js';
                script.async = true;
                script.onload = () => resolve(window.TradingView);
                script.onerror = reject;
                document.body.appendChild(script);
            });
        };

        const initTradingView = async () => {
            try {
                await loadTradingViewScript();
                const container = document.getElementById('tradingview_chart');
                if (container && window.TradingView) {
                    new window.TradingView.widget({
                        container_id: 'tradingview_chart',
                        symbol: `BINANCE:${selectedPair.symbol}`,
                        interval: 'D',
                        timezone: 'Etc/UTC',
                        theme: 'dark',
                        style: '1',
                        locale: 'en',
                        enable_publishing: false,
                        hide_top_toolbar: false,
                        hide_legend: false,
                        save_image: false,
                        height: '100%',
                        width: '100%',
                        autosize: true
                    });
                    setTradingViewLoaded(true);
                }
            } catch (error) {
                console.error('Error loading TradingView:', error);
            }
        };

        initTradingView();

        return () => {
            // Cleanup any TradingView instances if needed
            const container = document.getElementById('tradingview_chart');
            if (container) {
                container.innerHTML = '';
            }
        };
    }, [selectedPair]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                const response = await axios.get(`/api/price/${selectedPair.symbol}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const cryptoName = VALID_SYMBOLS[selectedPair.symbol.toUpperCase()];
                const cryptoData = response.data[cryptoName];
                
                if (cryptoData && typeof cryptoData.usd === 'number') {
                    setPrevPrice(numericPrice);
                    setNumericPrice(cryptoData.usd);
                    setPrice(new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                    }).format(cryptoData.usd));
                    
                    // Set volume
                    if (typeof cryptoData.volume === 'number') {
                        setVolume(new Intl.NumberFormat('en-US', {
                            maximumFractionDigits: 2,
                            notation: 'compact',
                            compactDisplay: 'short'
                        }).format(cryptoData.volume));
                    }
                }
            } catch (error) {
                if (error.response?.status === 401) {
                    setIsAuthenticated(false);
                }
                console.error('Fetch Error:', error);
            }
        };

        if (isAuthenticated) {
            fetchData();
            const interval = setInterval(fetchData, 1000);
            return () => clearInterval(interval);
        }
    }, [selectedPair, isAuthenticated, numericPrice]);

    useEffect(() => {
        const container = document.getElementById('tradingview_chart');
        if (!container) {
            console.warn('TradingView container not found');
            return;
        }
    
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = () => {
            if (typeof TradingView !== 'undefined' && container) {
                new TradingView.widget({
                    container_id: 'tradingview_chart',
                    symbol: selectedPair.symbol,
                    interval: 'D',
                    timezone: 'Etc/UTC',
                    theme: 'dark',
                    style: '1',
                    locale: 'en',
                    enable_publishing: false,
                    hide_top_toolbar: false,
                    hide_legend: false,
                    save_image: false,
                    height: '100%',
                    width: '100%',
                });
            }
        };
    
        document.body.appendChild(script);
        return () => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, [selectedPair]);

    useEffect(() => {
        const updateLayout = () => {
            const width = window.innerWidth;
            const layout = getInitialLayout();
            
            // Update CSS variables
            document.documentElement.style.setProperty('--layout-gap', layout.gap);
            document.documentElement.style.setProperty('--layout-padding', layout.padding);
            document.documentElement.style.setProperty('--grid-columns', layout.cards);
            document.documentElement.style.setProperty('--chart-height', layout.chartHeight);
            document.documentElement.style.setProperty('--font-size-title', layout.fontSize.title);
            document.documentElement.style.setProperty('--font-size-price', layout.fontSize.price);
            document.documentElement.style.setProperty('--font-size-text', layout.fontSize.text);
        };

        // Initial update
        updateLayout();

        // Update on resize
        window.addEventListener('resize', updateLayout);
        window.addEventListener('orientationchange', updateLayout);

        return () => {
            window.removeEventListener('resize', updateLayout);
            window.removeEventListener('orientationchange', updateLayout);
        };
    }, []);

    const handleAuthSuccess = () => {
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_role');
        setIsAuthenticated(false);
        setIsAdmin(false);
    };

    const getSentimentIcon = (sentiment) => {
        switch(sentiment?.toLowerCase()) {
            case 'bullish':
                return (
                    <div className="sentiment-score positive">
                        <i className="fas fa-arrow-up"></i>
                        <span className="score">Positive</span>
                    </div>
                );
            case 'bearish':
                return (
                    <div className="sentiment-score negative">
                        <i className="fas fa-arrow-down"></i>
                        <span className="score">Negative</span>
                    </div>
                );
            default:
                return (
                    <div className="sentiment-score neutral">
                        <i className="fas fa-minus"></i>
                        <span className="score">Neutral</span>
                    </div>
                );
        }
    };
    
    const NewsItem = ({ item }) => (
        <div className={`news-item ${item.sentiment?.toLowerCase()}`}>
            <div className="sentiment-indicator">
                {getSentimentIcon(item.sentiment)}
                {item.confidence && (
                    <div className="confidence-score">
                        {Math.round(item.confidence * 100)}%
                    </div>
                )}
            </div>
            <div className="news-content">
                <div className="news-title">{item.title}</div>
                <div className="news-meta">
                    <span className="news-source">{item.source}</span>
                    <span className="news-time">
                        {new Date(item.published_at).toLocaleTimeString()}
                    </span>
                </div>
            </div>
        </div>
    );

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

    const [newsCache, setNewsCache] = useState({});

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const symbol = selectedPair.symbol.replace('USDT', '');
                
                // Check cache first and use if less than 5 minutes old
                if (newsCache[symbol]) {
                    const cacheAge = Date.now() - newsCache[symbol].timestamp;
                    if (cacheAge < 300000) { // 5 minutes
                        setNews(newsCache[symbol].data);
                        setNewsLoading(false);
                        return;
                    }
                }
                
                // If cache is old or doesn't exist, fetch new data
                setNewsLoading(true);
                const token = localStorage.getItem('auth_token');
                
                const response = await axios.get('/api/news', {
                    params: { 
                        currencies: symbol,
                        limit: 10 // Reduce number of requested items
                    },
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });
                
                if (response.data?.results) {
                    setNews(response.data.results);
                    setNewsCache(prev => ({
                        ...prev,
                        [symbol]: {
                            data: response.data.results,
                            timestamp: Date.now()
                        }
                    }));
                }
                
            } catch (error) {
                console.error('News fetch error:', error.response?.data || error.message);
            } finally {
                setNewsLoading(false);
            }
        };

        if (isAuthenticated) {
            fetchNews();
            // Update every 5 minutes instead of continuous polling
            const interval = setInterval(fetchNews, 300000);
            return () => clearInterval(interval);
        }
    }, [selectedPair, isAuthenticated, newsCache]);

    // Update the newsSection function
    function newsSection() {
        const maxPage = Math.ceil(news.length / itemsPerPage);
        const displayedNews = news.slice(
            (currentPage - 1) * itemsPerPage, 
            currentPage * itemsPerPage
        );

        return (
            <div className="news-panel">
                <h2>Market News & Sentiment</h2>
                <div className="news-list">
                    {newsLoading ? (
                        <div className="news-loading">
                            <i className="fas fa-spinner fa-spin"></i> Loading news...
                        </div>
                    ) : news.length === 0 ? (
                        <div className="news-empty">
                            <i className="fas fa-newspaper"></i>
                            <p>No news available for {selectedPair.name}</p>
                        </div>
                    ) : (
                        <>
                            {displayedNews.map((item, index) => (
                                <div
                                    key={index}
                                    className={`news-item ${item.sentiment?.toLowerCase() || 'neutral'}`}
                                    onClick={() => item.url && window.open(item.url, '_blank')}
                                >
                                    <div className="sentiment-indicator">
                                        {getSentimentIcon(item.sentiment)}
                                    </div>
                                    <div className="news-content">
                                        <div className="news-title">
                                            {typeof item === 'object' ? item.title : String(item)}
                                        </div>
                                        {item.source && (
                                            <div className="news-meta">
                                                <span className="news-source">
                                                    {typeof item.source === 'object' ? 
                                                        item.source.title : 
                                                        String(item.source)}
                                                </span>
                                                {item.published_at && (
                                                    <span className="news-time">
                                                        {new Date(item.published_at).toLocaleTimeString()}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {news.length > itemsPerPage && (
                                <div className="pagination">
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <i className="fas fa-chevron-left"></i>
                                    </button>
                                    <span>{currentPage} / {maxPage}</span>
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.min(maxPage, p + 1))}
                                        disabled={currentPage === maxPage}
                                    >
                                        <i className="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Auth onAuthSuccess={handleAuthSuccess} />;
    }

    return (
        <div className="dashboard-container">
            <nav className="dashboard-nav">
                <div className="nav-group">
                    <CryptoSelector selectedPair={selectedPair} onPairChange={handlePairChange} />
                </div>
                <div className="nav-group">
                    {isAdmin && <button className="admin-button">Admin Panel</button>}
                    <button className="logout-button" onClick={handleLogout}>Logout</button>
                </div>
            </nav>

            <div className="main-content">
                <div className="dashboard-grid" style={dashboardStyle}>
                    {/* Price Card */}
                    <div className={`dashboard-card price-card ${priceAnimation}`}>
                        <div className="card-content">
                            <div className="card-header">
                                <h2>Current Price</h2>
                                <span className="card-icon">
                                    <i className="fas fa-chart-line"></i>
                                </span>
                            </div>
                            <div className="price-display">
                                <div className="price-value">{price}</div>
                                <div className={`price-change ${getPriceChangeClass()}`}>
                                    {getPriceChange()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Volume Card */}
                    <div className="dashboard-card volume-card">
                        <div className="card-content">
                            <div className="card-header">
                                <h2>24h Volume</h2>
                                <span className="card-icon">
                                    <i className="fas fa-chart-bar"></i>
                                </span>
                            </div>
                            <div className="volume-value">{volume}</div>
                        </div>
                    </div>
                </div>
                
                <div className="charts-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: layout.charts,
                    gap: layout.gap,
                    marginTop: layout.gap
                }}>
                    <div className="chart-container tradingview">
                        <div id="tradingview_chart"></div>
                    </div>
                    <div className="chart-container prediction">
                        <PredictionChart predictions={predictions} />
                    </div>
                </div>
            </div>
            
            <div className="side-content">
                {newsSection()}
                <Portfolio /> {/* Move here for better layout */}
            </div>
        </div>
    );
};

export default CryptoDashboard;  // Make sure this line is present


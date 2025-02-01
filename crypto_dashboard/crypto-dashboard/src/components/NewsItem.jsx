const NewsItem = ({ item }) => {
    const sentimentClass = item.sentiment?.toLowerCase() || 'neutral';
    const confidence = item.confidence ? Math.round(item.confidence * 100) : null;
    
    return (
        <div className={`news-item ${sentimentClass}`}>
            <div className="sentiment-indicator">
                {getSentimentIcon(item.sentiment)}
                {confidence && (
                    <div className="confidence-score">
                        {confidence}%
                    </div>
                )}
            </div>
            <div className="news-content">
                <div className="news-title">{item.title}</div>
                <div className="news-meta">
                    <span className="news-source">
                        {typeof item.source === 'object' ? item.source.title : item.source}
                    </span>
                    {item.published_at && (
                        <span className="news-time">
                            {new Date(item.published_at).toLocaleTimeString()}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
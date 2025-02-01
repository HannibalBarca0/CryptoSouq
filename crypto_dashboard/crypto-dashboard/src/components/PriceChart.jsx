import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const PriceChart = ({ symbol }) => {
    const [chartData, setChartData] = useState(null);
    const [debugData, setDebugData] = useState(null); // Add debug state

    useEffect(() => {
        const fetchPriceHistory = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                const response = await fetch(`/api/search/prices/${symbol}?interval=7d`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
                console.log("Price data received:", data);
                
                if (!data.prices || data.prices.length === 0) {
                    console.log('No price data available');
                    setChartData(null);
                    return;
                }

                // Sort prices by timestamp and limit to last 50 points for better visibility
                const sortedPrices = data.prices
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                    .slice(-50);

                setChartData({
                    labels: sortedPrices.map(p => 
                        new Date(p.timestamp).toLocaleTimeString()
                    ),
                    datasets: [
                        {
                            label: `${symbol} Price (USD)`,
                            data: sortedPrices.map(p => p.price),
                            borderColor: '#00fff0',
                            backgroundColor: 'rgba(0, 255, 240, 0.1)',
                            borderWidth: 2,
                            pointRadius: 1,
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: `${symbol} Volume`,
                            data: sortedPrices.map(p => p.volume),
                            borderColor: '#0087ff',
                            backgroundColor: 'rgba(0, 135, 255, 0.1)',
                            borderWidth: 2,
                            pointRadius: 1,
                            tension: 0.4,
                            fill: true,
                            yAxisID: 'volume'
                        }
                    ]
                });
            } catch (error) {
                console.error('Error fetching price history:', error);
                setChartData(null);
            }
        };

        fetchPriceHistory();
        const interval = setInterval(fetchPriceHistory, 60000); // Update every minute
        
        return () => clearInterval(interval);
    }, [symbol]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: { color: '#fff' }
            },
            title: {
                display: true,
                text: `${symbol} Price & Volume History`,
                color: '#fff'
            }
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                ticks: { color: '#00fff0' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            volume: {
                type: 'linear',
                display: true,
                position: 'right',
                ticks: { color: '#0087ff' },
                grid: { display: false }
            },
            x: {
                ticks: {
                    color: '#fff',
                    maxRotation: 45,
                    minRotation: 45
                },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        }
    };

    return (
        <div className="chart-container">
            {chartData ? (
                <>
                    <Line data={chartData} options={options} />
                    <div style={{display: 'none'}}>
                        <pre>{JSON.stringify(debugData, null, 2)}</pre>
                    </div>
                </>
            ) : (
                <div style={{color: '#fff', textAlign: 'center', padding: '20px'}}>
                    Loading price history...
                </div>
            )}
        </div>
    );
};

export default PriceChart;
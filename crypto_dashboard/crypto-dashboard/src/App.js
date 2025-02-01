import React, { useState, useEffect } from 'react';
import CryptoDashboard from './CryptoDashboard';
import Auth from './components/Auth';
import './App.css';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const validateToken = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch('/api/auth/validate', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.valid) {
                        setIsAuthenticated(true);
                    } else {
                        localStorage.removeItem('auth_token');
                        localStorage.removeItem('user_role');
                    }
                } else {
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user_role');
                }
            } catch (error) {
                console.error('Token validation error:', error);
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_role');
            } finally {
                setIsLoading(false);
            }
        };

        validateToken();
    }, []);

    const handleAuthSuccess = () => {
        setIsAuthenticated(true);
    };

    if (isLoading) {
        return (
            <div className="loading-screen">
                <div className="loader"></div>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="app">
            {!isAuthenticated ? (
                <Auth onAuthSuccess={handleAuthSuccess} />
            ) : (
                <CryptoDashboard />
            )}
        </div>
    );
}

export default App;
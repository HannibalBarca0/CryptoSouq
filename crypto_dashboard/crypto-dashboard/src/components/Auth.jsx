// src/components/Auth.jsx
import React, { useState, useEffect } from 'react';
import './Auth.css';

const Auth = ({ onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });

    useEffect(() => {
        const validateToken = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch('http://localhost:8000/api/auth/validate', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Token validation failed');
                }

                const data = await response.json();
                if (data.valid) {
                    onAuthSuccess();
                } else {
                    clearAuthData();
                }
            } catch (error) {
                console.error('Token validation error:', error);
                clearAuthData();
            }
        };

        validateToken();
    }, [onAuthSuccess]);

    const clearAuthData = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_role');
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Use relative URL with proxy
            const endpoint = isLogin ? '/api/auth/token' : '/api/auth/register';
            const body = isLogin ? 
                new URLSearchParams(formData) : 
                JSON.stringify(formData);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': isLogin ? 
                        'application/x-www-form-urlencoded' : 
                        'application/json'
                },
                body: body,
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Authentication failed');
            }

            if (data.access_token) {
                localStorage.setItem('auth_token', data.access_token);
                localStorage.setItem('user_role', data.is_admin ? 'admin' : 'user');
                onAuthSuccess();
            } else {
                throw new Error('No access token received');
            }
        } catch (error) {
            console.error('Auth error:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2>{isLogin ? 'Login' : 'Register'}</h2>
                {error && <div className="error-message">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Username"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        disabled={isLoading}
                        required
                    />
                    {!isLogin && (
                        <input
                            type="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            disabled={isLoading}
                            required
                        />
                    )}
                    <input
                        type="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        disabled={isLoading}
                        required
                    />
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
                    </button>
                </form>
                <p onClick={() => !isLoading && setIsLogin(!isLogin)}>
                    {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
                </p>
            </div>
        </div>
    );
};

export default Auth;
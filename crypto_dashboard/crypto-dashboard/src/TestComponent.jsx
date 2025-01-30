import React, { useEffect, useState } from 'react';
import axios from 'axios';

const TestComponent = () => {
    const [message, setMessage] = useState('Loading...');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Use relative URL since we have proxy configured
                const response = await axios.get('/api/test');
                console.log('Response:', response);
                setMessage(response.data.message);
            } catch (error) {
                console.error('Error details:', error.response || error);
                setMessage('Error: ' + (error.response?.data || error.message));
            }
        };

        fetchData();
    }, []);

    return (
        <div>
            <h2>Test Component</h2>
            <p>{message}</p>
        </div>
    );
};

export default TestComponent;
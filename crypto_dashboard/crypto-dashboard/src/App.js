import React from "react";
import CryptoDashboard from "./CryptoDashboard";
import ErrorBoundary from "./ErrorBoundary";

const App = () => {
    return (
        <div className="App">
            <ErrorBoundary>
                <CryptoDashboard />
            </ErrorBoundary>
        </div>
    );
};

export default App;
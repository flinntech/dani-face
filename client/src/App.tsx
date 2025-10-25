import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ChatInterface from './components/ChatInterface';
import Login from './components/Login';
import Signup from './components/Signup';
import './styles/App.css';

/**
 * Main App Content (inside AuthProvider)
 */
const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [showSignup, setShowSignup] = useState(false);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show login/signup if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="app">
        {showSignup ? (
          <Signup onSwitchToLogin={() => setShowSignup(false)} />
        ) : (
          <Login onSwitchToSignup={() => setShowSignup(true)} />
        )}
      </div>
    );
  }

  // Show chat interface if authenticated
  return (
    <div className="app">
      <ChatInterface />
    </div>
  );
};

/**
 * Main App component with Auth Provider
 */
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ChatInterface from './components/ChatInterface';
import LogsViewer from './components/LogsViewer';
import { SettingsPage } from './components/SettingsPage';
import Login from './components/Login';
import Signup from './components/Signup';
import './styles/App.css';

type AppPage = 'chat' | 'logs' | 'settings';

/**
 * Main App Content (inside AuthProvider)
 */
const AppContent: React.FC = () => {
  const { isAuthenticated, loading, logout, user } = useAuth();
  const [showSignup, setShowSignup] = useState(false);
  const [currentPage, setCurrentPage] = useState<AppPage>('chat');

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

  // Show navigation and current page if authenticated
  return (
    <div className="app">
      <nav className="app-nav">
        <div className="app-nav-brand">
          <h1>DANI</h1>
        </div>
        <div className="app-nav-links">
          <button
            className={`app-nav-link ${currentPage === 'chat' ? 'active' : ''}`}
            onClick={() => setCurrentPage('chat')}
          >
            Chat
          </button>
          <button
            className={`app-nav-link ${currentPage === 'logs' ? 'active' : ''}`}
            onClick={() => setCurrentPage('logs')}
          >
            Logs
          </button>
          <button
            className={`app-nav-link ${currentPage === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentPage('settings')}
          >
            Settings
          </button>
        </div>
        <div className="app-nav-user">
          <span className="app-nav-user-email">{user?.email}</span>
          <button className="app-nav-logout" onClick={logout}>
            Logout
          </button>
        </div>
      </nav>
      <div className="app-content">
        {currentPage === 'chat' && <ChatInterface />}
        {currentPage === 'logs' && <LogsViewer />}
        {currentPage === 'settings' && <SettingsPage onBack={() => setCurrentPage('chat')} />}
      </div>
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

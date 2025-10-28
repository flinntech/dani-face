import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ChatInterface from './components/ChatInterface';
import { SettingsPage } from './components/SettingsPage';
import { PendingApproval } from './components/PendingApproval';
import { AdminPanel } from './components/admin/AdminPanel';
import Login from './components/Login';
import Signup from './components/Signup';
import './styles/App.css';

type AppPage = 'chat' | 'settings' | 'admin';

/**
 * Main App Content (inside AuthProvider)
 */
const AppContent: React.FC = () => {
  const { isAuthenticated, loading, logout, user, isPending, isAdmin } = useAuth();
  const [showSignup, setShowSignup] = useState(false);
  const [currentPage, setCurrentPage] = useState<AppPage>('chat');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Load sidebar state from localStorage, default to true (open)
    const saved = localStorage.getItem('dani-sidebar-open');
    return saved !== null ? saved === 'true' : true;
  });

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dani-sidebar-open', String(sidebarOpen));
  }, [sidebarOpen]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.app-nav-user')) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [profileMenuOpen]);

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

  // Show pending approval screen for pending users
  if (isPending) {
    return (
      <div className="app">
        <PendingApproval userEmail={user?.email} onLogout={logout} />
      </div>
    );
  }

  // Show navigation and current page if authenticated
  return (
    <div className="app">
      <nav className="app-nav">
        {currentPage === 'chat' && (
          <button
            className="app-nav-hamburger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        )}
        <div className="app-nav-brand">
          <h1>DANI - Digi Artificial Network Intelligence</h1>
        </div>
        <div className="app-nav-user">
          <button
            className="app-nav-profile-button"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            aria-label="User menu"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span className="app-nav-user-email">{user?.email}</span>
            <svg
              className={`app-nav-chevron ${profileMenuOpen ? 'open' : ''}`}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          {profileMenuOpen && (
            <div className="app-nav-dropdown">
              <button
                className="app-nav-dropdown-item"
                onClick={() => {
                  setCurrentPage('chat');
                  setProfileMenuOpen(false);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                Chat
              </button>
              <button
                className="app-nav-dropdown-item"
                onClick={() => {
                  setCurrentPage('settings');
                  setProfileMenuOpen(false);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m-2.8 2.8l-4.2 4.2m12.2 0l-4.2-4.2m-2.8-2.8l-4.2-4.2"></path>
                </svg>
                Settings
              </button>
              {isAdmin && (
                <>
                  <div className="app-nav-dropdown-divider"></div>
                  <button
                    className="app-nav-dropdown-item"
                    onClick={() => {
                      setCurrentPage('admin');
                      setProfileMenuOpen(false);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                      <polyline points="2 17 12 22 22 17"></polyline>
                      <polyline points="2 12 12 17 22 12"></polyline>
                    </svg>
                    <span>
                      Admin
                      <span className="app-nav-admin-badge-inline">Admin</span>
                    </span>
                  </button>
                </>
              )}
              <div className="app-nav-dropdown-divider"></div>
              <button
                className="app-nav-dropdown-item logout"
                onClick={() => {
                  logout();
                  setProfileMenuOpen(false);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>
      <div className="app-content">
        {currentPage === 'chat' && (
          <ChatInterface
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        )}
        {currentPage === 'settings' && <SettingsPage onBack={() => setCurrentPage('chat')} />}
        {currentPage === 'admin' && isAdmin && <AdminPanel onBack={() => setCurrentPage('chat')} />}
      </div>
    </div>
  );
};

/**
 * Main App component with Theme and Auth Providers
 */
const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

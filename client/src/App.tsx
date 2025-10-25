import React from 'react';
import ChatInterface from './components/ChatInterface';
import './styles/App.css';

/**
 * Main App component
 */
const App: React.FC = () => {
  return (
    <div className="app">
      <ChatInterface />
    </div>
  );
};

export default App;

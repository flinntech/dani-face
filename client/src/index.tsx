import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeTheme } from './context/ThemeContext';
import './styles/index.css';

// Initialize theme before React mounts to prevent FOUC (Flash of Unstyled Content)
initializeTheme();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import React from 'react';
import '../styles/WelcomeMessage.css';

/**
 * Welcome message component that introduces DANI
 */
const WelcomeMessage: React.FC = () => {
  return (
    <div className="welcome-message">
      <div className="welcome-header">
        <h1>👋 Welcome to DANI</h1>
        <p className="welcome-subtitle">
          Your Digi Remote Manager and Network Infrastructure Assistant
        </p>
      </div>

      <div className="capabilities-section">
        <h2>What I can help you with:</h2>
        <div className="capabilities-grid">
          <div className="capability-card">
            <div className="capability-icon">📱</div>
            <h3>Device Management</h3>
            <p>Monitor Digi cellular IoT routers/gateways, view device status, locations, and connectivity</p>
          </div>

          <div className="capability-card">
            <div className="capability-icon">📊</div>
            <h3>Telemetry & Diagnostics</h3>
            <p>Analyze data streams, temperature sensors, GPS coordinates, signal strength, and other metrics</p>
          </div>

          <div className="capability-card">
            <div className="capability-icon">🌐</div>
            <h3>Network Connectivity</h3>
            <p>Troubleshoot internet outages, check carrier/cloud provider status (AT&T, Verizon, T-Mobile, AWS, Google Cloud, Azure)</p>
          </div>

          <div className="capability-card">
            <div className="capability-icon">🔔</div>
            <h3>Alerts & Automation</h3>
            <p>Configure and review alerts, automation workflows</p>
          </div>

          <div className="capability-card">
            <div className="capability-icon">📈</div>
            <h3>Fleet Analysis</h3>
            <p>Reports on device health, connections, cellular usage, firmware compliance</p>
          </div>
        </div>
      </div>

      <div className="getting-started">
        <h3>Getting Started</h3>
        <p>Type your question or request in the message box below. For example:</p>
        <ul>
          <li>"Show me the status of all devices in the New York region"</li>
          <li>"What devices are currently offline?"</li>
          <li>"Analyze the signal strength for device ABC123"</li>
          <li>"Are there any network outages affecting our devices?"</li>
        </ul>
      </div>

      <div className="disclaimer">
        <p>
          <em>DANI can make mistakes. Please verify important information.</em>
        </p>
      </div>
    </div>
  );
};

export default WelcomeMessage;

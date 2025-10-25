import React, { useState, useEffect, useCallback } from 'react';
import { getLogStream, getLogStats, searchLogs, exportLogs } from '../services/api';
import {
  LogEntry,
  LogType,
  LogLevel,
  LogStatsResponse,
  LogViewerFilters
} from '../types/logs.types';
import '../styles/LogsViewer.css';

const LogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const [filters, setFilters] = useState<LogViewerFilters>({
    logType: 'combined',
    logLevel: 'all',
    searchQuery: '',
    lineCount: 100,
    autoRefresh: false,
  });

  // Fetch logs based on filters
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (filters.searchQuery.trim()) {
        // Search mode
        const response = await searchLogs(filters.searchQuery, filters.lineCount);
        setLogs(response.results);
      } else {
        // Stream mode
        const response = await getLogStream(
          filters.logType,
          filters.lineCount,
          filters.logLevel
        );
        setLogs(response.logs);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await getLogStats();
      setStats(response);
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  // Auto-refresh
  useEffect(() => {
    if (filters.autoRefresh) {
      const interval = setInterval(() => {
        fetchLogs();
        fetchStats();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [filters.autoRefresh, fetchLogs, fetchStats]);

  // Handle export
  const handleExport = async () => {
    try {
      const response = await exportLogs(filters.logType);
      const blob = new Blob([JSON.stringify(response, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dani-agent-${filters.logType}-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to export logs');
    }
  };

  // Get log level badge color
  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case 'error':
        return 'log-level-error';
      case 'warn':
        return 'log-level-warn';
      case 'info':
        return 'log-level-info';
      case 'debug':
        return 'log-level-debug';
      default:
        return 'log-level-info';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  };

  // Render log details
  const renderLogDetails = (log: LogEntry) => {
    const excludeKeys = ['timestamp', 'level', 'message'];
    const extraFields = Object.keys(log).filter(key => !excludeKeys.includes(key) && log[key] !== undefined);

    return (
      <div className="log-details">
        <div className="log-details-header">
          <h3>Log Details</h3>
          <button
            className="close-button"
            onClick={() => setSelectedLog(null)}
            aria-label="Close details"
          >
            ✕
          </button>
        </div>

        <div className="log-details-content">
          <div className="log-detail-row">
            <span className="log-detail-label">Timestamp:</span>
            <span className="log-detail-value">{formatTimestamp(log.timestamp)}</span>
          </div>

          <div className="log-detail-row">
            <span className="log-detail-label">Level:</span>
            <span className={`log-level-badge ${getLevelColor(log.level)}`}>
              {log.level.toUpperCase()}
            </span>
          </div>

          <div className="log-detail-row">
            <span className="log-detail-label">Message:</span>
            <span className="log-detail-value">{log.message}</span>
          </div>

          {extraFields.map(key => (
            <div key={key} className="log-detail-row">
              <span className="log-detail-label">{key}:</span>
              <span className="log-detail-value">
                {typeof log[key] === 'object'
                  ? JSON.stringify(log[key], null, 2)
                  : String(log[key])}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="logs-viewer">
      {/* Header */}
      <div className="logs-header">
        <h1>Agent Logs</h1>
        <p className="logs-subtitle">Monitor and troubleshoot DANI agent activity</p>
      </div>

      {/* Statistics Dashboard */}
      {stats && (
        <div className="stats-dashboard">
          <div className="stat-card">
            <div className="stat-value">{stats.errorCount}</div>
            <div className="stat-label">Errors</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.conversationCount}</div>
            <div className="stat-label">Conversations</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.toolCalls.length}</div>
            <div className="stat-label">Unique Tools</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.models.length}</div>
            <div className="stat-label">Models Used</div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="logs-controls">
        <div className="controls-row">
          {/* Log Type */}
          <div className="control-group">
            <label htmlFor="log-type">Log Type</label>
            <select
              id="log-type"
              value={filters.logType}
              onChange={(e) => setFilters({ ...filters, logType: e.target.value as LogType })}
            >
              <option value="combined">All Logs</option>
              <option value="error">Errors Only</option>
              <option value="activity">Agent Activity</option>
            </select>
          </div>

          {/* Log Level */}
          <div className="control-group">
            <label htmlFor="log-level">Level</label>
            <select
              id="log-level"
              value={filters.logLevel}
              onChange={(e) => setFilters({ ...filters, logLevel: e.target.value as LogLevel | 'all' })}
            >
              <option value="all">All Levels</option>
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>

          {/* Line Count */}
          <div className="control-group">
            <label htmlFor="line-count">Lines</label>
            <select
              id="line-count"
              value={filters.lineCount}
              onChange={(e) => setFilters({ ...filters, lineCount: parseInt(e.target.value, 10) })}
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="250">250</option>
              <option value="500">500</option>
              <option value="1000">1000</option>
            </select>
          </div>

          {/* Auto Refresh */}
          <div className="control-group control-group-checkbox">
            <label>
              <input
                type="checkbox"
                checked={filters.autoRefresh}
                onChange={(e) => setFilters({ ...filters, autoRefresh: e.target.checked })}
              />
              <span>Auto-refresh (5s)</span>
            </label>
          </div>
        </div>

        <div className="controls-row">
          {/* Search */}
          <div className="control-group control-group-search">
            <label htmlFor="search">Search</label>
            <input
              type="text"
              id="search"
              placeholder="Search logs..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  fetchLogs();
                }
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="control-group control-group-actions">
            <button
              className="btn btn-primary"
              onClick={fetchLogs}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleExport}
              disabled={loading}
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="logs-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Logs Display */}
      <div className="logs-container">
        <div className="logs-list">
          {loading && logs.length === 0 ? (
            <div className="logs-loading">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="logs-empty">
              No logs found. Try adjusting your filters or search query.
            </div>
          ) : (
            <>
              <div className="logs-count">
                Showing {logs.length} log {logs.length === 1 ? 'entry' : 'entries'}
              </div>
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`log-entry ${selectedLog === log ? 'log-entry-selected' : ''}`}
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="log-entry-header">
                    <span className={`log-level-badge ${getLevelColor(log.level)}`}>
                      {(log.level || 'info').toUpperCase()}
                    </span>
                    <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
                  </div>
                  <div className="log-message">{log.message}</div>
                  {log.conversationId && (
                    <div className="log-meta">
                      <span className="log-meta-item">Conv: {log.conversationId}</span>
                    </div>
                  )}
                  {log.tool && (
                    <div className="log-meta">
                      <span className="log-meta-item">Tool: {log.tool}</span>
                      {log.server && <span className="log-meta-item">Server: {log.server}</span>}
                      {log.duration && <span className="log-meta-item">{log.duration}ms</span>}
                    </div>
                  )}
                  {log.model && (
                    <div className="log-meta">
                      <span className="log-meta-item">Model: {log.model}</span>
                    </div>
                  )}
                  {log.error && (
                    <div className="log-error-text">{log.error}</div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Details Panel */}
        {selectedLog && (
          <div className="logs-details-panel">
            {renderLogDetails(selectedLog)}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsViewer;

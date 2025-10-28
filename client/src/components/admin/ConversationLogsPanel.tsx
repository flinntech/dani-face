/**
 * ConversationLogsPanel
 * Main dashboard for viewing conversation logs with filtering, search, and export
 */

import React, { useState, useEffect } from 'react';
import { adminLogsService } from '../../services/adminLogsService';
import {
  LogFilters,
  Pagination,
  LogQueryResult,
  LogStats,
  ConversationLog,
  UserOption,
} from '../../types/log.types';
import './ConversationLogsPanel.css';

// Import child components
import LogFiltersComponent from './LogFilters';
import LogDetailView from './LogDetailView';
import LogExport from './LogExport';

const ConversationLogsPanel: React.FC = () => {
  // State
  const [logs, setLogs] = useState<ConversationLog[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [filters, setFilters] = useState<LogFilters>({});
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    sort_by: 'timestamp',
    sort_order: 'DESC',
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<ConversationLog | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Filter options
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [toolOptions, setToolOptions] = useState<string[]>([]);

  // Load initial data
  useEffect(() => {
    loadFilterOptions();
    loadStats();
  }, []);

  // Load logs when filters or pagination change
  useEffect(() => {
    loadLogs();
  }, [filters, pagination]);

  // Load filter options
  const loadFilterOptions = async () => {
    try {
      const [users, tools] = await Promise.all([
        adminLogsService.getFilterUsers(),
        adminLogsService.getFilterTools(),
      ]);
      setUserOptions(users);
      setToolOptions(tools);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  // Load stats
  const loadStats = async () => {
    try {
      const statsData = await adminLogsService.getStats(filters);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  // Load logs
  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const result: LogQueryResult = await adminLogsService.getLogs(filters, pagination);
      setLogs(result.logs);
      setTotal(result.total);
      setTotalPages(result.total_pages);
    } catch (err: any) {
      setError(err.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (newFilters: LogFilters) => {
    setFilters(newFilters);
    setPagination({ ...pagination, page: 1 }); // Reset to first page
    loadStats(); // Reload stats with new filters
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPagination({ ...pagination, page: newPage });
  };

  // Handle sort change
  const handleSortChange = (sortBy: 'timestamp' | 'execution_time_ms') => {
    const newSortOrder = pagination.sort_by === sortBy && pagination.sort_order === 'DESC' ? 'ASC' : 'DESC';
    setPagination({ ...pagination, sort_by: sortBy, sort_order: newSortOrder });
  };

  // Handle row click
  const handleRowClick = async (log: ConversationLog) => {
    try {
      // Fetch full details if needed
      const detailLog = await adminLogsService.getLogDetail(log.id);
      setSelectedLog(detailLog);
    } catch (err) {
      console.error('Failed to load log detail:', err);
      setSelectedLog(log); // Show what we have
    }
  };

  // Handle export
  const handleExport = () => {
    setShowExportDialog(true);
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({});
    setPagination({ ...pagination, page: 1 });
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Truncate text
  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Render feedback icon
  const renderFeedbackIcon = (status: 'positive' | 'negative' | 'none' | null) => {
    if (status === 'positive') return <span className="feedback-icon positive">👍</span>;
    if (status === 'negative') return <span className="feedback-icon negative">👎</span>;
    return <span className="feedback-icon none">⚪</span>;
  };

  return (
    <div className="conversation-logs-panel">
      <div className="logs-header">
        <h2>Conversation Logs</h2>
        <div className="header-actions">
          <button onClick={() => setShowFilters(!showFilters)} className="btn btn-secondary">
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
          <button onClick={loadLogs} className="btn btn-secondary" disabled={loading}>
            Refresh
          </button>
          <button onClick={handleExport} className="btn btn-primary">
            Export
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="stats-summary">
          <div className="stat-card">
            <div className="stat-label">Total Queries</div>
            <div className="stat-value">{stats.total_queries.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Response Time</div>
            <div className="stat-value">{formatDuration(stats.avg_response_time_ms)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Feedback Ratio</div>
            <div className="stat-value">
              {stats.feedback_stats.positive_percentage}%
              <span className="stat-detail">
                ({stats.feedback_stats.positive}/{stats.feedback_stats.positive + stats.feedback_stats.negative})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <LogFiltersComponent
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          userOptions={userOptions}
          toolOptions={toolOptions}
        />
      )}

      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}

      {/* Logs Table */}
      <div className="logs-table-container">
        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : (
          <>
            <table className="logs-table">
              <thead>
                <tr>
                  <th onClick={() => handleSortChange('timestamp')} className="sortable">
                    Timestamp {pagination.sort_by === 'timestamp' && (pagination.sort_order === 'DESC' ? '↓' : '↑')}
                  </th>
                  <th>User</th>
                  <th>Query</th>
                  <th>Model</th>
                  <th>Tools</th>
                  <th onClick={() => handleSortChange('execution_time_ms')} className="sortable">
                    Time {pagination.sort_by === 'execution_time_ms' && (pagination.sort_order === 'DESC' ? '↓' : '↑')}
                  </th>
                  <th>Feedback</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="no-data">
                      No logs found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} onClick={() => handleRowClick(log)} className="log-row">
                      <td>{formatDate(log.timestamp)}</td>
                      <td>{log.log_data.username}</td>
                      <td className="query-cell">{truncateText(log.log_data.query.original_text)}</td>
                      <td>{log.log_data.response.model_used}</td>
                      <td className="center">{log.log_data.execution.tool_calls.length}</td>
                      <td>{formatDuration(log.log_data.execution_time_ms)}</td>
                      <td className="center">{renderFeedbackIcon(log.log_data.feedback.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="btn btn-small"
                >
                  Previous
                </button>
                <span className="page-info">
                  Page {pagination.page} of {totalPages} ({total.toLocaleString()} total)
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === totalPages}
                  className="btn btn-small"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <LogDetailView log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <LogExport
          filters={filters}
          currentPage={pagination.page}
          currentLimit={pagination.limit}
          totalRecords={total}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </div>
  );
};

export default ConversationLogsPanel;

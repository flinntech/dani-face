/**
 * LogExport Component
 * Export dialog for conversation logs
 */

import React, { useState } from 'react';
import { adminLogsService } from '../../services/adminLogsService';
import { LogFilters, ExportRequest } from '../../types/log.types';
import './LogExport.css';

interface LogExportProps {
  filters: LogFilters;
  currentPage: number;
  currentLimit: number;
  totalRecords: number;
  onClose: () => void;
}

const LogExport: React.FC<LogExportProps> = ({ filters, currentPage, currentLimit, totalRecords, onClose }) => {
  const [format, setFormat] = useState<'json' | 'csv' | 'jsonl'>('json');
  const [scope, setScope] = useState<'current_page' | 'all_filtered'>('current_page');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      // Prepare export request
      const exportRequest: ExportRequest = {
        filters: {
          ...filters,
          ...(scope === 'current_page' && { page: currentPage, limit: currentLimit }),
        },
        format,
        scope,
      };

      // Call export API
      const blob = await adminLogsService.exportLogs(exportRequest);

      // Generate filename and download
      const filename = adminLogsService.generateExportFilename(format, filters);
      adminLogsService.downloadExportedFile(blob, filename);

      // Close dialog on success
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const getRecordCount = () => {
    if (scope === 'current_page') {
      return Math.min(currentLimit, totalRecords);
    }
    return totalRecords;
  };

  const exceedsLimit = totalRecords > 10000 && scope === 'all_filtered';

  return (
    <div className="export-modal-overlay" onClick={onClose}>
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export Conversation Logs</h2>
          <button onClick={onClose} className="close-button">
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Format Selection */}
          <div className="form-group">
            <label>Export Format</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  value="json"
                  checked={format === 'json'}
                  onChange={(e) => setFormat(e.target.value as any)}
                />
                <span>JSON</span>
                <span className="format-desc">Complete structured data with metadata</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={(e) => setFormat(e.target.value as any)}
                />
                <span>CSV</span>
                <span className="format-desc">Flattened view for spreadsheet analysis</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="jsonl"
                  checked={format === 'jsonl'}
                  onChange={(e) => setFormat(e.target.value as any)}
                />
                <span>JSONL</span>
                <span className="format-desc">JSON Lines format (one record per line)</span>
              </label>
            </div>
          </div>

          {/* Scope Selection */}
          <div className="form-group">
            <label>Export Scope</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  value="current_page"
                  checked={scope === 'current_page'}
                  onChange={(e) => setScope(e.target.value as any)}
                />
                <span>Current Page Only</span>
                <span className="format-desc">Export up to {currentLimit} records from current page</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="all_filtered"
                  checked={scope === 'all_filtered'}
                  onChange={(e) => setScope(e.target.value as any)}
                  disabled={exceedsLimit}
                />
                <span>All Filtered Results</span>
                <span className="format-desc">
                  {exceedsLimit
                    ? `Too many records (${totalRecords.toLocaleString()}). Max 10,000.`
                    : `Export all ${totalRecords.toLocaleString()} matching records (max 10,000)`}
                </span>
              </label>
            </div>
          </div>

          {/* Export Info */}
          <div className="export-info">
            <div>
              <strong>Records to export:</strong> {getRecordCount().toLocaleString()}
            </div>
            {Object.keys(filters).length > 0 && (
              <div>
                <strong>Active filters:</strong> {Object.keys(filters).length}
              </div>
            )}
          </div>

          {/* Warning for large exports */}
          {scope === 'all_filtered' && totalRecords > 1000 && (
            <div className="warning-box">
              <strong>⚠️ Large Export:</strong> Exporting {totalRecords.toLocaleString()} records may take some time.
            </div>
          )}

          {/* Error Message */}
          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary" disabled={exporting}>
            Cancel
          </button>
          <button onClick={handleExport} className="btn btn-primary" disabled={exporting || exceedsLimit}>
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogExport;

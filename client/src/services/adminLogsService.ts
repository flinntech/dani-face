/**
 * Admin Logs API Service
 * Handles conversation logs API calls for admin panel
 */

import axios from 'axios';
import { authService } from './authService';
import {
  LogFilters,
  Pagination,
  LogQueryResult,
  LogStats,
  ConversationLog,
  UserOption,
  ExportRequest,
} from '../types/log.types';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

/**
 * Get auth headers for admin requests
 */
const getAuthHeaders = () => {
  const token = authService.getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  return {
    Authorization: `Bearer ${token}`,
  };
};

class AdminLogsService {
  /**
   * Get conversation logs with filtering and pagination
   */
  async getLogs(filters: LogFilters, pagination: Pagination): Promise<LogQueryResult> {
    const params = {
      ...filters,
      ...pagination,
    };

    const response = await axios.get<LogQueryResult>(`${API_BASE}/admin/conversation-logs`, {
      headers: getAuthHeaders(),
      params,
    });

    return response.data;
  }

  /**
   * Get detailed log by ID
   */
  async getLogDetail(logId: string): Promise<ConversationLog> {
    const response = await axios.get<{ log: ConversationLog }>(
      `${API_BASE}/admin/conversation-logs/${logId}`,
      {
        headers: getAuthHeaders(),
      }
    );

    return response.data.log;
  }

  /**
   * Get log statistics
   */
  async getStats(filters?: Partial<LogFilters>): Promise<LogStats> {
    const response = await axios.get<{ stats: LogStats }>(`${API_BASE}/admin/conversation-logs-stats`, {
      headers: getAuthHeaders(),
      params: filters,
    });

    return response.data.stats;
  }

  /**
   * Get distinct users who have logs (for filter dropdown)
   */
  async getFilterUsers(): Promise<UserOption[]> {
    const response = await axios.get<{ users: UserOption[] }>(
      `${API_BASE}/admin/conversation-logs/filters/users`,
      {
        headers: getAuthHeaders(),
      }
    );

    return response.data.users;
  }

  /**
   * Get distinct tools used (for filter dropdown)
   */
  async getFilterTools(): Promise<string[]> {
    const response = await axios.get<{ tools: string[] }>(
      `${API_BASE}/admin/conversation-logs/filters/tools`,
      {
        headers: getAuthHeaders(),
      }
    );

    return response.data.tools;
  }

  /**
   * Export logs in specified format
   */
  async exportLogs(exportRequest: ExportRequest): Promise<Blob> {
    const response = await axios.post(`${API_BASE}/admin/conversation-logs/export`, exportRequest, {
      headers: getAuthHeaders(),
      responseType: 'blob',
    });

    return response.data;
  }

  /**
   * Helper to download exported file
   */
  downloadExportedFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Generate filename for export
   */
  generateExportFilename(format: 'json' | 'csv' | 'jsonl', filters: LogFilters): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const dateRange =
      filters.date_from && filters.date_to
        ? `_${filters.date_from.split('T')[0]}_to_${filters.date_to.split('T')[0]}`
        : '';

    return `dani_logs${dateRange}_${timestamp}.${format}`;
  }
}

// Export singleton instance
export const adminLogsService = new AdminLogsService();

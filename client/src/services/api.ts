import axios, { AxiosError } from 'axios';
import { ChatRequest, ChatResponse, ErrorResponse } from '../types/message.types';
import {
  LogStreamResponse,
  LogStatsResponse,
  LogSearchResponse,
  LogExportResponse,
  LogType,
  LogLevel
} from '../types/logs.types';
import { authService } from './authService';

// API base URL - uses window.location for dynamic URL
const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:${window.location.port}/api`;

/**
 * Get auth headers for API requests
 */
const getAuthHeaders = () => {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Send a chat message to the DANI agent
 */
export const sendChatMessage = async (
  message: string,
  conversationId: string
): Promise<ChatResponse> => {
  try {
    const request: ChatRequest = {
      message,
      conversationId,
    };

    const response = await axios.post<ChatResponse>(
      `${API_BASE_URL}/chat`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        timeout: 130000, // 130 seconds (slightly more than server timeout)
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;

      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.message || 'An error occurred');
      }

      if (axiosError.code === 'ECONNABORTED') {
        throw new Error('Request timeout. The agent is taking too long to respond.');
      }

      if (axiosError.code === 'ERR_NETWORK') {
        throw new Error('Network error. Please check your connection and try again.');
      }
    }

    throw new Error('An unexpected error occurred. Please try again.');
  }
};

/**
 * Check server health
 */
export const checkHealth = async (): Promise<{ status: string; agentConnected: boolean }> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, {
      timeout: 5000,
    });
    return response.data;
  } catch (error) {
    throw new Error('Unable to connect to server');
  }
};

/**
 * Logs API - Get log stream
 */
export const getLogStream = async (
  type: LogType = 'combined',
  lines: number = 100,
  level: LogLevel | 'all' = 'all'
): Promise<LogStreamResponse> => {
  try {
    const response = await axios.get<LogStreamResponse>(
      `${API_BASE_URL}/logs/stream`,
      {
        params: { type, lines, level },
        headers: getAuthHeaders(),
        timeout: 10000,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      throw new Error(axiosError.response?.data?.message || 'Failed to fetch logs');
    }
    throw new Error('Failed to fetch logs');
  }
};

/**
 * Logs API - Get log statistics
 */
export const getLogStats = async (): Promise<LogStatsResponse> => {
  try {
    const response = await axios.get<LogStatsResponse>(
      `${API_BASE_URL}/logs/stats`,
      {
        headers: getAuthHeaders(),
        timeout: 15000,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      throw new Error(axiosError.response?.data?.message || 'Failed to fetch log statistics');
    }
    throw new Error('Failed to fetch log statistics');
  }
};

/**
 * Logs API - Search logs
 */
export const searchLogs = async (
  query: string,
  lines: number = 50
): Promise<LogSearchResponse> => {
  try {
    const response = await axios.get<LogSearchResponse>(
      `${API_BASE_URL}/logs/search`,
      {
        params: { query, lines },
        headers: getAuthHeaders(),
        timeout: 15000,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      throw new Error(axiosError.response?.data?.message || 'Failed to search logs');
    }
    throw new Error('Failed to search logs');
  }
};

/**
 * Logs API - Export logs
 */
export const exportLogs = async (type: LogType = 'combined'): Promise<LogExportResponse> => {
  try {
    const response = await axios.get<LogExportResponse>(
      `${API_BASE_URL}/logs/export`,
      {
        params: { type },
        headers: getAuthHeaders(),
        timeout: 30000,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      throw new Error(axiosError.response?.data?.message || 'Failed to export logs');
    }
    throw new Error('Failed to export logs');
  }
};

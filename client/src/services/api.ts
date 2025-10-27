import axios, { AxiosError } from 'axios';
import { ChatRequest, ChatResponse, ErrorResponse } from '../types/message.types';
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

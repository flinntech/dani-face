import axios, { AxiosError } from 'axios';
import {
  ChatRequest,
  ChatResponse,
  ErrorResponse,
  BackendConversation,
  BackendConversationWithMessages,
  ConversationsListResponse,
  BackendMessage,
} from '../types/message.types';
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
 * Fetch all conversations for the authenticated user
 */
export const fetchConversations = async (
  limit: number = 50,
  offset: number = 0,
  includeArchived: boolean = false
): Promise<ConversationsListResponse> => {
  try {
    const response = await axios.get<ConversationsListResponse>(
      `${API_BASE_URL}/conversations`,
      {
        params: { limit, offset, includeArchived: includeArchived.toString() },
        headers: getAuthHeaders(),
        timeout: 10000,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      if (axiosError.response?.status === 401) {
        throw new Error('Unauthorized. Please log in again.');
      }
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.message || 'Failed to fetch conversations');
      }
    }
    throw new Error('Failed to fetch conversations');
  }
};

/**
 * Fetch a single conversation with all its messages
 */
export const fetchConversationWithMessages = async (
  conversationId: string
): Promise<BackendConversationWithMessages> => {
  try {
    const response = await axios.get<BackendConversationWithMessages>(
      `${API_BASE_URL}/conversations/${conversationId}`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      if (axiosError.response?.status === 401) {
        throw new Error('Unauthorized. Please log in again.');
      }
      if (axiosError.response?.status === 404) {
        throw new Error('Conversation not found');
      }
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.message || 'Failed to fetch conversation');
      }
    }
    throw new Error('Failed to fetch conversation');
  }
};

/**
 * Fetch messages for a specific conversation
 */
export const fetchConversationMessages = async (
  conversationId: string,
  limit?: number,
  offset?: number
): Promise<BackendMessage[]> => {
  try {
    const response = await axios.get<{ messages: BackendMessage[] }>(
      `${API_BASE_URL}/conversations/${conversationId}/messages`,
      {
        params: { limit, offset },
        headers: getAuthHeaders(),
        timeout: 10000,
      }
    );
    return response.data.messages;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      if (axiosError.response?.status === 401) {
        throw new Error('Unauthorized. Please log in again.');
      }
      if (axiosError.response?.status === 404) {
        throw new Error('Conversation not found');
      }
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.message || 'Failed to fetch messages');
      }
    }
    throw new Error('Failed to fetch messages');
  }
};

/**
 * Create a new conversation
 */
export const createConversation = async (title?: string): Promise<BackendConversation> => {
  try {
    const response = await axios.post<BackendConversation>(
      `${API_BASE_URL}/conversations`,
      { title },
      {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        timeout: 10000,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      if (axiosError.response?.status === 401) {
        throw new Error('Unauthorized. Please log in again.');
      }
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.message || 'Failed to create conversation');
      }
    }
    throw new Error('Failed to create conversation');
  }
};

/**
 * Update a conversation (title or archive status)
 */
export const updateConversation = async (
  conversationId: string,
  updates: { title?: string; is_archived?: boolean }
): Promise<BackendConversation> => {
  try {
    const response = await axios.patch<BackendConversation>(
      `${API_BASE_URL}/conversations/${conversationId}`,
      updates,
      {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        timeout: 10000,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      if (axiosError.response?.status === 401) {
        throw new Error('Unauthorized. Please log in again.');
      }
      if (axiosError.response?.status === 404) {
        throw new Error('Conversation not found');
      }
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.message || 'Failed to update conversation');
      }
    }
    throw new Error('Failed to update conversation');
  }
};

/**
 * Delete a conversation
 */
export const deleteConversation = async (conversationId: string): Promise<void> => {
  try {
    await axios.delete(
      `${API_BASE_URL}/conversations/${conversationId}`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      }
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      if (axiosError.response?.status === 401) {
        throw new Error('Unauthorized. Please log in again.');
      }
      if (axiosError.response?.status === 404) {
        throw new Error('Conversation not found');
      }
      if (axiosError.response?.data) {
        throw new Error(axiosError.response.data.message || 'Failed to delete conversation');
      }
    }
    throw new Error('Failed to delete conversation');
  }
};

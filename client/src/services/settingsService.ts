/**
 * Settings Service
 * Handles API calls for user settings and API key management
 */

import axios from 'axios';
import {
  ApiKeyRequest,
  ApiKeyResponse,
  UserServicesResponse,
  SuccessResponse,
  ServiceName,
} from '../types/settings.types';

// Use dynamic URL based on window.location (same as api.ts)
const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:${window.location.port}/api`;

/**
 * Get authentication token from local storage
 */
const getAuthToken = (): string | null => {
  return localStorage.getItem('dani_auth_token');
};

/**
 * Create axios instance with auth headers
 */
const createAxiosInstance = () => {
  const token = getAuthToken();
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
};

/**
 * Get all configured API keys/services for the current user
 */
export const getUserServices = async (): Promise<UserServicesResponse> => {
  const api = createAxiosInstance();
  const response = await api.get<UserServicesResponse>('/settings/api-keys');
  return response.data;
};

/**
 * Check if a specific service API key is configured
 */
export const getServiceApiKey = async (service: ServiceName): Promise<ApiKeyResponse> => {
  const api = createAxiosInstance();
  const response = await api.get<ApiKeyResponse>(`/settings/api-keys/${service}`);
  return response.data;
};

/**
 * Save or update DRM API credentials
 */
export const saveDrmApiKey = async (apiKeyId: string, apiKeySecret: string): Promise<SuccessResponse> => {
  const api = createAxiosInstance();
  const payload: ApiKeyRequest = { apiKeyId, apiKeySecret };
  const response = await api.post<SuccessResponse>('/settings/api-keys/drm', payload);
  return response.data;
};

/**
 * Delete DRM API credentials
 */
export const deleteDrmApiKey = async (): Promise<SuccessResponse> => {
  const api = createAxiosInstance();
  const response = await api.delete<SuccessResponse>('/settings/api-keys/drm');
  return response.data;
};

/**
 * Test DRM API credentials (optional - could be added later)
 */
export const testDrmApiKey = async (apiKeyId: string, apiKeySecret: string): Promise<boolean> => {
  // This could call a test endpoint to validate credentials
  // For now, just return true
  return true;
};

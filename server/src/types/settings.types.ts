/**
 * Type definitions for settings API
 */

export type ServiceName = 'drm';

export interface ApiKeyRequest {
  apiKeyId: string;
  apiKeySecret: string;
}

export interface ApiKeyResponse {
  serviceName: ServiceName;
  configured: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserServicesResponse {
  services: {
    [key in ServiceName]?: {
      configured: boolean;
      createdAt?: string;
      updatedAt?: string;
    };
  };
}

export interface SuccessResponse {
  success: boolean;
  message: string;
}

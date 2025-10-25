/**
 * Type definitions for DANI Agent API
 */

/**
 * Chat request payload sent to the agent
 */
export interface ChatRequest {
  message: string;
  conversationId: string;
}

/**
 * Token usage information from the AI model
 */
export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
}

/**
 * Chat response from the agent
 */
export interface ChatResponse {
  response: string;
  conversationId: string;
  model: string;
  usage: TokenUsage;
  iterations: number;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode?: number;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  agentConnected?: boolean;
}

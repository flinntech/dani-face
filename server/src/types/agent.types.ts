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
 * Detailed information about a tool call execution
 */
export interface ToolCallDetail {
  toolName: string;
  server?: string;
  input: Record<string, unknown>;
  output: string;
  timestamp: string;
  duration: number;
  isError: boolean;
  iteration: number;
}

/**
 * Reasoning step in the agentic loop
 */
export interface ReasoningStep {
  iteration: number;
  timestamp: string;
  toolsRequested: string[];
  thinking?: string;
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
  toolCallDetails?: ToolCallDetail[];
  reasoningSteps?: ReasoningStep[];
  logId?: string | null; // ID of the conversation log for feedback tracking
  userMessageId?: string | null; // ID of the saved user message in database
  assistantMessageId?: string | null; // ID of the saved assistant message in database
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

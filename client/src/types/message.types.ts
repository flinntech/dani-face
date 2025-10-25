/**
 * Type definitions for chat messages and UI state
 */

/**
 * Message status enum
 */
export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  RECEIVED = 'received',
  ERROR = 'error',
}

/**
 * Message role enum
 */
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

/**
 * Token usage information
 */
export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
}

/**
 * Chat message structure
 */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  status: MessageStatus;
  usage?: TokenUsage;
  model?: string;
  iterations?: number;
}

/**
 * API request/response types (matching server types)
 */
export interface ChatRequest {
  message: string;
  conversationId: string;
}

export interface ChatResponse {
  response: string;
  conversationId: string;
  model: string;
  usage: TokenUsage;
  iterations: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode?: number;
}

/**
 * Conversation state
 */
export interface ConversationState {
  conversationId: string;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

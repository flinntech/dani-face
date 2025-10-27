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
  toolCallDetails?: ToolCallDetail[];
  reasoningSteps?: ReasoningStep[];
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
  toolCallDetails?: ToolCallDetail[];
  reasoningSteps?: ReasoningStep[];
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

/**
 * Stored conversation metadata
 */
export interface StoredConversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
}

/**
 * Conversation history (all stored conversations)
 */
export interface ConversationHistory {
  conversations: StoredConversation[];
  currentConversationId: string | null;
}

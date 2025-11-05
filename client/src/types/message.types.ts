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
 * Feedback information for a message
 */
export interface MessageFeedback {
  status: 'positive' | 'negative';
  comment?: string;
  timestamp?: string;
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
  logId?: string | null; // ID of the conversation log for feedback tracking
  feedback?: MessageFeedback; // User feedback for this message
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
  logId?: string | null; // ID of the conversation log for feedback tracking
  userMessageId?: string | null; // ID of the saved user message in database
  assistantMessageId?: string | null; // ID of the saved assistant message in database
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode?: number;
}

/**
 * Backend conversation structure (from database)
 */
export interface BackendConversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  deleted_at: string | null;
}

/**
 * Backend message structure (from database)
 */
export interface BackendMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
  metadata: any;
}

/**
 * Backend conversation with messages (from database)
 */
export interface BackendConversationWithMessages extends BackendConversation {
  messages: BackendMessage[];
}

/**
 * Response from /api/conversations endpoint
 */
export interface ConversationsListResponse {
  conversations: BackendConversation[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
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

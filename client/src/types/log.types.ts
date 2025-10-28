/**
 * Frontend TypeScript type definitions for conversation logs
 * These mirror the backend types but are optimized for frontend use
 */

/**
 * Tool call execution details
 */
export interface ToolCallData {
  tool_name: string;
  server: string;
  input: Record<string, any>;
  output: any;
  timestamp: string;
  execution_time_ms: number;
  iteration: number;
  is_error: boolean;
  error_message?: string;
}

/**
 * Reasoning/thinking step
 */
export interface ReasoningStepData {
  iteration: number;
  timestamp: string;
  tools_requested: string[];
  thinking_content?: string;
  step_order: number;
}

/**
 * Token usage statistics
 */
export interface UsageData {
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens?: number;
  cache_read_tokens?: number;
}

/**
 * Query analyzer output
 */
export interface QueryAnalyzerOutput {
  selected_model: string;
  complexity_level: 'SIMPLE' | 'PROCEDURAL' | 'ANALYTICAL';
  reasoning?: string;
}

/**
 * User query information
 */
export interface QueryData {
  original_text: string;
  analyzer_output: QueryAnalyzerOutput;
}

/**
 * Execution flow details
 */
export interface ExecutionData {
  tool_calls: ToolCallData[];
  reasoning_steps: ReasoningStepData[];
  iterations: number;
}

/**
 * Response information
 */
export interface ResponseData {
  final_text: string;
  model_used: string;
  usage: UsageData;
}

/**
 * Feedback information
 */
export interface FeedbackData {
  status: null | 'positive' | 'negative';
  comment?: string;
  timestamp?: string;
}

/**
 * Error information
 */
export interface ErrorData {
  occurred: boolean;
  message?: string;
  stack?: string;
}

/**
 * Complete conversation log data
 */
export interface ConversationLogData {
  username: string;
  start_time: string;
  end_time: string;
  execution_time_ms: number;
  query: QueryData;
  execution: ExecutionData;
  response: ResponseData;
  feedback: FeedbackData;
  error?: ErrorData;
  metadata?: Record<string, any>;
}

/**
 * Conversation log (database row)
 */
export interface ConversationLog {
  id: string;
  conversation_id: string | null;
  message_id: string | null;
  user_id: string;
  timestamp: string; // ISO format
  log_data: ConversationLogData;
  created_at: string;
  updated_at: string;
}

/**
 * Filters for querying logs
 */
export interface LogFilters {
  date_from?: string;
  date_to?: string;
  user_id?: string;
  model?: string;
  feedback_status?: 'positive' | 'negative' | 'none';
  query_text?: string;
  tool_used?: string;
  min_execution_time?: number;
  complexity_level?: 'SIMPLE' | 'PROCEDURAL' | 'ANALYTICAL';
}

/**
 * Pagination parameters
 */
export interface Pagination {
  page: number;
  limit: number;
  sort_by?: 'timestamp' | 'execution_time_ms';
  sort_order?: 'ASC' | 'DESC';
}

/**
 * Log query result
 */
export interface LogQueryResult {
  logs: ConversationLog[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * Log statistics
 */
export interface LogStats {
  total_queries: number;
  avg_response_time_ms: number;
  feedback_stats: {
    positive: number;
    negative: number;
    none: number;
    positive_percentage: number;
  };
  queries_by_model: Record<string, number>;
  queries_by_complexity: Record<string, number>;
  queries_by_date: Array<{ date: string; count: number }>;
  most_used_tools: Array<{ tool_name: string; count: number }>;
}

/**
 * User option for filters
 */
export interface UserOption {
  user_id: string;
  email: string;
  name: string;
}

/**
 * Export request
 */
export interface ExportRequest {
  filters: LogFilters;
  format: 'json' | 'csv' | 'jsonl';
  scope: 'current_page' | 'all_filtered';
}

/**
 * Table row for display
 */
export interface LogTableRow {
  id: string;
  timestamp: Date;
  username: string;
  query: string; // Truncated
  model: string;
  toolCount: number;
  executionTimeMs: number;
  feedbackStatus: 'positive' | 'negative' | 'none';
}

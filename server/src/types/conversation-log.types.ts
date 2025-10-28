/**
 * TypeScript type definitions for conversation logging system
 * These types match the JSONB structure stored in the database
 */

/**
 * Tool call execution details
 */
export interface ToolCallData {
  tool_name: string;
  server: string;
  input: Record<string, any>;
  output: any;
  timestamp: string; // ISO 8601 format
  execution_time_ms: number;
  iteration: number;
  is_error: boolean;
  error_message?: string;
}

/**
 * Reasoning/thinking step during execution
 */
export interface ReasoningStepData {
  iteration: number;
  timestamp: string; // ISO 8601 format
  tools_requested: string[];
  thinking_content?: string; // Extended thinking mode content
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
 * Feedback information (for future thumbs up/down feature)
 */
export interface FeedbackData {
  status: null | 'positive' | 'negative';
  comment?: string;
  timestamp?: string; // ISO 8601 format
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
 * Complete conversation log data structure (stored in JSONB)
 */
export interface ConversationLogData {
  username: string;
  start_time: string; // ISO 8601 format
  end_time: string; // ISO 8601 format
  execution_time_ms: number;
  query: QueryData;
  execution: ExecutionData;
  response: ResponseData;
  feedback: FeedbackData;
  error?: ErrorData;
  metadata?: Record<string, any>; // Flexible field for future extensions
}

/**
 * Database row for conversation_logs table
 */
export interface ConversationLogRow {
  id: string; // UUID
  conversation_id: string | null; // UUID
  message_id: string | null; // UUID
  user_id: string; // UUID
  timestamp: Date;
  log_data: ConversationLogData;
  created_at: Date;
  updated_at: Date;
}

/**
 * Filters for querying logs
 */
export interface LogFilters {
  date_from?: string; // ISO 8601 date
  date_to?: string; // ISO 8601 date
  user_id?: string; // UUID
  model?: string;
  feedback_status?: 'positive' | 'negative' | 'none';
  query_text?: string; // Full-text search
  tool_used?: string; // Filter by specific tool name
  min_execution_time?: number; // Milliseconds
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
 * Log query result with pagination
 */
export interface LogQueryResult {
  logs: ConversationLogRow[];
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
 * Admin log access data
 */
export interface AdminLogAccessData {
  filters_applied?: LogFilters;
  export_format?: 'json' | 'csv' | 'jsonl';
  export_scope?: 'current_page' | 'all_filtered';
  record_count?: number;
  metadata?: Record<string, any>;
}

/**
 * Database row for admin_log_access table
 */
export interface AdminLogAccessRow {
  id: string; // UUID
  admin_user_id: string; // UUID
  action: string;
  log_id: string | null; // UUID
  access_data: AdminLogAccessData | null;
  timestamp: Date;
}

/**
 * Export metadata included in exported files
 */
export interface ExportMetadata {
  export_timestamp: string; // ISO 8601 format
  filters_applied: LogFilters;
  record_count: number;
  date_range: {
    from: string | null;
    to: string | null;
  };
  exported_by: string; // Admin username
  export_format: 'json' | 'csv' | 'jsonl';
}

/**
 * Flattened log for CSV export
 */
export interface FlattenedLog {
  id: string;
  timestamp: string;
  user_id: string;
  username: string;
  query: string;
  model: string;
  complexity: string;
  execution_time_ms: number;
  tool_count: number;
  response_preview: string; // First 200 chars
  feedback: string;
  full_data_json: string; // Escaped JSON string
}

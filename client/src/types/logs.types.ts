/**
 * Type definitions for logs and log viewer
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogType = 'combined' | 'error' | 'activity';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  conversationId?: string;
  model?: string;
  complexity?: string;
  tool?: string;
  server?: string;
  duration?: number;
  usage?: any;
  error?: string;
  stack?: string;
  cacheHitRate?: number;
  [key: string]: any; // Allow additional fields
}

export interface LogStreamResponse {
  logs: LogEntry[];
  type: LogType;
  count: number;
  timestamp: string;
}

export interface LogStatsResponse {
  files: Array<{
    name: string;
    size: string;
  }>;
  errorCount: number;
  toolCalls: Array<{
    tool: string;
    count: number;
  }>;
  models: Array<{
    model: string;
    count: number;
  }>;
  conversationCount: number;
  timestamp: string;
}

export interface LogSearchResponse {
  query: string;
  results: LogEntry[];
  count: number;
  timestamp: string;
}

export interface LogExportResponse {
  exportedAt: string;
  logType: LogType;
  totalLogs: number;
  logs: LogEntry[];
}

export interface LogViewerFilters {
  logType: LogType;
  logLevel: LogLevel | 'all';
  searchQuery: string;
  lineCount: number;
  autoRefresh: boolean;
}

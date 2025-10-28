/**
 * LogExportService
 * Handles exporting conversation logs in various formats (JSON, CSV, JSONL)
 */

import {
  ConversationLogRow,
  ExportMetadata,
  LogFilters,
  FlattenedLog,
} from '../types/conversation-log.types';
import { StructuredLogger } from '../shared/structured-logger';

const logger = new StructuredLogger('log-export');

export class LogExportService {
  /**
   * Export logs to JSON format
   * Complete structured data with metadata
   */
  static exportToJSON(logs: ConversationLogRow[], metadata: ExportMetadata): string {
    const exportData = {
      metadata,
      logs: logs.map((log) => ({
        id: log.id,
        conversation_id: log.conversation_id,
        message_id: log.message_id,
        user_id: log.user_id,
        timestamp: log.timestamp.toISOString(),
        ...log.log_data,
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export logs to CSV format
   * Flattened view with important fields + full JSONB as escaped string
   */
  static exportToCSV(logs: ConversationLogRow[], metadata: ExportMetadata): string {
    const flattenedLogs = logs.map((log) => this.flattenLog(log));

    // CSV header
    const headers = [
      'id',
      'timestamp',
      'user_id',
      'username',
      'query',
      'model',
      'complexity',
      'execution_time_ms',
      'tool_count',
      'response_preview',
      'feedback',
      'full_data_json',
    ];

    // Build CSV rows
    const rows = flattenedLogs.map((log) =>
      headers.map((header) => this.escapeCSVField(log[header as keyof FlattenedLog] || '')).join(',')
    );

    // Add metadata as comment rows
    const metadataRows = [
      `# Export Timestamp: ${metadata.export_timestamp}`,
      `# Exported By: ${metadata.exported_by}`,
      `# Record Count: ${metadata.record_count}`,
      `# Export Format: ${metadata.export_format}`,
      `# Date Range: ${metadata.date_range.from || 'N/A'} to ${metadata.date_range.to || 'N/A'}`,
      '',
    ];

    return [...metadataRows, headers.join(','), ...rows].join('\n');
  }

  /**
   * Export logs to JSONL format (JSON Lines)
   * One JSON object per line - ideal for streaming and ML/AI processing
   */
  static exportToJSONL(logs: ConversationLogRow[], metadata: ExportMetadata): string {
    // First line: metadata
    const lines = [JSON.stringify({ _metadata: metadata })];

    // Each log as a separate line
    logs.forEach((log) => {
      const exportLog = {
        id: log.id,
        conversation_id: log.conversation_id,
        message_id: log.message_id,
        user_id: log.user_id,
        timestamp: log.timestamp.toISOString(),
        ...log.log_data,
      };
      lines.push(JSON.stringify(exportLog));
    });

    return lines.join('\n');
  }

  /**
   * Generate filename for export
   */
  static generateFilename(format: 'json' | 'csv' | 'jsonl', filters: LogFilters): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const dateRange =
      filters.date_from && filters.date_to
        ? `_${filters.date_from.split('T')[0]}_to_${filters.date_to.split('T')[0]}`
        : '';

    return `dani_logs${dateRange}_${timestamp}.${format}`;
  }

  /**
   * Get MIME type for export format
   */
  static getMimeType(format: 'json' | 'csv' | 'jsonl'): string {
    const mimeTypes = {
      json: 'application/json',
      csv: 'text/csv',
      jsonl: 'application/x-ndjson',
    };
    return mimeTypes[format];
  }

  /**
   * Flatten log for CSV export
   */
  private static flattenLog(log: ConversationLogRow): FlattenedLog {
    const data = log.log_data;

    return {
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      user_id: log.user_id,
      username: data.username,
      query: data.query.original_text,
      model: data.response.model_used,
      complexity: data.query.analyzer_output.complexity_level,
      execution_time_ms: data.execution_time_ms,
      tool_count: data.execution.tool_calls.length,
      response_preview: data.response.final_text.substring(0, 200).replace(/\n/g, ' '),
      feedback: data.feedback.status || 'none',
      full_data_json: JSON.stringify(data),
    };
  }

  /**
   * Escape CSV field (handle quotes, commas, newlines)
   */
  private static escapeCSVField(field: string | number): string {
    const str = String(field);

    // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * Create export metadata object
   */
  static createExportMetadata(
    filters: LogFilters,
    recordCount: number,
    exportedBy: string,
    format: 'json' | 'csv' | 'jsonl'
  ): ExportMetadata {
    return {
      export_timestamp: new Date().toISOString(),
      filters_applied: filters,
      record_count: recordCount,
      date_range: {
        from: filters.date_from || null,
        to: filters.date_to || null,
      },
      exported_by: exportedBy,
      export_format: format,
    };
  }

  /**
   * Validate export request
   */
  static validateExportRequest(
    format: string,
    scope: string,
    recordCount: number
  ): { valid: boolean; error?: string } {
    // Validate format
    const validFormats = ['json', 'csv', 'jsonl'];
    if (!validFormats.includes(format)) {
      return { valid: false, error: 'Invalid export format. Must be json, csv, or jsonl.' };
    }

    // Validate scope
    const validScopes = ['current_page', 'all_filtered'];
    if (!validScopes.includes(scope)) {
      return { valid: false, error: 'Invalid export scope. Must be current_page or all_filtered.' };
    }

    // Validate record count (max 10,000 records)
    if (scope === 'all_filtered' && recordCount > 10000) {
      return {
        valid: false,
        error: `Export exceeds maximum record limit (10,000). Requested: ${recordCount}. Please narrow your filters or date range.`,
      };
    }

    return { valid: true };
  }

  /**
   * Log export action
   */
  static logExportAction(
    adminUserId: string,
    filters: LogFilters,
    format: string,
    recordCount: number
  ): void {
    logger.info('Admin log export', {
      admin_user_id: adminUserId,
      export_format: format,
      record_count: recordCount,
      filters,
    });
  }
}

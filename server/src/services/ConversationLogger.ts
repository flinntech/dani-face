/**
 * ConversationLogger Service
 * Handles logging of conversation execution flow to database
 */

import { Database } from './Database';
import { StructuredLogger } from '../shared/structured-logger';
import {
  ConversationLogData,
  ConversationLogRow,
  LogFilters,
  Pagination,
  LogQueryResult,
  LogStats,
} from '../types/conversation-log.types';
import { LogQueryBuilder } from '../utils/log-query-builder';
import * as fs from 'fs/promises';
import * as path from 'path';

const logger = new StructuredLogger('conversation-logger');

export class ConversationLogger {
  private db: Database;
  private fallbackLogDir: string;

  constructor(db: Database, fallbackLogDir: string = '/tmp/dani-logs') {
    this.db = db;
    this.fallbackLogDir = fallbackLogDir;
  }

  /**
   * Log a complete conversation execution
   */
  async logConversation(
    conversationId: string | null,
    messageId: string | null,
    userId: string,
    logData: ConversationLogData
  ): Promise<string | null> {
    try {
      const result = await this.db.queryOne<{ id: string }>(
        `INSERT INTO conversation_logs (conversation_id, message_id, user_id, log_data)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [conversationId, messageId, userId, JSON.stringify(logData)]
      );

      logger.info('Conversation logged successfully', {
        log_id: result?.id,
        user_id: userId,
        conversation_id: conversationId,
        execution_time_ms: logData.execution_time_ms,
      });

      return result?.id || null;
    } catch (error) {
      logger.error('Failed to log conversation to database', { error: error instanceof Error ? error : new Error(String(error)), user_id: userId });

      // Fallback: Write to file
      await this.fallbackLog(logData, userId);
      return null;
    }
  }

  /**
   * Update feedback for a conversation log
   */
  async updateFeedback(
    logId: string,
    feedbackStatus: 'positive' | 'negative',
    comment?: string
  ): Promise<void> {
    try {
      const feedbackData = {
        status: feedbackStatus,
        comment: comment || undefined,
        timestamp: new Date().toISOString(),
      };

      await this.db.query(
        `UPDATE conversation_logs
         SET log_data = jsonb_set(
           log_data,
           '{feedback}',
           $1::jsonb
         ),
         updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [JSON.stringify(feedbackData), logId]
      );

      logger.info('Feedback updated successfully', { log_id: logId, feedback_status: feedbackStatus });
    } catch (error) {
      logger.error('Failed to update feedback', { error: error instanceof Error ? error : new Error(String(error)), log_id: logId });
      throw error;
    }
  }

  /**
   * Query logs with filters and pagination
   */
  async queryLogs(filters: LogFilters, pagination: Pagination): Promise<LogQueryResult> {
    try {
      // Build queries
      const logQuery = LogQueryBuilder.buildLogQuery(filters, pagination);
      const countQuery = LogQueryBuilder.buildCountQuery(filters);

      // Execute queries
      const [logs, countResult] = await Promise.all([
        this.db.queryMany<ConversationLogRow>(logQuery.sql, logQuery.params),
        this.db.queryOne<{ total: string }>(countQuery.sql, countQuery.params),
      ]);

      const total = parseInt(countResult?.total || '0', 10);
      const totalPages = Math.ceil(total / pagination.limit);

      return {
        logs,
        total,
        page: pagination.page,
        limit: pagination.limit,
        total_pages: totalPages,
      };
    } catch (error) {
      logger.error('Failed to query conversation logs', { error: error instanceof Error ? error : new Error(String(error)), filters });
      throw error;
    }
  }

  /**
   * Get detailed log by ID
   */
  async getLogDetail(logId: string): Promise<ConversationLogRow | null> {
    try {
      const log = await this.db.queryOne<ConversationLogRow>(
        `SELECT
          id,
          conversation_id,
          message_id,
          user_id,
          timestamp,
          log_data,
          created_at,
          updated_at
         FROM conversation_logs
         WHERE id = $1`,
        [logId]
      );

      return log;
    } catch (error) {
      logger.error('Failed to get log detail', { error: error instanceof Error ? error : new Error(String(error)), log_id: logId });
      throw error;
    }
  }

  /**
   * Get log statistics
   */
  async getLogStats(filters?: Partial<LogFilters>): Promise<LogStats> {
    try {
      const queries = LogQueryBuilder.buildStatsQueries(filters);

      // Execute all stat queries in parallel
      const [totalResult, avgTimeResult, feedbackResults, modelResults, complexityResults, toolsResults] =
        await Promise.all([
          this.db.queryOne<{ total: string }>(queries.totalQuery.sql, queries.totalQuery.params),
          this.db.queryOne<{ avg_time: string }>(queries.avgTimeQuery.sql, queries.avgTimeQuery.params),
          this.db.queryMany<{ status: string | null; count: string }>(
            queries.feedbackQuery.sql,
            queries.feedbackQuery.params
          ),
          this.db.queryMany<{ model: string; count: string }>(queries.modelQuery.sql, queries.modelQuery.params),
          this.db.queryMany<{ complexity: string; count: string }>(
            queries.complexityQuery.sql,
            queries.complexityQuery.params
          ),
          this.db.queryMany<{ tool_name: string; count: string }>(queries.toolsQuery.sql, queries.toolsQuery.params),
        ]);

      // Process feedback stats
      const feedbackStats = {
        positive: 0,
        negative: 0,
        none: 0,
        positive_percentage: 0,
      };

      feedbackResults.forEach((result) => {
        const count = parseInt(result.count, 10);
        if (result.status === 'positive') {
          feedbackStats.positive = count;
        } else if (result.status === 'negative') {
          feedbackStats.negative = count;
        } else {
          feedbackStats.none = count;
        }
      });

      const totalFeedback = feedbackStats.positive + feedbackStats.negative;
      if (totalFeedback > 0) {
        feedbackStats.positive_percentage = Math.round((feedbackStats.positive / totalFeedback) * 100);
      }

      // Process model stats
      const queries_by_model: Record<string, number> = {};
      modelResults.forEach((result) => {
        queries_by_model[result.model] = parseInt(result.count, 10);
      });

      // Process complexity stats
      const queries_by_complexity: Record<string, number> = {};
      complexityResults.forEach((result) => {
        queries_by_complexity[result.complexity] = parseInt(result.count, 10);
      });

      // Process tool stats
      const most_used_tools = toolsResults.map((result) => ({
        tool_name: result.tool_name,
        count: parseInt(result.count, 10),
      }));

      return {
        total_queries: parseInt(totalResult?.total || '0', 10),
        avg_response_time_ms: Math.round(parseFloat(avgTimeResult?.avg_time || '0')),
        feedback_stats: feedbackStats,
        queries_by_model,
        queries_by_complexity,
        queries_by_date: [], // TODO: Implement date-based aggregation if needed
        most_used_tools,
      };
    } catch (error) {
      logger.error('Failed to get log statistics', { error: error instanceof Error ? error : new Error(String(error)), filters });
      throw error;
    }
  }

  /**
   * Get distinct users who have logs
   */
  async getDistinctUsers(): Promise<Array<{ user_id: string; email: string; name: string }>> {
    try {
      const sql = LogQueryBuilder.buildDistinctUsersQuery();
      const users = await this.db.queryMany<{ user_id: string; email: string; name: string }>(sql);
      return users;
    } catch (error) {
      logger.error('Failed to get distinct users', { error: error instanceof Error ? error : new Error(String(error)) });
      throw error;
    }
  }

  /**
   * Get distinct tools used across all logs
   */
  async getDistinctTools(): Promise<string[]> {
    try {
      const sql = LogQueryBuilder.buildDistinctToolsQuery();
      const results = await this.db.queryMany<{ tool_name: string }>(sql);
      return results.map((r) => r.tool_name);
    } catch (error) {
      logger.error('Failed to get distinct tools', { error: error instanceof Error ? error : new Error(String(error)) });
      throw error;
    }
  }

  /**
   * Log admin access to conversation logs
   */
  async logAdminAccess(
    adminUserId: string,
    action: string,
    logId?: string,
    accessData?: Record<string, any>
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO admin_log_access (admin_user_id, action, log_id, access_data)
         VALUES ($1, $2, $3, $4)`,
        [adminUserId, action, logId || null, accessData ? JSON.stringify(accessData) : null]
      );
    } catch (error) {
      logger.error('Failed to log admin access', { error: error instanceof Error ? error : new Error(String(error)), admin_user_id: adminUserId });
      // Don't throw - admin access logging failure shouldn't break the main operation
    }
  }

  /**
   * Fallback logging to file when database is unavailable
   */
  private async fallbackLog(logData: ConversationLogData, userId: string): Promise<void> {
    try {
      // Ensure fallback directory exists
      await fs.mkdir(this.fallbackLogDir, { recursive: true });

      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `conversation-log-${userId}-${timestamp}.json`;
      const filepath = path.join(this.fallbackLogDir, filename);

      // Write log to file
      await fs.writeFile(filepath, JSON.stringify(logData, null, 2), 'utf-8');

      logger.warn('Conversation logged to fallback file', {
        filepath,
        user_id: userId,
      });
    } catch (error) {
      logger.error('Failed to write fallback log file', { error: error instanceof Error ? error : new Error(String(error)), user_id: userId });
    }
  }
}

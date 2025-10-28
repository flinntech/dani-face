/**
 * LogQueryBuilder
 * Utility for building complex JSONB queries for conversation logs
 */

import { LogFilters, Pagination } from '../types/conversation-log.types';

export interface WhereClauseResult {
  sql: string;
  params: any[];
}

export class LogQueryBuilder {
  /**
   * Build WHERE clause from filters
   */
  static buildWhereClause(filters: LogFilters): WhereClauseResult {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Date range filter
    if (filters.date_from) {
      conditions.push(`timestamp >= $${paramIndex}`);
      params.push(filters.date_from);
      paramIndex++;
    }

    if (filters.date_to) {
      conditions.push(`timestamp <= $${paramIndex}`);
      params.push(filters.date_to);
      paramIndex++;
    }

    // User ID filter
    if (filters.user_id) {
      conditions.push(`user_id = $${paramIndex}`);
      params.push(filters.user_id);
      paramIndex++;
    }

    // Model filter
    if (filters.model) {
      conditions.push(`log_data->'response'->>'model_used' = $${paramIndex}`);
      params.push(filters.model);
      paramIndex++;
    }

    // Complexity level filter
    if (filters.complexity_level) {
      conditions.push(`log_data->'query'->'analyzer_output'->>'complexity_level' = $${paramIndex}`);
      params.push(filters.complexity_level);
      paramIndex++;
    }

    // Feedback status filter
    if (filters.feedback_status) {
      if (filters.feedback_status === 'none') {
        // Check for null or missing feedback status
        conditions.push(`(log_data->'feedback'->>'status' IS NULL OR log_data->'feedback'->>'status' = 'null')`);
      } else {
        conditions.push(`log_data->'feedback'->>'status' = $${paramIndex}`);
        params.push(filters.feedback_status);
        paramIndex++;
      }
    }

    // Query text search (full-text search)
    if (filters.query_text) {
      conditions.push(`to_tsvector('english', log_data->'query'->>'original_text') @@ plainto_tsquery('english', $${paramIndex})`);
      params.push(filters.query_text);
      paramIndex++;
    }

    // Tool used filter (check if tool_calls array contains tool with matching name)
    if (filters.tool_used) {
      conditions.push(`EXISTS (
        SELECT 1 FROM jsonb_array_elements(log_data->'execution'->'tool_calls') AS tool
        WHERE tool->>'tool_name' = $${paramIndex}
      )`);
      params.push(filters.tool_used);
      paramIndex++;
    }

    // Minimum execution time filter
    if (filters.min_execution_time !== undefined && filters.min_execution_time > 0) {
      conditions.push(`(log_data->>'execution_time_ms')::integer >= $${paramIndex}`);
      params.push(filters.min_execution_time);
      paramIndex++;
    }

    // Combine all conditions
    const sql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return { sql, params };
  }

  /**
   * Build ORDER BY clause
   */
  static buildOrderByClause(sortBy: string = 'timestamp', sortOrder: string = 'DESC'): string {
    const validSortFields = ['timestamp', 'execution_time_ms'];
    const validSortOrders = ['ASC', 'DESC'];

    // Validate sort field
    if (!validSortFields.includes(sortBy)) {
      sortBy = 'timestamp';
    }

    // Validate sort order
    if (!validSortOrders.includes(sortOrder.toUpperCase())) {
      sortOrder = 'DESC';
    }

    // Handle JSONB field
    if (sortBy === 'execution_time_ms') {
      return `ORDER BY (log_data->>'execution_time_ms')::integer ${sortOrder}`;
    }

    return `ORDER BY ${sortBy} ${sortOrder}`;
  }

  /**
   * Build LIMIT and OFFSET clause for pagination
   */
  static buildPaginationClause(page: number, limit: number, paramStartIndex: number): { sql: string; params: any[] } {
    // Validate and constrain pagination values
    const validatedPage = Math.max(1, Math.floor(page));
    const validatedLimit = Math.min(Math.max(1, Math.floor(limit)), 1000); // Max 1000 records per page
    const offset = (validatedPage - 1) * validatedLimit;

    const sql = `LIMIT $${paramStartIndex} OFFSET $${paramStartIndex + 1}`;
    const params = [validatedLimit, offset];

    return { sql, params };
  }

  /**
   * Build complete query for fetching logs
   */
  static buildLogQuery(filters: LogFilters, pagination: Pagination): { sql: string; params: any[] } {
    const whereClause = this.buildWhereClause(filters);
    const orderByClause = this.buildOrderByClause(pagination.sort_by, pagination.sort_order);
    const paginationClause = this.buildPaginationClause(
      pagination.page,
      pagination.limit,
      whereClause.params.length + 1
    );

    const sql = `
      SELECT
        id,
        conversation_id,
        message_id,
        user_id,
        timestamp,
        log_data,
        created_at,
        updated_at
      FROM conversation_logs
      ${whereClause.sql}
      ${orderByClause}
      ${paginationClause.sql}
    `;

    const params = [...whereClause.params, ...paginationClause.params];

    return { sql, params };
  }

  /**
   * Build count query for pagination
   */
  static buildCountQuery(filters: LogFilters): { sql: string; params: any[] } {
    const whereClause = this.buildWhereClause(filters);

    const sql = `
      SELECT COUNT(*) as total
      FROM conversation_logs
      ${whereClause.sql}
    `;

    return { sql, params: whereClause.params };
  }

  /**
   * Build query for statistics
   */
  static buildStatsQueries(filters?: Partial<LogFilters>): {
    totalQuery: { sql: string; params: any[] };
    avgTimeQuery: { sql: string; params: any[] };
    feedbackQuery: { sql: string; params: any[] };
    modelQuery: { sql: string; params: any[] };
    complexityQuery: { sql: string; params: any[] };
    toolsQuery: { sql: string; params: any[] };
  } {
    const whereClause = filters ? this.buildWhereClause(filters as LogFilters) : { sql: '', params: [] };

    return {
      // Total queries count
      totalQuery: {
        sql: `SELECT COUNT(*) as total FROM conversation_logs ${whereClause.sql}`,
        params: whereClause.params,
      },

      // Average response time
      avgTimeQuery: {
        sql: `
          SELECT AVG((log_data->>'execution_time_ms')::integer) as avg_time
          FROM conversation_logs
          ${whereClause.sql}
        `,
        params: whereClause.params,
      },

      // Feedback statistics
      feedbackQuery: {
        sql: `
          SELECT
            log_data->'feedback'->>'status' as status,
            COUNT(*) as count
          FROM conversation_logs
          ${whereClause.sql}
          GROUP BY log_data->'feedback'->>'status'
        `,
        params: whereClause.params,
      },

      // Queries by model
      modelQuery: {
        sql: `
          SELECT
            log_data->'response'->>'model_used' as model,
            COUNT(*) as count
          FROM conversation_logs
          ${whereClause.sql}
          GROUP BY log_data->'response'->>'model_used'
          ORDER BY count DESC
        `,
        params: whereClause.params,
      },

      // Queries by complexity level
      complexityQuery: {
        sql: `
          SELECT
            log_data->'query'->'analyzer_output'->>'complexity_level' as complexity,
            COUNT(*) as count
          FROM conversation_logs
          ${whereClause.sql}
          GROUP BY log_data->'query'->'analyzer_output'->>'complexity_level'
        `,
        params: whereClause.params,
      },

      // Most used tools
      toolsQuery: {
        sql: `
          SELECT
            tool->>'tool_name' as tool_name,
            COUNT(*) as count
          FROM conversation_logs,
          jsonb_array_elements(log_data->'execution'->'tool_calls') as tool
          ${whereClause.sql}
          GROUP BY tool->>'tool_name'
          ORDER BY count DESC
          LIMIT 10
        `,
        params: whereClause.params,
      },
    };
  }

  /**
   * Build query to get distinct users with logs
   */
  static buildDistinctUsersQuery(): string {
    return `
      SELECT DISTINCT
        cl.user_id,
        u.email,
        u.name
      FROM conversation_logs cl
      JOIN users u ON cl.user_id = u.id
      ORDER BY u.name
    `;
  }

  /**
   * Build query to get distinct tools used
   */
  static buildDistinctToolsQuery(): string {
    return `
      SELECT DISTINCT tool->>'tool_name' as tool_name
      FROM conversation_logs,
      jsonb_array_elements(log_data->'execution'->'tool_calls') as tool
      ORDER BY tool_name
    `;
  }
}

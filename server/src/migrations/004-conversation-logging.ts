/**
 * Migration 004: Conversation Logging System
 * Adds comprehensive logging for conversation execution flow using JSONB
 */

import { Migration } from '../services/MigrationService';
import { Database } from '../services/Database';

export const migration004: Migration = {
  id: 4,
  name: 'conversation-logging',

  up: async (db: Database): Promise<void> => {
    console.log('  → Creating conversation_logs table...');

    // Create main conversation logs table with JSONB structure
    await db.query(`
      CREATE TABLE IF NOT EXISTS conversation_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        message_id UUID,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        log_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('  → Creating admin_log_access table...');

    // Create admin log access audit table
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_log_access (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        log_id UUID REFERENCES conversation_logs(id) ON DELETE SET NULL,
        access_data JSONB,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('  → Creating indexes for conversation_logs...');

    // Basic indexes on non-JSONB columns
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_logs_user_id
        ON conversation_logs(user_id);

      CREATE INDEX IF NOT EXISTS idx_conversation_logs_conversation_id
        ON conversation_logs(conversation_id);

      CREATE INDEX IF NOT EXISTS idx_conversation_logs_timestamp
        ON conversation_logs(timestamp DESC);
    `);

    console.log('  → Creating GIN indexes for JSONB queries...');

    // GIN index for general JSONB queries
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_logs_data_gin
        ON conversation_logs USING GIN (log_data);
    `);

    console.log('  → Creating expression indexes for common JSONB paths...');

    // Specific JSONB path indexes for common queries
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_logs_model
        ON conversation_logs ((log_data->'response'->>'model_used'));

      CREATE INDEX IF NOT EXISTS idx_logs_feedback
        ON conversation_logs ((log_data->'feedback'->>'status'));

      CREATE INDEX IF NOT EXISTS idx_logs_complexity
        ON conversation_logs ((log_data->'query'->'analyzer_output'->>'complexity_level'));

      CREATE INDEX IF NOT EXISTS idx_logs_execution_time
        ON conversation_logs (((log_data->>'execution_time_ms')::integer));
    `);

    console.log('  → Creating full-text search index for query text...');

    // Full-text search on query text
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_logs_query_text
        ON conversation_logs USING GIN (
          to_tsvector('english', log_data->'query'->>'original_text')
        );
    `);

    console.log('  → Creating indexes for admin_log_access...');

    // Indexes for admin log access
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_log_access_admin_user_id
        ON admin_log_access(admin_user_id);

      CREATE INDEX IF NOT EXISTS idx_admin_log_access_action
        ON admin_log_access(action);

      CREATE INDEX IF NOT EXISTS idx_admin_log_access_timestamp
        ON admin_log_access(timestamp DESC);
    `);

    console.log('  → Creating trigger for updated_at timestamp...');

    // Create function to update updated_at timestamp
    await db.query(`
      CREATE OR REPLACE FUNCTION update_conversation_logs_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger to automatically update updated_at
    await db.query(`
      CREATE TRIGGER conversation_logs_updated_at_trigger
      BEFORE UPDATE ON conversation_logs
      FOR EACH ROW
      EXECUTE FUNCTION update_conversation_logs_updated_at();
    `);

    console.log('  ✅ Conversation logging system migration completed');
  },

  down: async (db: Database): Promise<void> => {
    console.log('  → Rolling back conversation logging system...');

    // Drop trigger and function
    await db.query('DROP TRIGGER IF EXISTS conversation_logs_updated_at_trigger ON conversation_logs;');
    await db.query('DROP FUNCTION IF EXISTS update_conversation_logs_updated_at();');

    // Drop indexes for admin_log_access
    await db.query(`
      DROP INDEX IF EXISTS idx_admin_log_access_timestamp;
      DROP INDEX IF EXISTS idx_admin_log_access_action;
      DROP INDEX IF EXISTS idx_admin_log_access_admin_user_id;
    `);

    // Drop JSONB indexes
    await db.query(`
      DROP INDEX IF EXISTS idx_logs_query_text;
      DROP INDEX IF EXISTS idx_logs_execution_time;
      DROP INDEX IF EXISTS idx_logs_complexity;
      DROP INDEX IF EXISTS idx_logs_feedback;
      DROP INDEX IF EXISTS idx_logs_model;
      DROP INDEX IF EXISTS idx_conversation_logs_data_gin;
    `);

    // Drop basic indexes
    await db.query(`
      DROP INDEX IF EXISTS idx_conversation_logs_timestamp;
      DROP INDEX IF EXISTS idx_conversation_logs_conversation_id;
      DROP INDEX IF EXISTS idx_conversation_logs_user_id;
    `);

    // Drop tables
    await db.query('DROP TABLE IF EXISTS admin_log_access;');
    await db.query('DROP TABLE IF EXISTS conversation_logs;');

    console.log('  ✅ Conversation logging system rollback completed');
  },
};

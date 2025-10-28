import { Migration } from '../services/MigrationService';

export const migration005: Migration = {
  id: 5,
  name: 'add-soft-deletes',
  async up(db) {
    console.log('Running migration 005: Add soft delete support');

    // Add deleted_at column to conversations table
    await db.query(`
      ALTER TABLE conversations
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
    `);

    // Add deleted_at column to messages table
    await db.query(`
      ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
    `);

    // Create index for filtering non-deleted conversations
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_conversations_deleted
      ON conversations(user_id, deleted_at)
      WHERE deleted_at IS NULL;
    `);

    // Create index for filtering non-deleted messages
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_deleted
      ON messages(conversation_id, deleted_at)
      WHERE deleted_at IS NULL;
    `);

    console.log('✅ Migration 005 completed: Soft delete support added');
  },

  async down(db) {
    console.log('Rolling back migration 005: Remove soft delete support');

    // Drop indexes
    await db.query('DROP INDEX IF EXISTS idx_messages_deleted;');
    await db.query('DROP INDEX IF EXISTS idx_conversations_deleted;');

    // Remove deleted_at columns
    await db.query('ALTER TABLE messages DROP COLUMN IF EXISTS deleted_at;');
    await db.query('ALTER TABLE conversations DROP COLUMN IF EXISTS deleted_at;');

    console.log('✅ Migration 005 rolled back');
  },
};

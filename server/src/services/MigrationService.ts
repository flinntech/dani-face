/**
 * Database Migration Service
 * Manages database schema migrations for RDS-compatible deployments
 */

import { Database } from './Database';
import { QueryResult } from 'pg';

export interface Migration {
  id: number;
  name: string;
  up: (db: Database) => Promise<void>;
  down?: (db: Database) => Promise<void>;
}

export class MigrationService {
  private db: Database;
  private migrations: Migration[] = [];

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Register a migration
   */
  registerMigration(migration: Migration): void {
    this.migrations.push(migration);
    // Keep migrations sorted by ID
    this.migrations.sort((a, b) => a.id - b.id);
  }

  /**
   * Initialize the schema_migrations table
   */
  private async initializeMigrationsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at
      ON schema_migrations(applied_at);
    `;

    await this.db.query(query);
    console.log('✅ Schema migrations table initialized');
  }

  /**
   * Get list of applied migrations
   */
  private async getAppliedMigrations(): Promise<number[]> {
    const result = await this.db.query<{ id: number }>(
      'SELECT id FROM schema_migrations ORDER BY id'
    );
    return result.rows.map(row => row.id);
  }

  /**
   * Mark a migration as applied
   */
  private async markMigrationApplied(migration: Migration): Promise<void> {
    await this.db.query(
      'INSERT INTO schema_migrations (id, name) VALUES ($1, $2)',
      [migration.id, migration.name]
    );
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    try {
      console.log('🔄 Starting database migrations...');

      // Initialize migrations table
      await this.initializeMigrationsTable();

      // Get applied migrations
      const appliedMigrations = await this.getAppliedMigrations();
      console.log(`📊 Applied migrations: [${appliedMigrations.join(', ')}]`);

      // Find pending migrations
      const pendingMigrations = this.migrations.filter(
        m => !appliedMigrations.includes(m.id)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations');
        return;
      }

      console.log(`📋 Found ${pendingMigrations.length} pending migration(s)`);

      // Run each pending migration
      for (const migration of pendingMigrations) {
        console.log(`🔄 Running migration ${migration.id}: ${migration.name}...`);

        try {
          // Run migration in a transaction
          await this.db.beginTransaction();
          await migration.up(this.db);
          await this.markMigrationApplied(migration);
          await this.db.commit();

          console.log(`✅ Migration ${migration.id} completed successfully`);
        } catch (error) {
          console.error(`❌ Migration ${migration.id} failed:`, error);
          await this.db.rollback();
          throw new Error(`Migration ${migration.id} (${migration.name}) failed: ${error}`);
        }
      }

      console.log('✅ All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration process failed:', error);
      throw error;
    }
  }

  /**
   * Rollback the last migration (use with caution)
   */
  async rollbackLastMigration(): Promise<void> {
    try {
      const appliedMigrations = await this.getAppliedMigrations();

      if (appliedMigrations.length === 0) {
        console.log('No migrations to rollback');
        return;
      }

      const lastMigrationId = appliedMigrations[appliedMigrations.length - 1];
      const migration = this.migrations.find(m => m.id === lastMigrationId);

      if (!migration) {
        throw new Error(`Migration ${lastMigrationId} not found in registered migrations`);
      }

      if (!migration.down) {
        throw new Error(`Migration ${lastMigrationId} does not have a down() method`);
      }

      console.log(`🔄 Rolling back migration ${migration.id}: ${migration.name}...`);

      await this.db.beginTransaction();
      await migration.down(this.db);
      await this.db.query('DELETE FROM schema_migrations WHERE id = $1', [migration.id]);
      await this.db.commit();

      console.log(`✅ Migration ${migration.id} rolled back successfully`);
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      await this.db.rollback();
      throw error;
    }
  }
}

// Export singleton instance
export const createMigrationService = (db: Database): MigrationService => {
  return new MigrationService(db);
};

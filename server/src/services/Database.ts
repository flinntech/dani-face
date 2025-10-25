/**
 * PostgreSQL Database Connection Pool
 * Manages database connections and provides query interface
 */

import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';

class Database {
  private pool: Pool | null = null;
  private static instance: Database;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Initialize database connection pool
   */
  public async connect(): Promise<void> {
    if (this.pool) {
      console.log('Database pool already exists');
      return;
    }

    const config: PoolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'dani',
      user: process.env.DB_USER || 'dani_user',
      password: process.env.DB_PASSWORD,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection not available
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

    this.pool = new Pool(config);

    // Test the connection
    try {
      const client = await this.pool.connect();
      console.log('✅ PostgreSQL connected successfully');
      console.log(`   Database: ${config.database}`);
      console.log(`   Host: ${config.host}:${config.port}`);
      client.release();
    } catch (error) {
      console.error('❌ PostgreSQL connection error:', error);
      throw error;
    }

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle database client:', err);
    });
  }

  /**
   * Execute a query
   */
  public async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database not initialized. Call connect() first.');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      console.log(`Query executed in ${duration}ms: ${text.substring(0, 100)}...`);
      return result;
    } catch (error) {
      console.error('Query error:', error);
      console.error('Query:', text);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Execute a query and return the first row or null
   */
  public async queryOne<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Execute a query and return all rows
   */
  public async queryMany<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<T[]> {
    const result = await this.query<T>(text, params);
    return result.rows;
  }

  /**
   * Begin a transaction
   */
  public async beginTransaction(): Promise<void> {
    await this.query('BEGIN');
  }

  /**
   * Commit a transaction
   */
  public async commit(): Promise<void> {
    await this.query('COMMIT');
  }

  /**
   * Rollback a transaction
   */
  public async rollback(): Promise<void> {
    await this.query('ROLLBACK');
  }

  /**
   * Close all database connections
   */
  public async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('Database disconnected');
    }
  }

  /**
   * Get the connection pool (for advanced usage)
   */
  public getPool(): Pool | null {
    return this.pool;
  }
}

// Export singleton instance
export const db = Database.getInstance();

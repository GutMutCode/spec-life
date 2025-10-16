/**
 * PostgreSQL Database Adapter
 *
 * Manages PostgreSQL connection pool and provides query interface.
 * Created: 2025-10-16
 * Task: T087
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

/**
 * PostgreSQL connection pool singleton
 */
class PostgresAdapter {
  private pool: pg.Pool | null = null;
  private static instance: PostgresAdapter;

  private constructor() {}

  static getInstance(): PostgresAdapter {
    if (!PostgresAdapter.instance) {
      PostgresAdapter.instance = new PostgresAdapter();
    }
    return PostgresAdapter.instance;
  }

  /**
   * Initialize connection pool
   */
  connect(): void {
    if (this.pool) {
      return; // Already connected
    }

    const connectionString =
      process.env.DATABASE_URL || 'postgresql://localhost:5432/task_priority_db';

    this.pool = new Pool({
      connectionString,
      max: 20, // Maximum connections in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Log connection errors
    this.pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });

    console.log('PostgreSQL connection pool initialized');
  }

  /**
   * Execute a query
   */
  async query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call connect() first.');
    }

    try {
      const start = Date.now();
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;

      // Log slow queries (>100ms)
      if (duration > 100) {
        console.warn(`Slow query (${duration}ms):`, text);
      }

      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call connect() first.');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('PostgreSQL connection pool closed');
    }
  }

  /**
   * Health check - verify database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const db = PostgresAdapter.getInstance();

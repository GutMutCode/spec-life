/**
 * @file PostgresAdapter.ts
 * @description Database adapter layer for PostgreSQL connection and query management
 *
 * ARCHITECTURE ROLE:
 * This adapter sits at the bottom of the backend stack:
 * Routes → Services → PostgresAdapter → PostgreSQL Database
 *
 * DESIGN PATTERN:
 * - Singleton pattern: Only one connection pool instance per application
 * - Connection pooling: Reuses connections for performance
 * - Transaction support: ACID-compliant database operations
 *
 * KEY FEATURES:
 * - Connection pool management (max 20 connections)
 * - Parameterized queries (SQL injection safe)
 * - Transaction support with automatic rollback on error
 * - Slow query logging (>100ms queries logged)
 * - Health check endpoint for monitoring
 * - Graceful shutdown support
 *
 * USAGE PATTERN:
 * ```typescript
 * import { db } from './storage/PostgresAdapter';
 *
 * // Initialize on app startup
 * db.connect();
 *
 * // Simple query
 * const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
 *
 * // Transaction
 * await db.transaction(async (client) => {
 *   await client.query('UPDATE tasks SET rank = rank + 1 WHERE rank >= $1', [2]);
 *   await client.query('INSERT INTO tasks (...) VALUES ($1, $2, ...)', [id, title]);
 * });
 *
 * // Shutdown
 * await db.close();
 * ```
 *
 * CONFIGURATION:
 * Reads DATABASE_URL from environment variables (.env file).
 * Format: postgresql://username:password@host:port/database
 * Default: postgresql://localhost:5432/task_priority_db
 *
 * CONNECTION POOL SETTINGS:
 * - max: 20 connections (handles concurrent requests)
 * - idleTimeoutMillis: 30000ms (closes idle connections after 30s)
 * - connectionTimeoutMillis: 2000ms (fails fast if can't connect)
 *
 * ERROR HANDLING:
 * - Connection errors logged to console
 * - Query errors thrown with full stack trace
 * - Transaction errors trigger automatic ROLLBACK
 * - Pool errors logged but pool remains available
 *
 * PERFORMANCE:
 * - Slow query logging: Queries >100ms logged as warnings
 * - Connection reuse: Pool avoids overhead of creating new connections
 * - Prepared statements: pg library automatically uses prepared statements
 *
 * SECURITY:
 * - Parameterized queries: All queries use $1, $2, etc. placeholders
 * - Never use string concatenation for SQL queries
 * - Row-level security enforced by application (user_id filtering)
 *
 * TODO: Future enhancements
 * - [ ] Add connection pool metrics (active/idle connections)
 * - [ ] Add query caching for frequently accessed data
 * - [ ] Add read replica support for horizontal scaling
 * - [ ] Add connection retry logic with exponential backoff
 * - [ ] Add distributed tracing (OpenTelemetry integration)
 *
 * @see /backend/src/services/TaskService.ts for usage examples
 * @see https://node-postgres.com/features/pooling for pg.Pool documentation
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

/**
 * PostgreSQL Database Adapter (Singleton)
 *
 * Manages connection pool and provides query interface for the entire application.
 * Only one instance exists per Node.js process.
 *
 * SINGLETON PATTERN:
 * - Private constructor: Cannot instantiate with `new PostgresAdapter()`
 * - Static instance: Shared across all imports
 * - getInstance(): Returns the single instance
 *
 * THREAD SAFETY:
 * Node.js is single-threaded, but connection pool handles concurrent queries
 * by maintaining multiple PostgreSQL connections (max 20).
 *
 * LIFECYCLE:
 * 1. Application starts
 * 2. db.connect() initializes pool
 * 3. Queries use pool connections
 * 4. Application shutdown: db.close() drains pool
 */
class PostgresAdapter {
  /**
   * PostgreSQL connection pool instance
   * Null until connect() is called.
   */
  private pool: pg.Pool | null = null;

  /**
   * Singleton instance
   * Shared across all imports of this module.
   */
  private static instance: PostgresAdapter;

  /**
   * Private constructor prevents direct instantiation
   * Use getInstance() to access the singleton.
   */
  private constructor() {}

  /**
   * Get the singleton instance
   *
   * USAGE:
   * ```typescript
   * const db = PostgresAdapter.getInstance();
   * db.connect();
   * ```
   *
   * @returns The singleton PostgresAdapter instance
   */
  static getInstance(): PostgresAdapter {
    if (!PostgresAdapter.instance) {
      PostgresAdapter.instance = new PostgresAdapter();
    }
    return PostgresAdapter.instance;
  }

  /**
   * Initialize PostgreSQL connection pool
   *
   * Creates a connection pool with configuration from environment variables.
   * Safe to call multiple times (idempotent) - subsequent calls are ignored.
   *
   * WHEN TO CALL:
   * Call this once during application startup, before handling any requests.
   *
   * EXAMPLE:
   * ```typescript
   * // In server.ts or index.ts
   * import { db } from './storage/PostgresAdapter';
   *
   * db.connect();  // Initialize pool
   *
   * app.listen(3000, () => {
   *   console.log('Server listening on port 3000');
   * });
   * ```
   *
   * CONNECTION STRING FORMAT:
   * postgresql://[user]:[password]@[host]:[port]/[database]
   *
   * EXAMPLE CONNECTION STRINGS:
   * - Development: postgresql://localhost:5432/task_priority_db
   * - Production: postgresql://admin:pass123@db.example.com:5432/prod_db
   * - Docker: postgresql://postgres:password@postgres:5432/task_priority_db
   *
   * CONFIGURATION:
   * - Source: DATABASE_URL environment variable (from .env file)
   * - Fallback: postgresql://localhost:5432/task_priority_db
   * - Max connections: 20 (handles ~20 concurrent API requests)
   * - Idle timeout: 30s (closes unused connections to save resources)
   * - Connection timeout: 2s (fails fast if database unreachable)
   *
   * POOL SIZING:
   * max=20 is suitable for:
   * - Small to medium applications (< 1000 req/min)
   * - Typical query latency: 10-50ms
   * - Calculation: 20 connections × 20 req/sec = 400 req/sec capacity
   *
   * For high-traffic apps, increase max connections:
   * - High traffic (> 5000 req/min): max=50
   * - Very high traffic (> 20000 req/min): Consider read replicas
   *
   * ERROR HANDLING:
   * - Pool errors (unexpected disconnects): Logged to console, pool remains usable
   * - Connection errors: Thrown when query() is called, not during connect()
   * - Network issues: Pool automatically retries connections
   *
   * IDEMPOTENCY:
   * Calling connect() multiple times is safe:
   * - First call: Creates pool
   * - Subsequent calls: Ignored (returns early)
   * - No duplicate pools created
   *
   * @throws {Error} Never throws directly, but pool.on('error') fires on connection issues
   */
  connect(): void {
    // Guard clause: Prevent duplicate pool creation
    if (this.pool) {
      return; // Already connected
    }

    // Read connection string from environment
    const connectionString =
      process.env.DATABASE_URL || 'postgresql://localhost:5432/task_priority_db';

    // Create connection pool
    this.pool = new Pool({
      connectionString,
      max: 20, // Maximum connections in pool
      idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
      connectionTimeoutMillis: 2000, // Fail fast if can't connect within 2 seconds
    });

    // Register error handler for unexpected pool errors
    // These are rare but can happen due to:
    // - Database server restart
    // - Network issues
    // - Idle connection timeouts exceeding PostgreSQL's limit
    this.pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });

    console.log('PostgreSQL connection pool initialized');
  }

  /**
   * Execute a parameterized SQL query
   *
   * Uses connection pooling for efficiency. Automatically measures query performance
   * and logs slow queries (>100ms).
   *
   * SECURITY - PARAMETERIZED QUERIES:
   * Always use parameterized queries with $1, $2, etc. placeholders to prevent SQL injection.
   *
   * ✅ SAFE (parameterized):
   * ```typescript
   * await db.query('SELECT * FROM users WHERE email = $1', [userEmail]);
   * await db.query('INSERT INTO tasks (title, rank) VALUES ($1, $2)', [title, rank]);
   * await db.query(
   *   'UPDATE tasks SET rank = rank + 1 WHERE user_id = $1 AND rank >= $2',
   *   [userId, targetRank]
   * );
   * ```
   *
   * ❌ UNSAFE (string concatenation - DO NOT USE):
   * ```typescript
   * // VULNERABLE TO SQL INJECTION!
   * await db.query(`SELECT * FROM users WHERE email = '${userEmail}'`);
   * await db.query(`DELETE FROM tasks WHERE id = '${taskId}'`);
   * ```
   *
   * QUERY EXAMPLES:
   *
   * SELECT query:
   * ```typescript
   * const result = await db.query(
   *   'SELECT * FROM tasks WHERE user_id = $1 AND completed = $2 ORDER BY rank ASC',
   *   [userId, false]
   * );
   * const tasks = result.rows; // Array of task objects
   * ```
   *
   * INSERT query with RETURNING:
   * ```typescript
   * const result = await db.query(
   *   `INSERT INTO tasks (id, user_id, title, rank, created_at, updated_at)
   *    VALUES ($1, $2, $3, $4, NOW(), NOW())
   *    RETURNING *`,
   *   [taskId, userId, title, rank]
   * );
   * const newTask = result.rows[0]; // Newly created task object
   * ```
   *
   * UPDATE query:
   * ```typescript
   * const result = await db.query(
   *   `UPDATE tasks
   *    SET title = $1, description = $2, updated_at = NOW()
   *    WHERE id = $3 AND user_id = $4
   *    RETURNING *`,
   *   [newTitle, newDescription, taskId, userId]
   * );
   * if (result.rowCount === 0) {
   *   throw new Error('Task not found or unauthorized');
   * }
   * const updatedTask = result.rows[0];
   * ```
   *
   * DELETE query:
   * ```typescript
   * const result = await db.query(
   *   'DELETE FROM tasks WHERE id = $1 AND user_id = $2',
   *   [taskId, userId]
   * );
   * if (result.rowCount === 0) {
   *   throw new Error('Task not found or unauthorized');
   * }
   * ```
   *
   * COUNT query:
   * ```typescript
   * const result = await db.query(
   *   'SELECT COUNT(*) as count FROM tasks WHERE user_id = $1',
   *   [userId]
   * );
   * const taskCount = parseInt(result.rows[0].count);
   * ```
   *
   * RESULT STRUCTURE:
   * ```typescript
   * {
   *   rows: T[],           // Array of result rows
   *   rowCount: number,    // Number of affected rows
   *   command: string,     // SQL command (SELECT, INSERT, UPDATE, DELETE)
   *   oid: number,         // Object ID (for INSERT queries)
   *   fields: FieldDef[]   // Column metadata
   * }
   * ```
   *
   * PERFORMANCE MONITORING:
   * - All queries are automatically timed
   * - Queries >100ms logged as warnings with SQL text
   * - Use these logs to identify optimization opportunities
   * - Consider adding indexes for frequently slow queries
   *
   * CONNECTION POOLING:
   * - Pool automatically manages connections
   * - Queries reuse idle connections (fast)
   * - If all connections busy, waits for available connection
   * - Timeout: 2000ms (throws error if no connection available)
   *
   * ERROR HANDLING:
   * - Database errors thrown with full stack trace
   * - Common errors:
   *   - 23505: Unique constraint violation (duplicate key)
   *   - 23503: Foreign key constraint violation
   *   - 42P01: Table does not exist
   *   - 42703: Column does not exist
   *
   * TRANSACTIONS:
   * For multi-query operations that must succeed or fail atomically,
   * use transaction() method instead of query().
   *
   * @template T - Type of row data (defaults to any)
   * @param text - SQL query with $1, $2, ... placeholders for parameters
   * @param params - Array of parameter values matching placeholders
   * @returns Promise resolving to query result with rows and metadata
   * @throws {Error} If pool not initialized (call connect() first)
   * @throws {Error} If query fails (syntax error, constraint violation, etc.)
   *
   * @see transaction() for multi-query atomic operations
   */
  async query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
    // Guard clause: Ensure pool is initialized
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call connect() first.');
    }

    try {
      // Measure query execution time
      const start = Date.now();
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;

      // Log slow queries for performance monitoring
      // Threshold: 100ms (typical queries should be <50ms)
      if (duration > 100) {
        console.warn(`Slow query (${duration}ms):`, text);
      }

      return result;
    } catch (error) {
      // Log query errors with full context
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Execute multiple queries in an ACID-compliant transaction
   *
   * Transactions ensure that all queries succeed or all fail together (atomicity).
   * Use transactions when multiple queries must be consistent with each other.
   *
   * ACID GUARANTEES:
   * - Atomicity: All queries succeed, or all are rolled back
   * - Consistency: Database constraints are enforced
   * - Isolation: Concurrent transactions don't interfere (default: READ COMMITTED)
   * - Durability: Committed changes survive crashes
   *
   * WHEN TO USE TRANSACTIONS:
   * ✅ Use transactions when:
   * - Multiple related INSERTs/UPDATEs must all succeed together
   * - Updating multiple rows that must stay consistent
   * - Reading and then writing based on that read (check-then-act)
   * - Moving data between tables (delete from A, insert into B)
   *
   * ❌ Don't use transactions when:
   * - Single query (transactions add overhead)
   * - Read-only queries (no data changes)
   * - Long-running operations (blocks other transactions)
   *
   * TRANSACTION LIFECYCLE:
   * 1. Acquire connection from pool
   * 2. Execute BEGIN (start transaction)
   * 3. Execute queries via callback
   * 4. If success: Execute COMMIT (save changes)
   * 5. If error: Execute ROLLBACK (discard changes)
   * 6. Release connection back to pool
   *
   * EXAMPLE - Rank Shifting (from TaskService):
   * ```typescript
   * await db.transaction(async (client) => {
   *   // Step 1: Shift existing tasks' ranks
   *   await client.query(
   *     `UPDATE tasks
   *      SET rank = rank + 1, updated_at = NOW()
   *      WHERE user_id = $1 AND rank >= $2 AND completed = FALSE`,
   *     [userId, targetRank]
   *   );
   *
   *   // Step 2: Insert new task at target rank
   *   const result = await client.query(
   *     `INSERT INTO tasks (id, user_id, title, rank, created_at, updated_at)
   *      VALUES ($1, $2, $3, $4, NOW(), NOW())
   *      RETURNING *`,
   *     [taskId, userId, title, targetRank]
   *   );
   *
   *   return result.rows[0];
   * });
   * ```
   *
   * If the INSERT fails (e.g., duplicate ID), the UPDATE is automatically rolled back.
   *
   * EXAMPLE - Transfer Task Between Users:
   * ```typescript
   * await db.transaction(async (client) => {
   *   // Remove from old user's task list
   *   await client.query(
   *     'DELETE FROM user_tasks WHERE user_id = $1 AND task_id = $2',
   *     [oldUserId, taskId]
   *   );
   *
   *   // Add to new user's task list
   *   await client.query(
   *     'INSERT INTO user_tasks (user_id, task_id) VALUES ($1, $2)',
   *     [newUserId, taskId]
   *   );
   *
   *   // Update task owner
   *   await client.query(
   *     'UPDATE tasks SET user_id = $1, updated_at = NOW() WHERE id = $2',
   *     [newUserId, taskId]
   *   );
   * });
   * ```
   *
   * EXAMPLE - Conditional Update (Check-Then-Act):
   * ```typescript
   * const result = await db.transaction(async (client) => {
   *   // Read current state
   *   const checkResult = await client.query(
   *     'SELECT rank FROM tasks WHERE id = $1 FOR UPDATE',
   *     [taskId]
   *   );
   *
   *   if (checkResult.rows[0].rank === 0) {
   *     throw new Error('Cannot modify highest priority task');
   *   }
   *
   *   // Update based on check
   *   const updateResult = await client.query(
   *     'UPDATE tasks SET rank = rank - 1 WHERE id = $1 RETURNING *',
   *     [taskId]
   *   );
   *
   *   return updateResult.rows[0];
   * });
   * ```
   *
   * Note: FOR UPDATE locks the row to prevent other transactions from modifying it.
   *
   * ERROR HANDLING:
   * If any query in the callback throws an error:
   * - ROLLBACK is executed automatically
   * - Connection is released back to pool
   * - Error is re-thrown to caller
   * - Database state is unchanged (atomicity)
   *
   * COMMON ERRORS:
   * - Deadlock (40P01): Two transactions waiting for each other's locks
   * - Serialization failure (40001): Concurrent transactions conflict
   * - Constraint violation (23xxx): Foreign key, unique, check constraint failed
   *
   * ISOLATION LEVEL:
   * Default: READ COMMITTED (sees committed changes from other transactions)
   * Change isolation level:
   * ```typescript
   * await db.transaction(async (client) => {
   *   await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
   *   // Your queries here
   * });
   * ```
   *
   * PERFORMANCE:
   * - Transactions hold locks on affected rows
   * - Long transactions block other transactions (use short transactions)
   * - Keep transaction callbacks fast (<100ms ideal)
   * - Don't do external API calls inside transactions
   *
   * CONNECTION MANAGEMENT:
   * - Acquires dedicated connection from pool (not shared)
   * - Connection released in finally block (always, even on error)
   * - If pool exhausted, waits for available connection (up to 2s timeout)
   *
   * @template T - Return type of the transaction callback
   * @param callback - Async function that receives a PoolClient and executes queries
   * @returns Promise resolving to the callback's return value
   * @throws {Error} If pool not initialized (call connect() first)
   * @throws {Error} If any query in callback fails (after ROLLBACK)
   *
   * @see query() for single query operations
   * @see TaskService.createTask() for rank shifting transaction example
   */
  async transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    // Guard clause: Ensure pool is initialized
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call connect() first.');
    }

    // Acquire dedicated connection from pool
    const client = await this.pool.connect();

    try {
      // Start transaction
      await client.query('BEGIN');

      // Execute callback queries
      const result = await callback(client);

      // Commit transaction (save changes)
      await client.query('COMMIT');

      return result;
    } catch (error) {
      // Rollback transaction (discard changes)
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Always release connection back to pool
      client.release();
    }
  }

  /**
   * Close connection pool and terminate all connections
   *
   * Performs graceful shutdown of the database connection pool.
   * Use this during application shutdown to clean up resources.
   *
   * WHEN TO CALL:
   * - Application shutdown (process.on('SIGTERM'))
   * - Test teardown (afterAll hooks)
   * - Hot-reload/restart scenarios
   *
   * SHUTDOWN BEHAVIOR:
   * 1. Waits for active queries to complete
   * 2. Closes all idle connections
   * 3. Terminates all connections after timeout
   * 4. Sets pool to null (prevents further queries)
   *
   * EXAMPLE - Graceful Shutdown:
   * ```typescript
   * import { db } from './storage/PostgresAdapter';
   *
   * // Handle SIGTERM (Docker stop, Kubernetes pod termination)
   * process.on('SIGTERM', async () => {
   *   console.log('SIGTERM received, closing database connection...');
   *   await db.close();
   *   process.exit(0);
   * });
   *
   * // Handle SIGINT (Ctrl+C in terminal)
   * process.on('SIGINT', async () => {
   *   console.log('SIGINT received, closing database connection...');
   *   await db.close();
   *   process.exit(0);
   * });
   * ```
   *
   * EXAMPLE - Test Teardown:
   * ```typescript
   * import { db } from './storage/PostgresAdapter';
   *
   * afterAll(async () => {
   *   await db.close();
   * });
   * ```
   *
   * IDEMPOTENCY:
   * Safe to call multiple times:
   * - First call: Closes pool
   * - Subsequent calls: No-op (pool already null)
   *
   * TIMEOUT:
   * If active connections don't finish within pool timeout (default 10s),
   * they are forcefully terminated.
   *
   * AFTER CLOSING:
   * Attempting to query after close() will throw:
   * "Database pool not initialized. Call connect() first."
   *
   * @returns Promise that resolves when all connections are closed
   */
  async close(): Promise<void> {
    if (this.pool) {
      // Wait for active queries to complete, then close all connections
      await this.pool.end();
      this.pool = null;
      console.log('PostgreSQL connection pool closed');
    }
  }

  /**
   * Health check - verify database connectivity
   *
   * Executes a simple query to verify database connection is working.
   * Use this for:
   * - Application startup checks
   * - Health check endpoints (e.g., /health, /ready)
   * - Monitoring and alerting
   * - Connection recovery verification
   *
   * EXAMPLE - Express Health Endpoint:
   * ```typescript
   * import { db } from './storage/PostgresAdapter';
   *
   * app.get('/health', async (req, res) => {
   *   const dbHealthy = await db.healthCheck();
   *
   *   if (dbHealthy) {
   *     res.status(200).json({ status: 'healthy', database: 'connected' });
   *   } else {
   *     res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
   *   }
   * });
   * ```
   *
   * EXAMPLE - Kubernetes Readiness Probe:
   * ```typescript
   * // Kubernetes will call this endpoint before routing traffic
   * app.get('/ready', async (req, res) => {
   *   const ready = await db.healthCheck();
   *   res.status(ready ? 200 : 503).json({ ready });
   * });
   * ```
   *
   * EXAMPLE - Startup Check:
   * ```typescript
   * import { db } from './storage/PostgresAdapter';
   *
   * async function startServer() {
   *   db.connect();
   *
   *   // Wait for database to be ready
   *   const maxRetries = 10;
   *   for (let i = 0; i < maxRetries; i++) {
   *     if (await db.healthCheck()) {
   *       console.log('Database connected successfully');
   *       break;
   *     }
   *     console.log(`Database not ready, retrying (${i + 1}/${maxRetries})...`);
   *     await new Promise(resolve => setTimeout(resolve, 1000));
   *   }
   *
   *   app.listen(3000, () => {
   *     console.log('Server listening on port 3000');
   *   });
   * }
   * ```
   *
   * QUERY EXECUTED:
   * Runs: SELECT 1
   * - Simplest possible query
   * - No table access required
   * - Fast (<1ms typically)
   * - Doesn't modify data
   *
   * BEHAVIOR:
   * - Returns true: Database is reachable and responsive
   * - Returns false: Database is unreachable, pool not initialized, or query failed
   * - Never throws errors (catches and logs them)
   *
   * ERROR SCENARIOS:
   * Returns false when:
   * - Pool not initialized (forgot to call connect())
   * - Network connection lost
   * - Database server down
   * - Authentication failure
   * - Firewall blocking connection
   * - Connection pool exhausted (all connections busy)
   *
   * PERFORMANCE:
   * - Fast operation (<5ms typically)
   * - Uses connection from pool (doesn't create new connection)
   * - Safe to call frequently (e.g., every 10 seconds)
   *
   * @returns Promise resolving to true if database is healthy, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Execute simple query to verify connection
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      // Log error and return false (don't throw)
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton instance of PostgresAdapter
 *
 * This is the main export used throughout the application.
 * All imports of this module receive the same shared instance.
 *
 * USAGE:
 * ```typescript
 * import { db } from './storage/PostgresAdapter';
 *
 * // All files share the same instance
 * db.connect();  // Initialize once at startup
 * await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
 * ```
 *
 * SINGLETON BENEFITS:
 * - Single connection pool shared across entire application
 * - No duplicate pools (efficient resource usage)
 * - Consistent configuration (all queries use same pool settings)
 * - Simple initialization (connect() once, use everywhere)
 *
 * ARCHITECTURE:
 * ```
 * index.ts                  → db.connect()
 * routes/tasks.ts           → import { db }
 * services/TaskService.ts   → import { db }
 * services/AuthService.ts   → import { db }
 *                              ↓
 *                     All use same pool
 * ```
 *
 * @see PostgresAdapter for class documentation
 * @see connect() to initialize the pool
 * @see query() for executing queries
 * @see transaction() for multi-query operations
 */
export const db = PostgresAdapter.getInstance();

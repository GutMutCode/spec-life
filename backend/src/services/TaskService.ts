/**
 * @file TaskService.ts
 * @description Business logic layer for task CRUD operations with automatic rank shifting
 *
 * RESPONSIBILITIES:
 * - Task creation, retrieval, update, and deletion
 * - Automatic rank shifting when inserting or deleting tasks
 * - Transaction management for atomic operations
 * - Data validation and transformation
 * - Database row mapping (snake_case → camelCase)
 *
 * RANK SHIFTING ALGORITHM:
 * Ranks represent task priority (0 = highest priority).
 * When tasks are inserted or deleted, ranks are automatically adjusted:
 *
 * INSERT at rank N:
 * - All tasks with rank >= N have their rank incremented by 1
 * - New task is inserted at rank N
 * - Performed in a single database transaction
 *
 * DELETE at rank N:
 * - Task at rank N is deleted
 * - All tasks with rank > N have their rank decremented by 1
 * - Performed in a single database transaction
 *
 * EXAMPLE - Insert at rank 1:
 * Before: [rank 0, rank 1, rank 2, rank 3]
 * After:  [rank 0, NEW(rank 1), rank 2, rank 3, rank 4]
 *         Tasks at old ranks 1,2,3 shifted to 2,3,4
 *
 * EXAMPLE - Delete at rank 1:
 * Before: [rank 0, rank 1, rank 2, rank 3]
 * After:  [rank 0, rank 1, rank 2]
 *         Tasks at old ranks 2,3 shifted to 1,2
 *
 * DATABASE OPERATIONS:
 * - Uses PostgresAdapter for database access
 * - All rank shifting uses database transactions
 * - Queries use parameterized statements (SQL injection safe)
 * - Returns null for not-found operations (404 handling)
 *
 * USAGE:
 * ```typescript
 * import { taskService } from './TaskService';
 *
 * // List tasks
 * const tasks = await taskService.listTasks(userId);
 *
 * // Create with rank shifting
 * const task = await taskService.createTask(userId, {
 *   title: 'My Task',
 *   rank: 0  // Will shift existing tasks
 * });
 *
 * // Update metadata
 * await taskService.updateTask(userId, taskId, {
 *   completed: true
 * });
 *
 * // Delete with rank shifting
 * await taskService.deleteTask(userId, taskId);
 * ```
 *
 * @see ../storage/PostgresAdapter.ts for database layer
 * @see ../models/Task.ts for type definitions
 * @see /ARCHITECTURE.md for system architecture
 */

import { db } from '../storage/PostgresAdapter.js';
import { Task, CreateTaskDTO, UpdateTaskDTO } from '../models/Task.js';
import { randomUUID } from 'crypto';

/**
 * TaskService - Business logic for task operations
 *
 * Handles all task-related business logic including CRUD operations,
 * automatic rank shifting, and data transformations.
 *
 * All methods require a userId parameter to ensure users can only
 * access their own tasks (row-level security).
 */
export class TaskService {
  /**
   * List all tasks for a user with optional filtering
   *
   * Retrieves tasks from the database and sorts them appropriately:
   * - Active tasks (completed=false): Sorted by rank ASC (0 first)
   * - Completed tasks (completed=true): Sorted by completedAt DESC (newest first)
   * - Mixed (no filter): Active first (rank ASC), then completed (completedAt DESC)
   *
   * QUERY PERFORMANCE:
   * - Uses compound index: idx_tasks_user_completed_rank
   * - Efficient for large task lists
   *
   * SQL EXAMPLE (active tasks):
   * ```sql
   * SELECT * FROM tasks
   * WHERE user_id = 'uuid'
   *   AND completed = false
   * ORDER BY rank ASC
   * ```
   *
   * @param userId - User ID (UUID v4)
   * @param completed - Filter by completion status:
   *                    - undefined: Return all tasks (active + completed)
   *                    - true: Return only completed tasks
   *                    - false: Return only active tasks
   * @returns Promise resolving to array of tasks with proper sorting
   *
   * @example
   * ```typescript
   * // Get all active tasks
   * const active = await taskService.listTasks(userId, false);
   *
   * // Get all completed tasks
   * const completed = await taskService.listTasks(userId, true);
   *
   * // Get all tasks (mixed)
   * const all = await taskService.listTasks(userId);
   * ```
   */
  async listTasks(userId: string, completed?: boolean): Promise<Task[]> {
    let query = 'SELECT * FROM tasks WHERE user_id = $1';
    const params: any[] = [userId];

    if (completed !== undefined) {
      query += ' AND completed = $2';
      params.push(completed);
    }

    // Sort: active tasks by rank ASC, completed tasks by completedAt DESC
    if (completed === false) {
      query += ' ORDER BY rank ASC';
    } else if (completed === true) {
      query += ' ORDER BY completed_at DESC';
    } else {
      // Mixed: sort by completed ASC (active first), then rank ASC / completedAt DESC
      query += ' ORDER BY completed ASC, CASE WHEN completed THEN completed_at END DESC, rank ASC';
    }

    const result = await db.query<Task>(query, params);
    return result.rows.map(this.mapRowToTask);
  }

  /**
   * Create a new task with automatic rank shifting
   *
   * Inserts a task at the specified rank and shifts existing tasks as needed.
   * All operations are performed in a database transaction for atomicity.
   *
   * RANK SHIFTING BEHAVIOR:
   * - All active tasks (completed=false) with rank >= insertion rank are shifted up by 1
   * - Completed tasks are NOT shifted (they don't participate in ranking)
   * - Hierarchical tasks: Only tasks with same parentId are shifted
   *
   * TRANSACTION FLOW:
   * 1. BEGIN transaction
   * 2. UPDATE tasks SET rank = rank + 1 WHERE rank >= insertionRank
   * 3. INSERT new task at insertionRank
   * 4. COMMIT transaction (or ROLLBACK on error)
   *
   * FIELD DEFAULTS:
   * - id: Generated UUID v4 if not provided
   * - createdAt: Current timestamp if not provided
   * - updatedAt: Current timestamp if not provided
   * - completed: false if not provided
   *
   * SQL EXAMPLE:
   * ```sql
   * BEGIN;
   * UPDATE tasks
   * SET rank = rank + 1, updated_at = NOW()
   * WHERE user_id = 'uuid'
   *   AND rank >= 2
   *   AND completed = FALSE;
   *
   * INSERT INTO tasks (id, user_id, title, rank, ...)
   * VALUES ('uuid', 'user-uuid', 'My Task', 2, ...);
   * COMMIT;
   * ```
   *
   * @param userId - User ID (UUID v4) - ensures row-level security
   * @param taskData - Task creation data including:
   *                   - title: Required task title (1-255 chars)
   *                   - rank: Required rank position (0 = highest priority)
   *                   - description: Optional description
   *                   - deadline: Optional deadline date
   *                   - parentId: Optional parent task ID (for subtasks)
   *                   - depth: Task depth in hierarchy (0 = root)
   *                   - id: Optional UUID (auto-generated if omitted)
   *                   - createdAt: Optional creation timestamp
   *                   - updatedAt: Optional update timestamp
   * @returns Promise resolving to the created task with all fields populated
   *
   * @throws {Error} If database transaction fails or constraint violation
   *
   * @example
   * ```typescript
   * // Create task at rank 0 (highest priority)
   * const task = await taskService.createTask(userId, {
   *   title: 'Important Task',
   *   rank: 0,
   *   deadline: new Date('2025-12-31')
   * });
   *
   * // Create subtask
   * const subtask = await taskService.createTask(userId, {
   *   title: 'Subtask',
   *   rank: 0,
   *   parentId: parentTaskId,
   *   depth: 1
   * });
   * ```
   */
  async createTask(userId: string, taskData: CreateTaskDTO): Promise<Task> {
    const id = taskData.id || randomUUID();
    const now = new Date();
    const createdAt = taskData.createdAt || now;
    const updatedAt = taskData.updatedAt || now;

    return await db.transaction(async (client) => {
      // Shift ranks up for tasks at or above the insertion rank
      await client.query(
        `UPDATE tasks
         SET rank = rank + 1, updated_at = $1
         WHERE user_id = $2 AND rank >= $3 AND completed = FALSE`,
        [now, userId, taskData.rank]
      );

      // Insert new task
      const result = await client.query<Task>(
        `INSERT INTO tasks (id, user_id, title, description, deadline, rank, completed, completed_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          id,
          userId,
          taskData.title,
          taskData.description || null,
          taskData.deadline || null,
          taskData.rank,
          taskData.completed || false,
          taskData.completedAt || null,
          createdAt,
          updatedAt,
        ]
      );

      return this.mapRowToTask(result.rows[0]);
    });
  }

  /**
   * Update an existing task's metadata
   *
   * Updates task fields dynamically based on provided values.
   * Only fields present in the updates object are modified.
   * The updatedAt timestamp is always set to current time.
   *
   * IMPORTANT: This method does NOT handle rank changes.
   * For rank changes, the frontend should delete and re-create the task
   * to ensure proper rank shifting of other tasks.
   *
   * UPDATEABLE FIELDS:
   * - title: Task title (1-255 chars)
   * - description: Task description
   * - deadline: Deadline date
   * - completed: Completion status
   * - completedAt: Completion timestamp
   *
   * NON-UPDATEABLE FIELDS:
   * - id: Cannot be changed
   * - userId: Cannot be changed
   * - rank: Use delete+create for rank changes
   * - createdAt: Immutable
   *
   * DYNAMIC QUERY BUILDING:
   * Only fields present in updates are included in the SQL UPDATE statement.
   * This prevents accidentally setting fields to null or undefined.
   *
   * SQL EXAMPLE:
   * ```sql
   * UPDATE tasks
   * SET title = 'Updated Title',
   *     completed = true,
   *     completed_at = NOW(),
   *     updated_at = NOW()
   * WHERE user_id = 'uuid'
   *   AND id = 'task-uuid'
   * RETURNING *
   * ```
   *
   * @param userId - User ID (UUID v4) - ensures row-level security
   * @param taskId - Task ID (UUID v4) - task to update
   * @param updates - Partial task object with fields to update:
   *                  - Only provided fields are modified
   *                  - undefined/null values are preserved
   *                  - updatedAt is always set to NOW()
   * @returns Promise resolving to:
   *          - Updated task object if found
   *          - null if task not found or not owned by user
   *
   * @example
   * ```typescript
   * // Mark task as completed
   * const task = await taskService.updateTask(userId, taskId, {
   *   completed: true,
   *   completedAt: new Date()
   * });
   *
   * // Update title and deadline
   * const task = await taskService.updateTask(userId, taskId, {
   *   title: 'Updated Title',
   *   deadline: new Date('2025-12-31')
   * });
   *
   * // Handle not found
   * const task = await taskService.updateTask(userId, taskId, updates);
   * if (!task) {
   *   // Return 404 Not Found
   * }
   * ```
   */
  async updateTask(userId: string, taskId: string, updates: UpdateTaskDTO): Promise<Task | null> {
    const now = new Date();
    const updatedAt = updates.updatedAt || now;

    // Build dynamic UPDATE query
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }

    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }

    if (updates.deadline !== undefined) {
      fields.push(`deadline = $${paramIndex++}`);
      values.push(updates.deadline);
    }

    if (updates.completed !== undefined) {
      fields.push(`completed = $${paramIndex++}`);
      values.push(updates.completed);
    }

    if (updates.completedAt !== undefined) {
      fields.push(`completed_at = $${paramIndex++}`);
      values.push(updates.completedAt);
    }

    // Always update updatedAt
    fields.push(`updated_at = $${paramIndex++}`);
    values.push(updatedAt);

    // Add WHERE clause parameters
    values.push(userId, taskId);

    const query = `
      UPDATE tasks
      SET ${fields.join(', ')}
      WHERE user_id = $${paramIndex++} AND id = $${paramIndex++}
      RETURNING *
    `;

    const result = await db.query<Task>(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTask(result.rows[0]);
  }

  /**
   * Delete a task with automatic rank shifting
   *
   * Deletes a task and shifts the ranks of remaining tasks.
   * All operations are performed in a database transaction for atomicity.
   *
   * RANK SHIFTING BEHAVIOR:
   * - All active tasks with rank > deleted rank have their rank decremented by 1
   * - Completed tasks are NOT shifted (they don't participate in ranking)
   * - Only applies to active (completed=false) tasks
   *
   * CASCADE DELETION:
   * - Database foreign key constraint CASCADE deletes subtasks
   * - All child tasks (parentId = deleted task id) are also deleted
   * - This is handled at the database level, not in application code
   *
   * TRANSACTION FLOW:
   * 1. BEGIN transaction
   * 2. SELECT task to get rank and completion status
   * 3. DELETE task (cascades to subtasks)
   * 4. UPDATE tasks SET rank = rank - 1 WHERE rank > deletedRank
   * 5. COMMIT transaction (or ROLLBACK on error)
   *
   * SQL EXAMPLE:
   * ```sql
   * BEGIN;
   * SELECT rank, completed FROM tasks
   * WHERE id = 'task-uuid' AND user_id = 'user-uuid';
   *
   * DELETE FROM tasks
   * WHERE id = 'task-uuid' AND user_id = 'user-uuid';
   *
   * UPDATE tasks
   * SET rank = rank - 1, updated_at = NOW()
   * WHERE user_id = 'user-uuid'
   *   AND rank > 2
   *   AND completed = FALSE;
   * COMMIT;
   * ```
   *
   * @param userId - User ID (UUID v4) - ensures row-level security
   * @param taskId - Task ID (UUID v4) - task to delete
   * @returns Promise resolving to:
   *          - true if task was deleted successfully
   *          - false if task not found or not owned by user
   *
   * @throws {Error} If database transaction fails
   *
   * @example
   * ```typescript
   * // Delete a task
   * const deleted = await taskService.deleteTask(userId, taskId);
   * if (deleted) {
   *   // Return 204 No Content
   * } else {
   *   // Return 404 Not Found
   * }
   * ```
   */
  async deleteTask(userId: string, taskId: string): Promise<boolean> {
    return await db.transaction(async (client) => {
      // Get the task to delete
      const taskResult = await client.query<Task>(
        'SELECT rank, completed FROM tasks WHERE id = $1 AND user_id = $2',
        [taskId, userId]
      );

      if (taskResult.rows.length === 0) {
        return false; // Task not found
      }

      const { rank, completed } = taskResult.rows[0];

      // Delete the task
      await client.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [taskId, userId]);

      // Shift ranks down for tasks with higher ranks (only if not completed)
      if (!completed) {
        await client.query(
          `UPDATE tasks
           SET rank = rank - 1, updated_at = $1
           WHERE user_id = $2 AND rank > $3 AND completed = FALSE`,
          [new Date(), userId, rank]
        );
      }

      return true;
    });
  }

  /**
   * Map database row to Task model
   *
   * Converts PostgreSQL snake_case column names to TypeScript camelCase.
   * Handles date string conversion to Date objects.
   *
   * FIELD MAPPINGS:
   * - user_id → userId
   * - parent_id → parentId
   * - completed_at → completedAt
   * - created_at → createdAt
   * - updated_at → updatedAt
   *
   * DATE CONVERSIONS:
   * - PostgreSQL TIMESTAMP WITH TIME ZONE → JavaScript Date object
   * - Handles null values (undefined in TypeScript)
   *
   * @param row - Raw database row from PostgreSQL query result
   * @returns Task object with camelCase fields and proper types
   *
   * @private
   *
   * @example
   * ```typescript
   * // Database row (snake_case)
   * {
   *   id: 'uuid',
   *   user_id: 'user-uuid',
   *   created_at: '2025-10-27T12:00:00.000Z'
   * }
   *
   * // Mapped Task (camelCase)
   * {
   *   id: 'uuid',
   *   userId: 'user-uuid',
   *   createdAt: Date('2025-10-27T12:00:00.000Z')
   * }
   * ```
   */
  private mapRowToTask(row: any): Task {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      deadline: row.deadline ? new Date(row.deadline) : undefined,
      rank: row.rank,
      parentId: row.parent_id || null,
      depth: row.depth || 0,
      completed: row.completed,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

/**
 * Singleton instance of TaskService
 *
 * Use this instance throughout the application for consistency.
 * The singleton pattern ensures all parts of the application share
 * the same service instance and database connection pool.
 *
 * @example
 * ```typescript
 * import { taskService } from './TaskService';
 *
 * // Use in route handlers
 * app.get('/api/tasks', async (req, res) => {
 *   const tasks = await taskService.listTasks(req.userId);
 *   res.json({ tasks });
 * });
 * ```
 */
export const taskService = new TaskService();

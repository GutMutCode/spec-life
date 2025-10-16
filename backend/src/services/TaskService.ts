/**
 * Task Service
 *
 * Business logic for task CRUD operations with rank shifting.
 * Created: 2025-10-16
 * Tasks: T097-T100
 */

import { db } from '../storage/PostgresAdapter.js';
import { Task, CreateTaskDTO, UpdateTaskDTO } from '../models/Task.js';
import { randomUUID } from 'crypto';

export class TaskService {
  /**
   * T097: List all tasks for a user
   *
   * @param userId - User ID
   * @param completed - Filter by completion status (optional)
   * @returns Array of tasks sorted by rank (active) or completedAt desc (completed)
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
   * T098: Create a new task with automatic rank shifting
   *
   * When inserting a task at a specific rank, all tasks at that rank or higher
   * have their ranks incremented by 1.
   *
   * @param userId - User ID
   * @param taskData - Task creation data
   * @returns Created task
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
   * T099: Update an existing task
   *
   * Note: Rank changes should use moveTask instead for proper shifting.
   * This method is for updating task metadata (title, description, deadline, completion).
   *
   * @param userId - User ID
   * @param taskId - Task ID
   * @param updates - Fields to update
   * @returns Updated task or null if not found
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
   * T100: Delete a task with automatic rank shifting
   *
   * When deleting a task, all tasks with higher ranks have their ranks decremented by 1.
   *
   * @param userId - User ID
   * @param taskId - Task ID
   * @returns True if deleted, false if not found
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
   * Helper: Map database row to Task model (converts snake_case to camelCase)
   */
  private mapRowToTask(row: any): Task {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      deadline: row.deadline ? new Date(row.deadline) : undefined,
      rank: row.rank,
      completed: row.completed,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// Export singleton instance
export const taskService = new TaskService();

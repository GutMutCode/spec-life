import Dexie, { type EntityTable } from 'dexie';
import type { Task } from '@shared/Task';

/**
 * Metadata type for storing app-level data like cleanup timestamps.
 */
export interface Metadata {
  key: string;
  value: string | number | boolean;
}

/**
 * IndexedDB database for local-first task storage.
 *
 * Schema version 1:
 * - tasks table with indexes for efficient querying
 *
 * Schema version 2:
 * - Added metadata table for app-level data (cleanup timestamps, etc.)
 *
 * Indexes:
 * - id (primary key)
 * - rank (for priority ordering)
 * - completedAt (for filtering completed tasks)
 * - createdAt (for chronological sorting)
 * - [completed+rank] (compound index for filtering incomplete tasks by priority)
 */
export class TaskDatabase extends Dexie {
  tasks!: EntityTable<Task, 'id'>;
  metadata!: Dexie.Table<Metadata, string>;

  constructor() {
    super('TaskPriorityDB');

    // Version 1: Original schema
    this.version(1).stores({
      tasks: 'id, rank, completedAt, createdAt, [completed+rank]',
    });

    // Version 2: Add metadata table
    this.version(2).stores({
      tasks: 'id, rank, completedAt, createdAt, [completed+rank]',
      metadata: 'key',
    });
  }
}

// Singleton instance of the database
export const db = new TaskDatabase();

/**
 * Helper function to get all incomplete tasks ordered by rank (priority).
 *
 * @returns Promise resolving to array of tasks sorted by rank (0 = highest priority)
 */
export const getIncompleteTasks = async (): Promise<Task[]> => {
  const allTasks = await db.tasks.toArray();
  return allTasks
    .filter((task) => !task.completed)
    .sort((a, b) => a.rank - b.rank);
};

/**
 * Helper function to get all completed tasks ordered by completion date (newest first).
 *
 * @returns Promise resolving to array of completed tasks
 */
export const getCompletedTasks = async (): Promise<Task[]> => {
  const allTasks = await db.tasks.toArray();
  return allTasks
    .filter((task) => task.completed)
    .sort((a, b) => {
      if (!a.completedAt || !b.completedAt) return 0;
      return b.completedAt.getTime() - a.completedAt.getTime();
    });
};

/**
 * Helper function to get task by ID.
 *
 * @param id - Task ID
 * @returns Promise resolving to task or undefined if not found
 */
export const getTaskById = async (id: string): Promise<Task | undefined> => {
  return db.tasks.get(id);
};

/**
 * Helper function to add a new task.
 *
 * @param task - Task to add (must include all required fields)
 * @returns Promise resolving to the task ID
 */
export const addTask = async (task: Task): Promise<string> => {
  return db.tasks.add(task);
};

/**
 * Helper function to update an existing task.
 *
 * @param id - Task ID
 * @param updates - Partial task object with fields to update
 * @returns Promise resolving to number of updated records (1 if successful)
 */
export const updateTask = async (id: string, updates: Partial<Task>): Promise<number> => {
  return db.tasks.update(id, {
    ...updates,
    updatedAt: new Date(),
  });
};

/**
 * Helper function to delete a task.
 *
 * @param id - Task ID
 * @returns Promise resolving when deletion is complete
 */
export const deleteTask = async (id: string): Promise<void> => {
  return db.tasks.delete(id);
};

/**
 * Helper function to bulk update task ranks (for re-prioritization).
 *
 * @param updates - Array of {id, rank} pairs
 * @returns Promise resolving when all updates are complete
 */
export const bulkUpdateRanks = async (updates: Array<{ id: string; rank: number }>): Promise<void> => {
  return db.transaction('rw', db.tasks, async () => {
    const now = new Date();
    for (const { id, rank } of updates) {
      await db.tasks.update(id, { rank, updatedAt: now });
    }
  });
};

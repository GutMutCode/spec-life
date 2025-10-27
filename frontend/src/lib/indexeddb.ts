/**
 * @file indexeddb.ts
 * @description IndexedDB database layer using Dexie.js for offline-first task storage
 *
 * CURRENT IMPLEMENTATION: Local-only storage
 * - Dexie.js wrapper for IndexedDB
 * - Two tables: tasks (Task entities), metadata (app-level data)
 * - Compound indexes for efficient querying (completed+rank)
 * - Schema migrations (v1 → v2) for backward compatibility
 *
 * TODO: Cloud Sync Integration
 * - [ ] Add sync_status field to tasks (pending, synced, conflict)
 * - [ ] Add last_synced_at timestamp field
 * - [ ] Add server_updated_at field for conflict detection
 * - [ ] Create sync queue table for offline operations
 * - [ ] Add metadata for last successful sync timestamp
 * - [ ] Implement schema migration v2 → v3 for sync fields
 * - [ ] Add indexes for sync_status and last_synced_at
 *
 * @see /frontend/ARCHITECTURE.md for system architecture
 */

import Dexie, { type EntityTable } from 'dexie';
import type { Task, SyncStatus } from '@shared/Task';

/**
 * Metadata type for storing app-level data like cleanup timestamps.
 */
export interface Metadata {
  key: string;
  value: string | number | boolean;
}

/**
 * Sync Queue Entry
 *
 * Stores operations performed offline for later synchronization with server.
 *
 * WORKFLOW:
 * 1. User creates/updates/deletes task while offline
 * 2. Operation added to syncQueue
 * 3. When online, SyncService processes queue
 * 4. On success: Remove from queue
 * 5. On failure: Increment retryCount, retry later
 *
 * RETRY LOGIC:
 * - Max retries: 5
 * - Exponential backoff: 1s, 2s, 4s, 8s, 16s
 * - After 5 failures: Mark as permanent error, notify user
 *
 * @see CLOUD_SYNC_MIGRATION.md Phase 3 for implementation details
 */
export interface SyncQueueEntry {
  /**
   * Auto-increment primary key
   * Used for ordering (FIFO queue)
   */
  queueId?: number;

  /**
   * ID of task being modified
   * Used to prevent duplicate operations on same task
   */
  taskId: string;

  /**
   * Type of operation to perform
   * - create: POST /api/tasks
   * - update: PUT /api/tasks/:id
   * - delete: DELETE /api/tasks/:id
   */
  operation: 'create' | 'update' | 'delete';

  /**
   * Operation payload
   * - create: Full task object
   * - update: Partial task with changed fields
   * - delete: Empty object
   */
  payload: Partial<Task>;

  /**
   * When operation was queued
   * Used for ordering and timeout detection
   */
  timestamp: Date;

  /**
   * Number of retry attempts
   * Incremented on each failed sync
   * @default 0
   */
  retryCount: number;

  /**
   * Last error message
   * Helps debug why sync failed
   * @example "Network error: Failed to fetch"
   */
  lastError?: string;
}

/**
 * IndexedDB database for local-first task storage with cloud sync support.
 *
 * SCHEMA VERSIONS:
 *
 * **Version 1** (Original):
 * - tasks table with basic indexes
 *
 * **Version 2** (App metadata):
 * - Added metadata table for cleanup timestamps
 *
 * **Version 3** (Cloud Sync - Phase 1):
 * - Added sync fields to tasks (syncStatus, lastSyncedAt, serverUpdatedAt)
 * - Added syncQueue table for offline operations
 * - Added indexes for sync operations
 * - Migration: Mark all existing tasks as 'pending'
 *
 * INDEXES:
 * - **id**: Primary key (UUID)
 * - **rank**: Priority ordering (0 = highest)
 * - **completedAt**: Filter completed tasks
 * - **createdAt**: Chronological sorting
 * - **[completed+rank]**: Compound index for incomplete tasks by priority
 * - **syncStatus**: Filter by sync state (pending/syncing/synced/conflict/error)
 * - **lastSyncedAt**: Find stale tasks needing re-sync
 *
 * @see CLOUD_SYNC_MIGRATION.md for sync architecture
 */
export class TaskDatabase extends Dexie {
  tasks!: EntityTable<Task, 'id'>;
  metadata!: Dexie.Table<Metadata, string>;
  syncQueue!: Dexie.Table<SyncQueueEntry, number>;

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

    // Version 3: Add cloud sync fields and syncQueue table
    this.version(3)
      .stores({
        tasks: 'id, rank, completedAt, createdAt, [completed+rank], syncStatus, lastSyncedAt',
        metadata: 'key',
        syncQueue: '++queueId, taskId, operation, timestamp',
      })
      .upgrade((tx) => {
        // Migrate existing tasks: Mark as 'pending' for initial sync
        return tx
          .table('tasks')
          .toCollection()
          .modify((task: Task) => {
            task.syncStatus = 'pending';
            task.lastSyncedAt = undefined;
            task.serverUpdatedAt = undefined;
          });
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

// ============================================================================
// SYNC QUEUE OPERATIONS (Phase 1+)
// ============================================================================

/**
 * Add operation to sync queue
 *
 * Used when offline or when sync fails.
 * Operations will be retried when network is available.
 *
 * @param entry - Sync queue entry (without queueId, will be auto-generated)
 * @returns Promise resolving to the queue ID
 *
 * @example
 * ```typescript
 * // Queue task creation while offline
 * await addToSyncQueue({
 *   taskId: task.id,
 *   operation: 'create',
 *   payload: task,
 *   timestamp: new Date(),
 *   retryCount: 0
 * });
 * ```
 */
export const addToSyncQueue = async (
  entry: Omit<SyncQueueEntry, 'queueId'>
): Promise<number> => {
  return db.syncQueue.add(entry);
};

/**
 * Get all pending sync operations
 *
 * Returns operations ordered by timestamp (FIFO).
 * Used by SyncService to process queue.
 *
 * @returns Promise resolving to array of queue entries
 */
export const getSyncQueue = async (): Promise<SyncQueueEntry[]> => {
  return db.syncQueue.orderBy('timestamp').toArray();
};

/**
 * Remove operation from sync queue
 *
 * Called after successful sync.
 *
 * @param queueId - Queue entry ID
 * @returns Promise resolving when deletion is complete
 */
export const removeFromSyncQueue = async (queueId: number): Promise<void> => {
  return db.syncQueue.delete(queueId);
};

/**
 * Update retry count for failed sync operation
 *
 * Increments retryCount and updates lastError.
 * Used when sync fails but should be retried.
 *
 * @param queueId - Queue entry ID
 * @param error - Error message
 * @returns Promise resolving to number of updated records
 */
export const incrementSyncRetry = async (
  queueId: number,
  error: string
): Promise<number> => {
  const entry = await db.syncQueue.get(queueId);
  if (!entry) return 0;

  return db.syncQueue.update(queueId, {
    retryCount: entry.retryCount + 1,
    lastError: error,
  });
};

/**
 * Clear all sync queue entries
 *
 * Used for testing or when resetting sync state.
 * ⚠️ Use with caution: Will lose offline changes!
 *
 * @returns Promise resolving when queue is cleared
 */
export const clearSyncQueue = async (): Promise<void> => {
  return db.syncQueue.clear();
};

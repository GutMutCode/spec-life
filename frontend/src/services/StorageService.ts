/**
 * @file StorageService.ts
 * @description Business logic layer for task storage operations
 *
 * CURRENT IMPLEMENTATION: Local-only (IndexedDB)
 * - All CRUD operations performed in IndexedDB only
 * - No backend synchronization
 * - Auto-generated fields (id, timestamps) created client-side
 *
 * TODO: Cloud Sync Integration
 * - [ ] Add API client for backend communication
 * - [ ] Implement dual-write pattern (IndexedDB + API)
 * - [ ] Add sync status tracking per operation
 * - [ ] Handle authentication token in API calls
 * - [ ] Implement retry logic for failed API calls
 * - [ ] Add conflict resolution for server vs local state
 * - [ ] Sync completed tasks to backend for 90-day retention
 *
 * @see /frontend/ARCHITECTURE.md for system architecture
 */

import {
  getIncompleteTasks,
  addTask,
  getTaskById,
  updateTask,
  getCompletedTasks,
  deleteTask,
  bulkUpdateRanks,
  db,
  addToSyncQueue,
} from '@/lib/indexeddb';
import { generateTaskId } from '@/lib/utils';
import type { Task } from '@shared/Task';
import { TaskApiService } from './TaskApiService';
import { syncService } from './SyncService';

/**
 * Custom error class for storage operations (T108).
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Service layer for task storage operations.
 *
 * Provides business logic layer between UI components and IndexedDB,
 * handling task creation with auto-generated fields and retrieving tasks.
 *
 * T108: Added comprehensive error handling with user-friendly messages.
 *
 * Phase 3: Dual-write pattern for cloud sync
 * - Write to IndexedDB (local-first)
 * - Attempt API call (if online)
 * - Queue operation (if offline or API fails)
 */
export class StorageService {
  private apiService: TaskApiService;

  constructor() {
    this.apiService = new TaskApiService();
  }
  /**
   * Gets the highest priority incomplete task (rank 0 at top level).
   *
   * Per FR-001: "The system always displays the task with rank 0 as the top priority."
   *
   * Hierarchical behavior:
   * - Only returns top-level tasks (parentId === null)
   * - Returns the task with rank 0 among top-level tasks
   *
   * @returns Promise resolving to the top task, or undefined if no incomplete tasks exist
   * @throws {StorageError} If database operation fails
   */
  async getTopTask(): Promise<Task | undefined> {
    try {
      const activeTasks = await getIncompleteTasks();
      // Filter for top-level tasks only (parentId === null or undefined)
      const topLevelTasks = activeTasks.filter((task) => task.parentId === null || task.parentId === undefined);
      return topLevelTasks.length > 0 ? topLevelTasks[0] : undefined;
    } catch (error) {
      throw new StorageError(
        'Failed to retrieve top task. Please refresh the page.',
        'getTopTask',
        error
      );
    }
  }

  /**
   * Creates a new task with auto-generated fields.
   *
   * Auto-generated fields:
   * - id: UUID v4
   * - completed: false
   * - createdAt: current timestamp
   * - updatedAt: current timestamp
   *
   * Phase 3: Dual-write pattern
   * 1. Write to IndexedDB (always succeeds - local-first)
   * 2. Try API call (if online)
   * 3. Queue operation (if offline or API fails)
   *
   * @param taskData - Partial task object with at least title and rank
   * @returns Promise resolving to the created task with all fields populated
   * @throws {StorageError} If database operation fails
   */
  async createTask(taskData: {
    title: string;
    description?: string;
    deadline?: Date;
    rank: number;
    parentId?: string | null;
    depth?: number;
    userId?: string;
    collaborators?: string[];
  }): Promise<Task> {
    try {
      const now = new Date();
      const newTask: Task = {
        id: generateTaskId(),
        title: taskData.title,
        description: taskData.description,
        deadline: taskData.deadline,
        rank: taskData.rank,
        parentId: taskData.parentId ?? null,
        depth: taskData.depth ?? 0,
        completed: false,
        createdAt: now,
        updatedAt: now,
        userId: taskData.userId,
        collaborators: taskData.collaborators,
        syncStatus: 'pending', // Phase 3: Mark as pending for sync
      };

      // Step 1: Write to IndexedDB (local-first, always succeeds)
      await addTask(newTask);

      // Step 2: Try API call (dual-write)
      if (syncService.isOnline()) {
        try {
          await this.apiService.createTask(newTask);
          // Success: Mark as synced
          await updateTask(newTask.id, {
            syncStatus: 'synced',
            lastSyncedAt: new Date(),
            serverUpdatedAt: newTask.updatedAt,
          });
          console.log('[StorageService] Task created and synced:', newTask.id);
        } catch (apiError) {
          console.error('[StorageService] API create failed, queuing:', apiError);
          // API failed: Queue operation for retry
          await addToSyncQueue({
            taskId: newTask.id,
            operation: 'create',
            payload: newTask,
            timestamp: new Date(),
            retryCount: 0,
          });
        }
      } else {
        // Offline: Queue operation
        console.log('[StorageService] Offline, queuing create operation');
        await addToSyncQueue({
          taskId: newTask.id,
          operation: 'create',
          payload: newTask,
          timestamp: new Date(),
          retryCount: 0,
        });
      }

      return newTask;
    } catch (error) {
      throw new StorageError(
        'Failed to create task. Please try again.',
        'createTask',
        error
      );
    }
  }

  /**
   * Gets all incomplete tasks sorted by rank (priority).
   *
   * @returns Promise resolving to array of tasks sorted by rank (0 = highest priority)
   * @throws {StorageError} If database operation fails
   */
  async getActiveTasks(): Promise<Task[]> {
    try {
      return await getIncompleteTasks();
    } catch (error) {
      throw new StorageError(
        'Failed to load tasks. Please refresh the page.',
        'getActiveTasks',
        error
      );
    }
  }

  /**
   * Gets a task by ID.
   *
   * @param id - Task ID
   * @returns Promise resolving to task or undefined if not found
   * @throws {StorageError} If database operation fails
   */
  async getTaskById(id: string): Promise<Task | undefined> {
    try {
      return await getTaskById(id);
    } catch (error) {
      throw new StorageError(
        'Failed to retrieve task details. Please try again.',
        'getTaskById',
        error
      );
    }
  }

  /**
   * Updates an existing task with new values.
   *
   * Automatically sets updatedAt timestamp to current time.
   * Preserves createdAt and other fields not included in updates.
   *
   * Phase 3: Dual-write pattern
   * 1. Write to IndexedDB (always succeeds - local-first)
   * 2. Try API call (if online)
   * 3. Queue operation (if offline or API fails)
   *
   * @param id - Task ID
   * @param updates - Partial task object with fields to update
   * @returns Promise resolving to number of updated records (1 if successful, 0 if not found)
   * @throws {StorageError} If database operation fails
   */
  async updateTask(id: string, updates: Partial<Task>): Promise<number> {
    try {
      // Step 1: Write to IndexedDB (local-first)
      const updatesWithSync = {
        ...updates,
        syncStatus: 'pending' as const, // Mark as pending for sync
      };
      const result = await updateTask(id, updatesWithSync);

      // Step 2: Try API call (dual-write)
      if (syncService.isOnline()) {
        try {
          await this.apiService.updateTask(id, updates);
          // Success: Mark as synced
          await updateTask(id, {
            syncStatus: 'synced',
            lastSyncedAt: new Date(),
          });
          console.log('[StorageService] Task updated and synced:', id);
        } catch (apiError) {
          console.error('[StorageService] API update failed, queuing:', apiError);
          // API failed: Queue operation for retry
          await addToSyncQueue({
            taskId: id,
            operation: 'update',
            payload: updates,
            timestamp: new Date(),
            retryCount: 0,
          });
        }
      } else {
        // Offline: Queue operation
        console.log('[StorageService] Offline, queuing update operation');
        await addToSyncQueue({
          taskId: id,
          operation: 'update',
          payload: updates,
          timestamp: new Date(),
          retryCount: 0,
        });
      }

      return result;
    } catch (error) {
      throw new StorageError(
        'Failed to update task. Please try again.',
        'updateTask',
        error
      );
    }
  }

  /**
   * Marks a task as completed and shifts ranks of remaining tasks (T071).
   *
   * When completing a task at rank N with parentId P:
   * - Task is marked as completed with completedAt=NOW
   * - All incomplete tasks with same parentId and rank > N have their rank decreased by 1
   * - All shifted tasks have updatedAt set to NOW
   * - The task will be removed from active tasks list
   *
   * Hierarchical behavior:
   * - Only shifts tasks with the same parentId (maintains hierarchy)
   *
   * Per FR-022: "Mark task complete with single tap."
   * Per FR-023: "Completed tasks move to history with 90-day retention."
   *
   * @param id - Task ID
   * @returns Promise resolving when completion and rank shifting is complete
   * @throws {StorageError} If database operation fails
   */
  async completeTask(id: string): Promise<void> {
    try {
      // Get the task to complete
      const taskToComplete = await getTaskById(id);
      if (!taskToComplete) {
        return; // Task not found, nothing to do
      }

      const completedRank = taskToComplete.rank;
      const parentId = taskToComplete.parentId;
      const now = new Date();

      // Mark task as completed
      await updateTask(id, {
        completed: true,
        completedAt: now,
        updatedAt: now,
      });

      // Get all incomplete tasks with same parentId and rank > completedRank
      const tasksToShift = await db.tasks
        .where('rank')
        .above(completedRank)
        .and((task) => !task.completed && task.parentId === parentId)
        .toArray();

      // Shift ranks down
      if (tasksToShift.length > 0) {
        const updates = tasksToShift.map((task) => ({
          id: task.id,
          rank: task.rank - 1,
        }));

        await bulkUpdateRanks(updates);
      }
    } catch (error) {
      throw new StorageError(
        'Failed to complete task. Please try again.',
        'completeTask',
        error
      );
    }
  }

  /**
   * Deletes a task and shifts ranks of tasks below it (T072).
   *
   * When deleting a task at rank N with parentId P:
   * - Task is deleted from database
   * - All tasks with same parentId and rank > N have their rank decreased by 1
   * - All shifted tasks have updatedAt set to NOW
   *
   * Hierarchical behavior:
   * - Only shifts tasks with the same parentId (maintains hierarchy)
   * - Child tasks (subtasks) are deleted via CASCADE in database
   *
   * Phase 4: Dual-write pattern
   * 1. Delete from IndexedDB (local-first)
   * 2. Try API call (if online)
   * 3. Queue operation (if offline or API fails)
   *
   * Per FR-025: "Delete task with confirmation dialog."
   *
   * @param id - Task ID
   * @returns Promise resolving when deletion and rank shifting is complete
   * @throws {StorageError} If database operation fails
   */
  async deleteTask(id: string): Promise<void> {
    try {
      // Get the task to delete
      const taskToDelete = await getTaskById(id);
      if (!taskToDelete) {
        return; // Task not found, nothing to do
      }

      const deletedRank = taskToDelete.rank;
      const parentId = taskToDelete.parentId;

      // Step 1: Delete from IndexedDB (local-first)
      await deleteTask(id);

      // Get all tasks with same parentId and rank > deletedRank
      const tasksToShift = await db.tasks
        .where('rank')
        .above(deletedRank)
        .and((task) => task.parentId === parentId)
        .toArray();

      // Shift ranks down
      if (tasksToShift.length > 0) {
        const updates = tasksToShift.map((task) => ({
          id: task.id,
          rank: task.rank - 1,
        }));

        await bulkUpdateRanks(updates);
      }

      // Step 2: Try API call (dual-write)
      if (syncService.isOnline()) {
        try {
          await this.apiService.deleteTask(id);
          console.log('[StorageService] Task deleted and synced:', id);
        } catch (apiError) {
          console.error('[StorageService] API delete failed, queuing:', apiError);
          // API failed: Queue operation for retry
          await addToSyncQueue({
            taskId: id,
            operation: 'delete',
            payload: {}, // No payload needed for delete
            timestamp: new Date(),
            retryCount: 0,
          });
        }
      } else {
        // Offline: Queue operation
        console.log('[StorageService] Offline, queuing delete operation');
        await addToSyncQueue({
          taskId: id,
          operation: 'delete',
          payload: {},
          timestamp: new Date(),
          retryCount: 0,
        });
      }
    } catch (error) {
      throw new StorageError(
        'Failed to delete task. Please try again.',
        'deleteTask',
        error
      );
    }
  }

  /**
   * Gets all completed tasks sorted by completion date (T073).
   *
   * Returns completed tasks in reverse chronological order (newest first).
   *
   * Per FR-023: "View completed tasks in history."
   * Per FR-024: "90-day retention for completed tasks."
   *
   * @returns Promise resolving to array of completed tasks
   * @throws {StorageError} If database operation fails
   */
  async getCompletedTasks(): Promise<Task[]> {
    try {
      return await getCompletedTasks();
    } catch (error) {
      throw new StorageError(
        'Failed to load completed tasks. Please refresh the page.',
        'getCompletedTasks',
        error
      );
    }
  }
}

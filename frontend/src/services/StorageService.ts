import {
  getIncompleteTasks,
  addTask,
  getTaskById,
  updateTask,
  getCompletedTasks,
  deleteTask,
  bulkUpdateRanks,
  db,
} from '@/lib/indexeddb';
import { generateTaskId } from '@/lib/utils';
import type { Task } from '@shared/Task';

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
 */
export class StorageService {
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
      // Filter for top-level tasks only (parentId === null)
      const topLevelTasks = activeTasks.filter((task) => task.parentId === null);
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
      };

      await addTask(newTask);
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
   * @param id - Task ID
   * @param updates - Partial task object with fields to update
   * @returns Promise resolving to number of updated records (1 if successful, 0 if not found)
   * @throws {StorageError} If database operation fails
   */
  async updateTask(id: string, updates: Partial<Task>): Promise<number> {
    try {
      return await updateTask(id, updates);
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

      // Delete the task (and all its subtasks via cascade)
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

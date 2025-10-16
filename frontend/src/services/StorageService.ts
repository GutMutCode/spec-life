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
 * Service layer for task storage operations.
 *
 * Provides business logic layer between UI components and IndexedDB,
 * handling task creation with auto-generated fields and retrieving tasks.
 */
export class StorageService {
  /**
   * Gets the highest priority incomplete task (rank 0, or lowest available rank).
   *
   * Per FR-001: "The system always displays the task with rank 0 as the top priority."
   *
   * @returns Promise resolving to the top task, or undefined if no incomplete tasks exist
   */
  async getTopTask(): Promise<Task | undefined> {
    const activeTasks = await getIncompleteTasks();
    return activeTasks.length > 0 ? activeTasks[0] : undefined;
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
   */
  async createTask(taskData: {
    title: string;
    description?: string;
    deadline?: Date;
    rank: number;
    userId?: string;
  }): Promise<Task> {
    const now = new Date();
    const newTask: Task = {
      id: generateTaskId(),
      title: taskData.title,
      description: taskData.description,
      deadline: taskData.deadline,
      rank: taskData.rank,
      completed: false,
      createdAt: now,
      updatedAt: now,
      userId: taskData.userId,
    };

    await addTask(newTask);
    return newTask;
  }

  /**
   * Gets all incomplete tasks sorted by rank (priority).
   *
   * @returns Promise resolving to array of tasks sorted by rank (0 = highest priority)
   */
  async getActiveTasks(): Promise<Task[]> {
    return getIncompleteTasks();
  }

  /**
   * Gets a task by ID.
   *
   * @param id - Task ID
   * @returns Promise resolving to task or undefined if not found
   */
  async getTaskById(id: string): Promise<Task | undefined> {
    return getTaskById(id);
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
   */
  async updateTask(id: string, updates: Partial<Task>): Promise<number> {
    return updateTask(id, updates);
  }

  /**
   * Marks a task as completed and shifts ranks of remaining tasks (T071).
   *
   * When completing a task at rank N:
   * - Task is marked as completed with completedAt=NOW
   * - All incomplete tasks with rank > N have their rank decreased by 1
   * - All shifted tasks have updatedAt set to NOW
   * - The task will be removed from active tasks list
   *
   * Per FR-022: "Mark task complete with single tap."
   * Per FR-023: "Completed tasks move to history with 90-day retention."
   *
   * @param id - Task ID
   * @returns Promise resolving when completion and rank shifting is complete
   */
  async completeTask(id: string): Promise<void> {
    // Get the task to complete
    const taskToComplete = await getTaskById(id);
    if (!taskToComplete) {
      return; // Task not found, nothing to do
    }

    const completedRank = taskToComplete.rank;
    const now = new Date();

    // Mark task as completed
    await updateTask(id, {
      completed: true,
      completedAt: now,
      updatedAt: now,
    });

    // Get all incomplete tasks with rank > completedRank
    const tasksToShift = await db.tasks
      .where('rank')
      .above(completedRank)
      .and((task) => !task.completed)
      .toArray();

    // Shift ranks down
    if (tasksToShift.length > 0) {
      const updates = tasksToShift.map((task) => ({
        id: task.id,
        rank: task.rank - 1,
      }));

      await bulkUpdateRanks(updates);
    }
  }

  /**
   * Deletes a task and shifts ranks of tasks below it (T072).
   *
   * When deleting a task at rank N:
   * - Task is deleted from database
   * - All tasks with rank > N have their rank decreased by 1
   * - All shifted tasks have updatedAt set to NOW
   *
   * Per FR-025: "Delete task with confirmation dialog."
   *
   * @param id - Task ID
   * @returns Promise resolving when deletion and rank shifting is complete
   */
  async deleteTask(id: string): Promise<void> {
    // Get the task to delete
    const taskToDelete = await getTaskById(id);
    if (!taskToDelete) {
      return; // Task not found, nothing to do
    }

    const deletedRank = taskToDelete.rank;

    // Delete the task
    await deleteTask(id);

    // Get all tasks with rank > deletedRank
    const tasksToShift = await db.tasks
      .where('rank')
      .above(deletedRank)
      .toArray();

    // Shift ranks down
    if (tasksToShift.length > 0) {
      const updates = tasksToShift.map((task) => ({
        id: task.id,
        rank: task.rank - 1,
      }));

      await bulkUpdateRanks(updates);
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
   */
  async getCompletedTasks(): Promise<Task[]> {
    return getCompletedTasks();
  }
}

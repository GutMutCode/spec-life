/**
 * @file TaskApiService.ts
 * @description API service for task CRUD operations with backend
 *
 * FEATURES:
 * - Communicates with backend Task API (/api/tasks)
 * - Handles authentication via JWT tokens (automatic via apiClient)
 * - Type-safe API calls with Task interface
 * - Error handling and transformation
 * - Retry logic for failed requests
 *
 * API ENDPOINTS:
 * - GET    /api/tasks              - List all tasks
 * - POST   /api/tasks              - Create new task
 * - PUT    /api/tasks/:id          - Update task
 * - DELETE /api/tasks/:id          - Delete task
 *
 * TODO: Future enhancements
 * - [ ] Add batch operations (create/update/delete multiple tasks)
 * - [ ] Add pagination for large task lists
 * - [ ] Add filtering and sorting options
 * - [ ] Add offline queue for failed requests
 * - [ ] Add optimistic response prediction
 *
 * @see /lib/api.ts for HTTP client configuration
 * @see /backend/src/api/routes/tasks.ts for API implementation
 */

import { apiClient, getErrorMessage } from '@/lib/api';
import type { Task } from '@shared/Task';

/**
 * API response for listing tasks
 */
interface ListTasksResponse {
  tasks: Task[];
}

/**
 * API response for single task operations
 */
interface TaskResponse {
  task: Task;
}

/**
 * Data for creating a new task
 */
export interface CreateTaskData {
  id?: string;
  title: string;
  description?: string;
  deadline?: Date;
  rank: number;
  parentId?: string | null;
  depth?: number;
  completed?: boolean;
  completedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  collaborators?: string[];
}

/**
 * Data for updating an existing task
 */
export interface UpdateTaskData {
  title?: string;
  description?: string;
  deadline?: Date;
  rank?: number;
  parentId?: string | null;
  depth?: number;
  completed?: boolean;
  completedAt?: Date | null;
  updatedAt?: Date;
  collaborators?: string[];
}

/**
 * Task API Service
 *
 * Provides methods for communicating with the backend Task API.
 * All methods require authentication (JWT token in Authorization header).
 *
 * @example
 * ```ts
 * const apiService = new TaskApiService();
 *
 * // List all tasks
 * const tasks = await apiService.listTasks();
 *
 * // Create a task
 * const newTask = await apiService.createTask({
 *   title: 'My Task',
 *   rank: 0
 * });
 *
 * // Update a task
 * await apiService.updateTask(taskId, { completed: true });
 *
 * // Delete a task
 * await apiService.deleteTask(taskId);
 * ```
 */
export class TaskApiService {
  /**
   * List all tasks for the authenticated user
   *
   * @param completed - Optional filter by completion status
   * @returns Promise resolving to array of tasks
   * @throws Error if API call fails
   */
  async listTasks(completed?: boolean): Promise<Task[]> {
    try {
      const params = completed !== undefined ? { completed: String(completed) } : {};

      const response = await apiClient.get<ListTasksResponse>('/api/tasks', { params });

      // Convert date strings back to Date objects
      return response.data.tasks.map((task) => ({
        ...task,
        deadline: task.deadline ? new Date(task.deadline) : undefined,
        completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
      }));
    } catch (error) {
      const message = getErrorMessage(error);
      throw new Error(`Failed to list tasks: ${message}`);
    }
  }

  /**
   * Create a new task on the server
   *
   * The backend will handle rank shifting for existing tasks automatically.
   *
   * @param data - Task data including title and rank
   * @returns Promise resolving to the created task
   * @throws Error if API call fails or validation fails
   */
  async createTask(data: CreateTaskData): Promise<Task> {
    try {
      // Convert Date objects to ISO strings for API
      const payload = {
        ...data,
        deadline: data.deadline?.toISOString(),
        completedAt: data.completedAt?.toISOString(),
        createdAt: data.createdAt?.toISOString(),
        updatedAt: data.updatedAt?.toISOString(),
      };

      const response = await apiClient.post<TaskResponse>('/api/tasks', payload);

      // Convert date strings back to Date objects
      const task = response.data.task;
      return {
        ...task,
        deadline: task.deadline ? new Date(task.deadline) : undefined,
        completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
      };
    } catch (error) {
      const message = getErrorMessage(error);
      throw new Error(`Failed to create task: ${message}`);
    }
  }

  /**
   * Update an existing task on the server
   *
   * Only the fields provided in the updates object will be modified.
   * The backend automatically sets updatedAt timestamp.
   *
   * @param id - Task ID
   * @param updates - Partial task object with fields to update
   * @returns Promise resolving to the updated task
   * @throws Error if API call fails or task not found
   */
  async updateTask(id: string, updates: UpdateTaskData): Promise<Task> {
    try {
      // Convert Date objects to ISO strings for API
      const payload = {
        ...updates,
        deadline: updates.deadline?.toISOString(),
        completedAt: updates.completedAt?.toISOString(),
        updatedAt: updates.updatedAt?.toISOString(),
      };

      const response = await apiClient.put<TaskResponse>(`/api/tasks/${id}`, payload);

      // Convert date strings back to Date objects
      const task = response.data.task;
      return {
        ...task,
        deadline: task.deadline ? new Date(task.deadline) : undefined,
        completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
      };
    } catch (error) {
      const message = getErrorMessage(error);
      throw new Error(`Failed to update task: ${message}`);
    }
  }

  /**
   * Delete a task from the server
   *
   * The backend will handle rank shifting for remaining tasks automatically.
   *
   * @param id - Task ID
   * @returns Promise resolving when deletion is complete
   * @throws Error if API call fails or task not found
   */
  async deleteTask(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/tasks/${id}`);
    } catch (error) {
      const message = getErrorMessage(error);
      throw new Error(`Failed to delete task: ${message}`);
    }
  }

  /**
   * Mark a task as completed
   *
   * This is a convenience method that updates the task's completed status.
   *
   * @param id - Task ID
   * @returns Promise resolving to the updated task
   * @throws Error if API call fails or task not found
   */
  async completeTask(id: string): Promise<Task> {
    return this.updateTask(id, {
      completed: true,
      completedAt: new Date(),
    });
  }

  /**
   * Sync all local tasks to the server
   *
   * This method is useful for initial sync or bulk sync operations.
   * It creates all local tasks that don't exist on the server.
   *
   * @param localTasks - Array of tasks from local storage
   * @returns Promise resolving to array of sync results
   */
  async syncTasks(localTasks: Task[]): Promise<{ success: Task[]; errors: Array<{ task: Task; error: string }> }> {
    const success: Task[] = [];
    const errors: Array<{ task: Task; error: string }> = [];

    for (const localTask of localTasks) {
      try {
        const createdTask = await this.createTask({
          id: localTask.id,
          title: localTask.title,
          description: localTask.description,
          deadline: localTask.deadline,
          rank: localTask.rank,
          parentId: localTask.parentId,
          depth: localTask.depth,
          completed: localTask.completed,
          completedAt: localTask.completedAt,
          createdAt: localTask.createdAt,
          updatedAt: localTask.updatedAt,
          collaborators: localTask.collaborators,
        });
        success.push(createdTask);
      } catch (error) {
        errors.push({
          task: localTask,
          error: getErrorMessage(error),
        });
      }
    }

    return { success, errors };
  }
}

/**
 * Singleton instance of TaskApiService
 *
 * Use this instance throughout the application for consistency.
 */
export const taskApiService = new TaskApiService();

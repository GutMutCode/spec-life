import { useState, useEffect, useCallback } from 'react';
import { StorageService } from '@/services/StorageService';
import type { Task } from '@shared/Task';

/**
 * React hook for managing task data with StorageService.
 *
 * Provides reactive state management for tasks with automatic refresh.
 * Uses Dexie's live queries for real-time updates when tasks change.
 */
export const useTasks = () => {
  const [topTask, setTopTask] = useState<Task | undefined>(undefined);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  const storageService = new StorageService();

  /**
   * Refreshes task data from storage.
   */
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);

      const [top, active] = await Promise.all([
        storageService.getTopTask(),
        storageService.getActiveTasks(),
      ]);

      setTopTask(top);
      setActiveTasks(active);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load tasks'));
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Creates a new task and refreshes the list.
   */
  const createTask = useCallback(
    async (taskData: {
      title: string;
      description?: string;
      deadline?: Date;
      rank: number;
    }) => {
      try {
        await storageService.createTask(taskData);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create task'));
        throw err;
      }
    },
    [refresh]
  );

  /**
   * Gets a task by ID.
   */
  const getTaskById = useCallback(async (id: string) => {
    return storageService.getTaskById(id);
  }, []);

  /**
   * Completes a task, shifts ranks, and refreshes the list (T074).
   */
  const completeTask = useCallback(
    async (id: string) => {
      try {
        await storageService.completeTask(id);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to complete task'));
        throw err;
      }
    },
    [refresh]
  );

  /**
   * Deletes a task and refreshes the list (T075).
   */
  const deleteTask = useCallback(
    async (id: string) => {
      try {
        await storageService.deleteTask(id);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to delete task'));
        throw err;
      }
    },
    [refresh]
  );

  /**
   * Updates a task and refreshes the list.
   */
  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      try {
        await storageService.updateTask(id, updates);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update task'));
        throw err;
      }
    },
    [refresh]
  );

  // Load initial data
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    topTask,
    activeTasks,
    loading,
    error,
    refresh,
    createTask,
    getTaskById,
    updateTask,
    completeTask,
    deleteTask,
  };
};

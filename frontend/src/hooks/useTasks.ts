/**
 * @file useTasks.ts
 * @description React hook for task state management with optimistic UI updates
 *
 * CURRENT IMPLEMENTATION: Local-only (IndexedDB via StorageService)
 * - Manages React state for topTask and activeTasks arrays
 * - Implements optimistic UI updates for instant feedback (T117)
 * - Calls StorageService for all CRUD operations
 * - Reverts optimistic updates on error
 * - No backend synchronization
 *
 * ARCHITECTURE:
 * - Component calls useTasks hook
 * - Hook updates React state optimistically
 * - Hook calls StorageService methods
 * - StorageService calls IndexedDB layer
 * - Hook refreshes state from IndexedDB on success
 * - Hook reverts state on error
 *
 * TODO: Cloud Sync Integration
 * - [ ] Add sync status state (syncing, synced, offline, error)
 * - [ ] Call API service alongside StorageService (dual-write)
 * - [ ] Handle API errors without reverting IndexedDB writes
 * - [ ] Queue failed API calls for retry when online
 * - [ ] Show sync status indicators in UI
 * - [ ] Add useAuth hook integration for authentication token
 * - [ ] Implement conflict resolution UI when server rejects update
 * - [ ] Add background sync polling for multi-device updates
 * - [ ] Handle real-time updates via WebSocket or polling
 *
 * @see /frontend/ARCHITECTURE.md for system architecture
 */

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
   * Completes a task, shifts ranks, and refreshes the list (T074, T117).
   * Uses optimistic UI updates for immediate feedback.
   */
  const completeTask = useCallback(
    async (id: string) => {
      // Optimistic update (T117)
      const previousTopTask = topTask;
      const previousActiveTasks = activeTasks;

      // Remove task from UI immediately
      setActiveTasks((prev) => prev.filter((task) => task.id !== id));
      if (topTask?.id === id) {
        setTopTask(activeTasks.find((task) => task.id !== id && task.rank === 0));
      }

      try {
        await storageService.completeTask(id);
        await refresh();
      } catch (err) {
        // Revert optimistic update on error
        setTopTask(previousTopTask);
        setActiveTasks(previousActiveTasks);
        setError(err instanceof Error ? err : new Error('Failed to complete task'));
        throw err;
      }
    },
    [refresh, topTask, activeTasks]
  );

  /**
   * Deletes a task and refreshes the list (T075, T117).
   * Uses optimistic UI updates for immediate feedback.
   */
  const deleteTask = useCallback(
    async (id: string) => {
      // Optimistic update (T117)
      const previousTopTask = topTask;
      const previousActiveTasks = activeTasks;

      // Remove task from UI immediately
      setActiveTasks((prev) => prev.filter((task) => task.id !== id));
      if (topTask?.id === id) {
        setTopTask(activeTasks.find((task) => task.id !== id && task.rank === 0));
      }

      try {
        await storageService.deleteTask(id);
        await refresh();
      } catch (err) {
        // Revert optimistic update on error
        setTopTask(previousTopTask);
        setActiveTasks(previousActiveTasks);
        setError(err instanceof Error ? err : new Error('Failed to delete task'));
        throw err;
      }
    },
    [refresh, topTask, activeTasks]
  );

  /**
   * Updates a task and refreshes the list (T117).
   * Uses optimistic UI updates for immediate feedback.
   */
  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      // Optimistic update (T117)
      const previousTopTask = topTask;
      const previousActiveTasks = activeTasks;

      // Update task in UI immediately
      setActiveTasks((prev) =>
        prev.map((task) => (task.id === id ? { ...task, ...updates } : task))
      );
      if (topTask?.id === id) {
        setTopTask({ ...topTask, ...updates });
      }

      try {
        await storageService.updateTask(id, updates);
        await refresh();
      } catch (err) {
        // Revert optimistic update on error
        setTopTask(previousTopTask);
        setActiveTasks(previousActiveTasks);
        setError(err instanceof Error ? err : new Error('Failed to update task'));
        throw err;
      }
    },
    [refresh, topTask, activeTasks]
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

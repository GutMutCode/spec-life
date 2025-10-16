import { useState, useCallback, useEffect, useMemo } from 'react';
import { useMachine } from '@xstate/react';
import { comparisonMachine } from '@/services/comparisonMachine';
import { TaskManager, type InsertTaskResult } from '@/services/TaskManager';
import { getIncompleteTasks } from '@/lib/indexeddb';
import type { Task } from '@shared/Task';

/**
 * React hook for managing task comparison workflow.
 *
 * Integrates ComparisonEngine (XState FSM) with React state management
 * and provides UI-friendly interface for the comparison process.
 *
 * Usage:
 * ```tsx
 * const { start, answer, skip, place, cancel, state, currentTask, isComplete } = useComparison();
 *
 * // Start comparison
 * start({ title: 'New Task', description: '...' });
 *
 * // Answer comparison
 * answer('higher'); // or 'lower'
 *
 * // Skip to manual placement
 * skip();
 *
 * // Place at specific rank
 * place(2);
 * ```
 */
export function useComparison() {
  const [current, send] = useMachine(comparisonMachine);
  const [insertResult, setInsertResult] = useState<InsertTaskResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const taskManager = new TaskManager();

  /**
   * Starts comparison workflow with new task data.
   *
   * @param newTask - Partial task with at least title
   */
  const start = useCallback(
    async (newTask: Partial<Task>) => {
      setError(null);
      setInsertResult(null);

      const existingTasks = await getIncompleteTasks();
      send({ type: 'START', newTask, existingTasks });
    },
    [send]
  );

  /**
   * Answers current comparison question.
   *
   * @param answer - 'higher' if new task is more important, 'lower' if less
   */
  const answer = useCallback(
    (answerValue: 'higher' | 'lower') => {
      send({ type: 'ANSWER', answer: answerValue });
    },
    [send]
  );

  /**
   * Skips remaining comparisons and shows manual placement UI.
   */
  const skip = useCallback(() => {
    send({ type: 'SKIP' });
  }, [send]);

  /**
   * Places task at specific rank (used in manual placement).
   *
   * @param rank - Target rank (0 = highest priority)
   */
  const place = useCallback(
    (rank: number) => {
      send({ type: 'PLACE', rank });
    },
    [send]
  );

  /**
   * Cancels comparison workflow and resets state.
   */
  const cancel = useCallback(() => {
    send({ type: 'CANCEL' });
    setError(null);
    setInsertResult(null);
  }, [send]);

  /**
   * Inserts task when comparison is complete.
   * Automatically called when FSM reaches COMPLETE state.
   */
  useEffect(() => {
    if (
      current.matches('complete') &&
      current.context.finalRank !== undefined &&
      !insertResult // Prevent duplicate insertions
    ) {
      const { newTask, finalRank } = current.context;

      taskManager
        .insertTask(newTask, finalRank)
        .then((result) => {
          setInsertResult(result);
          setError(null);
        })
        .catch((err) => {
          setError(err instanceof Error ? err : new Error('Failed to insert task'));
          console.error('Failed to insert task:', err);
        });
    }
  }, [current.value, current.context.finalRank, insertResult]);

  // Compute current comparison task (T116: memoized)
  const currentTask = useMemo(
    () =>
      current.matches('comparing') &&
      current.context.currentRank >= 0 &&
      current.context.currentRank < current.context.existingTasks.length
        ? current.context.existingTasks[current.context.currentRank]
        : undefined,
    [current.value, current.context.currentRank, current.context.existingTasks]
  );

  return {
    // State queries
    state: current.value as string,
    isIdle: current.matches('idle'),
    isComparing: current.matches('comparing'),
    isPlacing: current.matches('placing'),
    isComplete: current.matches('complete'),
    isCancelled: current.matches('cancelled'),

    // Current comparison data
    currentTask,
    newTask: current.context.newTask,
    stepCount: current.context.stepCount,
    currentRank: current.context.currentRank,
    finalRank: current.context.finalRank,
    existingTasks: current.context.existingTasks,

    // Result data
    insertResult,
    insertedTask: insertResult?.task || null,
    error,

    // Actions
    start,
    answer,
    skip,
    place,
    cancel,
  };
}

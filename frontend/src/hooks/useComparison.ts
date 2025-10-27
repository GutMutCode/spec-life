import { useState, useCallback, useEffect, useMemo } from 'react';
import { useMachine } from '@xstate/react';
import { comparisonMachine } from '@/services/comparisonMachine';
import { TaskManager, type InsertTaskResult } from '@/services/TaskManager';
import { getIncompleteTasks } from '@/lib/indexeddb';
import type { Task } from '@shared/Task';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Comparison answer value
 *
 * Used when user answers a comparison question:
 * - 'higher': New task is MORE important than the compared task
 * - 'lower': New task is LESS important than the compared task
 *
 * BINARY SEARCH LOGIC:
 * - 'higher': Search lower ranks (0 direction)
 * - 'lower': Search higher ranks (towards end of list)
 *
 * @example
 * ```typescript
 * const answer: ComparisonAnswer = 'higher';
 * comparisonHook.answer(answer);
 * ```
 */
export type ComparisonAnswer = 'higher' | 'lower';

/**
 * Comparison state machine states
 *
 * STATE TRANSITIONS:
 * idle → comparing → complete
 *   ↓       ↓         ↓
 *   └─ cancelled ─────┘
 *   └─── placing ─────┘
 *
 * STATE DESCRIPTIONS:
 * - idle: Waiting to start comparison
 * - comparing: Showing comparison question to user
 * - placing: Manual placement mode (user skipped comparisons)
 * - complete: Comparison done, task inserted
 * - cancelled: User cancelled workflow
 */
export type ComparisonState = 'idle' | 'comparing' | 'placing' | 'complete' | 'cancelled';

/**
 * Return type of useComparison hook
 *
 * Provides complete interface for task comparison workflow including:
 * - State queries (isComparing, isComplete, etc.)
 * - Current comparison data (currentTask, newTask, stepCount)
 * - Result data (insertedTask, error)
 * - Actions (start, answer, skip, place, cancel)
 *
 * @example
 * ```typescript
 * function AddTaskPage() {
 *   const comparison: UseComparisonResult = useComparison();
 *
 *   if (comparison.isComparing && comparison.currentTask) {
 *     return (
 *       <ComparisonQuestion
 *         newTask={comparison.newTask}
 *         existingTask={comparison.currentTask}
 *         onAnswer={comparison.answer}
 *         onSkip={comparison.skip}
 *       />
 *     );
 *   }
 *
 *   if (comparison.isComplete && comparison.insertedTask) {
 *     return <SuccessMessage task={comparison.insertedTask} />;
 *   }
 *
 *   return <TaskForm onSubmit={comparison.start} />;
 * }
 * ```
 */
export interface UseComparisonResult {
  // ===== STATE QUERIES =====

  /**
   * Current FSM state name
   * One of: 'idle', 'comparing', 'placing', 'complete', 'cancelled'
   */
  state: string;

  /**
   * True when in idle state (waiting to start)
   */
  isIdle: boolean;

  /**
   * True when in comparing state (showing comparison question)
   */
  isComparing: boolean;

  /**
   * True when in placing state (manual placement mode)
   */
  isPlacing: boolean;

  /**
   * True when in complete state (task inserted successfully)
   */
  isComplete: boolean;

  /**
   * True when in cancelled state (user cancelled workflow)
   */
  isCancelled: boolean;

  // ===== CURRENT COMPARISON DATA =====

  /**
   * Task being compared against (undefined when not comparing)
   *
   * This is the task shown in the comparison question:
   * "Is your new task more important than: {currentTask.title}?"
   */
  currentTask: Task | undefined;

  /**
   * New task being inserted
   * Contains at minimum: title, and optionally description, deadline
   */
  newTask: Partial<Task>;

  /**
   * Number of comparison questions answered so far
   * Used for progress tracking: "Question {stepCount} of {total}"
   */
  stepCount: number;

  /**
   * Current rank being tested in binary search
   * Internal state - not typically displayed to user
   */
  currentRank: number;

  /**
   * Final rank determined by comparison (undefined until complete)
   * This is where the task will be inserted (0 = highest priority)
   */
  finalRank: number | undefined;

  /**
   * List of existing tasks at same level (same parentId)
   * Used for comparison - filtered to sibling tasks only
   */
  existingTasks: Task[];

  // ===== RESULT DATA =====

  /**
   * Result of task insertion (null until complete)
   * Contains inserted task and rank-shifted tasks
   */
  insertResult: InsertTaskResult | null;

  /**
   * Successfully inserted task (null until complete)
   * Shortcut for insertResult?.task
   */
  insertedTask: Task | null;

  /**
   * Error that occurred during insertion (null if no error)
   */
  error: Error | null;

  // ===== ACTIONS =====

  /**
   * Start comparison workflow with new task data
   *
   * Loads existing tasks and begins binary search comparison.
   * Only compares with tasks at same hierarchical level (same parentId).
   *
   * @param newTask - Partial task with at least title
   *
   * @example
   * ```typescript
   * comparison.start({
   *   title: 'Implement login page',
   *   description: 'Add user authentication UI',
   *   deadline: new Date('2025-12-31'),
   *   parentId: null // Top-level task
   * });
   * ```
   */
  start: (newTask: Partial<Task>) => Promise<void>;

  /**
   * Answer current comparison question
   *
   * Advances binary search based on user's answer.
   *
   * @param answer - 'higher' if new task is more important, 'lower' if less
   *
   * @example
   * ```typescript
   * // User says new task is more important
   * comparison.answer('higher');
   *
   * // User says new task is less important
   * comparison.answer('lower');
   * ```
   */
  answer: (answer: ComparisonAnswer) => void;

  /**
   * Skip remaining comparisons and enter manual placement mode
   *
   * Transitions to 'placing' state where user can select rank manually.
   *
   * @example
   * ```typescript
   * <button onClick={comparison.skip}>
   *   Skip and place manually
   * </button>
   * ```
   */
  skip: () => void;

  /**
   * Place task at specific rank (used in manual placement mode)
   *
   * Typically used after skip() when user selects rank from list.
   *
   * @param rank - Target rank (0 = highest priority)
   *
   * @example
   * ```typescript
   * // Place at rank 3 (fourth position, since 0-indexed)
   * comparison.place(3);
   * ```
   */
  place: (rank: number) => void;

  /**
   * Cancel comparison workflow and reset to idle state
   *
   * Discards all comparison progress. No task is inserted.
   *
   * @example
   * ```typescript
   * <button onClick={comparison.cancel}>
   *   Cancel
   * </button>
   * ```
   */
  cancel: () => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * React hook for managing task comparison workflow
 *
 * Integrates ComparisonEngine (XState FSM) with React state management
 * and provides UI-friendly interface for the comparison process.
 *
 * WORKFLOW:
 * 1. User calls start() with new task data
 * 2. Hook loads existing tasks at same level (same parentId)
 * 3. FSM begins binary search comparison
 * 4. User answers comparison questions via answer()
 * 5. OR user skips via skip() and uses place()
 * 6. FSM determines final rank
 * 7. Hook automatically inserts task via TaskManager
 * 8. Returns to idle state
 *
 * HIERARCHICAL BEHAVIOR:
 * - Top-level tasks (parentId=null) compare with other top-level tasks
 * - Subtasks compare only with sibling subtasks (same parentId)
 * - Each level has independent ranking (ranks restart at 0)
 *
 * STATE MACHINE:
 * Uses XState FSM (comparisonMachine) for state transitions:
 * - idle → START → comparing
 * - comparing → ANSWER → comparing (loop until done)
 * - comparing → SKIP → placing
 * - placing → PLACE → complete
 * - comparing → done → complete
 * - any → CANCEL → cancelled
 *
 * AUTOMATIC INSERTION:
 * When FSM reaches 'complete' state, hook automatically:
 * 1. Calls TaskManager.insertTask()
 * 2. Stores result in insertResult state
 * 3. Handles errors in error state
 *
 * PERFORMANCE:
 * - currentTask is memoized (only recomputes when rank changes)
 * - Callbacks are wrapped in useCallback (stable references)
 * - Prevents duplicate insertions (guards against double-render)
 *
 * @returns UseComparisonResult object with state, data, and actions
 *
 * @example
 * ```tsx
 * function AddTaskPage() {
 *   const comparison = useComparison();
 *
 *   const handleSubmit = (formData: { title: string; description: string }) => {
 *     comparison.start(formData);
 *   };
 *
 *   if (comparison.isComparing && comparison.currentTask) {
 *     return (
 *       <div>
 *         <h2>Question {comparison.stepCount}</h2>
 *         <p>Is "{comparison.newTask.title}" more important than:</p>
 *         <p>"{comparison.currentTask.title}"?</p>
 *         <button onClick={() => comparison.answer('higher')}>Yes</button>
 *         <button onClick={() => comparison.answer('lower')}>No</button>
 *         <button onClick={comparison.skip}>Skip</button>
 *       </div>
 *     );
 *   }
 *
 *   if (comparison.isComplete && comparison.insertedTask) {
 *     return <div>Task added at rank {comparison.insertedTask.rank}!</div>;
 *   }
 *
 *   return <TaskForm onSubmit={handleSubmit} />;
 * }
 * ```
 *
 * @see comparisonMachine for FSM implementation
 * @see TaskManager.insertTask() for insertion logic
 */
export function useComparison(): UseComparisonResult {
  const [current, send] = useMachine(comparisonMachine);
  const [insertResult, setInsertResult] = useState<InsertTaskResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const taskManager = new TaskManager();

  /**
   * Starts comparison workflow with new task data.
   *
   * Hierarchical behavior:
   * - Only compares with tasks at the same level (same parentId)
   * - Top-level tasks (parentId=null) compare with other top-level tasks
   * - Subtasks compare only with sibling subtasks
   *
   * @param newTask - Partial task with at least title
   */
  const start = useCallback(
    async (newTask: Partial<Task>) => {
      setError(null);
      setInsertResult(null);

      const allTasks = await getIncompleteTasks();

      // Filter tasks to only include same-level tasks (same parentId)
      const parentId = newTask.parentId ?? null;
      const existingTasks = allTasks.filter((task) => task.parentId === parentId);

      send({ type: 'START', newTask, existingTasks });
    },
    [send]
  );

  /**
   * Answer current comparison question
   *
   * Advances binary search based on user's answer.
   * Sends ANSWER event to FSM with user's choice.
   *
   * BEHAVIOR:
   * - 'higher': New task ranks lower (closer to 0)
   * - 'lower': New task ranks higher (towards end)
   *
   * @param answerValue - 'higher' if new task more important, 'lower' if less
   */
  const answer = useCallback(
    (answerValue: ComparisonAnswer) => {
      send({ type: 'ANSWER', answer: answerValue });
    },
    [send]
  );

  /**
   * Skip remaining comparisons and enter manual placement mode
   *
   * Transitions FSM from 'comparing' to 'placing' state.
   * User can then select rank manually from list of tasks.
   *
   * USE CASE:
   * When user finds comparisons too tedious or confusing,
   * they can skip and visually select position in task list.
   */
  const skip = useCallback(() => {
    send({ type: 'SKIP' });
  }, [send]);

  /**
   * Place task at specific rank (used in manual placement mode)
   *
   * Transitions FSM from 'placing' to 'complete' state.
   * Task will be inserted at specified rank.
   *
   * @param rank - Target rank (0 = highest priority, 0-indexed)
   *
   * RANK SHIFTING:
   * Existing tasks at rank >= specified rank will have rank incremented.
   */
  const place = useCallback(
    (rank: number) => {
      send({ type: 'PLACE', rank });
    },
    [send]
  );

  /**
   * Cancel comparison workflow and reset to idle state
   *
   * Transitions FSM to 'cancelled' state, then back to 'idle'.
   * Clears all comparison progress and error state.
   *
   * BEHAVIOR:
   * - No task is inserted
   * - All comparison progress is lost
   * - FSM returns to idle state
   * - Error and result states are cleared
   */
  const cancel = useCallback(() => {
    send({ type: 'CANCEL' });
    setError(null);
    setInsertResult(null);
  }, [send]);

  /**
   * AUTO-INSERT EFFECT
   *
   * Automatically inserts task when FSM reaches 'complete' state.
   * Runs when finalRank is determined by comparison or manual placement.
   *
   * TRIGGER CONDITIONS:
   * - FSM state is 'complete'
   * - finalRank is defined (comparison finished)
   * - insertResult is null (prevents duplicate insertions on re-render)
   *
   * BEHAVIOR:
   * 1. Calls TaskManager.insertTask() with newTask and finalRank
   * 2. On success: Sets insertResult state, clears error
   * 3. On error: Sets error state, logs to console
   *
   * IDEMPOTENCY:
   * Guard condition (!insertResult) ensures insertion happens only once,
   * even if React re-renders the component in Strict Mode or due to state changes.
   *
   * ERROR HANDLING:
   * Errors are caught and stored in error state, not thrown.
   * UI can display error message to user.
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

  /**
   * CURRENT TASK COMPUTATION (Memoized for performance - T116)
   *
   * Computes the task currently being compared against.
   * Only recomputes when FSM state, currentRank, or existingTasks changes.
   *
   * RETURN VALUE:
   * - Task object: When in 'comparing' state with valid currentRank
   * - undefined: When not comparing, or currentRank out of bounds
   *
   * MEMOIZATION:
   * Prevents unnecessary re-computation when other state changes.
   * Important because this value is used in render logic.
   *
   * DEPENDENCIES:
   * - current.value: FSM state (idle, comparing, placing, complete, cancelled)
   * - current.context.currentRank: Index of task being compared
   * - current.context.existingTasks: Array of tasks for comparison
   */
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

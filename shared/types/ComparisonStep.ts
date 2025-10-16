import { Task } from './Task';

/**
 * States for the comparison workflow finite state machine.
 *
 * Workflow: IDLE → COMPARING → (repeat up to 10 times) → PLACING → COMPLETE
 * User can skip to PLACING or cancel to CANCELLED at any time.
 */
export enum ComparisonState {
  /** Initial state, no comparison in progress */
  IDLE = 'idle',

  /** Actively comparing new task against existing task */
  COMPARING = 'comparing',

  /** User chose to skip or hit 10-step limit, placing at current rank */
  PLACING = 'placing',

  /** Comparison workflow completed successfully */
  COMPLETE = 'complete',

  /** User cancelled the comparison workflow */
  CANCELLED = 'cancelled',
}

/**
 * Represents the current state of a comparison workflow session.
 *
 * Used to track the binary search process for determining task priority.
 */
export interface ComparisonStep {
  /** Current FSM state */
  state: ComparisonState;

  /** The new task being prioritized (may be incomplete during workflow) */
  newTask: Partial<Task>;

  /** The existing task currently being compared against (if in COMPARING state) */
  currentComparisonTask?: Task;

  /** Current rank position being considered (0 = highest priority) */
  currentRank: number;

  /** Number of comparison steps completed so far (max 10 per FR-033) */
  stepCount: number;

  /** Final rank assigned when state=COMPLETE (undefined until then) */
  finalRank?: number;
}

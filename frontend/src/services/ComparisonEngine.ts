import { createMachine, interpret, type ActorRefFrom, assign, setup } from 'xstate';
import { ComparisonState, type ComparisonStep } from '@shared/ComparisonStep';
import type { Task } from '@shared/Task';
import { getIncompleteTasks } from '@/lib/indexeddb';

/**
 * ComparisonEngine implements binary search for task priority insertion.
 *
 * Uses XState FSM with 5 states:
 * - IDLE: No comparison in progress
 * - COMPARING: User comparing new task against existing task
 * - PLACING: Determined insertion point, ready to insert
 * - COMPLETE: Comparison finished successfully
 * - CANCELLED: User cancelled comparison
 *
 * Workflow:
 * 1. Start with new task
 * 2. Binary search through existing tasks
 * 3. User chooses "More Important" or "Less Important"
 * 4. After 10 steps or user skip, transition to PLACING
 * 5. Finalize to get final rank
 */

export interface ComparisonContext {
  newTask: Partial<Task>;
  existingTasks: Task[];
  low: number;
  high: number;
  currentRank: number;
  stepCount: number;
  finalRank?: number;
}

export type ComparisonEvent =
  | { type: 'START'; newTask: Partial<Task> }
  | { type: 'ANSWER'; answer: 'higher' | 'lower' }
  | { type: 'SKIP' }
  | { type: 'PLACE'; rank: number }
  | { type: 'CANCEL' };

export class ComparisonEngine {
  private machine: ReturnType<typeof createMachine<ComparisonContext, ComparisonEvent>>;
  private actor: ActorRefFrom<typeof this.machine>;
  private existingTasks: Task[];

  constructor(existingTasks: Task[]) {
    this.existingTasks = existingTasks.sort((a, b) => a.rank - b.rank);

    this.machine = createMachine({
      id: 'comparison',
      initial: 'idle',
      context: {
        newTask: {},
        existingTasks: this.existingTasks,
        low: 0,
        high: this.existingTasks.length - 1,
        currentRank: Math.floor(this.existingTasks.length / 2),
        stepCount: 0,
        finalRank: undefined,
      },
      states: {
        idle: {
          on: {
            START: {
              target: 'comparing',
              actions: 'initializeComparison',
            },
          },
        },
        comparing: {
          on: {
            MORE_IMPORTANT: [
              {
                target: 'placing',
                guard: 'isAtHighestRank',
                actions: 'setRankToZero',
              },
              {
                target: 'placing',
                guard: 'hasReached10Steps',
                actions: 'moveToHigherRank',
              },
              {
                target: 'placing',
                guard: 'hasConverged',
                actions: 'moveToHigherRank',
              },
              {
                target: 'comparing',
                actions: 'moveToHigherRank',
              },
            ],
            LESS_IMPORTANT: [
              {
                target: 'placing',
                guard: 'isAtLowestRank',
                actions: 'setRankToEnd',
              },
              {
                target: 'placing',
                guard: 'hasReached10Steps',
                actions: 'moveToLowerRank',
              },
              {
                target: 'placing',
                guard: 'hasConverged',
                actions: 'moveToLowerRank',
              },
              {
                target: 'comparing',
                actions: 'moveToLowerRank',
              },
            ],
            SKIP: {
              target: 'placing',
              actions: 'setCurrentRank',
            },
            CANCEL: {
              target: 'cancelled',
            },
          },
        },
        placing: {
          on: {
            FINALIZE: {
              target: 'complete',
              actions: 'finalizePlacement',
            },
            CANCEL: {
              target: 'cancelled',
            },
          },
        },
        complete: {
          type: 'final',
        },
        cancelled: {
          type: 'final',
        },
      },
    }, {
      actions: {
        initializeComparison: ({ context, event }) => {
          if (event.type !== 'START') return;

          context.newTask = event.newTask;
          context.low = 0;
          context.high = context.existingTasks.length - 1;
          context.currentRank = Math.floor(context.existingTasks.length / 2);
          context.stepCount = 0;
        },
        moveToHigherRank: ({ context }) => {
          context.stepCount++;
          context.high = context.currentRank - 1;
          if (context.low <= context.high) {
            context.currentRank = Math.floor((context.low + context.high) / 2);
          } else {
            context.finalRank = context.low;
          }
        },
        moveToLowerRank: ({ context }) => {
          context.stepCount++;
          context.low = context.currentRank + 1;
          if (context.low <= context.high) {
            context.currentRank = Math.floor((context.low + context.high) / 2);
          } else {
            context.finalRank = context.low;
          }
        },
        setRankToZero: ({ context }) => {
          context.finalRank = 0;
        },
        setRankToEnd: ({ context }) => {
          context.finalRank = context.existingTasks.length;
        },
        setCurrentRank: ({ context }) => {
          context.finalRank = context.currentRank;
        },
        finalizePlacement: ({ context }) => {
          if (context.finalRank === undefined) {
            context.finalRank = context.currentRank;
          }
        },
      },
      guards: {
        isAtHighestRank: ({ context }) => context.currentRank === 0,
        isAtLowestRank: ({ context }) => context.currentRank >= context.existingTasks.length - 1,
        hasReached10Steps: ({ context }) => context.stepCount >= 9, // After this action, it will be 10
        hasConverged: ({ context }) => context.finalRank !== undefined,
      },
    });

    this.actor = interpret(this.machine).start();
  }

  /**
   * Starts comparison workflow with a new task.
   */
  startComparison(newTask: Partial<Task>): void {
    this.actor.send({ type: 'START', newTask });
  }

  /**
   * User chose "More Important" - new task is higher priority than current comparison task.
   */
  chooseMoreImportant(): void {
    this.actor.send({ type: 'MORE_IMPORTANT' });
  }

  /**
   * User chose "Less Important" - new task is lower priority than current comparison task.
   */
  chooseLessImportant(): void {
    this.actor.send({ type: 'LESS_IMPORTANT' });
  }

  /**
   * User skipped - place at current rank.
   */
  skip(): void {
    this.actor.send({ type: 'SKIP' });
  }

  /**
   * Finalize placement and transition to COMPLETE.
   */
  finalize(): void {
    this.actor.send({ type: 'FINALIZE' });
  }

  /**
   * Cancel comparison workflow.
   */
  cancel(): void {
    this.actor.send({ type: 'CANCEL' });
  }

  /**
   * Gets current comparison state.
   */
  getState(): ComparisonStep {
    const snapshot = this.actor.getSnapshot();
    const context = snapshot.context;

    let state: ComparisonState;
    if (snapshot.matches('idle')) state = ComparisonState.IDLE;
    else if (snapshot.matches('comparing')) state = ComparisonState.COMPARING;
    else if (snapshot.matches('placing')) state = ComparisonState.PLACING;
    else if (snapshot.matches('complete')) state = ComparisonState.COMPLETE;
    else if (snapshot.matches('cancelled')) state = ComparisonState.CANCELLED;
    else state = ComparisonState.IDLE;

    const currentComparisonTask =
      state === ComparisonState.COMPARING && context.currentRank >= 0 && context.currentRank < context.existingTasks.length
        ? context.existingTasks[context.currentRank]
        : undefined;

    return {
      state,
      newTask: context.newTask,
      currentComparisonTask,
      currentRank: context.currentRank,
      stepCount: context.stepCount,
      finalRank: context.finalRank,
    };
  }

  /**
   * Stops the FSM actor.
   */
  stop(): void {
    this.actor.stop();
  }
}

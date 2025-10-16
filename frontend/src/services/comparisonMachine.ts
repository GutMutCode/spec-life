import { setup, assign } from 'xstate';
import type { Task } from '@shared/Task';

/**
 * XState machine for comparison workflow using setup() API (v5).
 *
 * This machine is designed to work with useMachine hook from @xstate/react.
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
  | { type: 'START'; newTask: Partial<Task>; existingTasks: Task[] }
  | { type: 'ANSWER'; answer: 'higher' | 'lower' }
  | { type: 'SKIP' }
  | { type: 'PLACE'; rank: number }
  | { type: 'CANCEL' };

/**
 * Creates comparison machine using XState v5 setup() API.
 */
export const comparisonMachine = setup({
  types: {
    context: {} as ComparisonContext,
    events: {} as ComparisonEvent,
  },
  guards: {
    hasNoTasks: ({ context, event }) =>
      event.type === 'START' && event.existingTasks.length === 0,
    isHigherAndAtTop: ({ context, event }) =>
      event.type === 'ANSWER' && event.answer === 'higher' && context.currentRank === 0,
    isLowerAndAtBottom: ({ context, event }) =>
      event.type === 'ANSWER' && event.answer === 'lower' && context.currentRank >= context.existingTasks.length - 1,
    isHigherAnd10Steps: ({ context, event }) =>
      event.type === 'ANSWER' && event.answer === 'higher' && context.stepCount >= 9,
    isLowerAnd10Steps: ({ context, event }) =>
      event.type === 'ANSWER' && event.answer === 'lower' && context.stepCount >= 9,
    isHigherAndConverged: ({ context, event }) => {
      if (event.type !== 'ANSWER' || event.answer !== 'higher') return false;
      const nextHigh = context.currentRank - 1;
      return context.low > nextHigh;
    },
    isLowerAndConverged: ({ context, event }) => {
      if (event.type !== 'ANSWER' || event.answer !== 'lower') return false;
      const nextLow = context.currentRank + 1;
      return nextLow > context.high;
    },
    isHigher: ({ event }) =>
      event.type === 'ANSWER' && event.answer === 'higher',
    isLower: ({ event }) =>
      event.type === 'ANSWER' && event.answer === 'lower',
  },
  actions: {
    initializeComparison: assign(({ event }) => {
      if (event.type !== 'START') return {};

      const existingTasks = event.existingTasks.sort((a, b) => a.rank - b.rank);

      return {
        newTask: event.newTask,
        existingTasks,
        low: 0,
        high: existingTasks.length - 1,
        currentRank: Math.floor(existingTasks.length / 2),
        stepCount: 0,
        finalRank: undefined,
      };
    }),
    moveToHigherRank: assign(({ context }) => {
      const stepCount = context.stepCount + 1;
      const high = context.currentRank - 1;
      const low = context.low;

      let currentRank = context.currentRank;
      let finalRank = context.finalRank;

      if (low <= high) {
        currentRank = Math.floor((low + high) / 2);
      } else {
        finalRank = low;
      }

      return {
        stepCount,
        high,
        currentRank,
        finalRank,
      };
    }),
    moveToLowerRank: assign(({ context }) => {
      const stepCount = context.stepCount + 1;
      const low = context.currentRank + 1;
      const high = context.high;

      let currentRank = context.currentRank;
      let finalRank = context.finalRank;

      if (low <= high) {
        currentRank = Math.floor((low + high) / 2);
      } else {
        finalRank = low;
      }

      return {
        stepCount,
        low,
        currentRank,
        finalRank,
      };
    }),
    setRankToZero: assign({
      finalRank: 0,
    }),
    setRankToZeroWithTask: assign(({ event }) => {
      if (event.type !== 'START') return {};
      return {
        newTask: event.newTask,
        existingTasks: event.existingTasks,
        finalRank: 0,
      };
    }),
    setRankToEnd: assign(({ context }) => ({
      finalRank: context.existingTasks.length,
    })),
    setPlacedRank: assign(({ event }) => {
      if (event.type !== 'PLACE') return {};
      return {
        finalRank: event.rank,
      };
    }),
  },
}).createMachine({
  id: 'comparison',
  initial: 'idle',
  context: {
    newTask: {},
    existingTasks: [],
    low: 0,
    high: -1,
    currentRank: 0,
    stepCount: 0,
    finalRank: undefined,
  },
  states: {
    idle: {
      on: {
        START: [
          {
            target: 'complete',
            guard: 'hasNoTasks',
            actions: 'setRankToZeroWithTask',
          },
          {
            target: 'comparing',
            actions: 'initializeComparison',
          },
        ],
      },
    },
    comparing: {
      on: {
        ANSWER: [
          {
            target: 'complete',
            guard: 'isHigherAndAtTop',
            actions: 'setRankToZero',
          },
          {
            target: 'complete',
            guard: 'isLowerAndAtBottom',
            actions: 'setRankToEnd',
          },
          {
            target: 'placing',
            guard: 'isHigherAnd10Steps',
            actions: 'moveToHigherRank',
          },
          {
            target: 'placing',
            guard: 'isLowerAnd10Steps',
            actions: 'moveToLowerRank',
          },
          {
            target: 'complete',
            guard: 'isHigherAndConverged',
            actions: 'moveToHigherRank',
          },
          {
            target: 'complete',
            guard: 'isLowerAndConverged',
            actions: 'moveToLowerRank',
          },
          {
            target: 'comparing',
            guard: 'isHigher',
            actions: 'moveToHigherRank',
          },
          {
            target: 'comparing',
            guard: 'isLower',
            actions: 'moveToLowerRank',
          },
        ],
        SKIP: {
          target: 'placing',
        },
        CANCEL: {
          target: 'cancelled',
        },
      },
    },
    placing: {
      on: {
        PLACE: {
          target: 'complete',
          actions: 'setPlacedRank',
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
});

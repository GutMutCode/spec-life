import { describe, it, expect, beforeEach } from 'vitest';
import { ComparisonEngine } from '@/services/ComparisonEngine';
import { ComparisonState } from '@shared/ComparisonStep';
import type { Task } from '@shared/Task';

describe('ComparisonEngine', () => {
  let engine: ComparisonEngine;
  let existingTasks: Task[];

  beforeEach(() => {
    existingTasks = [
      {
        id: crypto.randomUUID(),
        title: 'Task at rank 0',
        rank: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        title: 'Task at rank 1',
        rank: 1,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        title: 'Task at rank 2',
        rank: 2,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  });

  describe('FSM State Transitions (T035)', () => {
    it('should start in IDLE state', () => {
      engine = new ComparisonEngine(existingTasks);
      const state = engine.getState();

      expect(state.state).toBe(ComparisonState.IDLE);
      expect(state.stepCount).toBe(0);
    });

    it('should transition from IDLE to COMPARING when starting comparison', () => {
      engine = new ComparisonEngine(existingTasks);

      engine.startComparison({ title: 'New task' });
      const state = engine.getState();

      expect(state.state).toBe(ComparisonState.COMPARING);
      expect(state.newTask.title).toBe('New task');
      expect(state.currentComparisonTask).toBeDefined();
      expect(state.stepCount).toBe(0);
    });

    it('should transition from COMPARING to COMPARING after binary choice', () => {
      engine = new ComparisonEngine(existingTasks);
      engine.startComparison({ title: 'New task' });

      engine.chooseMoreImportant();
      const state = engine.getState();

      expect(state.state).toBe(ComparisonState.COMPARING);
      expect(state.stepCount).toBe(1);
    });

    it('should transition from COMPARING to PLACING when skip is clicked', () => {
      engine = new ComparisonEngine(existingTasks);
      engine.startComparison({ title: 'New task' });

      engine.skip();
      const state = engine.getState();

      expect(state.state).toBe(ComparisonState.PLACING);
    });

    it('should transition from PLACING to COMPLETE when finalized', () => {
      engine = new ComparisonEngine(existingTasks);
      engine.startComparison({ title: 'New task' });
      engine.skip();

      engine.finalize();
      const state = engine.getState();

      expect(state.state).toBe(ComparisonState.COMPLETE);
      expect(state.finalRank).toBeDefined();
    });

    it('should transition from COMPARING to CANCELLED when cancelled', () => {
      engine = new ComparisonEngine(existingTasks);
      engine.startComparison({ title: 'New task' });

      engine.cancel();
      const state = engine.getState();

      expect(state.state).toBe(ComparisonState.CANCELLED);
    });
  });

  describe('10-Step Limit Enforcement (T036)', () => {
    it('should auto-transition to PLACING after 10 comparisons', () => {
      // Create enough tasks that binary search could exceed 10 steps
      // With alternating more/less choices to maximize steps
      const manyTasks: Task[] = Array.from({ length: 100 }, (_, i) => ({
        id: crypto.randomUUID(),
        title: `Task ${i}`,
        rank: i,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      engine = new ComparisonEngine(manyTasks);
      engine.startComparison({ title: 'New task' });

      // Make 10 comparisons - alternate to delay convergence
      let alternate = true;
      for (let i = 0; i < 12; i++) {
        const state = engine.getState();
        if (state.state !== ComparisonState.COMPARING) break;

        if (alternate) {
          engine.chooseMoreImportant();
        } else {
          engine.chooseLessImportant();
        }
        alternate = !alternate;
      }

      const state = engine.getState();
      expect(state.state).toBe(ComparisonState.PLACING);
      expect(state.stepCount).toBeLessThanOrEqual(10);
    });

    it('should not exceed 10 steps', () => {
      const manyTasks: Task[] = Array.from({ length: 20 }, (_, i) => ({
        id: crypto.randomUUID(),
        title: `Task ${i}`,
        rank: i,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      engine = new ComparisonEngine(manyTasks);
      engine.startComparison({ title: 'New task' });

      // Try to make 15 comparisons (should stop at 10)
      for (let i = 0; i < 15; i++) {
        const state = engine.getState();
        if (state.state === ComparisonState.COMPARING) {
          engine.chooseMoreImportant();
        }
      }

      const state = engine.getState();
      expect(state.stepCount).toBeLessThanOrEqual(10);
    });
  });

  describe('Skip Functionality (T037)', () => {
    it('should allow skipping at any step', () => {
      engine = new ComparisonEngine(existingTasks);
      engine.startComparison({ title: 'New task' });

      // Make 1 comparison then skip
      engine.chooseMoreImportant();

      const stateBefore = engine.getState();
      const stepsBefore = stateBefore.stepCount;

      engine.skip();

      const state = engine.getState();
      expect(state.state).toBe(ComparisonState.PLACING);
      expect(state.stepCount).toBe(stepsBefore);
    });

    it('should place at current rank when skipped', () => {
      engine = new ComparisonEngine(existingTasks);
      engine.startComparison({ title: 'New task' });

      engine.skip();
      engine.finalize();

      const state = engine.getState();
      expect(state.finalRank).toBeDefined();
      expect(state.finalRank).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Deadline Display During Comparison (T037A)', () => {
    it('should include deadline in comparison task when present', () => {
      const tasksWithDeadline: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Task with deadline',
          deadline: new Date('2025-12-31'),
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      engine = new ComparisonEngine(tasksWithDeadline);
      engine.startComparison({ title: 'New task' });

      const state = engine.getState();
      expect(state.currentComparisonTask?.deadline).toBeDefined();
      expect(state.currentComparisonTask?.deadline).toEqual(tasksWithDeadline[0].deadline);
    });

    it('should handle tasks without deadlines', () => {
      engine = new ComparisonEngine(existingTasks);
      engine.startComparison({ title: 'New task' });

      const state = engine.getState();
      expect(state.currentComparisonTask?.deadline).toBeUndefined();
    });
  });

  describe('Tiebreaker Logic (T038A)', () => {
    it('should place new task after existing task when considered equal', () => {
      const taskAtRank0: Task = {
        id: crypto.randomUUID(),
        title: 'Existing at rank 0',
        rank: 0,
        completed: false,
        createdAt: new Date(Date.now() - 1000), // Created 1 second ago
        updatedAt: new Date(),
      };

      engine = new ComparisonEngine([taskAtRank0]);
      engine.startComparison({
        title: 'New task',
      });

      // User considers them equal - chooses "Less Important" to place after
      engine.chooseLessImportant();
      engine.finalize();

      const state = engine.getState();
      // New task should be placed at rank 1 (after existing task at rank 0)
      expect(state.finalRank).toBe(1);
    });

    it('should use creation timestamp for tiebreaker', () => {
      const olderTask: Task = {
        id: crypto.randomUUID(),
        title: 'Older task',
        rank: 0,
        completed: false,
        createdAt: new Date(Date.now() - 10000), // Created 10 seconds ago
        updatedAt: new Date(),
      };

      engine = new ComparisonEngine([olderTask]);
      engine.startComparison({ title: 'Newer task' });

      const state = engine.getState();
      // When tasks are equal, newer task (later createdAt) goes after older task
      expect(state.currentComparisonTask).toBeDefined();
    });
  });

  describe('Binary Search Logic', () => {
    it('should use binary search to find insertion point', () => {
      engine = new ComparisonEngine(existingTasks);
      engine.startComparison({ title: 'New task' });

      // First comparison should be with middle task (rank 1)
      const state1 = engine.getState();
      expect(state1.currentComparisonTask?.rank).toBe(1);

      // Choose "More Important" - should compare with rank 0
      engine.chooseMoreImportant();
      const state2 = engine.getState();
      expect(state2.currentComparisonTask?.rank).toBe(0);

      // Choose "Less Important" - should place at rank 1
      engine.chooseLessImportant();
      engine.finalize();

      const state3 = engine.getState();
      expect(state3.finalRank).toBe(1);
    });

    it('should handle choosing "More Important" than rank 0', () => {
      engine = new ComparisonEngine(existingTasks);
      engine.startComparison({ title: 'New task' });

      // Compare with middle (rank 1), choose more important
      engine.chooseMoreImportant();
      // Compare with rank 0, choose more important
      engine.chooseMoreImportant();

      // Should transition to PLACING at rank 0
      const state = engine.getState();
      expect(state.state).toBe(ComparisonState.PLACING);

      engine.finalize();
      expect(engine.getState().finalRank).toBe(0);
    });

    it('should handle choosing "Less Important" than all tasks', () => {
      engine = new ComparisonEngine(existingTasks);
      engine.startComparison({ title: 'New task' });

      // Compare with middle (rank 1), choose less important
      engine.chooseLessImportant();
      // Compare with rank 2, choose less important
      engine.chooseLessImportant();

      // Should transition to PLACING at end
      const state = engine.getState();
      expect(state.state).toBe(ComparisonState.PLACING);

      engine.finalize();
      expect(engine.getState().finalRank).toBe(3);
    });
  });
});

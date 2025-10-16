import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runCleanup } from '@/lib/cleanup';
import { db } from '@/lib/indexeddb';
import type { Task } from '@shared/Task';

/**
 * Unit tests for daily cleanup job (T070)
 *
 * Tests the cleanup job that:
 * - Runs on app init if 24h has elapsed since last cleanup
 * - Deletes completed tasks where completedAt < NOW - 90 days in UTC
 * - Processes in batches of 100
 * - Stores last cleanup timestamp in IndexedDB metadata table
 */

describe('Daily Cleanup Job (T070)', () => {
  beforeEach(async () => {
    // Clear database before each test
    await db.tasks.clear();

    // Clear metadata (if exists)
    if (db.metadata) {
      await db.metadata.clear();
    }

    // Reset timers
    vi.clearAllTimers();
  });

  describe('Cleanup logic', () => {
    it('should delete tasks older than 90 days', async () => {
      const now = new Date();
      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Recent Completed',
          rank: 0,
          completed: true,
          completedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Old Completed',
          rank: 1,
          completed: true,
          completedAt: new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000), // 91 days ago
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Very Old Completed',
          rank: 2,
          completed: true,
          completedAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Active Task',
          rank: 3,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.tasks.bulkAdd(tasks);

      await runCleanup();

      const remaining = await db.tasks.toArray();

      // Should keep recent completed and active task
      expect(remaining).toHaveLength(2);
      expect(remaining.some((t) => t.title === 'Recent Completed')).toBe(true);
      expect(remaining.some((t) => t.title === 'Active Task')).toBe(true);

      // Old tasks should be deleted
      expect(remaining.some((t) => t.title === 'Old Completed')).toBe(false);
      expect(remaining.some((t) => t.title === 'Very Old Completed')).toBe(false);
    });

    it('should keep tasks completed exactly 90 days ago', async () => {
      const now = new Date();
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Exactly 90 Days',
        rank: 0,
        completed: true,
        completedAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), // Exactly 90 days
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(task);

      await runCleanup();

      const remaining = await db.tasks.toArray();

      // Should keep task that is exactly 90 days old
      expect(remaining).toHaveLength(1);
      expect(remaining[0].title).toBe('Exactly 90 Days');
    });

    it('should not affect active tasks', async () => {
      const now = new Date();
      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Old Active Task',
          rank: 0,
          completed: false,
          createdAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Recent Active Task',
          rank: 1,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.tasks.bulkAdd(tasks);

      await runCleanup();

      const remaining = await db.tasks.toArray();

      // All active tasks should be kept regardless of age
      expect(remaining).toHaveLength(2);
    });

    it('should handle tasks without completedAt', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Completed Without Date',
        rank: 0,
        completed: true,
        // No completedAt
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(task);

      await runCleanup();

      const remaining = await db.tasks.toArray();

      // Task without completedAt should be kept
      expect(remaining).toHaveLength(1);
      expect(remaining[0].title).toBe('Completed Without Date');
    });

    it('should handle empty database', async () => {
      await runCleanup();

      const remaining = await db.tasks.toArray();

      expect(remaining).toHaveLength(0);
    });

    it('should process large batches correctly', async () => {
      const now = new Date();
      const tasks: Task[] = [];

      // Create 150 old completed tasks (more than batch size of 100)
      for (let i = 0; i < 150; i++) {
        tasks.push({
          id: crypto.randomUUID(),
          title: `Old Task ${i}`,
          rank: i,
          completed: true,
          completedAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Add 10 recent completed tasks
      for (let i = 0; i < 10; i++) {
        tasks.push({
          id: crypto.randomUUID(),
          title: `Recent Task ${i}`,
          rank: 150 + i,
          completed: true,
          completedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await db.tasks.bulkAdd(tasks);

      await runCleanup();

      const remaining = await db.tasks.toArray();

      // Only recent 10 should remain
      expect(remaining).toHaveLength(10);
      expect(remaining.every((t) => t.title.startsWith('Recent Task'))).toBe(true);
    });
  });

  describe('Scheduling and metadata', () => {
    it('should store last cleanup timestamp', async () => {
      const beforeCleanup = new Date();

      await runCleanup();

      const afterCleanup = new Date();

      // Check metadata table for last cleanup timestamp
      if (db.metadata) {
        const lastCleanup = await db.metadata.get('lastCleanup');

        expect(lastCleanup).toBeDefined();
        expect(lastCleanup!.value).toBeDefined();

        const timestamp = new Date(lastCleanup!.value as string);
        expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeCleanup.getTime());
        expect(timestamp.getTime()).toBeLessThanOrEqual(afterCleanup.getTime());
      }
    });

    it('should skip cleanup if run within 24 hours', async () => {
      const now = new Date();

      // Set last cleanup to 12 hours ago
      if (db.metadata) {
        await db.metadata.put({
          key: 'lastCleanup',
          value: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
        });
      }

      // Add old task
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Old Task',
        rank: 0,
        completed: true,
        completedAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(task);

      const shouldRun = await runCleanup();

      // Cleanup should not run
      expect(shouldRun).toBe(false);

      // Old task should still exist
      const remaining = await db.tasks.toArray();
      expect(remaining).toHaveLength(1);
    });

    it('should run cleanup if more than 24 hours have passed', async () => {
      const now = new Date();

      // Set last cleanup to 25 hours ago
      if (db.metadata) {
        await db.metadata.put({
          key: 'lastCleanup',
          value: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(),
        });
      }

      // Add old task
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Old Task',
        rank: 0,
        completed: true,
        completedAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(task);

      const shouldRun = await runCleanup();

      // Cleanup should run
      expect(shouldRun).toBe(true);

      // Old task should be deleted
      const remaining = await db.tasks.toArray();
      expect(remaining).toHaveLength(0);
    });

    it('should run cleanup on first app init (no metadata)', async () => {
      const now = new Date();

      // Add old task
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Old Task',
        rank: 0,
        completed: true,
        completedAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(task);

      const shouldRun = await runCleanup();

      // Cleanup should run on first init
      expect(shouldRun).toBe(true);

      // Old task should be deleted
      const remaining = await db.tasks.toArray();
      expect(remaining).toHaveLength(0);
    });
  });

  describe('UTC time handling', () => {
    it('should use UTC time for 90-day calculation', async () => {
      const now = new Date();

      // Create task completed 91 days ago in UTC
      const completedAt = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - 91,
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
      ));

      const task: Task = {
        id: crypto.randomUUID(),
        title: 'UTC Old Task',
        rank: 0,
        completed: true,
        completedAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(task);

      await runCleanup();

      const remaining = await db.tasks.toArray();

      // Task should be deleted
      expect(remaining).toHaveLength(0);
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  getIncompleteTasks,
  getCompletedTasks,
  getTaskById,
  addTask,
  updateTask,
  deleteTask,
  bulkUpdateRanks,
} from '@/lib/indexeddb';
import type { Task } from '@shared/Task';

describe('IndexedDB Schema', () => {
  beforeEach(async () => {
    // Clear all tasks before each test
    await db.tasks.clear();
  });

  describe('Task CRUD Operations', () => {
    it('should create task with all fields', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Test task',
        description: 'Test description',
        deadline: new Date('2025-12-31'),
        rank: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addTask(task);
      const retrieved = await getTaskById(task.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(task.id);
      expect(retrieved?.title).toBe(task.title);
      expect(retrieved?.description).toBe(task.description);
      expect(retrieved?.rank).toBe(0);
      expect(retrieved?.completed).toBe(false);
    });

    it('should create task with minimal required fields', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Minimal task',
        rank: 1,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addTask(task);
      const retrieved = await getTaskById(task.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.description).toBeUndefined();
      expect(retrieved?.deadline).toBeUndefined();
    });

    it('should update task fields', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Original title',
        rank: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addTask(task);
      await updateTask(task.id, {
        title: 'Updated title',
        description: 'New description',
      });

      const retrieved = await getTaskById(task.id);
      expect(retrieved?.title).toBe('Updated title');
      expect(retrieved?.description).toBe('New description');
    });

    it('should delete task', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'To be deleted',
        rank: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addTask(task);
      expect(await getTaskById(task.id)).toBeDefined();

      await deleteTask(task.id);
      expect(await getTaskById(task.id)).toBeUndefined();
    });
  });

  describe('Rank Index Queries', () => {
    it('should query incomplete tasks ordered by rank', async () => {
      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'High priority',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Medium priority',
          rank: 5,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Low priority',
          rank: 10,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Add tasks in random order
      await addTask(tasks[1]);
      await addTask(tasks[2]);
      await addTask(tasks[0]);

      const retrieved = await getIncompleteTasks();

      // Should be sorted by rank: 0, 5, 10
      expect(retrieved).toHaveLength(3);
      expect(retrieved[0].rank).toBe(0);
      expect(retrieved[1].rank).toBe(5);
      expect(retrieved[2].rank).toBe(10);
    });

    it('should exclude completed tasks from incomplete query', async () => {
      const incompleteTasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Incomplete 1',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Incomplete 2',
          rank: 1,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const completedTask: Task = {
        id: crypto.randomUUID(),
        title: 'Completed',
        rank: 2,
        completed: true,
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addTask(incompleteTasks[0]);
      await addTask(completedTask);
      await addTask(incompleteTasks[1]);

      const retrieved = await getIncompleteTasks();
      expect(retrieved).toHaveLength(2);
      expect(retrieved.every((t) => !t.completed)).toBe(true);
    });
  });

  describe('Completed Tasks Queries', () => {
    it('should query completed tasks ordered by completion date', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Completed last week',
          rank: 0,
          completed: true,
          completedAt: lastWeek,
          createdAt: lastWeek,
          updatedAt: lastWeek,
        },
        {
          id: crypto.randomUUID(),
          title: 'Completed today',
          rank: 1,
          completed: true,
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: crypto.randomUUID(),
          title: 'Completed yesterday',
          rank: 2,
          completed: true,
          completedAt: yesterday,
          createdAt: yesterday,
          updatedAt: yesterday,
        },
      ];

      await addTask(tasks[0]);
      await addTask(tasks[1]);
      await addTask(tasks[2]);

      const retrieved = await getCompletedTasks();

      // Should be sorted by completedAt descending (newest first)
      expect(retrieved).toHaveLength(3);
      expect(retrieved[0].title).toBe('Completed today');
      expect(retrieved[1].title).toBe('Completed yesterday');
      expect(retrieved[2].title).toBe('Completed last week');
    });
  });

  describe('Bulk Rank Updates', () => {
    it('should update multiple task ranks in transaction', async () => {
      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Task A',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Task B',
          rank: 1,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Task C',
          rank: 2,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await addTask(tasks[0]);
      await addTask(tasks[1]);
      await addTask(tasks[2]);

      // Swap ranks: A (0→2), B (1→0), C (2→1)
      await bulkUpdateRanks([
        { id: tasks[0].id, rank: 2 },
        { id: tasks[1].id, rank: 0 },
        { id: tasks[2].id, rank: 1 },
      ]);

      const taskA = await getTaskById(tasks[0].id);
      const taskB = await getTaskById(tasks[1].id);
      const taskC = await getTaskById(tasks[2].id);

      expect(taskA?.rank).toBe(2);
      expect(taskB?.rank).toBe(0);
      expect(taskC?.rank).toBe(1);
    });
  });

  describe('Compound Index [completed+rank]', () => {
    it('should efficiently filter and sort by completed status and rank', async () => {
      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Incomplete high',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Completed low',
          rank: 10,
          completed: true,
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Incomplete medium',
          rank: 5,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await addTask(tasks[0]);
      await addTask(tasks[1]);
      await addTask(tasks[2]);

      // Query using the helper function which uses the compound index
      const incomplete = await getIncompleteTasks();

      expect(incomplete).toHaveLength(2);
      expect(incomplete.every((t) => !t.completed)).toBe(true);
      // Should be sorted by rank
      expect(incomplete[0].rank).toBe(0);
      expect(incomplete[1].rank).toBe(5);
    });
  });
});

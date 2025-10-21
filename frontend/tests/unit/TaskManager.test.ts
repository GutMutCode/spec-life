import { describe, it, expect, beforeEach } from 'vitest';
import { TaskManager } from '@/services/TaskManager';
import { db } from '@/lib/indexeddb';
import type { Task } from '@shared/Task';

describe('TaskManager', () => {
  let taskManager: TaskManager;

  beforeEach(async () => {
    await db.tasks.clear();
    taskManager = new TaskManager();
  });

  describe('insertTask with Rank Shifting (T038)', () => {
    it('should insert task at rank 1 and shift ranks 1+ to 2+', async () => {
      // Create initial tasks with ranks 0, 1, 2
      const initialTasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Task at rank 0',
          rank: 0,
          parentId: null,
          depth: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Task at rank 1',
          rank: 1,
          parentId: null,
          depth: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Task at rank 2',
          rank: 2,
          parentId: null,
          depth: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.tasks.bulkAdd(initialTasks);

      // Insert new task at rank 1
      const newTask: Partial<Task> = {
        title: 'New task at rank 1',
      };

      await taskManager.insertTask(newTask, 1);

      // Verify ranks
      const allTasks = await db.tasks.orderBy('rank').toArray();
      expect(allTasks).toHaveLength(4);
      expect(allTasks[0].title).toBe('Task at rank 0'); // Rank 0 unchanged
      expect(allTasks[0].rank).toBe(0);
      expect(allTasks[1].title).toBe('New task at rank 1'); // New task at rank 1
      expect(allTasks[1].rank).toBe(1);
      expect(allTasks[2].title).toBe('Task at rank 1'); // Old rank 1 → rank 2
      expect(allTasks[2].rank).toBe(2);
      expect(allTasks[3].title).toBe('Task at rank 2'); // Old rank 2 → rank 3
      expect(allTasks[3].rank).toBe(3);
    });

    it('should insert task at rank 0 and shift all existing tasks', async () => {
      const initialTasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Old rank 0',
          rank: 0,
          parentId: null,
          depth: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Old rank 1',
          rank: 1,
          parentId: null,
          depth: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.tasks.bulkAdd(initialTasks);

      await taskManager.insertTask({ title: 'New top priority' }, 0);

      const allTasks = await db.tasks.orderBy('rank').toArray();
      expect(allTasks[0].title).toBe('New top priority');
      expect(allTasks[0].rank).toBe(0);
      expect(allTasks[1].title).toBe('Old rank 0');
      expect(allTasks[1].rank).toBe(1);
      expect(allTasks[2].title).toBe('Old rank 1');
      expect(allTasks[2].rank).toBe(2);
    });

    it('should insert task at end without shifting', async () => {
      const initialTasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Rank 0',
          rank: 0,
          parentId: null,
          depth: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Rank 1',
          rank: 1,
          parentId: null,
          depth: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.tasks.bulkAdd(initialTasks);

      await taskManager.insertTask({ title: 'New task at end' }, 2);

      const allTasks = await db.tasks.orderBy('rank').toArray();
      expect(allTasks).toHaveLength(3);
      expect(allTasks[0].rank).toBe(0);
      expect(allTasks[1].rank).toBe(1);
      expect(allTasks[2].title).toBe('New task at end');
      expect(allTasks[2].rank).toBe(2);
    });

    it('should handle inserting into empty task list', async () => {
      await taskManager.insertTask({ title: 'First task' }, 0);

      const allTasks = await db.tasks.toArray();
      expect(allTasks).toHaveLength(1);
      expect(allTasks[0].title).toBe('First task');
      expect(allTasks[0].rank).toBe(0);
    });

    it('should perform rank shift in a single transaction', async () => {
      const initialTasks: Task[] = Array.from({ length: 10 }, (_, i) => ({
        id: crypto.randomUUID(),
        title: `Task ${i}`,
        rank: i,
        parentId: null,
        depth: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.tasks.bulkAdd(initialTasks);

      // Insert at rank 5 - should shift ranks 5-9 to 6-10
      await taskManager.insertTask({ title: 'New at rank 5' }, 5);

      const allTasks = await db.tasks.orderBy('rank').toArray();
      expect(allTasks).toHaveLength(11);

      // Verify all ranks are sequential
      allTasks.forEach((task, index) => {
        expect(task.rank).toBe(index);
      });

      expect(allTasks[5].title).toBe('New at rank 5');
    });

    it('should auto-generate id, timestamps, and completed=false', async () => {
      const beforeInsert = new Date();

      const result = await taskManager.insertTask(
        {
          title: 'New task',
          description: 'Test description',
        },
        0
      );

      const afterInsert = new Date();

      expect(result.task.id).toBeDefined();
      expect(result.task.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(result.task.completed).toBe(false);
      expect(result.task.createdAt).toBeDefined();
      expect(result.task.updatedAt).toBeDefined();
      expect(result.task.createdAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime());
      expect(result.task.createdAt.getTime()).toBeLessThanOrEqual(afterInsert.getTime());
    });

    it('should preserve optional fields', async () => {
      const deadline = new Date('2025-12-31');

      const result = await taskManager.insertTask(
        {
          title: 'Task with all fields',
          description: 'Full description',
          deadline: deadline,
        },
        0
      );

      expect(result.task.title).toBe('Task with all fields');
      expect(result.task.description).toBe('Full description');
      expect(result.task.deadline).toEqual(deadline);
    });
  });

  describe('moveTask Bidirectional Shifting (T054, T055)', () => {
    it('should move task from rank 3 to rank 1 (moving up)', async () => {
      // Create tasks with ranks 0, 1, 2, 3, 4
      const tasks: Task[] = Array.from({ length: 5 }, (_, i) => ({
        id: crypto.randomUUID(),
        title: `Task ${i}`,
        rank: i,
        parentId: null,
        depth: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.tasks.bulkAdd(tasks);

      // Move task at rank 3 to rank 1
      await taskManager.moveTask(tasks[3].id, 1);

      const allTasks = await db.tasks.orderBy('rank').toArray();

      // Expected result:
      // Rank 0: Task 0 (unchanged)
      // Rank 1: Task 3 (moved from rank 3)
      // Rank 2: Task 1 (shifted from rank 1 to 2)
      // Rank 3: Task 2 (shifted from rank 2 to 3)
      // Rank 4: Task 4 (unchanged)

      expect(allTasks[0].title).toBe('Task 0');
      expect(allTasks[0].rank).toBe(0);

      expect(allTasks[1].title).toBe('Task 3');
      expect(allTasks[1].rank).toBe(1);

      expect(allTasks[2].title).toBe('Task 1');
      expect(allTasks[2].rank).toBe(2);

      expect(allTasks[3].title).toBe('Task 2');
      expect(allTasks[3].rank).toBe(3);

      expect(allTasks[4].title).toBe('Task 4');
      expect(allTasks[4].rank).toBe(4);
    });

    it('should move task from rank 1 to rank 3 (moving down)', async () => {
      // Create tasks with ranks 0, 1, 2, 3, 4
      const tasks: Task[] = Array.from({ length: 5 }, (_, i) => ({
        id: crypto.randomUUID(),
        title: `Task ${i}`,
        rank: i,
        parentId: null,
        depth: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.tasks.bulkAdd(tasks);

      // Move task at rank 1 to rank 3
      await taskManager.moveTask(tasks[1].id, 3);

      const allTasks = await db.tasks.orderBy('rank').toArray();

      // Expected result:
      // Rank 0: Task 0 (unchanged)
      // Rank 1: Task 2 (shifted from rank 2 to 1)
      // Rank 2: Task 3 (shifted from rank 3 to 2)
      // Rank 3: Task 1 (moved from rank 1)
      // Rank 4: Task 4 (unchanged)

      expect(allTasks[0].title).toBe('Task 0');
      expect(allTasks[0].rank).toBe(0);

      expect(allTasks[1].title).toBe('Task 2');
      expect(allTasks[1].rank).toBe(1);

      expect(allTasks[2].title).toBe('Task 3');
      expect(allTasks[2].rank).toBe(2);

      expect(allTasks[3].title).toBe('Task 1');
      expect(allTasks[3].rank).toBe(3);

      expect(allTasks[4].title).toBe('Task 4');
      expect(allTasks[4].rank).toBe(4);
    });

    it('should move task to rank 0 (top)', async () => {
      const tasks: Task[] = Array.from({ length: 3 }, (_, i) => ({
        id: crypto.randomUUID(),
        title: `Task ${i}`,
        rank: i,
        parentId: null,
        depth: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.tasks.bulkAdd(tasks);

      // Move task at rank 2 to rank 0
      await taskManager.moveTask(tasks[2].id, 0);

      const allTasks = await db.tasks.orderBy('rank').toArray();

      expect(allTasks[0].title).toBe('Task 2');
      expect(allTasks[0].rank).toBe(0);

      expect(allTasks[1].title).toBe('Task 0');
      expect(allTasks[1].rank).toBe(1);

      expect(allTasks[2].title).toBe('Task 1');
      expect(allTasks[2].rank).toBe(2);
    });

    it('should move task to last position', async () => {
      const tasks: Task[] = Array.from({ length: 3 }, (_, i) => ({
        id: crypto.randomUUID(),
        title: `Task ${i}`,
        rank: i,
        parentId: null,
        depth: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.tasks.bulkAdd(tasks);

      // Move task at rank 0 to rank 2
      await taskManager.moveTask(tasks[0].id, 2);

      const allTasks = await db.tasks.orderBy('rank').toArray();

      expect(allTasks[0].title).toBe('Task 1');
      expect(allTasks[0].rank).toBe(0);

      expect(allTasks[1].title).toBe('Task 2');
      expect(allTasks[1].rank).toBe(1);

      expect(allTasks[2].title).toBe('Task 0');
      expect(allTasks[2].rank).toBe(2);
    });

    it('should do nothing when moving to same rank', async () => {
      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Task 0',
          rank: 0,
          parentId: null,
          depth: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Task 1',
          rank: 1,
          parentId: null,
          depth: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.tasks.bulkAdd(tasks);

      // Move task to its current rank
      await taskManager.moveTask(tasks[1].id, 1);

      const allTasks = await db.tasks.orderBy('rank').toArray();

      expect(allTasks[0].title).toBe('Task 0');
      expect(allTasks[0].rank).toBe(0);
      expect(allTasks[1].title).toBe('Task 1');
      expect(allTasks[1].rank).toBe(1);
    });

    it('should handle large distance moves efficiently', async () => {
      const tasks: Task[] = Array.from({ length: 20 }, (_, i) => ({
        id: crypto.randomUUID(),
        title: `Task ${i}`,
        rank: i,
        parentId: null,
        depth: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.tasks.bulkAdd(tasks);

      // Move task from rank 15 to rank 3
      await taskManager.moveTask(tasks[15].id, 3);

      const allTasks = await db.tasks.orderBy('rank').toArray();

      // Verify all ranks are still sequential
      allTasks.forEach((task, index) => {
        expect(task.rank).toBe(index);
      });

      // Verify the moved task is at the correct position
      expect(allTasks[3].title).toBe('Task 15');
    });

    it('should throw error when task not found', async () => {
      await expect(taskManager.moveTask('non-existent-id', 0)).rejects.toThrow('Task not found');
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '@/services/StorageService';
import { db } from '@/lib/indexeddb';
import type { Task } from '@shared/Task';

describe('StorageService', () => {
  let storageService: StorageService;

  beforeEach(async () => {
    // Clear database before each test
    await db.tasks.clear();
    storageService = new StorageService();
  });

  describe('getTopTask (T023)', () => {
    it('should return task with rank 0', async () => {
      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'High priority',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          parentId: null,
        },
        {
          id: crypto.randomUUID(),
          title: 'Low priority',
          rank: 1,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          parentId: null,
        },
      ];

      await db.tasks.bulkAdd(tasks);

      const topTask = await storageService.getTopTask();

      expect(topTask).toBeDefined();
      expect(topTask?.rank).toBe(0);
      expect(topTask?.title).toBe('High priority');
    });

    it('should return undefined when no tasks exist', async () => {
      const topTask = await storageService.getTopTask();
      expect(topTask).toBeUndefined();
    });

    it('should return undefined when all tasks are completed', async () => {
      const completedTask: Task = {
        id: crypto.randomUUID(),
        title: 'Completed task',
        rank: 0,
        completed: true,
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null,
      };

      await db.tasks.add(completedTask);

      const topTask = await storageService.getTopTask();
      expect(topTask).toBeUndefined();
    });

    it('should return task with lowest rank when rank 0 does not exist', async () => {
      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Rank 3',
          rank: 3,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          parentId: null,
        },
        {
          id: crypto.randomUUID(),
          title: 'Rank 1',
          rank: 1,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          parentId: null,
        },
      ];

      await db.tasks.bulkAdd(tasks);

      const topTask = await storageService.getTopTask();

      expect(topTask).toBeDefined();
      expect(topTask?.rank).toBe(1);
      expect(topTask?.title).toBe('Rank 1');
    });
  });

  describe('createTask (T024)', () => {
    it('should create task with auto-generated id', async () => {
      const newTask = await storageService.createTask({
        title: 'New task',
        rank: 0,
      });

      expect(newTask.id).toBeDefined();
      expect(newTask.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should create task with auto-generated timestamps', async () => {
      const beforeCreate = new Date();

      const newTask = await storageService.createTask({
        title: 'New task',
        rank: 0,
      });

      const afterCreate = new Date();

      expect(newTask.createdAt).toBeDefined();
      expect(newTask.updatedAt).toBeDefined();
      expect(newTask.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(newTask.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      expect(newTask.updatedAt.getTime()).toEqual(newTask.createdAt.getTime());
    });

    it('should create task with completed=false by default', async () => {
      const newTask = await storageService.createTask({
        title: 'New task',
        rank: 0,
      });

      expect(newTask.completed).toBe(false);
      expect(newTask.completedAt).toBeUndefined();
    });

    it('should persist task to IndexedDB', async () => {
      const newTask = await storageService.createTask({
        title: 'New task',
        description: 'Task description',
        deadline: new Date('2025-12-31'),
        rank: 0,
      });

      const retrieved = await db.tasks.get(newTask.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('New task');
      expect(retrieved?.description).toBe('Task description');
      expect(retrieved?.rank).toBe(0);
    });

    it('should support optional fields', async () => {
      const newTask = await storageService.createTask({
        title: 'Minimal task',
        rank: 0,
      });

      expect(newTask.description).toBeUndefined();
      expect(newTask.deadline).toBeUndefined();
      expect(newTask.userId).toBeUndefined();
    });
  });

  describe('getActiveTasks (T025)', () => {
    it('should return all incomplete tasks sorted by rank', async () => {
      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Rank 5',
          rank: 5,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Rank 0',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Rank 2',
          rank: 2,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.tasks.bulkAdd(tasks);

      const activeTasks = await storageService.getActiveTasks();

      expect(activeTasks).toHaveLength(3);
      expect(activeTasks[0].rank).toBe(0);
      expect(activeTasks[1].rank).toBe(2);
      expect(activeTasks[2].rank).toBe(5);
    });

    it('should exclude completed tasks', async () => {
      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Active',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Completed',
          rank: 1,
          completed: true,
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.tasks.bulkAdd(tasks);

      const activeTasks = await storageService.getActiveTasks();

      expect(activeTasks).toHaveLength(1);
      expect(activeTasks[0].title).toBe('Active');
      expect(activeTasks[0].completed).toBe(false);
    });

    it('should return empty array when no tasks exist', async () => {
      const activeTasks = await storageService.getActiveTasks();
      expect(activeTasks).toEqual([]);
    });

    it('should return empty array when all tasks are completed', async () => {
      const completedTask: Task = {
        id: crypto.randomUUID(),
        title: 'Completed task',
        rank: 0,
        completed: true,
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(completedTask);

      const activeTasks = await storageService.getActiveTasks();
      expect(activeTasks).toEqual([]);
    });
  });

  describe('getAllActiveTasks with pagination (T047)', () => {
    it('should handle large datasets efficiently', async () => {
      // Create 100 tasks to test performance
      const tasks: Task[] = [];
      for (let i = 0; i < 100; i++) {
        tasks.push({
          id: crypto.randomUUID(),
          title: `Task ${i}`,
          rank: i,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await db.tasks.bulkAdd(tasks);

      const startTime = performance.now();
      const activeTasks = await storageService.getActiveTasks();
      const endTime = performance.now();

      expect(activeTasks).toHaveLength(100);
      expect(activeTasks[0].rank).toBe(0);
      expect(activeTasks[99].rank).toBe(99);

      // Performance check: should complete within 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should return all tasks in correct order for large datasets', async () => {
      // Create tasks in random order
      const tasks: Task[] = [];
      const ranks = Array.from({ length: 50 }, (_, i) => i).sort(() => Math.random() - 0.5);

      for (const rank of ranks) {
        tasks.push({
          id: crypto.randomUUID(),
          title: `Task ${rank}`,
          rank,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await db.tasks.bulkAdd(tasks);

      const activeTasks = await storageService.getActiveTasks();

      expect(activeTasks).toHaveLength(50);

      // Verify tasks are sorted by rank
      for (let i = 0; i < activeTasks.length; i++) {
        expect(activeTasks[i].rank).toBe(i);
      }
    });

    it('should exclude completed tasks from large datasets', async () => {
      const tasks: Task[] = [];

      // Add 50 active tasks
      for (let i = 0; i < 50; i++) {
        tasks.push({
          id: crypto.randomUUID(),
          title: `Active Task ${i}`,
          rank: i,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Add 50 completed tasks
      for (let i = 50; i < 100; i++) {
        tasks.push({
          id: crypto.randomUUID(),
          title: `Completed Task ${i}`,
          rank: i,
          completed: true,
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await db.tasks.bulkAdd(tasks);

      const activeTasks = await storageService.getActiveTasks();

      expect(activeTasks).toHaveLength(50);
      expect(activeTasks.every((task) => !task.completed)).toBe(true);
    });
  });

  describe('updateTask with updatedAt timestamp (T056)', () => {
    it('should update task title and set updatedAt', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Original Title',
        rank: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(task);

      // Wait a bit to ensure updatedAt will be different
      await new Promise((resolve) => setTimeout(resolve, 10));

      await storageService.updateTask(task.id, { title: 'Updated Title' });

      const updated = await db.tasks.get(task.id);

      expect(updated).toBeDefined();
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(task.updatedAt.getTime());
    });

    it('should update task description', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Test Task',
        rank: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(task);

      await storageService.updateTask(task.id, { description: 'New Description' });

      const updated = await db.tasks.get(task.id);

      expect(updated?.description).toBe('New Description');
    });

    it('should update task deadline', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Test Task',
        rank: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(task);

      const newDeadline = new Date('2025-12-31');
      await storageService.updateTask(task.id, { deadline: newDeadline });

      const updated = await db.tasks.get(task.id);

      expect(updated?.deadline).toEqual(newDeadline);
    });

    it('should update multiple fields at once', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Original',
        rank: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(task);

      const newDeadline = new Date('2025-12-31');
      await storageService.updateTask(task.id, {
        title: 'Updated Title',
        description: 'Updated Description',
        deadline: newDeadline,
      });

      const updated = await db.tasks.get(task.id);

      expect(updated?.title).toBe('Updated Title');
      expect(updated?.description).toBe('Updated Description');
      expect(updated?.deadline).toEqual(newDeadline);
    });

    it('should preserve createdAt when updating', async () => {
      const createdAt = new Date('2025-01-01');
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Test Task',
        rank: 0,
        completed: false,
        createdAt,
        updatedAt: new Date(),
      };

      await db.tasks.add(task);

      await storageService.updateTask(task.id, { title: 'Updated' });

      const updated = await db.tasks.get(task.id);

      expect(updated?.createdAt).toEqual(createdAt);
    });

    it('should return the number of updated records', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Test Task',
        rank: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(task);

      const result = await storageService.updateTask(task.id, { title: 'Updated' });

      expect(result).toBe(1);
    });

    it('should return 0 when task not found', async () => {
      const result = await storageService.updateTask('non-existent-id', { title: 'Updated' });

      expect(result).toBe(0);
    });

    it('should not modify other tasks', async () => {
      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Task 1',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Task 2',
          rank: 1,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.tasks.bulkAdd(tasks);

      await storageService.updateTask(tasks[0].id, { title: 'Updated Task 1' });

      const task2 = await db.tasks.get(tasks[1].id);

      expect(task2?.title).toBe('Task 2');
    });
  });

  describe('completeTask (T067)', () => {
    it('should set completed=true and completedAt=NOW', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Active Task',
        rank: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(task);

      const beforeComplete = new Date();
      await storageService.completeTask(task.id);
      const afterComplete = new Date();

      const completedTask = await db.tasks.get(task.id);

      expect(completedTask).toBeDefined();
      expect(completedTask?.completed).toBe(true);
      expect(completedTask?.completedAt).toBeDefined();
      expect(completedTask!.completedAt!.getTime()).toBeGreaterThanOrEqual(beforeComplete.getTime());
      expect(completedTask!.completedAt!.getTime()).toBeLessThanOrEqual(afterComplete.getTime());
    });

    it('should remove task from active tasks', async () => {
      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Task 1',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Task 2',
          rank: 1,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.tasks.bulkAdd(tasks);

      await storageService.completeTask(tasks[0].id);

      const activeTasks = await storageService.getActiveTasks();

      expect(activeTasks).toHaveLength(1);
      expect(activeTasks[0].id).toBe(tasks[1].id);
    });

    it('should set updatedAt to completion time', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Test Task',
        rank: 0,
        completed: false,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      await db.tasks.add(task);

      await new Promise((resolve) => setTimeout(resolve, 10));

      await storageService.completeTask(task.id);

      const completedTask = await db.tasks.get(task.id);

      expect(completedTask?.updatedAt.getTime()).toBeGreaterThan(task.updatedAt.getTime());
    });

    it('should preserve other task fields', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Test Task',
        description: 'Task description',
        deadline: new Date('2025-12-31'),
        rank: 5,
        completed: false,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      await db.tasks.add(task);

      await storageService.completeTask(task.id);

      const completedTask = await db.tasks.get(task.id);

      expect(completedTask?.title).toBe('Test Task');
      expect(completedTask?.description).toBe('Task description');
      expect(completedTask?.deadline).toEqual(task.deadline);
      expect(completedTask?.rank).toBe(5);
      expect(completedTask?.createdAt).toEqual(task.createdAt);
    });

    it('should shift ranks down when completing middle task', async () => {
      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Task 0',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Task 1',
          rank: 1,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Task 2',
          rank: 2,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Task 3',
          rank: 3,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.tasks.bulkAdd(tasks);

      // Complete task at rank 1
      await storageService.completeTask(tasks[1].id);

      const activeTasks = await storageService.getActiveTasks();

      expect(activeTasks).toHaveLength(3);
      expect(activeTasks[0].id).toBe(tasks[0].id);
      expect(activeTasks[0].rank).toBe(0);
      expect(activeTasks[1].id).toBe(tasks[2].id);
      expect(activeTasks[1].rank).toBe(1); // Was rank 2, shifted to 1
      expect(activeTasks[2].id).toBe(tasks[3].id);
      expect(activeTasks[2].rank).toBe(2); // Was rank 3, shifted to 2
    });

    it('should not affect ranks when completing highest rank task', async () => {
      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Task 0',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Task 1',
          rank: 1,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Task 2',
          rank: 2,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.tasks.bulkAdd(tasks);

      // Complete task at rank 2 (highest)
      await storageService.completeTask(tasks[2].id);

      const activeTasks = await storageService.getActiveTasks();

      expect(activeTasks).toHaveLength(2);
      expect(activeTasks[0].rank).toBe(0);
      expect(activeTasks[1].rank).toBe(1);
    });

    it('should handle completing non-existent task gracefully', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Task 0',
        rank: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(task);

      // Try to complete non-existent task
      await storageService.completeTask('non-existent-id');

      // Original task should still exist and be active
      const activeTasks = await storageService.getActiveTasks();
      expect(activeTasks).toHaveLength(1);
      expect(activeTasks[0].id).toBe(task.id);
    });

    it('should handle already completed task', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Already Completed',
        rank: 0,
        completed: true,
        completedAt: new Date('2025-01-01'),
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      await db.tasks.add(task);

      await storageService.completeTask(task.id);

      const completedTask = await db.tasks.get(task.id);
      expect(completedTask?.completed).toBe(true);
    });
  });

  describe('deleteTask with rank shifting (T068)', () => {
    it('should delete the task from database', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Task to Delete',
        rank: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(task);

      await storageService.deleteTask(task.id);

      const deletedTask = await db.tasks.get(task.id);

      expect(deletedTask).toBeUndefined();
    });

    it('should shift ranks down when deleting middle task', async () => {
      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Task 0',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Task 1',
          rank: 1,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Task 2',
          rank: 2,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Task 3',
          rank: 3,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.tasks.bulkAdd(tasks);

      // Delete task at rank 1
      await storageService.deleteTask(tasks[1].id);

      const remaining = await db.tasks.orderBy('rank').toArray();

      expect(remaining).toHaveLength(3);
      expect(remaining[0].id).toBe(tasks[0].id);
      expect(remaining[0].rank).toBe(0);
      expect(remaining[1].id).toBe(tasks[2].id);
      expect(remaining[1].rank).toBe(1); // Was rank 2, shifted to 1
      expect(remaining[2].id).toBe(tasks[3].id);
      expect(remaining[2].rank).toBe(2); // Was rank 3, shifted to 2
    });

    it('should not affect ranks when deleting highest rank task', async () => {
      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Task 0',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Task 1',
          rank: 1,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Task 2',
          rank: 2,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.tasks.bulkAdd(tasks);

      // Delete task at rank 2 (highest)
      await storageService.deleteTask(tasks[2].id);

      const remaining = await db.tasks.orderBy('rank').toArray();

      expect(remaining).toHaveLength(2);
      expect(remaining[0].rank).toBe(0);
      expect(remaining[1].rank).toBe(1);
    });

    it('should shift all ranks when deleting rank 0 task', async () => {
      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Task 0',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Task 1',
          rank: 1,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Task 2',
          rank: 2,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.tasks.bulkAdd(tasks);

      // Delete task at rank 0
      await storageService.deleteTask(tasks[0].id);

      const remaining = await db.tasks.orderBy('rank').toArray();

      expect(remaining).toHaveLength(2);
      expect(remaining[0].id).toBe(tasks[1].id);
      expect(remaining[0].rank).toBe(0); // Was rank 1, shifted to 0
      expect(remaining[1].id).toBe(tasks[2].id);
      expect(remaining[1].rank).toBe(1); // Was rank 2, shifted to 1
    });

    it('should handle deleting non-existent task gracefully', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Task 0',
        rank: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(task);

      // Try to delete non-existent task
      await storageService.deleteTask('non-existent-id');

      // Original task should still exist
      const remaining = await db.tasks.toArray();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(task.id);
    });

    it('should handle deleting only task', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Only Task',
        rank: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(task);

      await storageService.deleteTask(task.id);

      const remaining = await db.tasks.toArray();
      expect(remaining).toHaveLength(0);
    });

    it('should update updatedAt for shifted tasks', async () => {
      const oldDate = new Date('2025-01-01');
      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Task 0',
          rank: 0,
          completed: false,
          createdAt: oldDate,
          updatedAt: oldDate,
        },
        {
          id: crypto.randomUUID(),
          title: 'Task 1',
          rank: 1,
          completed: false,
          createdAt: oldDate,
          updatedAt: oldDate,
        },
        {
          id: crypto.randomUUID(),
          title: 'Task 2',
          rank: 2,
          completed: false,
          createdAt: oldDate,
          updatedAt: oldDate,
        },
      ];

      await db.tasks.bulkAdd(tasks);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Delete task at rank 0
      await storageService.deleteTask(tasks[0].id);

      const remaining = await db.tasks.orderBy('rank').toArray();

      // Both remaining tasks should have updated timestamps
      expect(remaining[0].updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
      expect(remaining[1].updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
    });
  });

  describe('getCompletedTasks (90-day window) (T069)', () => {
    it('should return completed tasks sorted by completedAt (newest first)', async () => {
      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Completed 1',
          rank: 0,
          completed: true,
          completedAt: new Date('2025-10-01'),
          createdAt: new Date('2025-09-01'),
          updatedAt: new Date('2025-10-01'),
        },
        {
          id: crypto.randomUUID(),
          title: 'Completed 2',
          rank: 1,
          completed: true,
          completedAt: new Date('2025-10-15'),
          createdAt: new Date('2025-09-15'),
          updatedAt: new Date('2025-10-15'),
        },
        {
          id: crypto.randomUUID(),
          title: 'Completed 3',
          rank: 2,
          completed: true,
          completedAt: new Date('2025-10-10'),
          createdAt: new Date('2025-09-10'),
          updatedAt: new Date('2025-10-10'),
        },
      ];

      await db.tasks.bulkAdd(tasks);

      const completedTasks = await storageService.getCompletedTasks();

      expect(completedTasks).toHaveLength(3);
      expect(completedTasks[0].title).toBe('Completed 2'); // Oct 15 (newest)
      expect(completedTasks[1].title).toBe('Completed 3'); // Oct 10
      expect(completedTasks[2].title).toBe('Completed 1'); // Oct 1
    });

    it('should exclude active (incomplete) tasks', async () => {
      const tasks: Task[] = [
        {
          id: crypto.randomUUID(),
          title: 'Active',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Completed',
          rank: 1,
          completed: true,
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.tasks.bulkAdd(tasks);

      const completedTasks = await storageService.getCompletedTasks();

      expect(completedTasks).toHaveLength(1);
      expect(completedTasks[0].title).toBe('Completed');
    });

    it('should return empty array when no completed tasks exist', async () => {
      const completedTasks = await storageService.getCompletedTasks();

      expect(completedTasks).toEqual([]);
    });

    it('should return empty array when only active tasks exist', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Active Task',
        rank: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(task);

      const completedTasks = await storageService.getCompletedTasks();

      expect(completedTasks).toEqual([]);
    });

    it('should handle completed tasks without completedAt gracefully', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Completed Without Date',
        rank: 0,
        completed: true,
        // No completedAt field
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(task);

      const completedTasks = await storageService.getCompletedTasks();

      expect(completedTasks).toHaveLength(1);
      expect(completedTasks[0].title).toBe('Completed Without Date');
    });

    it('should handle large number of completed tasks', async () => {
      const tasks: Task[] = [];

      for (let i = 0; i < 100; i++) {
        tasks.push({
          id: crypto.randomUUID(),
          title: `Completed ${i}`,
          rank: i,
          completed: true,
          completedAt: new Date(Date.now() - i * 1000), // Each 1 second apart
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await db.tasks.bulkAdd(tasks);

      const completedTasks = await storageService.getCompletedTasks();

      expect(completedTasks).toHaveLength(100);
      expect(completedTasks[0].title).toBe('Completed 0'); // Most recent
      expect(completedTasks[99].title).toBe('Completed 99'); // Oldest
    });

    it('should preserve all task fields', async () => {
      const task: Task = {
        id: crypto.randomUUID(),
        title: 'Completed Task',
        description: 'Task description',
        deadline: new Date('2025-12-31'),
        rank: 5,
        completed: true,
        completedAt: new Date('2025-10-15'),
        createdAt: new Date('2025-09-01'),
        updatedAt: new Date('2025-10-15'),
        userId: 'user-123',
      };

      await db.tasks.add(task);

      const completedTasks = await storageService.getCompletedTasks();

      expect(completedTasks).toHaveLength(1);
      expect(completedTasks[0]).toEqual(task);
    });
  });
});

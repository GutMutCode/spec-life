import { test, expect } from '@playwright/test';

/**
 * E2E tests for task completion (T078, US5).
 *
 * Tests user scenarios:
 * - Complete top task
 * - Verify next task becomes top
 * - Verify completed task appears in history
 * - Verify rank shifting works correctly
 */

test.describe('Task Completion - Complete Top Task (T078)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to page and clear database
    await page.goto('http://localhost:5173');

    // Clear IndexedDB
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase('TaskPriorityDB');
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should complete top task and promote next task to rank 0', async ({ page }) => {
    // Create multiple tasks using native IndexedDB
    await page.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('TaskPriorityDB', 2);

        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['tasks'], 'readwrite');
          const store = transaction.objectStore('tasks');

          const tasks = [
            {
              id: crypto.randomUUID(),
              title: 'Task Rank 0 - Will Complete',
              description: 'This task will be completed',
              rank: 0,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: crypto.randomUUID(),
              title: 'Task Rank 1 - Should Become Top',
              description: 'This should become the new top task',
              rank: 1,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: crypto.randomUUID(),
              title: 'Task Rank 2 - Should Shift',
              rank: 2,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];

          tasks.forEach(task => store.add(task));

          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
        };

        request.onerror = () => reject(request.error);
      });
    });

    // Reload to display tasks
    await page.reload();
    await page.waitForSelector('[data-testid="task-card"]', { timeout: 5000 });

    // Verify initial top task
    await expect(page.getByText('Task Rank 0 - Will Complete')).toBeVisible();

    // Click complete button
    const completeButton = page.getByTestId('complete-button');
    await expect(completeButton).toBeVisible();
    await completeButton.click();

    // Wait for UI to update
    await page.waitForTimeout(500);

    // Verify new top task is displayed
    await expect(page.getByText('Task Rank 1 - Should Become Top')).toBeVisible();
    await expect(page.getByText('Task Rank 0 - Will Complete')).not.toBeVisible();

    // Verify rank badge shows #0 for new top task
    await expect(page.getByTestId('rank-badge')).toContainText('#0');

    // Verify in database that ranks shifted correctly
    const tasksAfterComplete = await page.evaluate(() => {
      return new Promise<any[]>((resolve, reject) => {
        const request = indexedDB.open('TaskPriorityDB', 2);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['tasks'], 'readonly');
          const store = transaction.objectStore('tasks');
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            const allTasks = getAllRequest.result;
            // Sort by rank
            allTasks.sort((a, b) => a.rank - b.rank);
            db.close();
            resolve(allTasks.map(t => ({ title: t.title, rank: t.rank, completed: t.completed })));
          };
          getAllRequest.onerror = () => {
            db.close();
            reject(getAllRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    });

    // Should have 2 active tasks with ranks 0 and 1
    expect(tasksAfterComplete.filter(t => !t.completed)).toHaveLength(2);
    expect(tasksAfterComplete.find(t => t.title === 'Task Rank 1 - Should Become Top')?.rank).toBe(0);
    expect(tasksAfterComplete.find(t => t.title === 'Task Rank 2 - Should Shift')?.rank).toBe(1);

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/complete-task-success.png' });
  });

  test('should show completed task in history page', async ({ page }) => {
    // Create a task
    await page.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('TaskPriorityDB', 2);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['tasks'], 'readwrite');
          const store = transaction.objectStore('tasks');

          const task = {
            id: crypto.randomUUID(),
            title: 'Task to Complete and Check History',
            description: 'This will appear in history',
            rank: 0,
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          store.add(task);

          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    });

    // Reload and complete the task
    await page.reload();
    await page.waitForSelector('[data-testid="task-card"]', { timeout: 5000 });

    const completeButton = page.getByTestId('complete-button');
    await completeButton.click();

    // Wait for completion
    await page.waitForTimeout(500);

    // Navigate to history page
    await page.getByRole('link', { name: /history/i }).click();
    await page.waitForSelector('[data-testid="completed-tasks-list"]', { timeout: 5000 });

    // Verify completed task appears in history
    await expect(page.getByText('Task to Complete and Check History')).toBeVisible();
    await expect(page.getByText('This will appear in history')).toBeVisible();
    await expect(page.getByText(/completed today/i)).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/complete-task-history.png' });
  });

  test('should handle completing multiple tasks in sequence', async ({ page }) => {
    // Create 5 tasks
    await page.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('TaskPriorityDB', 2);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['tasks'], 'readwrite');
          const store = transaction.objectStore('tasks');

          const tasks = [];
          for (let i = 0; i < 5; i++) {
            tasks.push({
              id: crypto.randomUUID(),
              title: `Task ${i}`,
              rank: i,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }

          tasks.forEach(task => store.add(task));

          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    });

    await page.reload();
    await page.waitForSelector('[data-testid="task-card"]', { timeout: 5000 });

    // Complete first 3 tasks
    for (let i = 0; i < 3; i++) {
      await expect(page.getByText(`Task ${i}`)).toBeVisible();

      const completeButton = page.getByTestId('complete-button');
      await completeButton.click();

      await page.waitForTimeout(500);
    }

    // Verify Task 3 is now the top task
    await expect(page.getByText('Task 3')).toBeVisible();

    // Verify ranks in database
    const remainingTasks = await page.evaluate(() => {
      return new Promise<any[]>((resolve, reject) => {
        const request = indexedDB.open('TaskPriorityDB', 2);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['tasks'], 'readonly');
          const store = transaction.objectStore('tasks');
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            const allTasks = getAllRequest.result;
            // Filter for active tasks and sort by rank
            const active = allTasks
              .filter(t => !t.completed)
              .sort((a, b) => a.rank - b.rank);
            db.close();
            resolve(active.map(t => ({ title: t.title, rank: t.rank })));
          };
          getAllRequest.onerror = () => {
            db.close();
            reject(getAllRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    });

    expect(remainingTasks).toHaveLength(2);
    expect(remainingTasks[0].title).toBe('Task 3');
    expect(remainingTasks[0].rank).toBe(0);
    expect(remainingTasks[1].title).toBe('Task 4');
    expect(remainingTasks[1].rank).toBe(1);

    // Verify 3 completed tasks in history
    await page.getByRole('link', { name: /history/i }).click();
    await page.waitForSelector('[data-testid="completed-tasks-list"]', { timeout: 5000 });

    const completedCards = page.getByTestId('completed-task-card');
    await expect(completedCards).toHaveCount(3);
  });

  test('should show empty state after completing last task', async ({ page }) => {
    // Create single task
    await page.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('TaskPriorityDB', 2);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['tasks'], 'readwrite');
          const store = transaction.objectStore('tasks');

          const task = {
            id: crypto.randomUUID(),
            title: 'Last Task',
            rank: 0,
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          store.add(task);

          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    });

    await page.reload();
    await page.waitForSelector('[data-testid="task-card"]', { timeout: 5000 });

    // Complete the task
    const completeButton = page.getByTestId('complete-button');
    await completeButton.click();

    // Wait for UI update
    await page.waitForTimeout(500);

    // Should show empty state
    await expect(page.getByTestId('empty-state')).toBeVisible();
    await expect(page.getByText('No tasks yet')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/complete-last-task-empty.png' });
  });

  test('should complete task from All Tasks page', async ({ page }) => {
    // Create multiple tasks
    await page.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('TaskPriorityDB', 2);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['tasks'], 'readwrite');
          const store = transaction.objectStore('tasks');

          const tasks = [
            {
              id: crypto.randomUUID(),
              title: 'First Task',
              rank: 0,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: crypto.randomUUID(),
              title: 'Second Task',
              rank: 1,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: crypto.randomUUID(),
              title: 'Third Task',
              rank: 2,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];

          tasks.forEach(task => store.add(task));

          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    });

    // Navigate to All Tasks page
    await page.goto('/tasks');
    await page.waitForSelector('[data-testid="task-list"]', { timeout: 5000 });

    // Find and complete the second task
    const taskCards = page.getByTestId('task-card');
    await expect(taskCards).toHaveCount(3);

    // Get the second task card and click its complete button
    const secondTaskCard = taskCards.nth(1);
    await expect(secondTaskCard.getByText('Second Task')).toBeVisible();

    const completeButton = secondTaskCard.getByTestId('complete-button');
    await completeButton.click();

    // Wait for update
    await page.waitForTimeout(500);

    // Should now have 2 tasks
    await expect(page.getByTestId('task-card')).toHaveCount(2);

    // Verify ranks adjusted
    await expect(page.getByText('First Task')).toBeVisible();
    await expect(page.getByText('Third Task')).toBeVisible();
    await expect(page.getByText('Second Task')).not.toBeVisible();

    // Verify in database
    const tasks = await page.evaluate(() => {
      return new Promise<any[]>((resolve, reject) => {
        const request = indexedDB.open('TaskPriorityDB', 2);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['tasks'], 'readonly');
          const store = transaction.objectStore('tasks');
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            const allTasks = getAllRequest.result;
            // Filter for active tasks and sort by rank
            const active = allTasks
              .filter(t => !t.completed)
              .sort((a, b) => a.rank - b.rank);
            db.close();
            resolve(active.map(t => ({ title: t.title, rank: t.rank })));
          };
          getAllRequest.onerror = () => {
            db.close();
            reject(getAllRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    });

    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toBe('First Task');
    expect(tasks[0].rank).toBe(0);
    expect(tasks[1].title).toBe('Third Task');
    expect(tasks[1].rank).toBe(1); // Was rank 2, shifted down to 1
  });
});

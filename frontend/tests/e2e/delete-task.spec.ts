import { test, expect } from '@playwright/test';

/**
 * E2E tests for task deletion (T079, US5).
 *
 * Tests user scenarios:
 * - Delete mid-rank task
 * - Verify rank shifting works correctly
 * - Verify confirmation dialog appears
 * - Verify task is permanently removed (not in history)
 */

test.describe('Task Deletion - Delete with Rank Shifting (T079)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to page and clear any existing data
    await page.goto('/');

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

  test('should delete mid-rank task and adjust ranks correctly', async ({ page }) => {
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
              title: 'Task Rank 0',
              rank: 0,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: crypto.randomUUID(),
              title: 'Task Rank 1 - Will Delete',
              description: 'This task will be deleted',
              rank: 1,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: crypto.randomUUID(),
              title: 'Task Rank 2 - Should Shift to 1',
              rank: 2,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: crypto.randomUUID(),
              title: 'Task Rank 3 - Should Shift to 2',
              rank: 3,
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

    // Verify all 4 tasks are displayed
    const taskCards = page.getByTestId('task-card');
    await expect(taskCards).toHaveCount(4);

    // Find the task to delete (rank 1)
    const taskToDelete = taskCards.nth(1);
    await expect(taskToDelete.getByText('Task Rank 1 - Will Delete')).toBeVisible();

    // Click delete button
    const deleteButton = taskToDelete.getByTestId('delete-button');
    await deleteButton.click();

    // Wait for confirmation dialog
    await page.waitForSelector('[data-testid="delete-dialog"]', { timeout: 2000 });

    // Verify dialog content
    await expect(page.getByText('Delete Task')).toBeVisible();
    await expect(page.getByText(/are you sure you want to delete/i)).toBeVisible();
    await expect(page.getByText('Task Rank 1 - Will Delete')).toBeVisible();

    // Take screenshot of dialog
    await page.screenshot({ path: 'tests/e2e/screenshots/delete-dialog.png' });

    // Click confirm button
    const confirmButton = page.getByTestId('delete-confirm-button');
    await confirmButton.click();

    // Wait for dialog to close and task to be removed
    await page.waitForTimeout(500);

    // Verify only 3 tasks remain
    await expect(page.getByTestId('task-card')).toHaveCount(3);

    // Verify deleted task is gone
    await expect(page.getByText('Task Rank 1 - Will Delete')).not.toBeVisible();

    // Verify other tasks are still present
    await expect(page.getByText('Task Rank 0')).toBeVisible();
    await expect(page.getByText('Task Rank 2 - Should Shift to 1')).toBeVisible();
    await expect(page.getByText('Task Rank 3 - Should Shift to 2')).toBeVisible();

    // Verify ranks in database
    const tasksAfterDelete = await page.evaluate(() => {
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
            resolve(allTasks.map(t => ({ title: t.title, rank: t.rank })));
          };
          getAllRequest.onerror = () => {
            db.close();
            reject(getAllRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    });

    expect(tasksAfterDelete).toHaveLength(3);
    expect(tasksAfterDelete[0].title).toBe('Task Rank 0');
    expect(tasksAfterDelete[0].rank).toBe(0);
    expect(tasksAfterDelete[1].title).toBe('Task Rank 2 - Should Shift to 1');
    expect(tasksAfterDelete[1].rank).toBe(1); // Was rank 2, shifted down
    expect(tasksAfterDelete[2].title).toBe('Task Rank 3 - Should Shift to 2');
    expect(tasksAfterDelete[2].rank).toBe(2); // Was rank 3, shifted down

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/delete-task-success.png' });
  });

  test('should cancel deletion when clicking cancel button', async ({ page }) => {
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
            title: 'Task to Not Delete',
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

    await page.goto('/tasks');
    await page.waitForSelector('[data-testid="task-list"]', { timeout: 5000 });

    // Click delete button
    const deleteButton = page.getByTestId('delete-button');
    await deleteButton.click();

    // Wait for dialog
    await page.waitForSelector('[data-testid="delete-dialog"]', { timeout: 2000 });

    // Click cancel button
    const cancelButton = page.getByTestId('delete-cancel-button');
    await cancelButton.click();

    // Wait for dialog to close
    await page.waitForTimeout(300);

    // Dialog should be gone
    await expect(page.getByTestId('delete-dialog')).not.toBeVisible();

    // Task should still be present
    await expect(page.getByText('Task to Not Delete')).toBeVisible();

    // Verify task still exists in database
    const taskExists = await page.evaluate(() => {
      return new Promise<boolean>((resolve, reject) => {
        const request = indexedDB.open('TaskPriorityDB', 2);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['tasks'], 'readonly');
          const store = transaction.objectStore('tasks');
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            db.close();
            resolve(getAllRequest.result.length === 1);
          };
          getAllRequest.onerror = () => {
            db.close();
            reject(getAllRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    });

    expect(taskExists).toBe(true);
  });

  test('should delete top task (rank 0) and promote next task', async ({ page }) => {
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
              title: 'Task Rank 0 - Will Delete',
              rank: 0,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: crypto.randomUUID(),
              title: 'Task Rank 1 - Should Become Top',
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

    // Navigate to Dashboard
    await page.goto('/');
    await page.waitForSelector('[data-testid="task-card"]', { timeout: 5000 });

    // Verify rank 0 task is displayed
    await expect(page.getByText('Task Rank 0 - Will Delete')).toBeVisible();

    // Delete the task
    const deleteButton = page.getByTestId('delete-button');
    await deleteButton.click();

    // Confirm deletion
    await page.waitForSelector('[data-testid="delete-dialog"]', { timeout: 2000 });
    const confirmButton = page.getByTestId('delete-confirm-button');
    await confirmButton.click();

    // Wait for update
    await page.waitForTimeout(500);

    // New top task should be displayed
    await expect(page.getByText('Task Rank 1 - Should Become Top')).toBeVisible();
    await expect(page.getByText('Task Rank 0 - Will Delete')).not.toBeVisible();

    // Verify rank badge shows #0
    await expect(page.getByTestId('rank-badge')).toContainText('#0');

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
            // Sort by rank
            allTasks.sort((a, b) => a.rank - b.rank);
            db.close();
            resolve(allTasks.map(t => ({ title: t.title, rank: t.rank })));
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
    expect(tasks[0].title).toBe('Task Rank 1 - Should Become Top');
    expect(tasks[0].rank).toBe(0);
    expect(tasks[1].title).toBe('Task Rank 2 - Should Shift');
    expect(tasks[1].rank).toBe(1);
  });

  test('should delete last task and show empty state', async ({ page }) => {
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
            title: 'Only Task - Will Delete',
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

    await page.goto('/');
    await page.waitForSelector('[data-testid="task-card"]', { timeout: 5000 });

    // Delete the task
    const deleteButton = page.getByTestId('delete-button');
    await deleteButton.click();

    // Confirm deletion
    await page.waitForSelector('[data-testid="delete-dialog"]', { timeout: 2000 });
    const confirmButton = page.getByTestId('delete-confirm-button');
    await confirmButton.click();

    // Wait for update
    await page.waitForTimeout(500);

    // Should show empty state
    await expect(page.getByTestId('empty-state')).toBeVisible();
    await expect(page.getByText('No tasks yet')).toBeVisible();

    // Verify database is empty
    const taskCount = await page.evaluate(() => {
      return new Promise<number>((resolve, reject) => {
        const request = indexedDB.open('TaskPriorityDB', 2);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['tasks'], 'readonly');
          const store = transaction.objectStore('tasks');
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            db.close();
            resolve(getAllRequest.result.length);
          };
          getAllRequest.onerror = () => {
            db.close();
            reject(getAllRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    });

    expect(taskCount).toBe(0);

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/delete-last-task-empty.png' });
  });

  test('should delete highest rank task without affecting others', async ({ page }) => {
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
              title: 'Task Rank 0',
              rank: 0,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: crypto.randomUUID(),
              title: 'Task Rank 1',
              rank: 1,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: crypto.randomUUID(),
              title: 'Task Rank 2 - Will Delete',
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

    // Navigate to All Tasks
    await page.goto('/tasks');
    await page.waitForSelector('[data-testid="task-list"]', { timeout: 5000 });

    // Delete the last task (rank 2)
    const taskCards = page.getByTestId('task-card');
    const lastTask = taskCards.nth(2);
    await expect(lastTask.getByText('Task Rank 2 - Will Delete')).toBeVisible();

    const deleteButton = lastTask.getByTestId('delete-button');
    await deleteButton.click();

    // Confirm deletion
    await page.waitForSelector('[data-testid="delete-dialog"]', { timeout: 2000 });
    const confirmButton = page.getByTestId('delete-confirm-button');
    await confirmButton.click();

    // Wait for update
    await page.waitForTimeout(500);

    // Verify only 2 tasks remain
    await expect(page.getByTestId('task-card')).toHaveCount(2);

    // Verify other tasks are unchanged
    await expect(page.getByText('Task Rank 0')).toBeVisible();
    await expect(page.getByText('Task Rank 1')).toBeVisible();

    // Verify ranks remain the same in database
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
            // Sort by rank
            allTasks.sort((a, b) => a.rank - b.rank);
            db.close();
            resolve(allTasks.map(t => ({ title: t.title, rank: t.rank })));
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
    expect(tasks[0].rank).toBe(0);
    expect(tasks[1].rank).toBe(1);
  });

  test('should not show deleted task in history', async ({ page }) => {
    // Create and delete a task
    await page.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('TaskPriorityDB', 2);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['tasks'], 'readwrite');
          const store = transaction.objectStore('tasks');

          const task = {
            id: crypto.randomUUID(),
            title: 'Task to Delete - Not in History',
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

    await page.goto('/');
    await page.waitForSelector('[data-testid="task-card"]', { timeout: 5000 });

    // Delete the task
    const deleteButton = page.getByTestId('delete-button');
    await deleteButton.click();

    await page.waitForSelector('[data-testid="delete-dialog"]', { timeout: 2000 });
    const confirmButton = page.getByTestId('delete-confirm-button');
    await confirmButton.click();

    await page.waitForTimeout(500);

    // Navigate to History
    await page.getByRole('link', { name: /history/i }).click();

    // Wait for history to load (should show empty state)
    await page.waitForTimeout(500);

    // Should show empty state, not the deleted task
    await expect(page.getByTestId('empty-state')).toBeVisible();
    await expect(page.getByText('No completed tasks yet')).toBeVisible();
    await expect(page.getByText('Task to Delete - Not in History')).not.toBeVisible();

    // Verify database has no completed tasks
    const completedCount = await page.evaluate(() => {
      return new Promise<number>((resolve, reject) => {
        const request = indexedDB.open('TaskPriorityDB', 2);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['tasks'], 'readonly');
          const store = transaction.objectStore('tasks');
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            const allTasks = getAllRequest.result;
            const completed = allTasks.filter(t => t.completed);
            db.close();
            resolve(completed.length);
          };
          getAllRequest.onerror = () => {
            db.close();
            reject(getAllRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    });

    expect(completedCount).toBe(0);
  });
});

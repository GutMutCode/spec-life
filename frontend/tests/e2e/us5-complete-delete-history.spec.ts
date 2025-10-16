import { test, expect } from '@playwright/test';

/**
 * E2E Independent Test for US5 (T080).
 *
 * Full user story validation:
 * "A user finishes a task or decides it's no longer relevant.
 * They mark it complete or delete it, and the system automatically
 * promotes the next highest priority task to the top."
 *
 * Test scenarios:
 * 1. Complete task and verify it moves to history
 * 2. Delete task and verify it's permanently removed
 * 3. View history and verify completed tasks appear
 * 4. Verify 90-day retention (FR-024)
 */

test.describe('US5 Independent Test - Complete/Delete/History (T080)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and clear data
    await page.goto('/');

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

  test('US5 Full Flow: Complete task, delete task, view history, verify retention', async ({ page }) => {
    // ==================== SETUP ====================
    // Create 5 tasks for testing
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
              title: 'Task 1 - Will Complete',
              description: 'This task will be marked complete',
              rank: 0,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: crypto.randomUUID(),
              title: 'Task 2 - Will Delete',
              description: 'This task will be deleted',
              rank: 1,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: crypto.randomUUID(),
              title: 'Task 3 - Will Complete',
              rank: 2,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: crypto.randomUUID(),
              title: 'Task 4 - Remains Active',
              rank: 3,
              completed: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: crypto.randomUUID(),
              title: 'Task 5 - Remains Active',
              rank: 4,
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

    await page.reload();
    await page.waitForSelector('[data-testid="task-card"]', { timeout: 5000 });

    // ==================== STEP 1: Complete Task 1 ====================
    console.log('Step 1: Completing Task 1...');

    // Verify Task 1 is displayed as top task
    await expect(page.getByText('Task 1 - Will Complete')).toBeVisible();
    await expect(page.getByTestId('rank-badge')).toContainText('#0');

    // Complete Task 1
    const completeButton = page.getByTestId('complete-button');
    await completeButton.click();
    await page.waitForTimeout(500);

    // Verify Task 2 is now the top task (was rank 1, now rank 0)
    await expect(page.getByText('Task 2 - Will Delete')).toBeVisible();
    await expect(page.getByTestId('rank-badge')).toContainText('#0');

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/us5-after-complete.png' });

    // ==================== STEP 2: Delete Task 2 ====================
    console.log('Step 2: Deleting Task 2...');

    // Delete Task 2 (now at rank 0)
    const deleteButton = page.getByTestId('delete-button');
    await deleteButton.click();

    // Confirm deletion
    await page.waitForSelector('[data-testid="delete-dialog"]', { timeout: 2000 });
    await expect(page.getByText('Task 2 - Will Delete')).toBeVisible();

    const confirmButton = page.getByTestId('delete-confirm-button');
    await confirmButton.click();
    await page.waitForTimeout(500);

    // Verify Task 3 is now the top task (was rank 2, shifted to 0)
    await expect(page.getByText('Task 3 - Will Complete')).toBeVisible();
    await expect(page.getByTestId('rank-badge')).toContainText('#0');

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/us5-after-delete.png' });

    // ==================== STEP 3: Complete Task 3 ====================
    console.log('Step 3: Completing Task 3...');

    // Complete Task 3
    const completeButton2 = page.getByTestId('complete-button');
    await completeButton2.click();
    await page.waitForTimeout(500);

    // Verify Task 4 is now the top task
    await expect(page.getByText('Task 4 - Remains Active')).toBeVisible();

    // ==================== STEP 4: Verify Database State ====================
    console.log('Step 4: Verifying database state...');

    const dbState = await page.evaluate(() => {
      return new Promise<any>((resolve, reject) => {
        const request = indexedDB.open('TaskPriorityDB', 2);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['tasks'], 'readonly');
          const store = transaction.objectStore('tasks');
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            const allTasks = getAllRequest.result;
            const activeTasks = allTasks.filter(t => !t.completed);
            const completedTasks = allTasks.filter(t => t.completed);

            db.close();
            resolve({
              totalTasks: allTasks.length,
              activeCount: activeTasks.length,
              completedCount: completedTasks.length,
              activeTitles: activeTasks.sort((a, b) => a.rank - b.rank).map(t => ({ title: t.title, rank: t.rank })),
              completedTitles: completedTasks.map(t => t.title),
            });
          };
          getAllRequest.onerror = () => {
            db.close();
            reject(getAllRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    });

    // Verify counts
    expect(dbState.totalTasks).toBe(4); // 5 original - 1 deleted
    expect(dbState.activeCount).toBe(2); // Task 4 and Task 5
    expect(dbState.completedCount).toBe(2); // Task 1 and Task 3

    // Verify active tasks have correct ranks
    expect(dbState.activeTitles[0].title).toBe('Task 4 - Remains Active');
    expect(dbState.activeTitles[0].rank).toBe(0); // Was rank 3, shifted to 0
    expect(dbState.activeTitles[1].title).toBe('Task 5 - Remains Active');
    expect(dbState.activeTitles[1].rank).toBe(1); // Was rank 4, shifted to 1

    // Verify completed tasks
    expect(dbState.completedTitles).toContain('Task 1 - Will Complete');
    expect(dbState.completedTitles).toContain('Task 3 - Will Complete');

    // Verify deleted task is NOT in database
    expect(dbState.completedTitles).not.toContain('Task 2 - Will Delete');

    console.log('Database state verified:', dbState);

    // ==================== STEP 5: View History ====================
    console.log('Step 5: Viewing history...');

    // Navigate to History page
    await page.getByRole('link', { name: /history/i }).click();
    await page.waitForSelector('[data-testid="completed-tasks-list"]', { timeout: 5000 });

    // Verify history shows 2 completed tasks
    const completedCards = page.getByTestId('completed-task-card');
    await expect(completedCards).toHaveCount(2);

    // Verify completed tasks appear in history
    await expect(page.getByText('Task 1 - Will Complete')).toBeVisible();
    await expect(page.getByText('Task 3 - Will Complete')).toBeVisible();

    // Verify deleted task does NOT appear in history
    await expect(page.getByText('Task 2 - Will Delete')).not.toBeVisible();

    // Verify completion dates are shown
    await expect(page.getByText(/completed today/i)).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/us5-history.png' });

    // ==================== STEP 6: Verify 90-day Retention (FR-024) ====================
    console.log('Step 6: Verifying 90-day retention...');

    // Create tasks with old completion dates
    await page.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('TaskPriorityDB', 2);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['tasks'], 'readwrite');
          const store = transaction.objectStore('tasks');

          const now = new Date();

          // Create tasks completed at different times
          const oldTasks = [
            {
              id: crypto.randomUUID(),
              title: 'Task Completed 89 Days Ago',
              rank: 10,
              completed: true,
              completedAt: new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000), // 89 days ago
              createdAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
              updatedAt: new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000),
            },
            {
              id: crypto.randomUUID(),
              title: 'Task Completed 91 Days Ago',
              rank: 11,
              completed: true,
              completedAt: new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000), // 91 days ago (should be deleted)
              createdAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
              updatedAt: new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000),
            },
            {
              id: crypto.randomUUID(),
              title: 'Task Completed 120 Days Ago',
              rank: 12,
              completed: true,
              completedAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000), // 120 days ago (should be deleted)
              createdAt: new Date(now.getTime() - 130 * 24 * 60 * 60 * 1000),
              updatedAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
            },
          ];

          oldTasks.forEach(task => store.add(task));

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

    // Run cleanup job
    const cleanupResult = await page.evaluate(async () => {
      const { runCleanup } = await import('/src/lib/cleanup');
      await runCleanup();

      // Get remaining completed tasks using native IndexedDB
      return new Promise<any[]>((resolve, reject) => {
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
            resolve(completed.map(t => ({ title: t.title, completedAt: t.completedAt })));
          };
          getAllRequest.onerror = () => {
            db.close();
            reject(getAllRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    });

    console.log('After cleanup, remaining completed tasks:', cleanupResult);

    // Verify only tasks within 90 days remain
    expect(cleanupResult.some(t => t.title.includes('91 Days Ago'))).toBe(false);
    expect(cleanupResult.some(t => t.title.includes('120 Days Ago'))).toBe(false);
    expect(cleanupResult.some(t => t.title.includes('89 Days Ago'))).toBe(true);

    // Reload history page to see updated list
    await page.reload();
    await page.waitForTimeout(500);

    // Should show 3 tasks (Task 1, Task 3, and 89-day-old task)
    // Tasks older than 90 days should be gone
    await expect(page.getByText('Task Completed 89 Days Ago')).toBeVisible();
    await expect(page.getByText('Task Completed 91 Days Ago')).not.toBeVisible();
    await expect(page.getByText('Task Completed 120 Days Ago')).not.toBeVisible();

    // Take final screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/us5-final-state.png' });

    console.log('✓ US5 Independent Test PASSED: All scenarios verified');
  });

  test('US5 Rank Shifting: Verify continuous rank sequence after operations', async ({ page }) => {
    // Create 10 tasks
    await page.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('TaskPriorityDB', 2);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['tasks'], 'readwrite');
          const store = transaction.objectStore('tasks');

          const tasks = [];
          for (let i = 0; i < 10; i++) {
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

    await page.goto('/tasks');
    await page.waitForSelector('[data-testid="task-list"]', { timeout: 5000 });

    // Complete tasks 2, 4, 6
    // Delete tasks 1, 5
    // Final order should be: 0, 3, 7, 8, 9 with ranks 0-4

    const operations = [
      { type: 'complete', index: 2 }, // Complete Task 2
      { type: 'delete', index: 1 },   // Delete Task 1
      { type: 'complete', index: 3 }, // Complete Task 4 (index shifted)
      { type: 'delete', index: 3 },   // Delete Task 5 (index shifted)
      { type: 'complete', index: 3 }, // Complete Task 6 (index shifted)
    ];

    for (const op of operations) {
      await page.waitForTimeout(300);

      const taskCards = page.getByTestId('task-card');
      const targetCard = taskCards.nth(op.index);

      if (op.type === 'complete') {
        const completeButton = targetCard.getByTestId('complete-button');
        await completeButton.click();
      } else {
        const deleteButton = targetCard.getByTestId('delete-button');
        await deleteButton.click();

        await page.waitForSelector('[data-testid="delete-dialog"]', { timeout: 2000 });
        const confirmButton = page.getByTestId('delete-confirm-button');
        await confirmButton.click();
      }

      await page.waitForTimeout(300);
    }

    // Verify final state
    const finalState = await page.evaluate(() => {
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

    // Should have 5 active tasks with ranks 0-4 (continuous sequence)
    expect(finalState).toHaveLength(5);
    expect(finalState[0].title).toBe('Task 0');
    expect(finalState[0].rank).toBe(0);
    expect(finalState[1].title).toBe('Task 3');
    expect(finalState[1].rank).toBe(1);
    expect(finalState[2].title).toBe('Task 7');
    expect(finalState[2].rank).toBe(2);
    expect(finalState[3].title).toBe('Task 8');
    expect(finalState[3].rank).toBe(3);
    expect(finalState[4].title).toBe('Task 9');
    expect(finalState[4].rank).toBe(4);

    console.log('✓ Rank shifting verified: All ranks continuous from 0-4');
  });
});

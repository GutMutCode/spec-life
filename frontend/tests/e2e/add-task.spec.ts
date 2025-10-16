import { test, expect } from '@playwright/test';

/**
 * E2E tests for US2 - Add Task with Comparison Workflow
 *
 * Tests the complete user journey:
 * 1. User navigates to add task page
 * 2. User fills out task form
 * 3. User goes through comparison workflow
 * 4. Task is inserted at correct rank
 * 5. User returns to dashboard with updated task list
 */

test.describe('US2 - Add Task with Comparison (T045)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5175');

    // Clear IndexedDB before each test
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase('TaskPriorityDB');
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    });

    // Reload to ensure clean state
    await page.reload();
  });

  test('should complete full add task workflow with empty database', async ({ page }) => {
    // Click "Add Your First Task" button
    await page.click('text=Add Your First Task');

    // Should navigate to /add
    await expect(page).toHaveURL('http://localhost:5175/add');

    // Fill out task form
    await page.fill('[data-testid="title-input"]', 'My First Task');
    await page.fill('[data-testid="description-input"]', 'This is a test task');

    // Set deadline to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    await page.fill('[data-testid="deadline-input"]', tomorrowStr);

    // Submit form
    await page.click('[data-testid="submit-button"]');

    // Should show comparison modal (or complete immediately for empty DB)
    await page.waitForSelector('[data-testid="comparison-modal"]', { timeout: 5000 });

    // Should complete and redirect to dashboard
    await expect(page).toHaveURL('http://localhost:5175/', { timeout: 5000 });

    // Should show task on dashboard
    await expect(page.locator('text=My First Task')).toBeVisible();
  });

  test('should allow skip to manual placement', async ({ page }) => {
    // Seed some tasks first via browser console
    await page.evaluate(() => {
      const db = (window as any).db;
      if (db) {
        return db.tasks.bulkAdd([
          {
            id: '1',
            title: 'Existing Task 1',
            rank: 0,
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: '2',
            title: 'Existing Task 2',
            rank: 1,
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);
      }
    });

    await page.reload();

    // Click Add Task button
    await page.click('text=Add Task');

    // Fill form
    await page.fill('[data-testid="title-input"]', 'New Task');
    await page.click('[data-testid="submit-button"]');

    // Wait for comparison modal
    await page.waitForSelector('[data-testid="comparison-modal"]');

    // Should show comparison UI
    await expect(page.locator('text=Compare Tasks')).toBeVisible();

    // Click skip button
    await page.click('[data-testid="skip-button"]');

    // Should show manual placement UI
    await expect(page.locator('text=Choose Position')).toBeVisible();

    // Place at rank 1
    await page.click('[data-testid="place-rank-1"]');

    // Should complete and return to dashboard
    await expect(page).toHaveURL('http://localhost:5175/', { timeout: 5000 });
  });

  test('should allow answering comparison questions', async ({ page }) => {
    // Seed tasks
    await page.evaluate(() => {
      const db = (window as any).db;
      if (db) {
        return db.tasks.bulkAdd([
          {
            id: '1',
            title: 'Low Priority Task',
            rank: 0,
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);
      }
    });

    await page.reload();

    // Navigate to add task
    await page.click('text=Add Task');

    // Fill form with high priority task
    await page.fill('[data-testid="title-input"]', 'High Priority Task');
    await page.click('[data-testid="submit-button"]');

    // Wait for comparison
    await page.waitForSelector('[data-testid="comparison-modal"]');

    // Should show comparison question
    await expect(page.locator('text=Compare Tasks')).toBeVisible();

    // Answer "more important"
    await page.click('[data-testid="answer-higher"]');

    // Should complete (as there's only 1 existing task)
    await expect(page).toHaveURL('http://localhost:5175/', { timeout: 5000 });

    // Verify task was added at rank 0
    const tasks = await page.evaluate(() => {
      const db = (window as any).db;
      if (db) {
        return db.tasks.toArray();
      }
      return [];
    });

    expect(tasks.length).toBe(2);
    const newTask = tasks.find((t: any) => t.title === 'High Priority Task');
    expect(newTask.rank).toBe(0);
  });

  test('should handle form validation', async ({ page }) => {
    // Navigate to add task
    await page.goto('http://localhost:5175/add');

    // Try to submit without title
    await page.click('[data-testid="submit-button"]');

    // Should show validation error
    await expect(page.locator('[data-testid="title-error"]')).toBeVisible();

    // Form should not submit
    await expect(page).toHaveURL('http://localhost:5175/add');
  });

  test('should allow canceling from form', async ({ page }) => {
    // Navigate to add task
    await page.goto('http://localhost:5175/add');

    // Fill form
    await page.fill('[data-testid="title-input"]', 'Test Task');

    // Click cancel
    await page.click('text=Cancel');

    // Should return to dashboard
    await expect(page).toHaveURL('http://localhost:5175/');
  });

  test('should allow canceling from comparison modal', async ({ page }) => {
    // Seed task
    await page.evaluate(() => {
      const db = (window as any).db;
      if (db) {
        return db.tasks.add({
          id: '1',
          title: 'Existing Task',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });

    await page.reload();

    // Navigate to add task
    await page.click('text=Add Task');

    // Fill form
    await page.fill('[data-testid="title-input"]', 'New Task');
    await page.click('[data-testid="submit-button"]');

    // Wait for comparison modal
    await page.waitForSelector('[data-testid="comparison-modal"]');

    // Click cancel
    await page.click('[data-testid="cancel-button"]');

    // Should close modal and return to form or dashboard
    await page.waitForSelector('[data-testid="comparison-modal"]', { state: 'hidden' });
  });
});

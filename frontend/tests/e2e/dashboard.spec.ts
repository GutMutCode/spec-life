import { test, expect } from '@playwright/test';

/**
 * E2E tests for Dashboard page (US1).
 *
 * Tests user scenarios:
 * - T031: Empty state when no tasks exist
 * - T032: Top task display when tasks exist
 */

test.describe('Dashboard - Empty State (T031)', () => {
  test('should show "Add your first task" message when no tasks exist', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');

    // Wait for page to load
    await page.waitForSelector('[data-testid="empty-state"]', { timeout: 5000 });

    // Verify empty state message
    await expect(page.getByText('No tasks yet')).toBeVisible();
    await expect(
      page.getByText('Add your first task to start prioritizing your work.')
    ).toBeVisible();

    // Verify CTA button exists
    await expect(page.getByRole('button', { name: /add your first task/i })).toBeVisible();

    // Take screenshot for visual verification
    await page.screenshot({ path: 'tests/e2e/screenshots/dashboard-empty.png' });
  });

  test('should not show loading spinner after page loads', async ({ page }) => {
    await page.goto('/');

    // Wait for either empty state or task to appear (loading should be gone)
    await page.waitForSelector('[data-testid="empty-state"], [data-testid="task-card"]', {
      timeout: 5000,
    });

    // Loading spinner should not be visible
    await expect(page.getByTestId('loading-state')).not.toBeVisible();
  });
});

test.describe('Dashboard - Top Task Display (T032)', () => {
  test('should display task with rank 0 prominently', async ({ page, context }) => {
    // Navigate to page first
    await page.goto('/');

    // Create tasks in IndexedDB using page.evaluate
    await page.evaluate(async () => {
      const { db } = await import('/src/lib/indexeddb');

      const tasks = [
        {
          id: crypto.randomUUID(),
          title: 'High Priority Task',
          description: 'This is the most important task',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Medium Priority Task',
          rank: 1,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          title: 'Low Priority Task',
          rank: 2,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.tasks.bulkAdd(tasks);
    });

    // Reload to fetch tasks
    await page.reload();

    // Wait for task card to appear
    await page.waitForSelector('[data-testid="task-card"]', { timeout: 5000 });

    // Verify only rank 0 task is displayed
    await expect(page.getByText('High Priority Task')).toBeVisible();
    await expect(page.getByText('This is the most important task')).toBeVisible();

    // Verify other tasks are NOT displayed (dashboard shows only top task)
    await expect(page.getByText('Medium Priority Task')).not.toBeVisible();
    await expect(page.getByText('Low Priority Task')).not.toBeVisible();

    // Verify rank badge shows #0
    await expect(page.getByTestId('rank-badge')).toContainText('#0');

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/dashboard-with-task.png' });
  });

  test('should display task with deadline', async ({ page }) => {
    await page.goto('/');

    // Create task with deadline
    await page.evaluate(async () => {
      const { db } = await import('/src/lib/indexeddb');

      const task = {
        id: crypto.randomUUID(),
        title: 'Task with Deadline',
        description: 'Important task with a due date',
        deadline: new Date('2025-12-31'),
        rank: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(task);
    });

    await page.reload();
    await page.waitForSelector('[data-testid="task-card"]', { timeout: 5000 });

    // Verify task is displayed
    await expect(page.getByText('Task with Deadline')).toBeVisible();

    // Verify deadline is shown
    await expect(page.getByTestId('deadline-text')).toBeVisible();
  });

  test('should show overdue indicator for past deadlines', async ({ page }) => {
    await page.goto('/');

    // Create task with past deadline
    await page.evaluate(async () => {
      const { db } = await import('/src/lib/indexeddb');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const task = {
        id: crypto.randomUUID(),
        title: 'Overdue Task',
        deadline: yesterday,
        rank: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.tasks.add(task);
    });

    await page.reload();
    await page.waitForSelector('[data-testid="task-card"]', { timeout: 5000 });

    // Verify task is displayed
    await expect(page.getByText('Overdue Task')).toBeVisible();

    // Verify overdue indicator
    await expect(page.getByText('This task is overdue')).toBeVisible();
    await expect(page.getByTestId('deadline-text')).toContainText('(overdue)');

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/dashboard-overdue.png' });
  });
});

test.describe('Dashboard - Performance (T034)', () => {
  test('should load in under 2 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    // Wait for page to be fully loaded (either empty state or task card)
    await page.waitForSelector('[data-testid="empty-state"], [data-testid="task-card"]', {
      timeout: 5000,
    });

    const loadTime = Date.now() - startTime;

    // Verify load time meets SC-001 requirement (<2s)
    expect(loadTime).toBeLessThan(2000);
  });
});

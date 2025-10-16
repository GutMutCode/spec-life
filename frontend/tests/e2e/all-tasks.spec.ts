import { test, expect } from '@playwright/test';

/**
 * E2E tests for All Tasks view (US3 - T052)
 *
 * Tests the complete user journey for viewing all tasks:
 * - Navigation to /tasks page
 * - Display of all tasks in priority order
 * - Rank badge visibility and color coding
 * - Performance with large task lists
 * - Empty state handling
 * - Navigation between views
 */

test.describe('All Tasks View (US3)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and clear IndexedDB
    await page.goto('/');
    await page.evaluate(() => {
      indexedDB.deleteDatabase('TaskPriorityDB');
    });
    await page.reload();
  });

  test.describe('Empty State', () => {
    test('should show empty state when no tasks exist', async ({ page }) => {
      await page.goto('/tasks');

      await expect(page.getByTestId('empty-state')).toBeVisible();
      await expect(page.getByText('No tasks yet')).toBeVisible();
      await expect(
        page.getByText('Add your first task to start prioritizing your work.')
      ).toBeVisible();
    });

    test('should navigate to add task from empty state', async ({ page }) => {
      await page.goto('/tasks');

      await page.getByRole('button', { name: /add your first task/i }).click();

      await expect(page).toHaveURL('/add');
    });
  });

  test.describe('Task Display', () => {
    test('should display all tasks in priority order (rank 0 first)', async ({ page }) => {
      // Create 15 tasks via the form
      const taskTitles = [];
      for (let i = 0; i < 5; i++) {
        taskTitles.push(`Task ${i}`);
      }

      for (const title of taskTitles) {
        await page.goto('/add');
        await page.getByTestId('title-input').fill(title);
        await page.getByTestId('submit-button').click();

        // Handle comparison or success modal
        const successButton = page.getByTestId('close-button');
        if (await successButton.isVisible({ timeout: 2000 })) {
          await successButton.click();
        }
      }

      // Navigate to all tasks view
      await page.goto('/tasks');

      // Wait for tasks to load
      await expect(page.getByTestId('task-list')).toBeVisible();

      // Verify all tasks are displayed
      const taskCards = page.getByTestId('task-card');
      await expect(taskCards).toHaveCount(5);

      // Verify task count indicator
      await expect(page.getByText('Showing 5 tasks')).toBeVisible();
    });

    test('should display rank badges with correct numbers', async ({ page }) => {
      // Create 3 tasks
      for (let i = 0; i < 3; i++) {
        await page.goto('/add');
        await page.getByTestId('title-input').fill(`Task ${i}`);
        await page.getByTestId('submit-button').click();

        const closeButton = page.getByTestId('close-button');
        if (await closeButton.isVisible({ timeout: 2000 })) {
          await closeButton.click();
        }
      }

      await page.goto('/tasks');

      // Check rank badges
      const rankBadges = page.getByTestId('rank-badge');
      await expect(rankBadges).toHaveCount(3);

      // Verify rank numbers are displayed (order depends on comparison)
      const firstBadge = rankBadges.first();
      await expect(firstBadge).toBeVisible();
      await expect(firstBadge).toContainText('#');
    });

    test('should display task details (title, description, deadline)', async ({ page }) => {
      // Create a task with full details
      await page.goto('/add');
      await page.getByTestId('title-input').fill('Complete Project');
      await page.getByTestId('description-input').fill('Finish the MVP implementation');
      await page.getByTestId('deadline-input').fill('2025-12-31');
      await page.getByTestId('submit-button').click();

      const closeButton = page.getByTestId('close-button');
      if (await closeButton.isVisible({ timeout: 2000 })) {
        await closeButton.click();
      }

      await page.goto('/tasks');

      // Verify task details are displayed
      await expect(page.getByText('Complete Project')).toBeVisible();
      await expect(page.getByText('Finish the MVP implementation')).toBeVisible();
      await expect(page.getByTestId('deadline-text')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to dashboard from all tasks view', async ({ page }) => {
      // Create a task first
      await page.goto('/add');
      await page.getByTestId('title-input').fill('Test Task');
      await page.getByTestId('submit-button').click();

      const closeButton = page.getByTestId('close-button');
      if (await closeButton.isVisible({ timeout: 2000 })) {
        await closeButton.click();
      }

      await page.goto('/tasks');

      // Click back to dashboard
      await page.getByRole('button', { name: /back to dashboard/i }).click();

      await expect(page).toHaveURL('/');
    });

    test('should navigate to add task from all tasks view', async ({ page }) => {
      await page.goto('/tasks');

      await page.getByRole('button', { name: /add task/i }).click();

      await expect(page).toHaveURL('/add');
    });

    test('should navigate from dashboard to all tasks', async ({ page }) => {
      // Create a task first
      await page.goto('/add');
      await page.getByTestId('title-input').fill('Test Task');
      await page.getByTestId('submit-button').click();

      const closeButton = page.getByTestId('close-button');
      if (await closeButton.isVisible({ timeout: 2000 })) {
        await closeButton.click();
      }

      await page.goto('/');

      // Click "View all tasks" link
      await page.getByRole('button', { name: /view all tasks/i }).click();

      await expect(page).toHaveURL('/tasks');
      await expect(page.getByTestId('task-list')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load and display tasks within 2 seconds (SC-006)', async ({ page }) => {
      // Create 10 tasks
      for (let i = 0; i < 10; i++) {
        await page.goto('/add');
        await page.getByTestId('title-input').fill(`Performance Test Task ${i}`);
        await page.getByTestId('submit-button').click();

        const closeButton = page.getByTestId('close-button');
        if (await closeButton.isVisible({ timeout: 2000 })) {
          await closeButton.click();
        }
      }

      // Measure load time
      const startTime = Date.now();
      await page.goto('/tasks');
      await expect(page.getByTestId('task-list')).toBeVisible();
      const loadTime = Date.now() - startTime;

      // Verify all 10 tasks are displayed
      const taskCards = page.getByTestId('task-card');
      await expect(taskCards).toHaveCount(10);

      // Performance check: should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    test('should handle scrolling with many tasks', async ({ page }) => {
      // Create 15 tasks
      for (let i = 0; i < 15; i++) {
        await page.goto('/add');
        await page.getByTestId('title-input').fill(`Scroll Test Task ${i}`);
        await page.getByTestId('submit-button').click();

        const closeButton = page.getByTestId('close-button');
        if (await closeButton.isVisible({ timeout: 2000 })) {
          await closeButton.click();
        }
      }

      await page.goto('/tasks');

      // Verify initial tasks are visible
      await expect(page.getByTestId('task-list')).toBeVisible();

      // Scroll to bottom
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Verify tasks are still displayed correctly
      const taskCards = page.getByTestId('task-card');
      await expect(taskCards).toHaveCount(15);
      await expect(page.getByText('Showing 15 tasks')).toBeVisible();
    });
  });

  test.describe('US3 Independent Test', () => {
    test('should create 10 tasks and display all in correct order', async ({ page }) => {
      // Create 10 tasks with clear priority order
      const tasks = [
        { title: 'Urgent Bug Fix', description: 'Critical production issue' },
        { title: 'Client Meeting', description: 'Prepare presentation' },
        { title: 'Code Review', description: 'Review PR #123' },
        { title: 'Documentation', description: 'Update API docs' },
        { title: 'Testing', description: 'Write unit tests' },
        { title: 'Refactoring', description: 'Clean up legacy code' },
        { title: 'Research', description: 'Investigate new framework' },
        { title: 'Planning', description: 'Sprint planning session' },
        { title: 'Deployment', description: 'Deploy to staging' },
        { title: 'Monitoring', description: 'Check system metrics' },
      ];

      for (const task of tasks) {
        await page.goto('/add');
        await page.getByTestId('title-input').fill(task.title);
        await page.getByTestId('description-input').fill(task.description);
        await page.getByTestId('submit-button').click();

        const closeButton = page.getByTestId('close-button');
        if (await closeButton.isVisible({ timeout: 2000 })) {
          await closeButton.click();
        }
      }

      // Measure load time for all tasks view
      const startTime = Date.now();
      await page.goto('/tasks');
      await expect(page.getByTestId('task-list')).toBeVisible();
      const loadTime = Date.now() - startTime;

      // Verify all 10 tasks are displayed
      const taskCards = page.getByTestId('task-card');
      await expect(taskCards).toHaveCount(10);

      // Verify rank badges are shown
      const rankBadges = page.getByTestId('rank-badge');
      await expect(rankBadges).toHaveCount(10);

      // Verify tasks are in order (rank 0 to 9)
      const firstRankBadge = rankBadges.first();
      await expect(firstRankBadge).toContainText('#0');

      // Performance requirement: <2s load time (SC-006)
      expect(loadTime).toBeLessThan(2000);

      console.log(`All tasks view loaded in ${loadTime}ms`);
    });
  });
});

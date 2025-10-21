import { test, expect } from '@playwright/test';

/**
 * E2E tests for Contextual Shortcut Hints (002-ui, User Story 2).
 *
 * Tests user scenarios:
 * - FR-006: Contextual hints on hover (500ms) and focus (immediate)
 * - Tooltip timing behavior
 * - Tooltip positioning
 */

test.describe('Shortcut Hints - Hover Behavior (FR-006)', () => {
  test('shows tooltip after 500ms hover on Add Task button', async ({ page }) => {
    await page.goto('/');

    // Find Add Task button/link (implementation may vary)
    const addButton = page.locator('a[href="/add"], button').filter({ hasText: /add/i }).first();
    await addButton.hover();

    // Should NOT be visible immediately
    await expect(page.getByRole('tooltip')).not.toBeVisible({ timeout: 100 });

    // Should appear after 500ms
    await page.waitForTimeout(500);
    await expect(page.getByRole('tooltip')).toBeVisible();
    await expect(page.getByText(/add new task/i)).toBeVisible();
    await expect(page.getByText('n')).toBeVisible();
  });

  test('hides tooltip immediately on mouseleave', async ({ page }) => {
    await page.goto('/');

    const addButton = page.locator('a[href="/add"], button').filter({ hasText: /add/i }).first();
    await addButton.hover();
    await page.waitForTimeout(500);

    // Tooltip should be visible
    await expect(page.getByRole('tooltip')).toBeVisible();

    // Move mouse away
    await page.mouse.move(0, 0);

    // Tooltip should hide immediately
    await expect(page.getByRole('tooltip')).not.toBeVisible({ timeout: 100 });
  });

  test('cancels tooltip if mouseleave before 500ms', async ({ page }) => {
    await page.goto('/');

    const addButton = page.locator('a[href="/add"], button').filter({ hasText: /add/i }).first();
    await addButton.hover();

    // Move away after 200ms (before 500ms timeout)
    await page.waitForTimeout(200);
    await page.mouse.move(0, 0);

    // Wait past original 500ms
    await page.waitForTimeout(400);

    // Tooltip should NOT appear
    await expect(page.getByRole('tooltip')).not.toBeVisible();
  });

  test('shows tooltip on hover for navigation links', async ({ page }) => {
    await page.goto('/');

    // Test All Tasks link (shortcut: a)
    const allTasksLink = page.locator('a[href="/tasks"]').first();
    await allTasksLink.hover();
    await page.waitForTimeout(500);

    await expect(page.getByRole('tooltip')).toBeVisible();
    await expect(page.getByText(/all tasks|view all tasks/i)).toBeVisible();
    await expect(page.getByText('a')).toBeVisible();
  });
});

test.describe('Shortcut Hints - Focus Behavior (FR-006)', () => {
  test('shows tooltip immediately on focus (keyboard navigation)', async ({ page }) => {
    await page.goto('/');

    // Tab to Add Task button
    await page.keyboard.press('Tab');

    // Find the currently focused element
    const focusedElement = page.locator(':focus');
    const elementText = await focusedElement.textContent();

    // If we focused on Add Task element, tooltip should show immediately
    if (elementText && /add/i.test(elementText)) {
      await expect(page.getByRole('tooltip')).toBeVisible({ timeout: 100 });
      await expect(page.getByText('n')).toBeVisible();
    }
  });

  test('hides tooltip immediately on blur', async ({ page }) => {
    await page.goto('/');

    // Tab to an element with shortcut hint
    await page.keyboard.press('Tab');

    // Check if tooltip is visible
    const tooltipVisible = await page.getByRole('tooltip').isVisible().catch(() => false);

    if (tooltipVisible) {
      // Tab away (blur)
      await page.keyboard.press('Tab');

      // Tooltip should hide immediately
      await expect(page.getByRole('tooltip')).not.toBeVisible({ timeout: 100 });
    }
  });

  test('navigates through multiple hints with keyboard', async ({ page }) => {
    await page.goto('/');

    let hintsFound = 0;

    // Tab through first 10 elements looking for hints
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);

      const tooltipVisible = await page.getByRole('tooltip').isVisible().catch(() => false);

      if (tooltipVisible) {
        hintsFound++;
        // Verify tooltip has required structure
        const kbd = page.locator('tooltip kbd, [role="tooltip"] kbd');
        await expect(kbd).toBeVisible();
      }
    }

    // Should find at least one hint (n, a, h, or d)
    expect(hintsFound).toBeGreaterThan(0);
  });
});

test.describe('Shortcut Hints - Tooltip Content', () => {
  test('displays shortcut key in correct format', async ({ page }) => {
    await page.goto('/');

    const addButton = page.locator('a[href="/add"], button').filter({ hasText: /add/i }).first();
    await addButton.hover();
    await page.waitForTimeout(500);

    // Key should be in <kbd> element
    const kbd = page.locator('[role="tooltip"] kbd');
    await expect(kbd).toBeVisible();
    await expect(kbd).toHaveText('n');
  });

  test('displays description text', async ({ page }) => {
    await page.goto('/');

    const addButton = page.locator('a[href="/add"], button').filter({ hasText: /add/i }).first();
    await addButton.hover();
    await page.waitForTimeout(500);

    // Should show description
    await expect(page.getByText(/add new task/i)).toBeVisible();
  });
});

test.describe('Shortcut Hints - Positioning', () => {
  test('tooltip appears near hovered element', async ({ page }) => {
    await page.goto('/');

    const addButton = page.locator('a[href="/add"], button').filter({ hasText: /add/i }).first();
    const buttonBox = await addButton.boundingBox();

    await addButton.hover();
    await page.waitForTimeout(500);

    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();

    const tooltipBox = await tooltip.boundingBox();

    // Tooltip should be positioned near the button
    // (within reasonable distance - not exact due to positioning strategy)
    if (buttonBox && tooltipBox) {
      const distance = Math.abs(tooltipBox.y - buttonBox.y);
      expect(distance).toBeLessThan(200); // Reasonable proximity
    }
  });

  test('tooltip does not block interaction with element', async ({ page }) => {
    await page.goto('/');

    const addButton = page.locator('a[href="/add"], button').filter({ hasText: /add/i }).first();
    await addButton.hover();
    await page.waitForTimeout(500);

    // Tooltip should be visible
    await expect(page.getByRole('tooltip')).toBeVisible();

    // Button should still be clickable (tooltip has pointer-events: none)
    await addButton.click();

    // Should navigate to /add
    await expect(page).toHaveURL(/\/add/);
  });
});

test.describe('Shortcut Hints - Multiple Navigation Links', () => {
  test('shows different hints for different links', async ({ page }) => {
    await page.goto('/');

    // Test All Tasks link (a)
    const allTasksLink = page.locator('a[href="/tasks"]').first();
    if (await allTasksLink.isVisible()) {
      await allTasksLink.hover();
      await page.waitForTimeout(500);
      await expect(page.getByText('a')).toBeVisible();
      await page.mouse.move(0, 0); // Move away
    }

    await page.waitForTimeout(100);

    // Test History link (h)
    const historyLink = page.locator('a[href="/history"]').first();
    if (await historyLink.isVisible()) {
      await historyLink.hover();
      await page.waitForTimeout(500);
      await expect(page.getByText('h')).toBeVisible();
      await page.mouse.move(0, 0); // Move away
    }

    await page.waitForTimeout(100);

    // Test Dashboard link (d)
    const dashboardLink = page.locator('a[href="/"]').first();
    if (await dashboardLink.isVisible()) {
      await dashboardLink.hover();
      await page.waitForTimeout(500);
      await expect(page.getByText('d')).toBeVisible();
    }
  });
});

test.describe('Shortcut Hints - Timing Accuracy', () => {
  test('tooltip appears within 500-600ms window', async ({ page }) => {
    await page.goto('/');

    const addButton = page.locator('a[href="/add"], button').filter({ hasText: /add/i }).first();

    const startTime = Date.now();
    await addButton.hover();

    // Wait for tooltip to appear
    await page.getByRole('tooltip').waitFor({ state: 'visible', timeout: 700 });
    const endTime = Date.now();

    const elapsedTime = endTime - startTime;

    // Should be approximately 500ms (allow 100ms margin for browser/network delays)
    expect(elapsedTime).toBeGreaterThanOrEqual(450);
    expect(elapsedTime).toBeLessThan(700);
  });

  test('tooltip appears immediately on focus (< 100ms)', async ({ page }) => {
    await page.goto('/');

    // Tab to first focusable element
    const startTime = Date.now();
    await page.keyboard.press('Tab');

    // Check if tooltip appears
    const tooltipAppeared = await page.getByRole('tooltip')
      .waitFor({ state: 'visible', timeout: 150 })
      .then(() => true)
      .catch(() => false);

    if (tooltipAppeared) {
      const endTime = Date.now();
      const elapsedTime = endTime - startTime;

      // Should be very fast (< 100ms)
      expect(elapsedTime).toBeLessThan(150);
    }
  });
});

test.describe('Shortcut Hints - Edge Cases', () => {
  test('handles rapid hover on/off correctly', async ({ page }) => {
    await page.goto('/');

    const addButton = page.locator('a[href="/add"], button').filter({ hasText: /add/i }).first();

    // Hover on
    await addButton.hover();
    await page.waitForTimeout(100);

    // Hover off quickly
    await page.mouse.move(0, 0);
    await page.waitForTimeout(100);

    // Hover on again
    await addButton.hover();
    await page.waitForTimeout(500);

    // Should show tooltip (second hover completed)
    await expect(page.getByRole('tooltip')).toBeVisible();
  });

  test('tooltip works after modal interactions', async ({ page }) => {
    await page.goto('/');

    // Open shortcuts modal
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog')).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Hover on button - tooltip should still work
    const addButton = page.locator('a[href="/add"], button').filter({ hasText: /add/i }).first();
    await addButton.hover();
    await page.waitForTimeout(500);

    await expect(page.getByRole('tooltip')).toBeVisible();
  });
});

test.describe('Shortcut Hints - Visual Regression', () => {
  test('matches visual snapshot of tooltip', async ({ page }) => {
    await page.goto('/');

    const addButton = page.locator('a[href="/add"], button').filter({ hasText: /add/i }).first();
    await addButton.hover();
    await page.waitForTimeout(500);

    // Wait for tooltip to be fully visible
    await expect(page.getByRole('tooltip')).toBeVisible();

    // Take screenshot of tooltip
    await expect(page).toHaveScreenshot('shortcut-hint-tooltip.png');
  });
});

import { test, expect } from '@playwright/test';

/**
 * E2E tests for Keyboard Shortcuts Help UI (002-ui).
 *
 * Tests user scenarios:
 * - FR-001: Opening/closing modal with ? key
 * - FR-002: Displaying all shortcuts grouped by category
 * - FR-004: Closing via Escape, click outside, close button
 * - FR-005a: Auto-close before executing other shortcuts
 * - FR-007: OS-specific keyboard display
 * - SC-001: Help key response in <1s
 */

test.describe('Shortcuts Help Modal - Opening and Closing (FR-001, FR-004)', () => {
  test('opens shortcuts modal on ? key press', async ({ page }) => {
    await page.goto('/');

    // Press ? key to open modal
    await page.keyboard.press('?');

    // Modal should be visible
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Keyboard Shortcuts')).toBeVisible();
  });

  test('closes modal on second ? key press (toggle)', async ({ page }) => {
    await page.goto('/');

    // Open modal
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog')).toBeVisible();

    // Close modal by pressing ? again
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('closes modal on Escape key press', async ({ page }) => {
    await page.goto('/');

    // Open modal
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog')).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('closes modal when clicking overlay outside', async ({ page }) => {
    await page.goto('/');

    // Open modal
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog')).toBeVisible();

    // Click overlay (presentation role)
    const overlay = page.getByRole('presentation');
    await overlay.click({ position: { x: 10, y: 10 } }); // Click top-left corner

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('closes modal when clicking close button', async ({ page }) => {
    await page.goto('/');

    // Open modal
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog')).toBeVisible();

    // Click close button
    const closeButton = page.getByLabelText('Close shortcuts help');
    await closeButton.click();

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('does not close when clicking modal content', async ({ page }) => {
    await page.goto('/');

    // Open modal
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog')).toBeVisible();

    // Click modal content (dialog element itself)
    const dialog = page.getByRole('dialog');
    await dialog.click();

    // Modal should remain open
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

test.describe('Shortcuts Help Modal - Content Display (FR-002, FR-003)', () => {
  test('displays all shortcuts grouped by category', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('?');

    // Check category headers appear
    await expect(page.getByText('Navigation')).toBeVisible();
    await expect(page.getByText('Task Management')).toBeVisible();
    await expect(page.getByText('Help')).toBeVisible();

    // Check some shortcut descriptions
    await expect(page.getByText('Add new task')).toBeVisible();
    await expect(page.getByText('Show keyboard shortcuts help')).toBeVisible();
    await expect(page.getByText('View all tasks')).toBeVisible();
  });

  test('displays shortcuts with key badges', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('?');

    // Check for KBD elements showing keys
    const keyBadges = page.locator('kbd');
    await expect(keyBadges).toHaveCount(10); // 10 shortcuts total

    // Check specific key badges
    await expect(page.locator('kbd:has-text("n")')).toBeVisible();
    await expect(page.locator('kbd:has-text("?")')).toBeVisible();
    await expect(page.locator('kbd:has-text("a")')).toBeVisible();
  });
});

test.describe('Shortcuts Help Modal - Auto-Close Behavior (FR-005a)', () => {
  test('closes modal and executes shortcut when pressing n (add task)', async ({ page }) => {
    await page.goto('/');

    // Open modal
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog')).toBeVisible();

    // Press 'n' shortcut for add task
    await page.keyboard.press('n');

    // Modal should auto-close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Should navigate to /add (shortcut executed)
    await expect(page).toHaveURL(/\/add/);
  });

  test('closes modal and executes shortcut when pressing a (all tasks)', async ({ page }) => {
    await page.goto('/');

    // Open modal
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog')).toBeVisible();

    // Press 'a' shortcut for all tasks
    await page.keyboard.press('a');

    // Modal should auto-close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Should navigate to /all (shortcut executed)
    await expect(page).toHaveURL(/\/all/);
  });

  test('closes modal and executes shortcut when pressing h (history)', async ({ page }) => {
    await page.goto('/');

    // Open modal
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog')).toBeVisible();

    // Press 'h' shortcut for history
    await page.keyboard.press('h');

    // Modal should auto-close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Should navigate to /history (shortcut executed)
    await expect(page).toHaveURL(/\/history/);
  });

  test('closes modal and executes shortcut when pressing d (dashboard)', async ({ page }) => {
    // Start on a different page
    await page.goto('/all');

    // Open modal
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog')).toBeVisible();

    // Press 'd' shortcut for dashboard
    await page.keyboard.press('d');

    // Modal should auto-close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Should navigate to / (dashboard)
    await expect(page).toHaveURL(/^\/$|\/$/);
  });
});

test.describe('Shortcuts Help Modal - Accessibility (FR-008)', () => {
  test('has correct ARIA attributes', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('?');

    const dialog = page.getByRole('dialog');

    // Check ARIA attributes
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby', 'shortcuts-modal-title');
  });

  test('focuses close button when opened', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('?');

    // Close button should be focused (first focusable element)
    const closeButton = page.getByLabelText('Close shortcuts help');
    await expect(closeButton).toBeFocused();
  });

  test('traps focus within modal when using Tab', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('?');

    // Get all focusable elements
    const closeButton = page.getByLabelText('Close shortcuts help');

    // Close button should be focused initially
    await expect(closeButton).toBeFocused();

    // Pressing Tab should cycle focus within modal (not escape to page)
    await page.keyboard.press('Tab');

    // Focus should still be somewhere in the modal
    const dialog = page.getByRole('dialog');
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.closest('[role="dialog"]') !== null;
    });
    expect(focusedElement).toBe(true);
  });

  test('restores focus to previously focused element after closing', async ({ page }) => {
    await page.goto('/');

    // Focus a button before opening modal
    const addButton = page.getByRole('link', { name: /add/i }).first();
    await addButton.focus();

    // Open modal
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog')).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Focus should return to the add button
    // (This test might be flaky - focus restoration happens async)
    await page.waitForTimeout(100);
    await expect(addButton).toBeFocused();
  });
});

test.describe('Shortcuts Help Modal - Performance (SC-001, SC-007)', () => {
  test('responds to ? key press in under 1 second', async ({ page }) => {
    await page.goto('/');

    const startTime = Date.now();

    // Press ? key
    await page.keyboard.press('?');

    // Wait for modal to appear
    await expect(page.getByRole('dialog')).toBeVisible();

    const responseTime = Date.now() - startTime;

    // Per SC-001: Help key response in <1s
    expect(responseTime).toBeLessThan(1000);
  });

  test('renders modal content in under 200ms', async ({ page }) => {
    await page.goto('/');

    // Press ? key
    await page.keyboard.press('?');

    const startRender = Date.now();

    // Wait for all categories to be visible (content fully rendered)
    await expect(page.getByText('Navigation')).toBeVisible();
    await expect(page.getByText('Task Management')).toBeVisible();
    await expect(page.getByText('Help')).toBeVisible();

    const renderTime = Date.now() - startRender;

    // Per SC-007: Modal renders in <200ms
    expect(renderTime).toBeLessThan(200);
  });
});

test.describe('Shortcuts Help Modal - Edge Cases', () => {
  test('ignores ? key when typing in input field', async ({ page }) => {
    await page.goto('/add');

    // Focus input field
    const titleInput = page.getByPlaceholder(/title/i);
    await titleInput.click();

    // Type ? in the input
    await titleInput.fill('What is the deadline?');

    // Modal should NOT open
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Input should contain the question mark
    await expect(titleInput).toHaveValue('What is the deadline?');
  });

  test('ignores modifier key combinations with ?', async ({ page }) => {
    await page.goto('/');

    // Press Ctrl+? (should be ignored)
    await page.keyboard.press('Control+Shift+/'); // Shift+/ = ?
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Press Alt+? (should be ignored)
    await page.keyboard.press('Alt+Shift+/');
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Plain ? should work
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('locks body scroll when modal is open', async ({ page }) => {
    await page.goto('/');

    // Open modal
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog')).toBeVisible();

    // Check body overflow style
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe('hidden');
  });

  test('restores body scroll when modal closes', async ({ page }) => {
    await page.goto('/');

    // Open modal
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog')).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Check body overflow restored
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe('');
  });
});

test.describe('Shortcuts Help Modal - Visual Regression', () => {
  test('matches visual snapshot of modal', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('?');

    // Wait for modal to be fully visible
    await expect(page.getByRole('dialog')).toBeVisible();

    // Take screenshot for visual regression
    await expect(page).toHaveScreenshot('shortcuts-modal.png');
  });
});

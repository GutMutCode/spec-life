import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ShortcutHint from '../ShortcutHint';

// Mock useDeviceDetection to control mobile detection in tests
vi.mock('@/hooks/useDeviceDetection', () => ({
  useDeviceDetection: () => ({
    os: 'Mac',
    isTouchOnly: false,
    isMac: true,
    isWindows: false,
    isLinux: false
  })
}));

describe('ShortcutHint', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Hover Behavior (500ms delay)', () => {
    it('does not show tooltip immediately on hover', () => {
      render(
        <ShortcutHint shortcutKey="n" description="Add new task">
          <button>Add Task</button>
        </ShortcutHint>
      );

      const wrapper = screen.getByText('Add Task').parentElement!;
      fireEvent.mouseEnter(wrapper);

      // Should NOT be visible immediately
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('shows tooltip after 500ms hover', async () => {
      render(
        <ShortcutHint shortcutKey="n" description="Add new task">
          <button>Add Task</button>
        </ShortcutHint>
      );

      const wrapper = screen.getByText('Add Task').parentElement!;
      fireEvent.mouseEnter(wrapper);

      // Fast-forward time by 500ms
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Should be visible after 500ms
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      expect(screen.getByText('Add new task')).toBeInTheDocument();
      expect(screen.getByText('n')).toBeInTheDocument();
    });

    it('hides tooltip immediately on mouseleave', () => {
      render(
        <ShortcutHint shortcutKey="n" description="Add new task">
          <button>Add Task</button>
        </ShortcutHint>
      );

      const wrapper = screen.getByText('Add Task').parentElement!;
      fireEvent.mouseEnter(wrapper);
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      fireEvent.mouseLeave(wrapper);

      // Should hide immediately
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('cancels timer if mouseleave before 500ms', () => {
      render(
        <ShortcutHint shortcutKey="n" description="Add new task">
          <button>Add Task</button>
        </ShortcutHint>
      );

      const wrapper = screen.getByText('Add Task').parentElement!;
      fireEvent.mouseEnter(wrapper);

      // Leave after 200ms (before 500ms timeout)
      act(() => {
        vi.advanceTimersByTime(200);
      });
      fireEvent.mouseLeave(wrapper);

      // Advance past original 500ms
      act(() => {
        vi.advanceTimersByTime(400);
      });

      // Should NOT show tooltip
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Focus Behavior (immediate)', () => {
    it('shows tooltip immediately on focus', () => {
      render(
        <ShortcutHint shortcutKey="h" description="View history">
          <button>History</button>
        </ShortcutHint>
      );

      const wrapper = screen.getByText('History').parentElement!;
      fireEvent.focus(wrapper);

      // Should be visible immediately (0ms delay)
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      expect(screen.getByText('View history')).toBeInTheDocument();
      expect(screen.getByText('h')).toBeInTheDocument();
    });

    it('hides tooltip immediately on blur', () => {
      render(
        <ShortcutHint shortcutKey="h" description="View history">
          <button>History</button>
        </ShortcutHint>
      );

      const wrapper = screen.getByText('History').parentElement!;
      fireEvent.focus(wrapper);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      fireEvent.blur(wrapper);

      // Should hide immediately
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Tooltip Content', () => {
    it('displays description and shortcut key', () => {
      render(
        <ShortcutHint shortcutKey="a" description="View all tasks">
          <button>All Tasks</button>
        </ShortcutHint>
      );

      const wrapper = screen.getByText('All Tasks').parentElement!;
      fireEvent.focus(wrapper);

      expect(screen.getByText('View all tasks')).toBeInTheDocument();

      // Key should be in <kbd> element
      const kbd = screen.getByText('a');
      expect(kbd.tagName).toBe('KBD');
    });

    it('uses default description if not provided', () => {
      render(
        <ShortcutHint shortcutKey="d">
          <button>Dashboard</button>
        </ShortcutHint>
      );

      const wrapper = screen.getByText('Dashboard').parentElement!;
      fireEvent.focus(wrapper);

      // Should show tooltip even without description
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      expect(screen.getByText('d')).toBeInTheDocument();
    });
  });

  describe('Positioning', () => {
    it('applies correct CSS class for top position', () => {
      render(
        <ShortcutHint shortcutKey="n" description="Test" position="top">
          <button>Test</button>
        </ShortcutHint>
      );

      const wrapper = screen.getByText('Test').parentElement!;
      fireEvent.focus(wrapper);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveClass('shortcut-hint-top');
    });

    it('applies correct CSS class for bottom position', () => {
      render(
        <ShortcutHint shortcutKey="n" description="Test" position="bottom">
          <button>Test</button>
        </ShortcutHint>
      );

      const wrapper = screen.getByText('Test').parentElement!;
      fireEvent.focus(wrapper);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveClass('shortcut-hint-bottom');
    });

    it('applies correct CSS class for left position', () => {
      render(
        <ShortcutHint shortcutKey="n" description="Test" position="left">
          <button>Test</button>
        </ShortcutHint>
      );

      const wrapper = screen.getByText('Test').parentElement!;
      fireEvent.focus(wrapper);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveClass('shortcut-hint-left');
    });

    it('applies correct CSS class for right position', () => {
      render(
        <ShortcutHint shortcutKey="n" description="Test" position="right">
          <button>Test</button>
        </ShortcutHint>
      );

      const wrapper = screen.getByText('Test').parentElement!;
      fireEvent.focus(wrapper);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveClass('shortcut-hint-right');
    });

    it('defaults to bottom position if not specified', () => {
      render(
        <ShortcutHint shortcutKey="n" description="Test">
          <button>Test</button>
        </ShortcutHint>
      );

      const wrapper = screen.getByText('Test').parentElement!;
      fireEvent.focus(wrapper);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveClass('shortcut-hint-bottom');
    });
  });

  describe('Disabled State', () => {
    it('does not show tooltip when disabled', () => {
      render(
        <ShortcutHint shortcutKey="n" description="Test" disabled={true}>
          <button>Test</button>
        </ShortcutHint>
      );

      const wrapper = screen.getByText('Test').parentElement!;
      fireEvent.focus(wrapper);
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Mobile Behavior', () => {
    it.skip('does not render tooltip on touch-only devices', () => {
      // Re-mock for this specific test
      vi.doMock('@/hooks/useDeviceDetection', () => ({
        useDeviceDetection: () => ({
          os: 'Unknown',
          isTouchOnly: true,
          isMac: false,
          isWindows: false,
          isLinux: false
        })
      }));

      render(
        <ShortcutHint shortcutKey="n" description="Add new task">
          <button>Add Task</button>
        </ShortcutHint>
      );

      const wrapper = screen.getByText('Add Task').parentElement!;
      fireEvent.mouseEnter(wrapper);
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Should never show tooltip on mobile
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      fireEvent.focus(wrapper);

      // Should not show on focus either
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Children Rendering', () => {
    it('renders children correctly', () => {
      render(
        <ShortcutHint shortcutKey="n" description="Test">
          <button>Click Me</button>
        </ShortcutHint>
      );

      expect(screen.getByText('Click Me')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('preserves children functionality', () => {
      const handleClick = vi.fn();

      render(
        <ShortcutHint shortcutKey="n" description="Test">
          <button onClick={handleClick}>Click Me</button>
        </ShortcutHint>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid hover on/off correctly', () => {
      render(
        <ShortcutHint shortcutKey="n" description="Test">
          <button>Test</button>
        </ShortcutHint>
      );

      const wrapper = screen.getByText('Test').parentElement!;

      // Hover on
      fireEvent.mouseEnter(wrapper);
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Hover off quickly
      fireEvent.mouseLeave(wrapper);

      // Hover on again
      fireEvent.mouseEnter(wrapper);
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Should show tooltip (second timer completed)
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('handles both hover and focus simultaneously', () => {
      render(
        <ShortcutHint shortcutKey="n" description="Test">
          <button>Test</button>
        </ShortcutHint>
      );

      const wrapper = screen.getByText('Test').parentElement!;

      // Hover first
      fireEvent.mouseEnter(wrapper);
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // Then focus (should still show)
      fireEvent.focus(wrapper);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // Leave hover (but still focused, so should still show)
      fireEvent.mouseLeave(wrapper);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // Blur (should hide)
      fireEvent.blur(wrapper);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has correct role attribute', () => {
      render(
        <ShortcutHint shortcutKey="n" description="Test">
          <button>Test</button>
        </ShortcutHint>
      );

      const wrapper = screen.getByText('Test').parentElement!;
      fireEvent.focus(wrapper);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toBeInTheDocument();
    });
  });
});

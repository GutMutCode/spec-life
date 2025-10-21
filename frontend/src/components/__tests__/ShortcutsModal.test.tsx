import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShortcutsModal from '../ShortcutsModal';
import { shortcuts } from '@/config/shortcuts';
import { ShortcutCategory } from '@/config/shortcuts.types';

// Mock useDeviceDetection to control OS detection in tests
vi.mock('@/hooks/useDeviceDetection', () => ({
  useDeviceDetection: () => ({
    os: 'Mac',
    isTouchOnly: false,
    isMac: true,
    isWindows: false,
    isLinux: false
  })
}));

// Mock useFocusTrap to avoid focus management complexity in unit tests
vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: null })
}));

describe('ShortcutsModal', () => {
  beforeEach(() => {
    // Reset body styles
    document.body.style.overflow = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(<ShortcutsModal isOpen={false} onClose={vi.fn()} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders modal when isOpen is true', () => {
      render(<ShortcutsModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('renders all shortcuts grouped by category', () => {
      render(<ShortcutsModal isOpen={true} onClose={vi.fn()} />);

      // Check category headers appear (only categories with shortcuts)
      expect(screen.getByText('Navigation')).toBeInTheDocument();
      expect(screen.getByText('Accessibility')).toBeInTheDocument();
      expect(screen.getByText('Help')).toBeInTheDocument();

      // Check some shortcut descriptions appear
      expect(screen.getByText('Add new task')).toBeInTheDocument();
      expect(screen.getByText('Show keyboard shortcuts help')).toBeInTheDocument();
    });

    it('renders shortcuts in correct category order', () => {
      render(<ShortcutsModal isOpen={true} onClose={vi.fn()} />);

      const categoryHeaders = screen.getAllByRole('heading', { level: 3 });
      const categoryTexts = categoryHeaders.map(h => h.textContent);

      // Per contract: Navigation, Task Management, History, Accessibility, Help
      // (Only categories with shortcuts will appear)
      // Current shortcuts: Navigation, Accessibility, Help
      expect(categoryTexts[0]).toBe('Navigation');
      expect(categoryTexts).toContain('Accessibility');
      expect(categoryTexts).toContain('Help');

      // Verify order: Navigation should come before Accessibility and Help
      const navIndex = categoryTexts.indexOf('Navigation');
      const accIndex = categoryTexts.indexOf('Accessibility');
      const helpIndex = categoryTexts.indexOf('Help');
      expect(navIndex).toBeLessThan(accIndex);
      expect(accIndex).toBeLessThan(helpIndex);
    });

    it('displays each shortcut with key badge and description', () => {
      render(<ShortcutsModal isOpen={true} onClose={vi.fn()} />);

      // Find a specific shortcut (n for "Add new task")
      const keyBadge = screen.getByText('n');
      const description = screen.getByText('Add new task');

      expect(keyBadge.tagName).toBe('KBD');
      expect(description).toBeInTheDocument();
    });

    it('uses custom shortcuts when provided via props', () => {
      const customShortcuts = [
        {
          id: 'test-1',
          key: 'x',
          description: 'Custom action',
          category: ShortcutCategory.Navigation
        }
      ];

      render(<ShortcutsModal isOpen={true} onClose={vi.fn()} shortcuts={customShortcuts} />);

      expect(screen.getByText('x')).toBeInTheDocument();
      expect(screen.getByText('Custom action')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<ShortcutsModal isOpen={true} onClose={vi.fn()} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'shortcuts-modal-title');
    });

    it('renders close button with accessible label', () => {
      render(<ShortcutsModal isOpen={true} onClose={vi.fn()} />);

      const closeButton = screen.getByLabelText('Close shortcuts help');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton.tagName).toBe('BUTTON');
    });
  });

  describe('Closing Behavior', () => {
    it('calls onClose when close button clicked', () => {
      const onClose = vi.fn();
      render(<ShortcutsModal isOpen={true} onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close shortcuts help');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay clicked', () => {
      const onClose = vi.fn();
      render(<ShortcutsModal isOpen={true} onClose={onClose} />);

      const overlay = screen.getByRole('presentation');
      fireEvent.click(overlay);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when modal content clicked', () => {
      const onClose = vi.fn();
      render(<ShortcutsModal isOpen={true} onClose={onClose} />);

      const dialog = screen.getByRole('dialog');
      fireEvent.click(dialog);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Body Scroll Lock', () => {
    it('locks body scroll when modal opens', () => {
      const { rerender } = render(<ShortcutsModal isOpen={false} onClose={vi.fn()} />);
      expect(document.body.style.overflow).toBe('');

      rerender(<ShortcutsModal isOpen={true} onClose={vi.fn()} />);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when modal closes', () => {
      const { rerender } = render(<ShortcutsModal isOpen={true} onClose={vi.fn()} />);
      expect(document.body.style.overflow).toBe('hidden');

      rerender(<ShortcutsModal isOpen={false} onClose={vi.fn()} />);
      expect(document.body.style.overflow).toBe('');
    });

    it('restores body scroll on unmount', () => {
      const { unmount } = render(<ShortcutsModal isOpen={true} onClose={vi.fn()} />);
      expect(document.body.style.overflow).toBe('hidden');

      unmount();
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Performance', () => {
    it('renders in under 200ms', async () => {
      const start = performance.now();

      render(<ShortcutsModal isOpen={true} onClose={vi.fn()} />);
      await waitFor(() => screen.getByRole('dialog'));

      const end = performance.now();
      const renderTime = end - start;

      expect(renderTime).toBeLessThan(200);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty shortcuts array gracefully', () => {
      render(<ShortcutsModal isOpen={true} onClose={vi.fn()} shortcuts={[]} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // Should show either empty state or no categories
    });

    it('accepts custom className prop', () => {
      render(<ShortcutsModal isOpen={true} onClose={vi.fn()} className="custom-class" />);

      const dialog = screen.getByRole('dialog');
      expect(dialog.className).toContain('custom-class');
    });
  });
});

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDeviceDetection } from './useDeviceDetection';

interface UseShortcutsHelpOptions {
  /** Help trigger key (default: '?') */
  triggerKey?: string;

  /** Whether to enable the hook (default: true) */
  enabled?: boolean;
}

interface UseShortcutsHelpReturn {
  /** Whether the shortcuts modal is currently open */
  isOpen: boolean;

  /** Function to open the modal */
  open: () => void;

  /** Function to close the modal */
  close: () => void;

  /** Function to toggle modal state */
  toggle: () => void;
}

/**
 * Manages the shortcuts help modal open/close state and keyboard events
 *
 * Features:
 * - FR-001: Opens/closes modal on `?` key press (toggle)
 * - FR-004: Handles Escape key, click outside, close button
 * - FR-005a: Auto-closes before executing other shortcuts
 * - FR-011: Disabled on touch-only mobile devices
 *
 * Usage:
 * ```tsx
 * function App() {
 *   const { isOpen, close } = useShortcutsHelp();
 *   return <ShortcutsModal isOpen={isOpen} onClose={close} />;
 * }
 * ```
 */
export function useShortcutsHelp(
  options: UseShortcutsHelpOptions = {}
): UseShortcutsHelpReturn {
  const { triggerKey = '?', enabled = true } = options;
  const [isOpen, setIsOpen] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const { isTouchOnly } = useDeviceDetection();

  // Mobile: disable entirely (FR-011)
  if (isTouchOnly) {
    return {
      isOpen: false,
      open: () => {},
      close: () => {},
      toggle: () => {}
    };
  }

  const open = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Restore focus on next tick (after modal unmounts)
    setTimeout(() => {
      previousFocusRef.current?.focus();
    }, 0);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      // Ignore if typing (FR-001)
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isTyping) return;

      // Ignore if modifier keys pressed (except Shift for '?')
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      const key = event.key;

      // Toggle help modal on trigger key (FR-001)
      if (key === triggerKey) {
        event.preventDefault();
        toggle();
        return;
      }

      // Auto-close on any other shortcut (FR-005a)
      // List of application shortcut keys
      const appShortcuts = ['n', 'a', 'h', 'd', 'Escape'];
      if (isOpen && appShortcuts.includes(key)) {
        // Close immediately, let event propagate
        setIsOpen(false);
        // Don't prevent default - let shortcut execute
      }
    }

    // Use capture phase to run before other handlers
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, triggerKey, isOpen, toggle]);

  return { isOpen, open, close, toggle };
}

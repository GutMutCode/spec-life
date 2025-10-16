import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Keyboard shortcuts hook (T111).
 *
 * Provides global keyboard shortcuts for common actions:
 * - n: Navigate to "Add Task" page
 * - a: Navigate to "All Tasks" page
 * - h: Navigate to "History" page
 * - d: Navigate to "Dashboard" (home)
 * - ?: Show shortcuts help (future enhancement)
 *
 * Shortcuts are disabled when user is typing in an input/textarea.
 *
 * Usage:
 * ```tsx
 * function App() {
 *   useKeyboardShortcuts();
 *   return <div>...</div>;
 * }
 * ```
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Don't trigger shortcuts if user is typing in an input
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isTyping) {
        return;
      }

      // Don't trigger if modifier keys are pressed (except Shift for '?')
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      const key = event.key.toLowerCase();

      switch (key) {
        case 'n':
          // Navigate to Add Task page
          event.preventDefault();
          navigate('/add');
          break;

        case 'a':
          // Navigate to All Tasks page
          event.preventDefault();
          navigate('/tasks');
          break;

        case 'h':
          // Navigate to History page
          event.preventDefault();
          navigate('/history');
          break;

        case 'd':
          // Navigate to Dashboard (home)
          event.preventDefault();
          navigate('/');
          break;

        case '?':
          // Show shortcuts help (future: could open a modal)
          event.preventDefault();
          console.log('Keyboard Shortcuts:\n' +
            'n - Add new task\n' +
            'a - View all tasks\n' +
            'h - View history\n' +
            'd - Dashboard (home)\n' +
            '? - Show this help'
          );
          // TODO: Show modal with shortcuts list
          break;

        default:
          // No shortcut for this key
          break;
      }
    }

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, location]);
}

/**
 * Page-specific keyboard shortcuts hook.
 *
 * Provides context-aware shortcuts for specific pages.
 *
 * Usage:
 * ```tsx
 * function Dashboard() {
 *   usePageShortcuts({
 *     'c': () => completeTopTask(),
 *     'e': () => editTopTask(),
 *   });
 *   return <div>...</div>;
 * }
 * ```
 */
export function usePageShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Don't trigger shortcuts if user is typing in an input
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isTyping) {
        return;
      }

      // Don't trigger if modifier keys are pressed
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      const key = event.key.toLowerCase();
      const handler = shortcuts[key];

      if (handler) {
        event.preventDefault();
        handler();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}

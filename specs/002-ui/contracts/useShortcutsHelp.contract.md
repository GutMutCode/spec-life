# Hook Contract: useShortcutsHelp

**Type**: React Custom Hook (State Management)
**File**: `frontend/src/hooks/useShortcutsHelp.ts`
**Test**: `frontend/src/hooks/__tests__/useShortcutsHelp.test.ts`

## Purpose

Manages the shortcuts help modal open/close state and integrates with keyboard event handling. Implements FR-001 (help key toggle), FR-004 (close methods), FR-005a (close before shortcut execution).

## Hook Interface

```typescript
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

export function useShortcutsHelp(
  options?: UseShortcutsHelpOptions
): UseShortcutsHelpReturn;
```

## Behavior Contract

### Opening Modal

**Via Keyboard (FR-001)**:
- **WHEN** user presses `?` key (or custom `triggerKey`)
- **AND** user is NOT typing in input/textarea
- **AND** no modifier keys pressed (Ctrl, Alt, Meta)
- **THEN** hook MUST:
  1. Set `isOpen` to `true`
  2. Store currently focused element for later restoration

**Via Programmatic Call**:
- **WHEN** `open()` function is called
- **THEN** hook MUST:
  1. Set `isOpen` to `true`
  2. Store currently focused element

### Closing Modal

**Via Keyboard - Toggle (FR-001 clarification)**:
- **WHEN** user presses `?` key while modal is already open
- **THEN** hook MUST:
  1. Set `isOpen` to `false`
  2. Restore focus to previously focused element

**Via Programmatic Call (FR-004)**:
- **WHEN** `close()` function is called (from modal component)
- **THEN** hook MUST:
  1. Set `isOpen` to `false`
  2. Restore focus to previously focused element

### Auto-Close Before Shortcut Execution (FR-005a)

**Critical Behavior**:
- **WHEN** modal is open
- **AND** user presses any application shortcut (n, a, h, d, etc.)
- **THEN** hook MUST:
  1. Immediately close modal (set `isOpen` to `false`)
  2. Allow keyboard event to propagate
  3. Let shortcut handler execute after modal closes

**Implementation Note**: This requires the hook to listen for ALL keyboard events and close the modal BEFORE other shortcut handlers run. Use event capture phase.

### Disabled When Typing (FR-001)

- **WHEN** user is focused on `<input>`, `<textarea>`, or `contentEditable` element
- **THEN** hook MUST:
  1. Ignore `?` key presses
  2. Not open/close modal
  3. Let typing continue normally

### Disabled on Mobile (FR-011)

- **WHEN** device is detected as touch-only mobile
- **THEN** hook MUST:
  1. Not attach keyboard event listeners
  2. Return `isOpen: false` always
  3. `open()`, `close()`, `toggle()` are no-ops

## Implementation Details

```typescript
import { useState, useEffect, useRef } from 'react';
import { useDeviceDetection } from './useDeviceDetection';

export function useShortcutsHelp(
  options: UseShortcutsHelpOptions = {}
): UseShortcutsHelpReturn {
  const { triggerKey = '?', enabled = true } = options;
  const [isOpen, setIsOpen] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const { isTouchOnly } = useDeviceDetection();

  // Mobile: disable entirely
  if (isTouchOnly) {
    return {
      isOpen: false,
      open: () => {},
      close: () => {},
      toggle: () => {}
    };
  }

  const open = () => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    // Restore focus on next tick (after modal unmounts)
    setTimeout(() => {
      previousFocusRef.current?.focus();
    }, 0);
  };

  const toggle = () => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  };

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      // Ignore if typing
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isTyping) return;

      // Ignore if modifier keys pressed (except Shift for '?')
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      const key = event.key;

      // Toggle help modal on trigger key
      if (key === triggerKey) {
        event.preventDefault();
        toggle();
        return;
      }

      // Auto-close on any other shortcut (FR-005a)
      // List of application shortcut keys
      const appShortcuts = ['n', 'a', 'h', 'd'];
      if (isOpen && appShortcuts.includes(key.toLowerCase())) {
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
```

## Dependencies

**Hooks**:
- `useState()` - for modal open/close state
- `useEffect()` - for keyboard event listener
- `useRef()` - for storing previous focus element
- `useDeviceDetection()` - to check if touch-only mobile

**Event Handling**:
- `window.addEventListener('keydown', handler, true)` - capture phase for priority

## Test Contract

**Unit Tests** (`useShortcutsHelp.test.ts`):

```typescript
import { renderHook, act } from '@testing-library/react';
import { useShortcutsHelp } from '../useShortcutsHelp';

describe('useShortcutsHelp', () => {
  it('opens modal on ? key press', () => {
    const { result } = renderHook(() => useShortcutsHelp());

    expect(result.current.isOpen).toBe(false);

    act(() => {
      const event = new KeyboardEvent('keydown', { key: '?' });
      window.dispatchEvent(event);
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('closes modal on second ? key press (toggle)', () => {
    const { result } = renderHook(() => useShortcutsHelp());

    // Open
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
    });
    expect(result.current.isOpen).toBe(true);

    // Close (toggle)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('ignores ? key when typing in input', () => {
    const { result } = renderHook(() => useShortcutsHelp());

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    act(() => {
      const event = new KeyboardEvent('keydown', { key: '?', bubbles: true });
      Object.defineProperty(event, 'target', { value: input });
      window.dispatchEvent(event);
    });

    expect(result.current.isOpen).toBe(false);

    document.body.removeChild(input);
  });

  it('closes modal immediately when app shortcut pressed', () => {
    const { result } = renderHook(() => useShortcutsHelp());

    // Open modal
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
    });
    expect(result.current.isOpen).toBe(true);

    // Press app shortcut (e.g., 'n' for add task)
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'n', bubbles: true });
      window.dispatchEvent(event);
    });

    // Modal should auto-close
    expect(result.current.isOpen).toBe(false);
  });

  it('stores and restores focus element', () => {
    const { result } = renderHook(() => useShortcutsHelp());

    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    expect(document.activeElement).toBe(button);

    // Open modal
    act(() => {
      result.current.open();
    });

    // Simulate modal focusing its close button
    const modalButton = document.createElement('button');
    document.body.appendChild(modalButton);
    modalButton.focus();

    expect(document.activeElement).toBe(modalButton);

    // Close modal
    act(() => {
      result.current.close();
    });

    // Focus should restore to original button
    setTimeout(() => {
      expect(document.activeElement).toBe(button);
    }, 10);

    document.body.removeChild(button);
    document.body.removeChild(modalButton);
  });

  it('disables on touch-only devices', () => {
    // Mock touch-only device
    jest.mock('./useDeviceDetection', () => ({
      useDeviceDetection: () => ({ isTouchOnly: true, os: 'Unknown' })
    }));

    const { result } = renderHook(() => useShortcutsHelp());

    // Try to open
    act(() => {
      result.current.open();
    });

    // Should remain closed
    expect(result.current.isOpen).toBe(false);
  });

  it('can use custom trigger key', () => {
    const { result } = renderHook(() => useShortcutsHelp({ triggerKey: 'h' }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('can be disabled via enabled option', () => {
    const { result } = renderHook(() => useShortcutsHelp({ enabled: false }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('ignores modifier key combinations', () => {
    const { result } = renderHook(() => useShortcutsHelp());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: '?',
        ctrlKey: true
      }));
    });

    expect(result.current.isOpen).toBe(false);
  });
});
```

## Integration with Existing Code

**Modify `useKeyboardShortcuts.ts`**:
- Current implementation (lines 73-84) logs shortcuts to console
- Change to call `openShortcutsModal()` from this hook

**Example Integration in `App.tsx`**:
```tsx
import { useShortcutsHelp } from './hooks/useShortcutsHelp';
import ShortcutsModal from './components/ShortcutsModal';

function App() {
  const { isOpen, close } = useShortcutsHelp();

  return (
    <>
      {/* Existing app content */}
      <ShortcutsModal isOpen={isOpen} onClose={close} />
    </>
  );
}
```

## Performance Considerations

**Event Listener Efficiency**:
- Single `keydown` listener on window (lightweight)
- Early returns for common cases (typing, modifiers)
- No heavy computations in event handler

**Memory Leaks Prevention**:
- `useEffect` cleanup removes event listener
- `previousFocusRef` properly cleaned up on unmount

## Error Handling

**Missing focus element**:
- **IF** `previousFocusRef.current` is null on close
- **THEN** don't crash, just skip focus restoration

**Multiple modals**:
- **IF** another modal opens while shortcuts modal is open
- **THEN** current implementation doesn't handle modal stacking (accept limitation)
- **Future enhancement**: Modal stack manager

## Accessibility Notes

**Focus Management**:
- Storing and restoring focus is critical for keyboard users
- Must happen AFTER modal unmounts (hence `setTimeout`)

**Screen Reader Announcements**:
- Hook doesn't handle announcements (that's `ShortcutsModal`'s job)
- Hook only manages state and keyboard events

## Version History

- **v1.0** (2025-10-17): Initial contract based on spec FR-001, FR-004, FR-005a

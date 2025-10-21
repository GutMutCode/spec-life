import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShortcutsHelp } from '../useShortcutsHelp';

// Mock useDeviceDetection
vi.mock('../useDeviceDetection', () => ({
  useDeviceDetection: () => ({
    os: 'Mac',
    isTouchOnly: false,
    isMac: true,
    isWindows: false,
    isLinux: false
  })
}));

describe('useShortcutsHelp', () => {
  beforeEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

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
      const event = new KeyboardEvent('keydown', {
        key: '?',
        bubbles: true
      });
      input.dispatchEvent(event);
    });

    expect(result.current.isOpen).toBe(false);
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
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }));
    });

    // Modal should auto-close
    expect(result.current.isOpen).toBe(false);
  });

  it('provides open, close, and toggle functions', () => {
    const { result } = renderHook(() => useShortcutsHelp());

    expect(typeof result.current.open).toBe('function');
    expect(typeof result.current.close).toBe('function');
    expect(typeof result.current.toggle).toBe('function');
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
      const event = new KeyboardEvent('keydown', {
        key: '?',
        ctrlKey: true
      });
      window.dispatchEvent(event);
    });

    expect(result.current.isOpen).toBe(false);
  });
});

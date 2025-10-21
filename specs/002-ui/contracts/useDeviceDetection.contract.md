# Hook Contract: useDeviceDetection

**Type**: React Custom Hook (Utility)
**File**: `frontend/src/hooks/useDeviceDetection.ts`
**Test**: `frontend/src/hooks/__tests__/useDeviceDetection.test.ts`

## Purpose

Detects user's operating system and device type for OS-specific keyboard display (FR-007) and mobile hiding (FR-011).

## Hook Interface

```typescript
interface UseDeviceDetectionReturn {
  /** Detected operating system */
  os: OperatingSystem;

  /** Whether device is touch-only (hide shortcuts UI) */
  isTouchOnly: boolean;

  /** Whether device is Mac (for ⌘ vs Ctrl display) */
  isMac: boolean;

  /** Whether device is Windows */
  isWindows: boolean;

  /** Whether device is Linux */
  isLinux: boolean;
}

export function useDeviceDetection(): UseDeviceDetectionReturn;
```

## Behavior Contract

### Operating System Detection (FR-007)

**Detection Method** (per research.md decision):
```typescript
const detectOS = (): OperatingSystem => {
  const platform = navigator.platform.toUpperCase();

  if (platform.indexOf('MAC') >= 0) {
    return OperatingSystem.Mac;
  }
  if (platform.indexOf('WIN') >= 0) {
    return OperatingSystem.Windows;
  }
  if (platform.indexOf('LINUX') >= 0) {
    return OperatingSystem.Linux;
  }

  return OperatingSystem.Unknown;
};
```

**Expected Results**:
- MacOS (MacIntel, MacPPC, Mac68K): `OperatingSystem.Mac`
- Windows (Win32, Win64, Windows): `OperatingSystem.Windows`
- Linux (Linux x86_64, Linux i686): `OperatingSystem.Linux`
- Other (FreeBSD, etc.): `OperatingSystem.Unknown` (defaults to Windows-style keys)

### Touch-Only Device Detection (FR-011)

**Detection Method** (per research.md decision):
```typescript
const detectTouchOnly = (): boolean => {
  // Check for touch capability
  const hasTouch = 'ontouchstart' in window;

  // Check for precise pointer (mouse/trackpad)
  const hasPrecisePointer = window.matchMedia('(pointer: fine)').matches;

  // Touch-only if has touch AND no precise pointer
  return hasTouch && !hasPrecisePointer;
};
```

**Expected Results**:
- Desktop (mouse/trackpad): `isTouchOnly: false` ✅ Show shortcuts
- Phone (touch-only): `isTouchOnly: true` ❌ Hide shortcuts
- Tablet (touch-only): `isTouchOnly: true` ❌ Hide shortcuts
- Hybrid (Surface, iPad+keyboard): `isTouchOnly: false` ✅ Show shortcuts (has precise pointer)

### Reactive Updates

**Static Detection** (per Constitution III: Simplicity):
- Detection runs ONCE on mount
- Does NOT react to window resize or device changes
- User must refresh page if device changes (rare edge case)

**Rationale**:
- Simpler implementation (no event listeners)
- Covers 99.9% of real-world usage
- Device type doesn't change during single session

## Implementation

```typescript
import { useMemo } from 'react';
import { OperatingSystem } from '../config/shortcuts.types';

export function useDeviceDetection(): UseDeviceDetectionReturn {
  const os = useMemo(() => {
    const platform = navigator.platform.toUpperCase();

    if (platform.indexOf('MAC') >= 0) {
      return OperatingSystem.Mac;
    }
    if (platform.indexOf('WIN') >= 0) {
      return OperatingSystem.Windows;
    }
    if (platform.indexOf('LINUX') >= 0) {
      return OperatingSystem.Linux;
    }

    return OperatingSystem.Unknown;
  }, []);

  const isTouchOnly = useMemo(() => {
    const hasTouch = 'ontouchstart' in window;
    const hasPrecisePointer = window.matchMedia('(pointer: fine)').matches;
    return hasTouch && !hasPrecisePointer;
  }, []);

  return {
    os,
    isTouchOnly,
    isMac: os === OperatingSystem.Mac,
    isWindows: os === OperatingSystem.Windows,
    isLinux: os === OperatingSystem.Linux
  };
}
```

## Dependencies

**Web APIs**:
- `navigator.platform` - for OS detection
- `window.matchMedia()` - for pointer type detection
- `window.ontouchstart` - for touch capability detection

**Browser Support**:
- All target browsers support these APIs (Chrome 90+, Firefox 88+, Safari 14+)

## Test Contract

**Unit Tests** (`useDeviceDetection.test.ts`):

```typescript
import { renderHook } from '@testing-library/react';
import { useDeviceDetection } from '../useDeviceDetection';
import { OperatingSystem } from '../../config/shortcuts.types';

describe('useDeviceDetection', () => {
  it('detects Mac OS', () => {
    Object.defineProperty(navigator, 'platform', {
      value: 'MacIntel',
      configurable: true
    });

    const { result } = renderHook(() => useDeviceDetection());

    expect(result.current.os).toBe(OperatingSystem.Mac);
    expect(result.current.isMac).toBe(true);
    expect(result.current.isWindows).toBe(false);
    expect(result.current.isLinux).toBe(false);
  });

  it('detects Windows OS', () => {
    Object.defineProperty(navigator, 'platform', {
      value: 'Win32',
      configurable: true
    });

    const { result } = renderHook(() => useDeviceDetection());

    expect(result.current.os).toBe(OperatingSystem.Windows);
    expect(result.current.isWindows).toBe(true);
    expect(result.current.isMac).toBe(false);
    expect(result.current.isLinux).toBe(false);
  });

  it('detects Linux OS', () => {
    Object.defineProperty(navigator, 'platform', {
      value: 'Linux x86_64',
      configurable: true
    });

    const { result } = renderHook(() => useDeviceDetection());

    expect(result.current.os).toBe(OperatingSystem.Linux);
    expect(result.current.isLinux).toBe(true);
    expect(result.current.isMac).toBe(false);
    expect(result.current.isWindows).toBe(false);
  });

  it('detects unknown OS as fallback', () => {
    Object.defineProperty(navigator, 'platform', {
      value: 'FreeBSD',
      configurable: true
    });

    const { result } = renderHook(() => useDeviceDetection());

    expect(result.current.os).toBe(OperatingSystem.Unknown);
  });

  it('detects touch-only device (phone)', () => {
    // Mock touch-only phone
    Object.defineProperty(window, 'ontouchstart', {
      value: true,
      configurable: true
    });
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn(() => ({ matches: false })), // pointer: coarse
      configurable: true
    });

    const { result } = renderHook(() => useDeviceDetection());

    expect(result.current.isTouchOnly).toBe(true);
  });

  it('detects desktop device (mouse)', () => {
    // Mock desktop with mouse
    Object.defineProperty(window, 'ontouchstart', {
      value: undefined,
      configurable: true
    });
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn(() => ({ matches: true })), // pointer: fine
      configurable: true
    });

    const { result } = renderHook(() => useDeviceDetection());

    expect(result.current.isTouchOnly).toBe(false);
  });

  it('detects hybrid device as NOT touch-only (iPad with keyboard)', () => {
    // Mock iPad with Smart Keyboard (has both touch and precise pointer)
    Object.defineProperty(window, 'ontouchstart', {
      value: true,
      configurable: true
    });
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn(() => ({ matches: true })), // pointer: fine
      configurable: true
    });

    const { result } = renderHook(() => useDeviceDetection());

    // Should NOT be touch-only (show shortcuts because keyboard available)
    expect(result.current.isTouchOnly).toBe(false);
  });

  it('memoizes result (does not re-detect on re-render)', () => {
    const { result, rerender } = renderHook(() => useDeviceDetection());

    const firstOS = result.current.os;
    const firstTouchOnly = result.current.isTouchOnly;

    rerender();

    // Should be same reference (memoized)
    expect(result.current.os).toBe(firstOS);
    expect(result.current.isTouchOnly).toBe(firstTouchOnly);
  });
});
```

## Usage Examples

**Example 1: Conditional Rendering in ShortcutsModal**
```tsx
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import { ModifierKeys } from '../config/shortcuts.types';

function ShortcutsModal() {
  const { os } = useDeviceDetection();
  const modKeys = ModifierKeys[os];

  return (
    <div>
      <p>Meta key: {modKeys.meta}</p> {/* ⌘ on Mac, Win on Windows */}
    </div>
  );
}
```

**Example 2: Hide Shortcuts UI on Mobile**
```tsx
import { useDeviceDetection } from '../hooks/useDeviceDetection';

function App() {
  const { isTouchOnly } = useDeviceDetection();

  // Don't render shortcuts UI on touch-only devices
  if (isTouchOnly) {
    return <AppContent />;
  }

  return (
    <>
      <AppContent />
      <ShortcutsModal />
    </>
  );
}
```

## Performance Considerations

**Optimization**:
- `useMemo()` ensures detection runs only once per mount
- No event listeners (static detection)
- No re-renders triggered by this hook

**Cost**:
- Initial detection: ~1ms (reading `navigator.platform`, `matchMedia`)
- Re-renders: 0ms (memoized value returned)

## Error Handling

**Unsupported browsers**:
- **IF** `navigator.platform` is undefined (very old browsers)
- **THEN** default to `OperatingSystem.Unknown` (shows Windows-style keys)

**Missing matchMedia**:
- **IF** `window.matchMedia` is undefined
- **THEN** assume not touch-only (safe default - show shortcuts)

```typescript
const hasPrecisePointer = window.matchMedia
  ? window.matchMedia('(pointer: fine)').matches
  : true; // Safe default: assume precise pointer exists
```

## Edge Cases

**1. iPad with Smart Keyboard**:
- Has touch: `true`
- Has precise pointer: `true` (when keyboard connected)
- Result: `isTouchOnly: false` ✅ Correct (show shortcuts)

**2. Surface Device (touch + mouse/trackpad)**:
- Has touch: `true`
- Has precise pointer: `true`
- Result: `isTouchOnly: false` ✅ Correct (show shortcuts)

**3. Desktop with Touchscreen**:
- Has touch: `true`
- Has precise pointer: `true` (mouse still primary)
- Result: `isTouchOnly: false` ✅ Correct (show shortcuts)

**4. Phone (no keyboard)**:
- Has touch: `true`
- Has precise pointer: `false`
- Result: `isTouchOnly: true` ✅ Correct (hide shortcuts)

## Accessibility Notes

**Screen Readers**:
- OS detection helps display correct key labels for screen reader users
- Example: VoiceOver on Mac reads "Command N" instead of "Control N"

**High Contrast Mode**:
- Does not affect device detection
- Keyboard display remains same regardless of theme

## Version History

- **v1.0** (2025-10-17): Initial contract based on spec FR-007, FR-011, research decisions

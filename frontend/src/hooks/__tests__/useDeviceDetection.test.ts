import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDeviceDetection } from '../useDeviceDetection';
import { OperatingSystem } from '../../config/shortcuts.types';

describe('useDeviceDetection', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.unstubAllGlobals();
  });

  it('detects Mac OS', () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      platform: 'MacIntel'
    });

    const { result } = renderHook(() => useDeviceDetection());

    expect(result.current.os).toBe(OperatingSystem.Mac);
    expect(result.current.isMac).toBe(true);
    expect(result.current.isWindows).toBe(false);
    expect(result.current.isLinux).toBe(false);
  });

  it('detects Windows OS', () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      platform: 'Win32'
    });

    const { result } = renderHook(() => useDeviceDetection());

    expect(result.current.os).toBe(OperatingSystem.Windows);
    expect(result.current.isWindows).toBe(true);
    expect(result.current.isMac).toBe(false);
    expect(result.current.isLinux).toBe(false);
  });

  it('detects Linux OS', () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      platform: 'Linux x86_64'
    });

    const { result } = renderHook(() => useDeviceDetection());

    expect(result.current.os).toBe(OperatingSystem.Linux);
    expect(result.current.isLinux).toBe(true);
    expect(result.current.isMac).toBe(false);
    expect(result.current.isWindows).toBe(false);
  });

  it('detects unknown OS as fallback', () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      platform: 'FreeBSD'
    });

    const { result } = renderHook(() => useDeviceDetection());

    expect(result.current.os).toBe(OperatingSystem.Unknown);
  });

  it('detects touch-only device (phone)', () => {
    // Mock touch-only phone
    vi.stubGlobal('ontouchstart', {});
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false, // pointer: coarse
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    })));

    const { result } = renderHook(() => useDeviceDetection());

    expect(result.current.isTouchOnly).toBe(true);
  });

  it('detects desktop device (mouse)', () => {
    // Mock desktop with mouse
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true, // pointer: fine
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    })));

    const { result } = renderHook(() => useDeviceDetection());

    expect(result.current.isTouchOnly).toBe(false);
  });

  it('detects hybrid device as NOT touch-only (iPad with keyboard)', () => {
    // Mock iPad with Smart Keyboard (has both touch and precise pointer)
    vi.stubGlobal('ontouchstart', {});
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true, // pointer: fine
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    })));

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

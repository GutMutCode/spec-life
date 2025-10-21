import { useMemo } from 'react';
import { OperatingSystem } from '../config/shortcuts.types';

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

/**
 * Detects user's operating system and device type
 *
 * Used for:
 * - FR-007: OS-specific keyboard display (⌘ on Mac, Ctrl on Windows/Linux)
 * - FR-011: Hide shortcuts UI on touch-only mobile devices
 *
 * Detection runs once on mount (memoized) per Constitution III (Simplicity)
 */
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
    const hasPrecisePointer = window.matchMedia
      ? window.matchMedia('(pointer: fine)').matches
      : true; // Safe default: assume precise pointer exists
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

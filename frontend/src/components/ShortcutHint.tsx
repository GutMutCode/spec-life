import { useState, useRef, useEffect, useCallback } from 'react';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';

interface ShortcutHintProps {
  /** The keyboard shortcut key to display */
  shortcutKey: string;

  /** Description of the action (optional) */
  description?: string;

  /** Tooltip position preference */
  position?: 'top' | 'bottom' | 'left' | 'right';

  /** Children (the element to attach hint to) */
  children: React.ReactNode;

  /** Whether to disable the hint */
  disabled?: boolean;
}

/**
 * Displays contextual tooltip hints on interactive elements showing their associated keyboard shortcuts.
 *
 * Features:
 * - FR-006: Shows tooltip on hover (500ms delay) and focus (immediate)
 * - FR-011: Hidden on touch-only mobile devices
 * - Immediate hide on mouseleave/blur
 * - Configurable positioning
 *
 * Usage:
 * ```tsx
 * <ShortcutHint shortcutKey="n" description="Add new task">
 *   <button>Add Task</button>
 * </ShortcutHint>
 * ```
 */
export default function ShortcutHint({
  shortcutKey,
  description,
  position = 'bottom',
  children,
  disabled = false
}: ShortcutHintProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isTouchOnly } = useDeviceDetection();

  // Mobile: render children only, no hint (FR-011)
  if (isTouchOnly) {
    return <>{children}</>;
  }

  // Disabled: render children only, no hint
  if (disabled) {
    return <>{children}</>;
  }

  // Handle mouse enter (500ms delay per FR-006)
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 500);
  }, []);

  // Handle mouse leave (immediate hide)
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Only hide if not focused
    if (!isFocused) {
      setIsVisible(false);
    }
  }, [isFocused]);

  // Handle focus (immediate show per FR-006)
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setIsVisible(true);
  }, []);

  // Handle blur (immediate hide)
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Only hide if not hovered
    if (!isHovered) {
      setIsVisible(false);
    }
  }, [isHovered]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Determine tooltip CSS class based on position
  const positionClass = `shortcut-hint-${position}`;

  return (
    <div className="shortcut-hint-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {children}
      </div>

      {isVisible && (
        <div
          role="tooltip"
          className={`shortcut-hint-tooltip ${positionClass}`}
          style={{
            position: 'absolute',
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            ...getPositionStyles(position)
          }}
        >
          {description && <span className="hint-description">{description}</span>}
          <kbd
            className="hint-key"
            style={{
              marginLeft: description ? '0.5rem' : '0',
              padding: '0.125rem 0.375rem',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '0.25rem',
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}
          >
            {shortcutKey}
          </kbd>
        </div>
      )}
    </div>
  );
}

/**
 * Get position styles based on position prop
 */
function getPositionStyles(position: 'top' | 'bottom' | 'left' | 'right'): React.CSSProperties {
  switch (position) {
    case 'top':
      return {
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: '0.5rem'
      };
    case 'bottom':
      return {
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: '0.5rem'
      };
    case 'left':
      return {
        right: '100%',
        top: '50%',
        transform: 'translateY(-50%)',
        marginRight: '0.5rem'
      };
    case 'right':
      return {
        left: '100%',
        top: '50%',
        transform: 'translateY(-50%)',
        marginLeft: '0.5rem'
      };
    default:
      return {};
  }
}

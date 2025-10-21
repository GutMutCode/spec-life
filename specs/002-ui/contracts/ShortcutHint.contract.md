# Component Contract: ShortcutHint

**Type**: React Component (Tooltip)
**File**: `frontend/src/components/ShortcutHint.tsx`
**Test**: `frontend/src/components/__tests__/ShortcutHint.test.tsx`

## Purpose

Displays contextual tooltip hints on interactive elements showing their associated keyboard shortcuts. Implements FR-006 (contextual shortcut hints).

## Props Interface

```typescript
interface ShortcutHintProps {
  /** The keyboard shortcut key to display */
  shortcutKey: string;

  /** Description of the action (optional, defaults to shortcut description) */
  description?: string;

  /** Tooltip position preference */
  position?: 'top' | 'bottom' | 'left' | 'right';

  /** Children (the element to attach hint to) */
  children: React.ReactNode;

  /** Whether to disable the hint */
  disabled?: boolean;
}
```

## Behavior Contract

### Hover Behavior (FR-006)
- **WHEN** user hovers over wrapped element
- **THEN** component MUST:
  1. Wait 500ms (per clarification session)
  2. Display tooltip with format: `{description} ({key})`
  3. Position tooltip relative to wrapped element
  4. Keep tooltip visible while hovering

- **WHEN** user stops hovering (mouseleave)
- **THEN** component MUST:
  1. Hide tooltip immediately (no fade delay)
  2. Cancel pending timer if <500ms elapsed

### Focus Behavior (FR-006)
- **WHEN** user focuses wrapped element (keyboard navigation)
- **THEN** component MUST:
  1. Display tooltip immediately (0ms delay per clarification)
  2. Show same format: `{description} ({key})`
  3. Position tooltip relative to focused element

- **WHEN** user blurs element (Tab away)
- **THEN** component MUST:
  1. Hide tooltip immediately

### Mobile Behavior (FR-011)
- **WHEN** device is touch-only mobile
- **THEN** component MUST:
  1. Not render tooltip at all
  2. Render children without hint wrapper
  3. No event listeners attached

## DOM Structure

```tsx
<div className="shortcut-hint-wrapper" style={{ position: 'relative' }}>
  {/* Wrapped element */}
  <div
    onMouseEnter={handleMouseEnter}
    onMouseLeave={handleMouseLeave}
    onFocus={handleFocus}
    onBlur={handleBlur}
  >
    {children}
  </div>

  {/* Tooltip (conditionally rendered) */}
  {isVisible && (
    <div
      role="tooltip"
      className={`shortcut-hint-tooltip shortcut-hint-${position}`}
      style={positionStyles}
    >
      <span className="hint-description">{description}</span>
      <kbd className="hint-key">{shortcutKey}</kbd>
    </div>
  )}
</div>
```

## Styling Contract

**CSS Classes** (Tailwind):
```css
.shortcut-hint-wrapper {
  position: relative;
  display: inline-block;
}

.shortcut-hint-tooltip {
  position: absolute;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  white-space: nowrap;
  pointer-events: none; /* Don't interfere with mouse events */
}

.shortcut-hint-top {
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 0.5rem;
}

.shortcut-hint-bottom {
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 0.5rem;
}

.shortcut-hint-left {
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-right: 0.5rem;
}

.shortcut-hint-right {
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-left: 0.5rem;
}

.hint-key {
  margin-left: 0.5rem;
  padding: 0.125rem 0.375rem;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.875rem;
}
```

**No Animation**: Immediate show/hide per constitution (simplicity over cleverness)

## Timing Contract

**Hover Delay** (FR-006 clarification):
- 500ms delay before showing tooltip on hover
- 0ms delay on focus (immediate)
- 0ms delay on hide (both hover and focus)

**Implementation**:
```typescript
const [isVisible, setIsVisible] = useState(false);
const timerRef = useRef<number | null>(null);

const handleMouseEnter = () => {
  timerRef.current = setTimeout(() => {
    setIsVisible(true);
  }, 500);
};

const handleMouseLeave = () => {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
  }
  setIsVisible(false);
};

const handleFocus = () => {
  setIsVisible(true); // Immediate, no delay
};

const handleBlur = () => {
  setIsVisible(false);
};
```

## Accessibility Contract

**ARIA Attributes**:
- Tooltip MUST have `role="tooltip"`
- Optional: `aria-describedby` on wrapped element pointing to tooltip ID
- Tooltip content MUST be readable by screen readers

**Keyboard Navigation**:
- Tooltip appears on focus (keyboard users)
- Tooltip disappears on blur (Tab away)
- Does not trap focus (user can Tab through)

## Performance Contract

- **No heavy positioning library**: Simple CSS positioning (constitution: simplicity)
- **Lazy timer**: Only start timer on hover, clear on leave
- **No portal**: Render in-place (simpler than ComparisonModal's portal approach)

## Dependencies

**Hooks**:
- `useState()` - for visibility state
- `useRef()` - for timer reference
- `useDeviceDetection()` - to check if touch-only mobile (FR-011)

**Props**:
- `shortcutKey` - from parent component (e.g., button knows its shortcut)

## Usage Examples

**Example 1: Add Task Button**
```tsx
<ShortcutHint shortcutKey="n" description="Add new task">
  <button onClick={handleAddTask}>Add Task</button>
</ShortcutHint>
```

**Example 2: Navigation Link**
```tsx
<ShortcutHint shortcutKey="h" description="View history" position="bottom">
  <Link to="/history">History</Link>
</ShortcutHint>
```

**Example 3: Disabled Hint (when shortcut not available)**
```tsx
<ShortcutHint shortcutKey="c" description="Complete task" disabled={noTasks}>
  <button disabled={noTasks}>Complete</button>
</ShortcutHint>
```

## Test Contract

**Unit Tests** (`ShortcutHint.test.tsx`):

```typescript
describe('ShortcutHint', () => {
  it('shows tooltip after 500ms hover', async () => {
    render(
      <ShortcutHint shortcutKey="n" description="Add new task">
        <button>Add Task</button>
      </ShortcutHint>
    );

    const button = screen.getByRole('button');
    fireEvent.mouseEnter(button);

    // Should NOT be visible immediately
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // Should be visible after 500ms
    await waitFor(() => screen.getByRole('tooltip'), { timeout: 600 });
    expect(screen.getByText('Add new task')).toBeInTheDocument();
    expect(screen.getByText('n')).toBeInTheDocument();
  });

  it('hides tooltip immediately on mouseleave', async () => {
    render(
      <ShortcutHint shortcutKey="n" description="Add new task">
        <button>Add Task</button>
      </ShortcutHint>
    );

    const button = screen.getByRole('button');
    fireEvent.mouseEnter(button);
    await waitFor(() => screen.getByRole('tooltip'), { timeout: 600 });

    fireEvent.mouseLeave(button);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip immediately on focus', () => {
    render(
      <ShortcutHint shortcutKey="h" description="View history">
        <button>History</button>
      </ShortcutHint>
    );

    const button = screen.getByRole('button');
    button.focus();

    // Should be visible immediately (0ms delay)
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('hides tooltip on blur', () => {
    render(
      <ShortcutHint shortcutKey="h" description="View history">
        <button>History</button>
      </ShortcutHint>
    );

    const button = screen.getByRole('button');
    button.focus();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    button.blur();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('does not render tooltip on touch-only devices', () => {
    // Mock touch-only device
    Object.defineProperty(window, 'ontouchstart', { value: true });
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn(() => ({ matches: false })) // pointer: coarse
    });

    render(
      <ShortcutHint shortcutKey="n" description="Add new task">
        <button>Add Task</button>
      </ShortcutHint>
    );

    const button = screen.getByRole('button');
    fireEvent.mouseEnter(button);

    // Should never show tooltip on mobile
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('cancels timer if mouseleave before 500ms', async () => {
    render(
      <ShortcutHint shortcutKey="n" description="Add new task">
        <button>Add Task</button>
      </ShortcutHint>
    );

    const button = screen.getByRole('button');
    fireEvent.mouseEnter(button);

    // Leave after 200ms (before 500ms timeout)
    await new Promise(resolve => setTimeout(resolve, 200));
    fireEvent.mouseLeave(button);

    // Wait past original 500ms
    await new Promise(resolve => setTimeout(resolve, 400));

    // Should NOT show tooltip
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('positions tooltip correctly based on position prop', () => {
    const { rerender } = render(
      <ShortcutHint shortcutKey="n" description="Test" position="top">
        <button>Test</button>
      </ShortcutHint>
    );

    const button = screen.getByRole('button');
    button.focus();

    let tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveClass('shortcut-hint-top');

    button.blur();

    rerender(
      <ShortcutHint shortcutKey="n" description="Test" position="bottom">
        <button>Test</button>
      </ShortcutHint>
    );

    button.focus();
    tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveClass('shortcut-hint-bottom');
  });
});
```

**Integration Tests** (Playwright):

```typescript
test('shows tooltip on hover with 500ms delay', async ({ page }) => {
  await page.goto('http://localhost:5173');

  const addButton = page.getByRole('button', { name: /add task/i });
  await addButton.hover();

  // Should not be visible immediately
  await expect(page.getByRole('tooltip')).not.toBeVisible();

  // Should appear after 500ms
  await page.waitForTimeout(500);
  await expect(page.getByRole('tooltip')).toBeVisible();
  await expect(page.getByText('Add new task')).toBeVisible();
  await expect(page.getByText('n')).toBeVisible();
});
```

## Error Handling

**Missing shortcutKey prop**:
- **IF** `shortcutKey` is empty or undefined
- **THEN** log warning, don't render tooltip

**Invalid position prop**:
- **IF** `position` is not one of: top, bottom, left, right
- **THEN** default to 'bottom'

**Timer cleanup**:
- **MUST** clear timeout in `useEffect` cleanup to prevent memory leaks

## Implementation Notes

**Keep Simple** (Constitution III):
- No collision detection (defer to Phase 9 if needed)
- No animation (immediate show/hide)
- No third-party library (pure React + CSS)
- In-place rendering (no portal needed)

**Edge Cases**:
1. Multiple rapid hovers: Clear previous timer, start new one
2. Hover + Focus simultaneously: Show tooltip (either trigger works)
3. Tooltip overflow off-screen: Accept limitation, defer complex positioning

## Version History

- **v1.0** (2025-10-17): Initial contract based on spec FR-006, clarification answers

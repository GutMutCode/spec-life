# Component Contract: ShortcutsModal

**Type**: React Component (Modal Dialog)
**File**: `frontend/src/components/ShortcutsModal.tsx`
**Test**: `frontend/src/components/__tests__/ShortcutsModal.test.tsx`

## Purpose

Displays a modal dialog showing all available keyboard shortcuts organized by category. Primary UI component for FR-001 through FR-005.

## Props Interface

```typescript
interface ShortcutsModalProps {
  /** Whether the modal is currently open */
  isOpen: boolean;

  /** Callback when modal should close */
  onClose: () => void;

  /** Optional custom shortcuts array (defaults to global config) */
  shortcuts?: KeyboardShortcut[];

  /** Optional className for custom styling */
  className?: string;
}
```

## Behavior Contract

### Opening Behavior
- **WHEN** `isOpen` prop changes from `false` to `true`
- **THEN** modal MUST:
  1. Render with fade-in animation (200ms max per SC-007)
  2. Focus first interactive element (close button)
  3. Trap focus within modal (Tab cycles between elements inside modal only)
  4. Lock body scroll (`document.body.style.overflow = 'hidden'`)
  5. Display all shortcuts grouped by category in display order

### Closing Behavior
- **WHEN** any of these events occur:
  1. User presses `Escape` key (FR-004)
  2. User clicks overlay outside modal (FR-004)
  3. User clicks close button (FR-004)
  4. User presses `?` key again (FR-001 toggle behavior)
- **THEN** modal MUST:
  1. Call `onClose()` callback
  2. Restore focus to element that triggered modal open
  3. Unlock body scroll (`document.body.style.overflow = ''`)
  4. Fade out and unmount (200ms max animation)

### Shortcut Execution While Open (FR-005a)
- **WHEN** user presses any application shortcut (n, a, h, d) while modal is open
- **THEN** modal MUST:
  1. Close immediately (call `onClose()`)
  2. Allow shortcut event to propagate after close
  3. Shortcut executes on next event loop tick

### Display Behavior
- **MUST** group shortcuts by `ShortcutCategory` enum
- **MUST** display categories in this order:
  1. Navigation
  2. Task Management
  3. History
  4. Accessibility
  5. Help
- **MUST** show OS-appropriate modifier keys (⌘ on Mac, Ctrl on Windows/Linux per FR-007)
- **MUST** display each shortcut as: `[Key Badge] Description`
  - Example: `n` Add new task
  - Example: `?` Show keyboard shortcuts help

### Accessibility Contract (FR-008)
- **MUST** have `role="dialog"`
- **MUST** have `aria-modal="true"`
- **MUST** have `aria-labelledby` pointing to modal title element ID
- **MUST** have `aria-describedby` pointing to description element ID (optional)
- **MUST** trap focus using `useFocusTrap` hook
- **MUST** return focus to trigger element on close
- **MUST** announce to screen readers when opened/closed

## DOM Structure

```tsx
<div role="presentation" className="modal-overlay" onClick={handleOverlayClick}>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="shortcuts-modal-title"
    className="modal-container"
    onClick={(e) => e.stopPropagation()}
  >
    <div className="modal-header">
      <h2 id="shortcuts-modal-title">Keyboard Shortcuts</h2>
      <button
        type="button"
        aria-label="Close shortcuts help"
        onClick={onClose}
      >
        ✕
      </button>
    </div>

    <div className="modal-body">
      {categories.map(category => (
        <section key={category} className="shortcut-category">
          <h3>{category}</h3>
          <ul>
            {shortcuts.map(shortcut => (
              <li key={shortcut.id}>
                <kbd>{shortcut.key}</kbd>
                <span>{shortcut.description}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  </div>
</div>
```

## Styling Contract

**CSS Classes** (Tailwind):
- Modal overlay: `fixed inset-0 bg-black/50 flex items-center justify-center z-50`
- Modal container: `bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto`
- Modal header: `flex justify-between items-center p-6 border-b`
- Modal body: `p-6 space-y-6`
- Category section: `space-y-3`
- Shortcut list: `grid grid-cols-1 gap-2`
- Key badge: `kbd` element with monospace font, gray background

**Animations**:
- Fade in: `opacity-0 → opacity-100` (200ms)
- Fade out: `opacity-100 → opacity-0` (200ms)
- Optional: Scale in `scale-95 → scale-100` (200ms)

## Performance Contract

- **SC-007**: Modal MUST render in <200ms from `isOpen` change
- **Measurement**: Use `performance.mark()` and `performance.measure()`
- **Optimization**:
  - Lazy load via `React.lazy()` (code split)
  - Memoize category grouping with `useMemo()`
  - Memoize shortcut list rendering with `React.memo()`

## Dependencies

**Hooks**:
- `useFocusTrap(isOpen)` - from `frontend/src/hooks/useFocusTrap.ts`
- `useEffect()` - for body scroll lock/unlock
- `useMemo()` - for grouping shortcuts by category
- `useDeviceDetection()` - for OS-specific key display

**Props**:
- `shortcuts` from `frontend/src/config/shortcuts.ts` (default)

## Test Contract

**Unit Tests** (`ShortcutsModal.test.tsx`):

```typescript
describe('ShortcutsModal', () => {
  it('renders all shortcuts grouped by category', () => {
    render(<ShortcutsModal isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Add new task')).toBeInTheDocument();
  });

  it('calls onClose when Escape key pressed', () => {
    const onClose = jest.fn();
    render(<ShortcutsModal isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay clicked', () => {
    const onClose = jest.fn();
    render(<ShortcutsModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('focuses close button on open', () => {
    render(<ShortcutsModal isOpen={true} onClose={jest.fn()} />);
    const closeButton = screen.getByLabelText('Close shortcuts help');
    expect(closeButton).toHaveFocus();
  });

  it('displays correct modifier key for OS', () => {
    // Mock Mac OS
    Object.defineProperty(navigator, 'platform', { value: 'MacIntel' });
    render(<ShortcutsModal isOpen={true} onClose={jest.fn()} />);
    // Assert ⌘ symbol appears (if any Cmd shortcuts exist)
  });

  it('renders in under 200ms', async () => {
    const start = performance.now();
    render(<ShortcutsModal isOpen={true} onClose={jest.fn()} />);
    await waitFor(() => screen.getByRole('dialog'));
    const end = performance.now();
    expect(end - start).toBeLessThan(200);
  });

  it('locks body scroll when open', () => {
    render(<ShortcutsModal isOpen={true} onClose={jest.fn()} />);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll when closed', () => {
    const { rerender } = render(<ShortcutsModal isOpen={true} onClose={jest.fn()} />);
    rerender(<ShortcutsModal isOpen={false} onClose={jest.fn()} />);
    expect(document.body.style.overflow).toBe('');
  });
});
```

**Integration Tests** (Playwright `shortcuts-help.spec.ts`):

```typescript
test('opens shortcuts modal on ? key press', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.keyboard.press('?');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Keyboard Shortcuts')).toBeVisible();
});

test('closes modal on Escape key', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.keyboard.press('?');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('executes shortcut after closing modal', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.keyboard.press('?'); // Open modal
  await page.keyboard.press('n'); // Should close modal AND navigate to /add
  await expect(page).toHaveURL('http://localhost:5173/add');
});
```

## Error Handling

**Invalid shortcuts array**:
- **IF** `shortcuts` prop is empty or undefined
- **THEN** display message: "No keyboard shortcuts available"

**Missing category**:
- **IF** shortcut has invalid `category` value
- **THEN** log warning, place in "Other" category

**Render errors**:
- **IF** component throws error during render
- **THEN** ErrorBoundary catches, displays fallback UI

## Implementation Notes

**Reuse Existing Patterns**:
1. Modal structure: Follow `ComparisonModal.tsx` (lines 50-200)
2. Focus trap: Use `useFocusTrap.ts` hook (lines 1-49)
3. Portal rendering: Use `ReactDOM.createPortal()` pattern from ComparisonModal
4. Overlay click: Same event handling as ComparisonModal

**New Patterns**:
1. Category grouping: `useMemo()` to group shortcuts by category
2. OS detection: New `useDeviceDetection()` hook
3. Body scroll lock: `useEffect` with cleanup

## Version History

- **v1.0** (2025-10-17): Initial contract based on spec FR-001 through FR-009

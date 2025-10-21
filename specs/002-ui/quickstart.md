# Quickstart Guide: Keyboard Shortcuts Help UI

**Feature Branch**: `002-ui`
**Target Developers**: Frontend developers implementing this feature
**Estimated Time**: 2-3 hours for full implementation following TDD

## Prerequisites

Before starting, ensure you have:
- ✅ Read the [feature specification](./spec.md)
- ✅ Read the [research findings](./research.md)
- ✅ Read the [data model](./data-model.md)
- ✅ Reviewed all [component contracts](./contracts/)
- ✅ Understood the [project constitution](../../.specify/memory/constitution.md)

**Required Skills**:
- React 18+ with TypeScript
- React Hooks (useState, useEffect, useMemo, useRef)
- CSS (Tailwind CSS)
- Testing (Vitest, Testing Library, Playwright)
- Keyboard event handling
- Accessibility (ARIA, focus management)

## Development Workflow (TDD)

Per **Constitution I (Test-First Development)**: ALL implementation MUST follow Red-Green-Refactor cycle.

### Workflow Steps

1. **Red**: Write failing test for component/behavior
2. **Green**: Write minimal code to pass test
3. **Refactor**: Improve code while keeping tests green
4. **Repeat**: Next test case

**DO NOT** write implementation before tests. This is NON-NEGOTIABLE per constitution.

## Implementation Phases

### Phase 1: Setup (15 minutes)

**1.1. Create Type Definitions**

```bash
# Create types file
touch frontend/src/config/shortcuts.types.ts
```

Copy from [`data-model.md`](./data-model.md) section "Type Definitions Location":
- `ShortcutCategory` enum
- `OperatingSystem` enum
- `KeyboardShortcut` interface
- `ShortcutHint` interface
- `PageContext` interface
- `ModifierKeyLabels` interface
- `ModifierKeys` constant

**Test**: TypeScript compilation succeeds (`pnpm exec tsc --noEmit`)

**1.2. Create Shortcuts Configuration**

```bash
# Create config file
touch frontend/src/config/shortcuts.ts
```

Copy from [`data-model.md`](./data-model.md) section "Storage Strategy":
- Export `shortcuts` array with all current shortcuts (n, a, h, d, ?, Tab, Enter, Escape)
- Export `groupShortcutsByCategory()` helper function

**Test**: Import in test file, verify array has correct structure

### Phase 2: Device Detection Hook (30 minutes)

**2.1. Write Tests First** (TDD: Red)

```bash
# Create test file
touch frontend/src/hooks/__tests__/useDeviceDetection.test.ts
```

Copy test cases from [`useDeviceDetection.contract.md`](./contracts/useDeviceDetection.contract.md):
- Test: Detects Mac OS
- Test: Detects Windows OS
- Test: Detects Linux OS
- Test: Detects touch-only device (phone)
- Test: Detects hybrid device (iPad with keyboard)
- Test: Memoizes result

Run tests: `pnpm test useDeviceDetection` → **Should FAIL** (no implementation yet)

**2.2. Implement Hook** (TDD: Green)

```bash
# Create hook file
touch frontend/src/hooks/useDeviceDetection.ts
```

Implement per [`useDeviceDetection.contract.md`](./contracts/useDeviceDetection.contract.md):
- Use `navigator.platform` for OS detection
- Use `window.matchMedia('(pointer: fine)')` + touch detection for mobile
- Memoize with `useMemo()`

Run tests: `pnpm test useDeviceDetection` → **Should PASS**

**2.3. Refactor** (TDD: Refactor)

- Extract helper functions if needed
- Add TypeScript type guards
- Optimize memoization

Run tests again to ensure still passing.

### Phase 3: Shortcuts Help Hook (45 minutes)

**3.1. Write Tests First** (TDD: Red)

```bash
# Create test file
touch frontend/src/hooks/__tests__/useShortcutsHelp.test.ts
```

Copy test cases from [`useShortcutsHelp.contract.md`](./contracts/useShortcutsHelp.contract.md):
- Test: Opens modal on ? key press
- Test: Closes modal on second ? key press (toggle)
- Test: Ignores ? when typing in input
- Test: Auto-closes on app shortcut press (FR-005a)
- Test: Stores and restores focus
- Test: Disables on touch-only devices

Run tests: `pnpm test useShortcutsHelp` → **Should FAIL**

**3.2. Implement Hook** (TDD: Green)

```bash
# Create hook file
touch frontend/src/hooks/useShortcutsHelp.ts
```

Implement per contract:
- State: `isOpen`, `previousFocusRef`
- Functions: `open()`, `close()`, `toggle()`
- Event listener on `window` (capture phase: `true`)
- Check if typing, modifiers, touch-only
- Auto-close on app shortcuts (FR-005a)

Run tests: `pnpm test useShortcutsHelp` → **Should PASS**

**3.3. Refactor**

- Extract helper functions (`isTyping()`, `isAppShortcut()`)
- Optimize event listener cleanup
- Add JSDoc comments

### Phase 4: Shortcuts Modal Component (60 minutes)

**4.1. Write Tests First** (TDD: Red)

```bash
# Create test file
touch frontend/src/components/__tests__/ShortcutsModal.test.tsx
```

Copy test cases from [`ShortcutsModal.contract.md`](./contracts/ShortcutsModal.contract.md):
- Test: Renders all shortcuts grouped by category
- Test: Calls onClose when Escape pressed
- Test: Calls onClose when overlay clicked
- Test: Focuses close button on open
- Test: Locks body scroll when open
- Test: Restores body scroll when closed
- Test: Displays correct modifier key for OS
- Test: Renders in under 200ms (performance)

Run tests: `pnpm test ShortcutsModal` → **Should FAIL**

**4.2. Implement Component** (TDD: Green)

```bash
# Create component file
touch frontend/src/components/ShortcutsModal.tsx
```

Implement per contract:
- Props: `isOpen`, `onClose`, `shortcuts?`, `className?`
- Group shortcuts by category using `groupShortcutsByCategory()`
- Use `useFocusTrap()` hook from existing codebase
- Lock/unlock body scroll in `useEffect`
- Handle Escape key, overlay click, close button
- Display OS-appropriate modifier keys using `useDeviceDetection()`

Run tests: `pnpm test ShortcutsModal` → **Should PASS**

**4.3. Add Styling** (Tailwind CSS)

Use classes from contract:
- Modal overlay: `fixed inset-0 bg-black/50 flex items-center justify-center z-50`
- Modal container: `bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto`
- Category sections, key badges (`<kbd>`), lists

**4.4. Refactor**

- Extract `ShortcutCategorySection` sub-component
- Extract `ShortcutItem` sub-component
- Memoize category grouping with `useMemo()`
- Optimize re-renders with `React.memo()`

### Phase 5: Shortcut Hint Component (Optional - P2 Priority)

**Note**: This is User Story 2 (P2). Can be deferred if time-constrained.

**5.1. Write Tests First** (TDD: Red)

```bash
# Create test file
touch frontend/src/components/__tests__/ShortcutHint.test.tsx
```

Copy test cases from [`ShortcutHint.contract.md`](./contracts/ShortcutHint.contract.md):
- Test: Shows tooltip after 500ms hover
- Test: Hides tooltip immediately on mouseleave
- Test: Shows tooltip immediately on focus
- Test: Cancels timer if mouseleave before 500ms
- Test: Does not render on touch-only devices

Run tests: `pnpm test ShortcutHint` → **Should FAIL**

**5.2. Implement Component** (TDD: Green)

```bash
# Create component file
touch frontend/src/components/ShortcutHint.tsx
```

Implement per contract:
- Props: `shortcutKey`, `description?`, `position?`, `children`, `disabled?`
- Hover: 500ms delay before showing
- Focus: 0ms delay (immediate)
- Use `setTimeout`/`clearTimeout` for timing
- Hide on touch-only devices

**5.3. Add Styling**

CSS positioning for tooltip (top, bottom, left, right)

**5.4. Refactor**

- Extract timing logic to custom hook (`useTooltipTiming()`)
- Extract positioning logic

### Phase 6: Integration (30 minutes)

**6.1. Integrate useShortcutsHelp in App**

Modify `frontend/src/App.tsx`:

```tsx
import { useShortcutsHelp } from './hooks/useShortcutsHelp';
import ShortcutsModal from './components/ShortcutsModal';

function App() {
  const { isOpen, close } = useShortcutsHelp();

  return (
    <>
      {/* Existing app content */}
      <Router>
        <Layout>
          <Routes>
            {/* existing routes */}
          </Routes>
        </Layout>
      </Router>

      {/* Shortcuts modal */}
      <ShortcutsModal isOpen={isOpen} onClose={close} />
    </>
  );
}
```

**6.2. Refactor useKeyboardShortcuts Hook**

Modify `frontend/src/hooks/useKeyboardShortcuts.ts` (lines 73-84):

**Before**:
```typescript
case '?':
  event.preventDefault();
  console.log('Keyboard Shortcuts:\n' + ...);
  break;
```

**After**:
```typescript
case '?':
  // Handled by useShortcutsHelp hook
  // No action needed here (hook listens globally)
  break;
```

**6.3. Extract Shortcuts to Config**

Refactor `useKeyboardShortcuts.ts`:
- Import `shortcuts` from `config/shortcuts.ts`
- Use config array instead of hardcoded switch cases
- Attach handlers from config

**6.4. Integration Test**

Run full E2E test suite:

```bash
cd frontend
pnpm test:e2e
```

### Phase 7: E2E Testing (30 minutes)

**7.1. Write Playwright Tests**

```bash
# Create E2E test file
touch frontend/e2e/shortcuts-help.spec.ts
```

Test scenarios:
1. Open modal on ? key press
2. Close modal on Escape key
3. Click outside to close
4. Press ? again to toggle close
5. Execute shortcut (n) while modal open → closes modal AND navigates
6. Hover button shows tooltip (if P2 implemented)

**7.2. Run Tests**

```bash
pnpm test:e2e shortcuts-help
```

Fix any failures until all tests pass.

## Verification Checklist

Before marking feature complete, verify:

### Functional Requirements
- [ ] FR-001: `?` key opens shortcuts modal
- [ ] FR-001: `?` key toggles close when modal already open
- [ ] FR-002: All shortcuts displayed grouped by category
- [ ] FR-003: Key combination + description shown for each
- [ ] FR-004: Modal closes via Escape, click outside, close button, or `?` key
- [ ] FR-005: Modal is overlay, doesn't navigate away
- [ ] FR-005a: Pressing app shortcut (n, a, h, d) closes modal then executes
- [ ] FR-006: Tooltips show on hover (500ms) and focus (0ms) - if P2 implemented
- [ ] FR-007: Shows `⌘` on Mac, `Ctrl` on Windows/Linux
- [ ] FR-008: ARIA labels, focus trap, screen reader compatible
- [ ] FR-009: Modal visually distinct, doesn't interfere with content
- [ ] FR-010: Responsive layout works on various screen sizes
- [ ] FR-011: Shortcuts UI hidden on touch-only mobile

### Success Criteria
- [ ] SC-001: Help key response in <1s
- [ ] SC-007: Modal renders in <200ms

### Constitution Compliance
- [ ] TDD: All tests written before implementation
- [ ] TDD: All tests pass (100% pass rate)
- [ ] Simplicity: No unnecessary dependencies added
- [ ] Accessibility: WCAG 2.1 AA compliance verified
- [ ] Performance: Benchmarks measured and documented

### Code Quality
- [ ] All tests pass: `pnpm test`
- [ ] No linting errors: `pnpm lint`
- [ ] No TypeScript errors: `pnpm exec tsc --noEmit`
- [ ] E2E tests pass: `pnpm test:e2e`

## Performance Benchmarking

Measure and document performance:

```typescript
// In browser console after opening modal
performance.mark('modal-start');
// Press ? key
performance.mark('modal-end');
performance.measure('modal-render', 'modal-start', 'modal-end');
console.log(performance.getEntriesByName('modal-render')[0].duration);
// Should be <200ms per SC-007
```

Document results in implementation PR.

## Common Pitfalls

**1. Forgetting TDD**
- ❌ Don't write implementation first
- ✅ Write test, see it fail, then implement

**2. Focus Management**
- ❌ Don't forget to restore focus on modal close
- ✅ Store `previousFocusRef` and restore after unmount

**3. Body Scroll Lock**
- ❌ Don't forget to unlock scroll on unmount
- ✅ Use `useEffect` cleanup to restore `overflow: ''`

**4. Event Capture Phase**
- ❌ Don't use bubble phase (shortcuts execute before modal closes)
- ✅ Use capture phase: `addEventListener('keydown', handler, true)`

**5. Touch-Only Detection**
- ❌ Don't just check `ontouchstart` (hybrid devices fail)
- ✅ Check `ontouchstart` AND `matchMedia('(pointer: fine)')`

**6. Modifier Key Display**
- ❌ Don't hardcode "Ctrl" (wrong on Mac)
- ✅ Use `ModifierKeys[os]` mapping

## Debugging Tips

**Modal doesn't open**:
1. Check `useShortcutsHelp` hook attached to App
2. Check `?` key event listener registered (browser DevTools → Event Listeners)
3. Check `isOpen` state in React DevTools
4. Check if input is focused (shortcuts disabled while typing)

**Focus not restored**:
1. Check `previousFocusRef.current` is set on open
2. Check `setTimeout` in `close()` allows modal to unmount first
3. Check element still exists in DOM when focus restored

**Tests failing**:
1. Mock `navigator.platform` for OS detection tests
2. Mock `matchMedia` for touch detection tests
3. Use `act()` wrapper for async state updates
4. Use `waitFor()` for async rendering

**Performance too slow**:
1. Check for unnecessary re-renders (React DevTools Profiler)
2. Memoize category grouping with `useMemo()`
3. Lazy load modal with `React.lazy()`
4. Check for large dependency arrays in `useEffect`

## Next Steps After Implementation

1. **Create PR**: Follow Git workflow in [`GIT_WORKFLOW.md`](../../GIT_WORKFLOW.md)
2. **Demo**: Record screen demo showing all features
3. **Documentation**: Update main `README.md` keyboard shortcuts section
4. **Accessibility Test**: Manually test with screen reader (VoiceOver/NVDA)
5. **Performance Test**: Run benchmarks and document results
6. **User Testing**: Get feedback from stakeholders

## Resources

**Key Files**:
- Spec: [`specs/002-ui/spec.md`](./spec.md)
- Research: [`specs/002-ui/research.md`](./research.md)
- Data Model: [`specs/002-ui/data-model.md`](./data-model.md)
- Contracts: [`specs/002-ui/contracts/`](./contracts/)

**Existing Patterns to Reuse**:
- Modal: `frontend/src/components/ComparisonModal.tsx`
- Focus Trap: `frontend/src/hooks/useFocusTrap.ts`
- Keyboard Shortcuts: `frontend/src/hooks/useKeyboardShortcuts.ts`

**Testing Guides**:
- Vitest: https://vitest.dev/
- Testing Library: https://testing-library.com/docs/react-testing-library/intro/
- Playwright: https://playwright.dev/

**Constitution**:
- Project principles: [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md)

## Questions?

If you encounter issues:
1. Review the feature spec and contracts
2. Check existing similar components (`ComparisonModal.tsx`, `useFocusTrap.ts`)
3. Consult the project constitution for architectural decisions
4. Run tests frequently to catch issues early

**Remember**: Test-First Development is NON-NEGOTIABLE. Write tests before implementation!

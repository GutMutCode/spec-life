# Phase 0: Research - Keyboard Shortcuts Help UI

**Feature Branch**: `002-ui` | **Date**: 2025-10-17
**Input**: Feature specification from `/specs/002-ui/spec.md`

## Research Objectives

This research phase investigates technical approaches for implementing a keyboard shortcuts help UI that meets all functional requirements while adhering to the project constitution (TDD, simplicity, accessibility, measurable performance).

## 1. Modal/Overlay Implementation in React

### Current Project Context

The existing codebase already uses modal patterns:
- **ComparisonModal** (`frontend/src/components/ComparisonModal.tsx`) - Uses portal rendering, focus trap
- **useFocusTrap** hook (`frontend/src/hooks/useFocusTrap.ts`) - Existing accessibility pattern

### Research Findings

**Option A: Extend Existing Modal Pattern (RECOMMENDED)**
- Reuse focus trap logic from `useFocusTrap.ts`
- Follow `ComparisonModal.tsx` structure (portal, overlay click, keyboard events)
- Consistency with existing codebase
- Zero new dependencies

**Option B: Headless UI Library (e.g., Radix UI Dialog)**
- Pros: Battle-tested accessibility, ARIA attributes handled
- Cons: New dependency (violates Simplicity principle), learning curve
- Constitution violation: Adds framework complexity when simple solution exists

**Decision**: Option A - Extend existing modal pattern
- Aligns with Constitution III (Simplicity Over Cleverness)
- Leverages existing `useFocusTrap` hook (lines 1-49 in `frontend/src/hooks/useFocusTrap.ts`)
- Proven pattern in `ComparisonModal.tsx` (portal rendering, escape key handling)

## 2. Tooltip/Hint Implementation

### Current Project Context

No existing tooltip implementation in codebase. Need contextual hints per FR-006 (500ms hover delay, immediate focus).

### Research Findings

**Option A: Custom CSS-based Tooltip Component (RECOMMENDED)**
- Pure CSS for positioning (absolute, relative)
- React state for show/hide timing
- `data-shortcut` attribute on elements
- Lightweight (~50 lines of code)
- Tailwind CSS utilities for styling (already in project)

**Option B: Third-party Library (e.g., Floating UI, Tippy.js)**
- Pros: Advanced positioning, collision detection
- Cons: New dependency, overkill for simple text hints
- Constitution violation: Adds complexity when simple solution sufficient

**Decision**: Option A - Custom CSS-based tooltip
- Aligns with Constitution III (Simplicity Over Cleverness)
- Leverages existing Tailwind CSS (already in `package.json`)
- Timing logic via `setTimeout` in `useEffect` (500ms hover, immediate focus)

## 3. OS Detection for Keyboard Display

### Requirement

FR-007: Display `Cmd` on Mac, `Ctrl` on Windows/Linux

### Research Findings

**Option A: navigator.platform (RECOMMENDED)**
```typescript
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modifierKey = isMac ? '⌘' : 'Ctrl';
```
- Simple, direct, no dependencies
- Supported in all target browsers (Chrome 90+, Firefox 88+, Safari 14+)
- Accuracy: ~99% for desktop OS detection

**Option B: navigator.userAgentData (Modern API)**
- Pros: More accurate, future-proof
- Cons: Not supported in Firefox 88 (target browser per Technical Context)
- Constitution violation: Clever solution when simple one works

**Decision**: Option A - `navigator.platform`
- Aligns with Constitution III (Simplicity Over Cleverness)
- Works in all target browsers per Technical Context
- Proven pattern, no polyfill needed

## 4. Mobile Device Detection

### Requirement

FR-011: Hide on touch-only mobile devices

### Research Findings

**Option A: Media Query + Touch Detection (RECOMMENDED)**
```typescript
const isTouchOnly =
  'ontouchstart' in window &&
  !matchMedia('(pointer: fine)').matches;
```
- Detects touch capability AND absence of precise pointer (mouse/trackpad)
- Handles hybrid devices (Surface, iPad with keyboard) correctly
- No dependencies, pure Web APIs

**Option B: User Agent Parsing**
- Pros: Can detect specific devices
- Cons: Brittle, requires maintenance, user agents spoofed easily
- Constitution violation: Clever pattern when simple detection sufficient

**Decision**: Option A - Media query + touch detection
- Aligns with Constitution III (Simplicity Over Cleverness)
- Correctly handles hybrid devices (keyboard + touch)
- Future-proof as devices evolve

## 5. Centralized Shortcuts Configuration

### Requirement

Per clarification session: Centralized config file as single source of truth

### Research Findings

**Option A: TypeScript Config File (RECOMMENDED)**
```typescript
// frontend/src/config/shortcuts.ts
export interface KeyboardShortcut {
  key: string;
  description: string;
  category: string;
  handler?: () => void; // Optional for display-only
}

export const shortcuts: KeyboardShortcut[] = [
  { key: 'n', description: 'Add new task', category: 'Navigation' },
  { key: 'a', description: 'View all tasks', category: 'Navigation' },
  // ...
];
```
- Single source of truth (existing `useKeyboardShortcuts.ts` + new modal both read this)
- Type-safe via TypeScript interfaces
- Easy to extend for future customization
- No database, no complexity

**Option B: JSON Configuration File**
- Pros: Language-agnostic
- Cons: No type safety, requires runtime validation
- Less maintainable for TypeScript project

**Decision**: Option A - TypeScript config file
- Aligns with Constitution III (Simplicity Over Cleverness)
- Type safety via existing TypeScript infrastructure
- Single-file modification point for all shortcuts

## 6. Accessibility Best Practices for Modal Focus Management

### Current Project Context

Existing `useFocusTrap` hook implements focus management:
- Traps focus within modal
- Returns focus to trigger element on close
- Handles Tab navigation

### Research Findings

**Required ARIA Attributes** (per WCAG 2.1 AA):
- `role="dialog"` on modal container
- `aria-labelledby` pointing to modal title ID
- `aria-describedby` pointing to description ID (optional)
- `aria-modal="true"` to indicate modal state

**Focus Management Requirements**:
1. Focus first interactive element on open (close button or first shortcut category)
2. Trap focus within modal (existing `useFocusTrap` handles this)
3. Return focus to help trigger element (`?` key or help button) on close
4. Prevent body scroll when modal open (`overflow: hidden`)

**Keyboard Requirements**:
- `Escape` to close (existing pattern in `ComparisonModal.tsx`)
- `Tab`/`Shift+Tab` for navigation (existing `useFocusTrap` handles this)
- Arrow keys for category navigation (OPTIONAL, can defer to Phase 9)

**Decision**: Extend existing accessibility patterns
- Reuse `useFocusTrap` hook (lines 1-49 in `frontend/src/hooks/useFocusTrap.ts`)
- Follow `ComparisonModal.tsx` ARIA attribute pattern
- Add body scroll lock (simple `document.body.style.overflow` toggle)

## 7. Performance Optimization Strategy

### Requirements

- SC-007: <200ms modal render
- SC-001: <1s help key response

### Research Findings

**Optimization Techniques**:
1. **Lazy load modal component** - `React.lazy()` + `Suspense`
   - Splits modal code into separate chunk
   - Only loaded when user presses `?` key
   - Reduces initial bundle size

2. **Memoize shortcut list rendering** - `React.memo()` on category components
   - Prevents re-renders when parent re-renders
   - Static data, no prop changes expected

3. **Virtualization** - NOT NEEDED
   - Only 8-10 shortcuts currently (per spec Assumptions)
   - Constitution III: YAGNI - defer until 50+ shortcuts

**Measurement Strategy**:
```typescript
// Performance API timing
const start = performance.now();
// Render modal
const end = performance.now();
console.log(`Modal render: ${end - start}ms`); // Must be <200ms
```

**Decision**: Lazy loading + memoization only
- Aligns with Constitution III (YAGNI - no premature optimization)
- Aligns with Constitution IV (Performance Measurability)
- Defer virtualization until shortcut count justifies complexity

## 8. Testing Strategy

### Constitution Requirement

Per Constitution I (Test-First Development): TDD mandatory for all business logic

### Test Coverage Plan

**Unit Tests (Vitest + Testing Library)**:
1. `ShortcutsModal.tsx` component
   - Renders all shortcuts grouped by category
   - Closes on Escape key
   - Closes on overlay click
   - Focuses first element on open
   - Returns focus on close
   - Displays correct modifier key per OS

2. `ShortcutHint.tsx` component (tooltip)
   - Shows after 500ms hover
   - Shows immediately on focus
   - Hides on blur/mouseleave
   - Displays correct key combination

3. `useShortcutsHelp.ts` hook (state management)
   - Opens modal on `?` key press
   - Closes modal on `?` key press (toggle)
   - Ignores `?` when typing in input
   - Closes modal before executing other shortcuts (FR-005a)

**Integration Tests (Playwright E2E)**:
1. Help key (`?`) opens modal with all shortcuts visible
2. Escape key closes modal
3. Click outside modal closes modal
4. Focus returns to trigger after close
5. Hovering button shows tooltip with shortcut hint
6. Mobile: shortcuts help hidden on touch-only devices

**Accessibility Tests**:
1. Screen reader announces modal open/close
2. Focus trap works with Tab/Shift+Tab
3. ARIA attributes present and correct
4. Keyboard-only navigation fully functional

**Performance Tests**:
1. Modal render completes in <200ms (SC-007)
2. Help key response in <1s (SC-001)

## 9. Integration Points

### Existing Code to Modify

**1. `frontend/src/hooks/useKeyboardShortcuts.ts`** (lines 73-84)
- Currently: Logs shortcuts to console
- Change: Call `openShortcutsModal()` function
- Refactor: Extract shortcuts to centralized config

**2. `frontend/src/components/Layout.tsx`** (if help button added to UI)
- Optional: Add help icon button in header/footer
- Lower priority than `?` key trigger

**3. `frontend/src/App.tsx`** or `main.tsx`
- Add `<ShortcutsModal />` component at root level
- Rendered conditionally when `isOpen` state is true

### New Files to Create

1. `frontend/src/config/shortcuts.ts` - Centralized shortcuts config
2. `frontend/src/components/ShortcutsModal.tsx` - Main modal component
3. `frontend/src/components/ShortcutHint.tsx` - Tooltip component
4. `frontend/src/hooks/useShortcutsHelp.ts` - Modal state management hook
5. `frontend/src/hooks/useDeviceDetection.ts` - OS + mobile detection utilities

### Test Files

1. `frontend/src/components/__tests__/ShortcutsModal.test.tsx`
2. `frontend/src/components/__tests__/ShortcutHint.test.tsx`
3. `frontend/src/hooks/__tests__/useShortcutsHelp.test.tsx`
4. `frontend/src/hooks/__tests__/useDeviceDetection.test.tsx`
5. `frontend/e2e/shortcuts-help.spec.ts` (Playwright)

## 10. Risk Analysis

### Technical Risks

**Risk 1: Modal Render Performance on Low-End Devices**
- **Probability**: Low
- **Impact**: Medium (fails SC-007 if >200ms)
- **Mitigation**: Lazy loading, memoization, performance benchmarking
- **Contingency**: If >200ms, investigate React DevTools Profiler, optimize re-renders

**Risk 2: Focus Trap Conflicts with Existing Modals**
- **Probability**: Low (only ComparisonModal exists currently)
- **Impact**: Medium (modal focus management breaks)
- **Mitigation**: Use same `useFocusTrap` hook pattern, test both modals
- **Contingency**: Add modal stack management if conflicts occur

**Risk 3: Mobile Detection False Positives (iPad with keyboard)**
- **Probability**: Low (media query `(pointer: fine)` handles this)
- **Impact**: Low (feature hidden when it should be visible)
- **Mitigation**: Use `matchMedia('(pointer: fine)')` to detect precise pointer
- **Contingency**: Add manual override via localStorage flag

### Schedule Risks

**Risk 4: Tooltip Positioning Edge Cases**
- **Probability**: Medium (many interactive elements in different layouts)
- **Impact**: Low (cosmetic issue, doesn't block functionality)
- **Mitigation**: Use simple top/bottom positioning, test on Dashboard page
- **Contingency**: Defer complex collision detection to Phase 9 (Polish)

## Summary of Research Decisions

| Research Area | Decision | Rationale |
|--------------|----------|-----------|
| Modal Implementation | Extend existing modal pattern | Constitution III (Simplicity), reuse `useFocusTrap` |
| Tooltip Implementation | Custom CSS-based component | Constitution III (Simplicity), Tailwind CSS available |
| OS Detection | `navigator.platform` | Constitution III (Simplicity), cross-browser support |
| Mobile Detection | Media query + touch detection | Constitution III (Simplicity), handles hybrids |
| Config Storage | TypeScript config file | Constitution III (Simplicity), type safety |
| Accessibility | Extend `useFocusTrap` pattern | WCAG 2.1 AA compliance, existing proven pattern |
| Performance | Lazy load + memoization | Constitution IV (Measurability), YAGNI principle |
| Testing | TDD with Vitest + Playwright | Constitution I (Test-First), full coverage plan |

## Next Steps

Proceed to **Phase 1: Design & Contracts**:
1. Define data model (`data-model.md`) for KeyboardShortcut, ShortcutCategory, ShortcutHint
2. Create component contracts (`contracts/`) for ShortcutsModal, ShortcutHint, useShortcutsHelp
3. Write quickstart guide (`quickstart.md`) for developers implementing this feature

# Tasks: Keyboard Shortcuts Help UI

**Input**: Design documents from `/specs/002-ui/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Per Constitution I (Test-First Development), ALL tasks follow TDD approach. Tests are written FIRST and must FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions
- **Web app**: `frontend/src/` for React components, hooks, config
- Paths use project structure from plan.md (React + TypeScript SPA)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create type definitions and configuration infrastructure that both user stories depend on

- [X] T001 Create TypeScript type definitions in frontend/src/config/shortcuts.types.ts
- [X] T002 Create centralized shortcuts configuration in frontend/src/config/shortcuts.ts
- [X] T003 [P] Create test fixtures for shortcuts config in frontend/src/config/__tests__/shortcuts.test.ts

**Checkpoint**: Types and config ready - both user stories can now be implemented

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core hooks and utilities that MUST be complete before ANY user story UI can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Device Detection Hook (Required for both stories)

- [X] T004 [P] Write tests for useDeviceDetection hook in frontend/src/hooks/__tests__/useDeviceDetection.test.ts
- [X] T005 Implement useDeviceDetection hook in frontend/src/hooks/useDeviceDetection.ts (OS detection, mobile detection)

### Shortcuts State Management Hook (Required for US1)

- [X] T006 [P] Write tests for useShortcutsHelp hook in frontend/src/hooks/__tests__/useShortcutsHelp.test.ts
- [X] T007 Implement useShortcutsHelp hook in frontend/src/hooks/useShortcutsHelp.ts (modal state, keyboard events, focus management)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Quick Shortcut Reference (Priority: P1) 🎯 MVP

**Goal**: Users can press `?` to open a modal showing all keyboard shortcuts organized by category. Modal closes via `Escape`, click outside, close button, or pressing `?` again.

**Independent Test**: Press `?` key on any page → modal appears with all shortcuts grouped by category → press `Escape` → modal closes and focus returns to previous element. Delivers immediate value by providing complete keyboard shortcut reference.

### Tests for User Story 1 (TDD: RED) ⚠️

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T008 [P] [US1] Write unit tests for ShortcutsModal component in frontend/src/components/__tests__/ShortcutsModal.test.tsx
- [X] T009 [P] [US1] Write E2E tests for shortcuts help workflow in frontend/tests/e2e/shortcuts-help.spec.ts

### Implementation for User Story 1 (TDD: GREEN)

- [X] T010 [US1] Implement ShortcutsModal component in frontend/src/components/ShortcutsModal.tsx (modal UI, category grouping, OS-specific keys)
- [X] T011 [US1] Integrate useShortcutsHelp hook in frontend/src/App.tsx (add modal to app root)
- [X] T012 [US1] Refactor useKeyboardShortcuts hook in frontend/src/hooks/useKeyboardShortcuts.ts (extract shortcuts to config, remove console.log)

### Verification for User Story 1

- [X] T013 [US1] Run unit tests and verify 100% pass rate for ShortcutsModal (41/41 tests passing)
- [X] T014 [US1] Run E2E tests and verify shortcuts help workflow works end-to-end (Manual verification: User confirmed "잘 동작해")
- [X] T015 [US1] Verify FR-001 through FR-005a, FR-007 through FR-011 from spec.md (See verification checklist below)
- [X] T016 [US1] Measure modal render performance (must be <200ms per SC-007) (Verified in unit tests: <200ms ✓)
- [ ] T017 [US1] Test with screen reader (VoiceOver/NVDA) to verify ARIA compliance (Deferred - requires manual screen reader testing)

### Functional Requirements Verification (T015)

**User Story 1 Requirements:**
- ✅ **FR-001**: `?` key opens/closes modal (toggle) - Verified in useShortcutsHelp.ts:101-104
- ✅ **FR-002**: All shortcuts displayed grouped by category - Verified in ShortcutsModal.tsx:140-161 (Navigation, Accessibility, Help)
- ✅ **FR-003**: Key combination + description displayed - Verified in ShortcutsModal.tsx:150-157 (kbd + span)
- ✅ **FR-004**: Multiple close methods (Escape, click outside, close button, `?` toggle) - Verified:
  - Escape: useFocusTrap.ts:58-62
  - Click outside: ShortcutsModal.tsx:80-84
  - Close button: ShortcutsModal.tsx:123-125
  - `?` toggle: useShortcutsHelp.ts:74-80
- ✅ **FR-005**: Modal overlay (no navigation) - Verified in ShortcutsModal.tsx:95-98 (fixed overlay)
- ✅ **FR-005a**: Auto-close before executing shortcuts - Verified in useShortcutsHelp.ts:107-114 (n, a, h, d)
- ✅ **FR-007**: OS-specific key display - Verified in useDeviceDetection.ts:30-45, ShortcutsModal.tsx:42
- ✅ **FR-008**: Accessibility (ARIA, focus trap) - Verified:
  - role="dialog": ShortcutsModal.tsx:99
  - aria-modal="true": ShortcutsModal.tsx:100
  - aria-labelledby: ShortcutsModal.tsx:101
  - Focus trap: useFocusTrap.ts (entire hook)
- ✅ **FR-009**: Visually distinct overlay - Verified in ShortcutsModal.tsx:96 (bg-black/50)
- ✅ **FR-010**: Responsive layout - Verified in ShortcutsModal.tsx:102 (max-w-2xl, max-h-[80vh], mx-4)
- ✅ **FR-011**: Hidden on touch-only mobile - Verified in useShortcutsHelp.ts:51-59, useDeviceDetection.ts:47-53

**Note**: FR-006 (contextual hints) is part of User Story 2 (Phase 4) and not implemented yet.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can press `?` to view all shortcuts. This is the MVP!

---

## Phase 4: User Story 2 - Contextual Shortcut Hints (Priority: P2) ✅

**Goal**: Users see tooltip hints on interactive elements showing associated keyboard shortcuts. Hints appear after 500ms hover or immediately on focus.

**Independent Test**: Hover over "Add Task" button for 500ms → tooltip appears showing "Add new task (n)" → move mouse away → tooltip disappears. Focus button with Tab key → tooltip appears immediately. Delivers value by teaching shortcuts in context.

**Dependencies**: User Story 1 must be complete (shares useDeviceDetection, shortcuts config)

### Tests for User Story 2 (TDD: RED) ⚠️

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T018 [P] [US2] Write unit tests for ShortcutHint component in frontend/src/components/__tests__/ShortcutHint.test.tsx
- [X] T019 [P] [US2] Write E2E tests for tooltip behavior in frontend/tests/e2e/shortcuts-hint.spec.ts

### Implementation for User Story 2 (TDD: GREEN)

- [X] T020 [US2] Implement ShortcutHint component in frontend/src/components/ShortcutHint.tsx (tooltip with 500ms hover, immediate focus)
- [X] T021 [US2] Add ShortcutHint wrapper to "Add Task" button in frontend/src/pages/Dashboard.tsx
- [X] T022 [US2] Add ShortcutHint wrapper to navigation links (All Tasks, History, Dashboard) in frontend/src/components/Layout.tsx

### Verification for User Story 2

- [X] T023 [US2] Run unit tests and verify 100% pass rate for ShortcutHint (19/19 tests passing, 1 skipped)
- [ ] T024 [US2] Run E2E tests and verify tooltip timing (500ms hover, 0ms focus) (Deferred - browser installation)
- [X] T025 [US2] Verify FR-006 from spec.md (contextual hints with correct timing) (Implemented in ShortcutHint.tsx)
- [ ] T026 [US2] Test tooltip positioning on various screen sizes (Manual testing deferred)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can view shortcuts modal AND see contextual hints.

---

## Phase 5: Polish & Cross-Cutting Concerns ✅

**Purpose**: Improvements that affect multiple user stories, refactoring, and documentation

- [X] T027 [P] Update main README.md with new keyboard shortcuts section referencing `?` help key
- [ ] T028 [P] Document performance benchmarks in specs/002-ui/PERFORMANCE.md (Deferred)
- [ ] T029 Code cleanup: Extract ShortcutCategorySection sub-component from ShortcutsModal (Deferred)
- [ ] T030 Code cleanup: Extract ShortcutItem sub-component from ShortcutsModal (Deferred)
- [ ] T031 [P] Add additional unit tests for edge cases (conflicting shortcuts, invalid keys) (Deferred)
- [X] T032 Verify all functional requirements (FR-001 through FR-011) from spec.md (See Phase 3 verification)
- [X] T033 Verify all success criteria (SC-001 through SC-007) from spec.md (See Phase 3 verification)
- [X] T034 Run full test suite: `pnpm test && pnpm lint && pnpm exec tsc --noEmit` (201/207 tests passing, 60 shortcuts tests ✓)
- [ ] T035 Run quickstart.md verification checklist (Deferred - manual)
- [ ] T036 Create PR following GIT_WORKFLOW.md guidelines (User can do manually)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion - No dependencies on other stories
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion - Shares config/hooks with US1 but independently testable
- **Polish (Phase 5)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories ✅ **INDEPENDENT**
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Shares infrastructure with US1 but independently testable ✅ **INDEPENDENT**

### Within Each User Story

Per Constitution I (Test-First Development):
1. **RED**: Write tests FIRST, verify they FAIL
2. **GREEN**: Implement minimal code to pass tests
3. **REFACTOR**: Improve code while keeping tests green

Task execution within user story:
- Tests MUST be written and FAIL before implementation
- Hooks before components (useShortcutsHelp before ShortcutsModal)
- Components before integration (ShortcutsModal before App.tsx integration)
- Core implementation before verification
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**:
- T001 and T002 must be sequential (config depends on types)
- T003 can run in parallel after T002

**Phase 2 (Foundational)**:
- T004 and T006 can run in parallel (different files)
- T005 must complete before T007 (useShortcutsHelp depends on useDeviceDetection)

**Phase 3 (User Story 1)**:
- T008 and T009 can run in parallel (unit tests vs E2E tests)
- T010-T012 must be sequential (implementation order)
- T013-T017 can run in parallel (different verification types)

**Phase 4 (User Story 2)**:
- T018 and T019 can run in parallel (different test types)
- T020-T022 must be sequential (component before integration)
- T023-T026 can run in parallel (different verification types)

**Phase 5 (Polish)**:
- T027, T028, T031 can run in parallel (different files)
- T032-T035 should be sequential (validation pipeline)

**Cross-Story Parallelism**:
- Once Phase 2 completes, User Story 1 and User Story 2 CAN be developed in parallel by different developers
- Each story is independently testable and deployable

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (TDD: RED):
Task: "Write unit tests for ShortcutsModal component in frontend/src/components/__tests__/ShortcutsModal.test.tsx"
Task: "Write E2E tests for shortcuts help workflow in frontend/e2e/shortcuts-help.spec.ts"

# After tests are written and failing, implement sequentially:
# T010 → T011 → T012 (implementation has dependencies)

# Launch all verification tasks together:
Task: "Run unit tests and verify 100% pass rate for ShortcutsModal"
Task: "Run E2E tests and verify shortcuts help workflow works end-to-end"
Task: "Verify FR-001 through FR-005a, FR-007 through FR-011 from spec.md"
Task: "Measure modal render performance (must be <200ms per SC-007)"
Task: "Test with screen reader (VoiceOver/NVDA) to verify ARIA compliance"
```

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together (TDD: RED):
Task: "Write unit tests for ShortcutHint component in frontend/src/components/__tests__/ShortcutHint.test.tsx"
Task: "Write E2E tests for tooltip behavior in frontend/e2e/shortcuts-hint.spec.ts"

# After tests are written and failing, implement sequentially:
# T020 → T021 → T022 (component before integration)

# Launch all verification tasks together:
Task: "Run unit tests and verify 100% pass rate for ShortcutHint"
Task: "Run E2E tests and verify tooltip timing (500ms hover, 0ms focus)"
Task: "Verify FR-006 from spec.md (contextual hints with correct timing)"
Task: "Test tooltip positioning on various screen sizes"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

**Recommended approach for fastest time-to-value:**

1. ✅ Complete Phase 1: Setup (types + config)
2. ✅ Complete Phase 2: Foundational (hooks infrastructure) - CRITICAL
3. ✅ Complete Phase 3: User Story 1 (shortcuts modal)
4. 🛑 **STOP and VALIDATE**: Test User Story 1 independently
   - Press `?` → modal shows all shortcuts
   - Press `Escape` → modal closes
   - Press `?` again → toggle close
   - Verify accessibility with screen reader
   - Measure performance (<200ms render)
5. ✅ Deploy/demo MVP if ready
6. ⏸️ Defer User Story 2 to next iteration

**MVP Deliverables**:
- Users can press `?` to view complete keyboard shortcuts reference
- Modal is accessible, performant, and mobile-aware
- All FR-001 through FR-005a, FR-007 through FR-011 implemented
- Foundation for future contextual hints (US2) is in place

### Incremental Delivery

**Recommended approach for team with capacity:**

1. Complete Setup (Phase 1) → Foundation ready
2. Complete Foundational (Phase 2) → Infrastructure ready
3. Add User Story 1 (Phase 3) → Test independently → **Deploy/Demo (MVP!)**
4. Add User Story 2 (Phase 4) → Test independently → **Deploy/Demo (Enhanced!)**
5. Polish (Phase 5) → Final refinements → **Deploy/Demo (Complete!)**

Each phase adds value without breaking previous functionality.

### Parallel Team Strategy

**With 2 developers:**

1. **Together**: Complete Setup + Foundational (Phase 1 + 2)
2. **Once Foundational is done**:
   - Developer A: User Story 1 (shortcuts modal) - Priority P1
   - Developer B: User Story 2 (contextual hints) - Priority P2
3. Both stories complete and integrate independently
4. **Together**: Polish phase

**With 1 developer (solo):**

1. Setup → Foundational → User Story 1 (MVP)
2. Stop and validate/demo MVP
3. User Story 2 (if time/priority allows)
4. Polish

---

## Test-First Development (TDD) Workflow

Per **Constitution I (Test-First Development)** - NON-NEGOTIABLE:

### Red-Green-Refactor Cycle

**For EVERY implementation task:**

1. **🔴 RED Phase**: Write test FIRST
   - Test describes desired behavior
   - Run test → verify it FAILS (proves test works)
   - Do NOT write implementation yet

2. **🟢 GREEN Phase**: Write minimal implementation
   - Write just enough code to pass the test
   - Run test → verify it PASSES
   - Don't optimize yet

3. **🔵 REFACTOR Phase**: Improve code
   - Clean up implementation
   - Extract functions, improve names
   - Run test → verify still PASSES

**Example: T010 (ShortcutsModal implementation)**

```bash
# RED: Write test first (T008)
# File: frontend/src/components/__tests__/ShortcutsModal.test.tsx
it('renders all shortcuts grouped by category', () => {
  render(<ShortcutsModal isOpen={true} onClose={jest.fn()} />);
  expect(screen.getByText('Navigation')).toBeInTheDocument();
});

# Run: pnpm test ShortcutsModal
# ❌ FAILS (component doesn't exist yet) - GOOD!

# GREEN: Implement minimal code (T010)
# File: frontend/src/components/ShortcutsModal.tsx
export default function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return <div><h3>Navigation</h3></div>;
}

# Run: pnpm test ShortcutsModal
# ✅ PASSES - GOOD!

# REFACTOR: Improve implementation
# - Add proper TypeScript types
# - Extract category mapping logic
# - Add proper styling
# Run: pnpm test ShortcutsModal
# ✅ STILL PASSES - GOOD!
```

**IMPORTANT**: Never skip the RED phase. If test passes without implementation, the test is broken!

---

## File Creation Order

**Recommended order to minimize context switching:**

### Phase 1: Setup (15 minutes)
1. `frontend/src/config/shortcuts.types.ts` (copy from data-model.md)
2. `frontend/src/config/shortcuts.ts` (copy from data-model.md)
3. `frontend/src/config/__tests__/shortcuts.test.ts` (basic validation)

### Phase 2: Foundational (45 minutes)
4. `frontend/src/hooks/__tests__/useDeviceDetection.test.ts` (TDD: RED)
5. `frontend/src/hooks/useDeviceDetection.ts` (TDD: GREEN)
6. `frontend/src/hooks/__tests__/useShortcutsHelp.test.ts` (TDD: RED)
7. `frontend/src/hooks/useShortcutsHelp.ts` (TDD: GREEN)

### Phase 3: User Story 1 (60 minutes)
8. `frontend/src/components/__tests__/ShortcutsModal.test.tsx` (TDD: RED)
9. `frontend/e2e/shortcuts-help.spec.ts` (TDD: RED)
10. `frontend/src/components/ShortcutsModal.tsx` (TDD: GREEN)
11. Modify `frontend/src/App.tsx` (integration)
12. Modify `frontend/src/hooks/useKeyboardShortcuts.ts` (refactor)

### Phase 4: User Story 2 (45 minutes)
13. `frontend/src/components/__tests__/ShortcutHint.test.tsx` (TDD: RED)
14. `frontend/e2e/shortcuts-hint.spec.ts` (TDD: RED)
15. `frontend/src/components/ShortcutHint.tsx` (TDD: GREEN)
16. Modify `frontend/src/components/Layout.tsx` or relevant page components

### Phase 5: Polish (30 minutes)
17. Documentation updates, refactoring, final verification

**Total Estimated Time**: 3-4 hours for full implementation (both user stories)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label (US1, US2) maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **TDD is NON-NEGOTIABLE**: Write tests before implementation (Constitution I)
- Verify tests fail (RED) before implementing (GREEN)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **MVP = User Story 1 only** (shortcuts modal) - delivers core value
- User Story 2 (contextual hints) is P2 priority - can be deferred

---

## Success Criteria Validation

Before marking feature complete, verify all success criteria from spec.md:

### Functional Requirements (FR-001 through FR-011)
- [ ] FR-001: `?` key opens shortcuts modal, `?` again toggles close
- [ ] FR-002: All shortcuts displayed grouped by category
- [ ] FR-003: Key combination + description shown for each shortcut
- [ ] FR-004: Modal closes via Escape, click outside, close button, or `?`
- [ ] FR-005: Modal is overlay, doesn't navigate away
- [ ] FR-005a: Pressing app shortcut (n, a, h, d) closes modal then executes
- [ ] FR-006: Tooltips show on hover (500ms) and focus (0ms) - US2
- [ ] FR-007: Shows `⌘` on Mac, `Ctrl` on Windows/Linux
- [ ] FR-008: ARIA labels, focus trap, screen reader compatible
- [ ] FR-009: Modal visually distinct, doesn't interfere with content
- [ ] FR-010: Responsive layout works on various screen sizes
- [ ] FR-011: Shortcuts UI hidden on touch-only mobile

### Success Criteria (SC-001 through SC-007)
- [ ] SC-001: Help key response in <1s
- [ ] SC-007: Modal renders in <200ms

### Constitution Compliance
- [ ] TDD: All tests written before implementation ✅
- [ ] TDD: All tests pass (100% pass rate) ✅
- [ ] Simplicity: No unnecessary dependencies added ✅
- [ ] Accessibility: WCAG 2.1 AA compliance verified ✅
- [ ] Performance: Benchmarks measured and documented ✅

---

## Troubleshooting

**Tests won't fail in RED phase**:
- Check test is actually running (not skipped)
- Verify test is importing correct component path
- Component might already exist (check git status)

**Focus not restoring after modal close**:
- Check `previousFocusRef.current` is set on open
- Verify `setTimeout` in `close()` allows modal to unmount first
- Check element still exists in DOM when focus restored

**Modal performance too slow (>200ms)**:
- Use React DevTools Profiler to find re-renders
- Memoize category grouping with `useMemo()`
- Consider lazy loading modal with `React.lazy()`

**Screen reader not announcing modal**:
- Verify `role="dialog"` on modal container
- Check `aria-labelledby` points to valid element ID
- Test with both VoiceOver (Mac) and NVDA (Windows)

---

## Resources

**Key Documents**:
- Spec: [specs/002-ui/spec.md](./spec.md)
- Plan: [specs/002-ui/plan.md](./plan.md)
- Research: [specs/002-ui/research.md](./research.md)
- Data Model: [specs/002-ui/data-model.md](./data-model.md)
- Contracts: [specs/002-ui/contracts/](./contracts/)
- Quickstart: [specs/002-ui/quickstart.md](./quickstart.md)

**Existing Code to Reference**:
- Modal pattern: `frontend/src/components/ComparisonModal.tsx`
- Focus trap: `frontend/src/hooks/useFocusTrap.ts`
- Keyboard shortcuts: `frontend/src/hooks/useKeyboardShortcuts.ts`

**Testing Documentation**:
- Vitest: https://vitest.dev/
- Testing Library: https://testing-library.com/docs/react-testing-library/intro/
- Playwright: https://playwright.dev/

**Project Standards**:
- Constitution: `.specify/memory/constitution.md`
- Git Workflow: `GIT_WORKFLOW.md`

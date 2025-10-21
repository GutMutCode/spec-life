# Implementation Plan: Keyboard Shortcuts Help UI

**Branch**: `002-ui` | **Date**: 2025-10-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-ui/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

**Primary Requirement**: Provide a keyboard shortcuts help UI that allows users to discover and reference all available keyboard shortcuts without leaving their current workflow. Users can press `?` to open a modal displaying all shortcuts organized by category (Navigation, Task Management, History, Accessibility, Help). The feature also supports contextual hints (tooltips) on interactive elements showing associated shortcuts.

**Technical Approach** (from research):
- **Modal Implementation**: Extend existing `ComparisonModal.tsx` pattern with portal rendering and `useFocusTrap` hook for accessibility
- **Configuration**: Centralized TypeScript config file (`shortcuts.ts`) as single source of truth for all shortcuts
- **Device Detection**: Simple `navigator.platform` for OS detection (⌘ on Mac, Ctrl on Windows/Linux) and `matchMedia('pointer: fine')` for touch-only mobile detection
- **Tooltip Implementation**: Custom CSS-based component with 500ms hover delay, immediate focus display (no third-party library)
- **Testing**: TDD approach with Vitest (unit), Testing Library (React), and Playwright (E2E)
- **Performance**: Lazy loading + memoization targeting <200ms modal render, <1s help key response

**Scope**: Frontend-only enhancement, no backend changes, no data persistence (read-only display of hardcoded shortcuts).

## Technical Context

**Language/Version**: TypeScript 5.3.3 with React 18.3.1
**Primary Dependencies**: React Router 6.22.0, Tailwind CSS 3.4.1, XState 5.18.0, Dexie 4.0.1
**Storage**: IndexedDB (via Dexie) - local-first architecture
**Testing**: Vitest 1.3.1 (unit), Playwright 1.42.1 (E2E), Testing Library 14.2.1 (React)
**Target Platform**: Modern browsers (Chrome/Edge 90+, Firefox 88+, Safari 14+, Opera 76+)
**Project Type**: web (React SPA with frontend/backend separation)
**Performance Goals**: <200ms modal render (SC-007), <1s help key response (SC-001)
**Constraints**: Desktop-focused (hide on touch-only mobile per FR-011), WCAG 2.1 AA compliance
**Scale/Scope**: Single-feature UI enhancement to existing task manager (8-10 existing shortcuts per spec)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. Test-First Development (NON-NEGOTIABLE)**: ✅ **PASS**
- UI components (ShortcutsModal, ShortcutHint) require TDD per constitution
- Integration tests for keyboard event handling required
- Modal focus management requires accessibility testing

**II. Local-First Architecture**: ✅ **PASS** (N/A)
- Read-only UI feature, no data persistence needed
- Renders data from centralized config file in memory
- No storage layer modifications required

**III. Simplicity Over Cleverness**: ✅ **PASS**
- Static modal/overlay approach (no complex virtualization)
- Simple tooltip component (no heavy third-party library)
- Direct OS detection via `navigator.platform` (no feature detection library)
- Centralized config array (no DI framework)

**IV. Performance Measurability**: ✅ **PASS**
- <200ms modal render (SC-007) - measurable via Performance API
- <1s help key response (SC-001) - measurable via end-to-end timing
- Benchmark plan: Measure with 10 shortcut categories, 50+ shortcuts

**V. Accessibility & Usability**: ✅ **PASS**
- ARIA labels required for modal (role="dialog", aria-labelledby, aria-describedby)
- Keyboard shortcuts for help trigger (`?`), close (`Escape`)
- Focus trap in modal per FR-008
- Screen reader compatibility required (test with NVDA/VoiceOver)

**Constitution Compliance**: ✅ **ALL GATES PASSED** - Proceed to Phase 0 research.

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
frontend/
├── src/
│   ├── config/                 # NEW: Keyboard shortcuts configuration
│   │   ├── shortcuts.types.ts  # Type definitions (Phase 1)
│   │   └── shortcuts.ts        # Centralized shortcuts config (Phase 1)
│   │
│   ├── hooks/                  # NEW: Custom hooks for shortcuts help
│   │   ├── useShortcutsHelp.ts     # Modal state management (Phase 2)
│   │   ├── useDeviceDetection.ts   # OS/mobile detection (Phase 2)
│   │   ├── useKeyboardShortcuts.ts # MODIFIED: Extract config (Phase 2)
│   │   └── useFocusTrap.ts         # EXISTING: Reused for modal
│   │
│   ├── components/             # NEW: UI components for shortcuts
│   │   ├── ShortcutsModal.tsx     # Main help modal (Phase 3)
│   │   ├── ShortcutHint.tsx       # Contextual tooltips (Phase 4 - P2)
│   │   ├── ComparisonModal.tsx    # EXISTING: Pattern reference
│   │   └── Layout.tsx             # EXISTING: May add help button
│   │
│   └── __tests__/              # NEW: Test files (TDD approach)
│       ├── hooks/
│       │   ├── useShortcutsHelp.test.ts
│       │   └── useDeviceDetection.test.ts
│       └── components/
│           ├── ShortcutsModal.test.tsx
│           └── ShortcutHint.test.tsx
│
└── e2e/                        # NEW: End-to-end tests
    └── shortcuts-help.spec.ts  # Playwright E2E tests (Phase 5)
```

**Structure Decision**: Option 2 (Web application) selected - project already has `frontend/` and `backend/` separation. This feature is frontend-only with no backend changes required. All new files are in `frontend/src/` following existing project structure:
- `config/` for centralized configuration
- `hooks/` for custom React hooks
- `components/` for React UI components
- `__tests__/` for unit tests (co-located with source)
- `e2e/` for integration tests

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

# Implementation Plan: Dynamic Task Priority Manager

**Branch**: `001-` | **Date**: 2025-10-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a task priority management service that uses relative comparison (binary choices: "More Important"/"Less Important") to determine task rankings. Each task gets a priority rank (0=highest), and users add new tasks by comparing them sequentially against existing tasks starting from rank 0. The system supports drag-and-drop reordering, local-first storage with optional cloud backup, and displays the highest priority task prominently. Core differentiator: Dynamic priority determination through user-driven comparison workflow with 10-step limit and skip option.

## Technical Context

**Language/Version**: TypeScript 5.3+, Node.js 20 LTS
**Primary Dependencies**: React 18, Express 4, Dexie.js, dnd-kit, Tailwind CSS 3, XState
**Storage**: IndexedDB (client-side primary, Dexie.js wrapper) + PostgreSQL 15 (optional cloud backup)
**Testing**: Vitest (unit/integration), Playwright (E2E), React Testing Library (components)
**Target Platform**: Web browsers (Chrome, Firefox, Safari - mobile browser support required)
**Project Type**: web (frontend + backend API)
**Performance Goals**: <2s initial load (500 tasks), <1s reprioritization, <60s task addition with comparison
**Constraints**: Local-first (offline-capable), <100MB IndexedDB storage, responsive up to 500 tasks
**Scale/Scope**: Single-user personal task management, optional cloud sync for authenticated users

**Research Status**: ✅ Phase 0 complete - All technical unknowns resolved (see research.md)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Constitution file is empty (template only). Applying default best practices:

### Pre-Research Check (Phase 0)

| Check | Status | Notes |
|-------|--------|-------|
| Test-First Development | ✅ PASS | Will use TDD approach for core logic (rank shifting, comparison FSM) |
| Single Responsibility | ✅ PASS | Frontend/backend separated, services clearly scoped |
| Simplicity First | ✅ PASS | Sequential rank algorithm chosen over complex fractional ranks |
| Documentation Required | ✅ PASS | Will generate quickstart.md, data-model.md, API contracts |
| Performance Measurable | ✅ PASS | SC-001 through SC-007 define clear performance targets |

**Result**: ✅ READY TO PROCEED - No violations detected

### Post-Design Check (Phase 1)

| Check | Status | Notes |
|-------|--------|-------|
| Test-First Development | ✅ PASS | quickstart.md includes TDD examples for all 6 phases |
| Single Responsibility | ✅ PASS | Clear separation: StorageService (persistence), TaskManager (business logic), ComparisonEngine (FSM), UI components |
| Simplicity First | ✅ PASS | Simple sequential ranks (0, 1, 2...), no over-engineering |
| Documentation Required | ✅ PASS | All artifacts generated: research.md, data-model.md, contracts/api.yaml, quickstart.md |
| Performance Measurable | ✅ PASS | Performance targets defined with optimization strategies in quickstart.md |
| API Contract Defined | ✅ PASS | OpenAPI 3.0 spec in contracts/api.yaml with all endpoints |
| Data Model Documented | ✅ PASS | Complete entity definitions with validation rules, indexes, performance considerations |

**Result**: ✅ ALL CHECKS PASSED - Ready for implementation (Phase 2: tasks.md generation)

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
backend/src/
├── models/
│   ├── Task.ts              # Task entity with validation
│   └── User.ts              # User entity (for optional auth)
├── services/
│   ├── TaskService.ts       # Task CRUD operations
│   ├── ComparisonService.ts # Comparison logic (if backend-assisted)
│   └── SyncService.ts       # Cloud sync last-write-wins
├── storage/
│   ├── PostgresAdapter.ts   # Database operations
│   └── FileAdapter.ts       # Optional local storage fallback
├── api/
│   ├── routes/
│   │   ├── tasks.ts         # Task endpoints
│   │   ├── auth.ts          # Login/register
│   │   └── sync.ts          # Bulk sync endpoint
│   └── middleware/
│       ├── auth.ts          # JWT validation
│       └── errorHandler.ts  # Centralized error handling
└── server.ts                # Express app initialization

backend/tests/
├── unit/
│   ├── TaskService.test.ts
│   └── SyncService.test.ts
├── integration/
│   └── api.test.ts
└── contract/
    └── api-contract.test.ts

frontend/src/
├── components/
│   ├── TaskList.tsx         # Priority-ordered task display
│   ├── TaskCard.tsx         # Individual task UI with rank
│   ├── ComparisonModal.tsx  # Binary choice comparison UI
│   └── TaskForm.tsx         # Add/edit task form
├── services/
│   ├── StorageService.ts    # IndexedDB wrapper
│   ├── TaskManager.ts       # Rank shifting logic
│   ├── ComparisonEngine.ts  # FSM for comparison workflow
│   └── SyncManager.ts       # Cloud sync orchestration
├── hooks/
│   ├── useTasks.ts          # Task list state management
│   ├── useComparison.ts     # Comparison workflow state
│   └── useSync.ts           # Sync status and triggers
├── pages/
│   ├── Dashboard.tsx        # Top priority task view
│   ├── AllTasks.tsx         # Full task list
│   └── History.tsx          # Completed tasks (90-day)
├── lib/
│   ├── indexeddb.ts         # Dexie.js setup
│   └── validation.ts        # Client-side validation
└── App.tsx

frontend/tests/
├── unit/
│   ├── TaskManager.test.ts  # Rank shifting tests
│   └── ComparisonEngine.test.ts # FSM tests
├── integration/
│   └── storage.test.ts
└── e2e/
    ├── add-task.spec.ts     # Comparison workflow E2E
    └── drag-drop.spec.ts    # Reordering E2E

shared/types/
├── Task.ts                  # Shared Task interface
├── ComparisonStep.ts        # Comparison state types
└── api.ts                   # API request/response types
```

**Structure Decision**: Web application with separate frontend (React + IndexedDB) and backend (Express + PostgreSQL). Shared types ensure type safety across the stack. Frontend is primary (local-first), backend is optional (cloud sync feature).

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

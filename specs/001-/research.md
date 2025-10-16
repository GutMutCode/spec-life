# Research: Dynamic Task Priority Manager

**Feature**: 001- | **Date**: 2025-10-15 | **Phase**: 0 (Outline & Research)

## Purpose

This document consolidates research findings for technical decisions required to implement the Dynamic Task Priority Manager. All unknowns from the Technical Context have been resolved through best practices analysis and technology evaluation.

---

## R1: IndexedDB for Local-First Storage

### Decision
Use IndexedDB as the primary client-side storage mechanism for tasks.

### Rationale
- **Native browser support**: Available in all modern browsers without external dependencies
- **Structured storage**: Supports indexes for fast queries by rank, completion status, and creation date
- **Sufficient capacity**: 50MB+ storage quota (well above 100MB constraint for 500 tasks)
- **Async API**: Non-blocking operations prevent UI freezes during reads/writes
- **Transaction support**: ACID guarantees for rank shifting operations (critical for consistency)

### Alternatives Considered
- **localStorage**: Rejected - 5-10MB limit insufficient, synchronous API blocks UI, no indexing
- **WebSQL**: Rejected - Deprecated standard, no future browser support
- **In-memory only**: Rejected - Violates FR-013 (persistence across sessions)

### Implementation Notes
- Use Dexie.js wrapper for simpler IndexedDB API and TypeScript support
- Schema: `tasks` table with indexes on `rank`, `completedAt`, `createdAt`
- Migrations: Support for schema updates (e.g., adding new task fields)

---

## R2: React 18 with TypeScript for Frontend

### Decision
Build frontend using React 18 with TypeScript 5.3+, Vite as build tool.

### Rationale
- **Component architecture**: Natural fit for task list, comparison modal, drag-and-drop UI
- **Concurrent rendering**: React 18 features improve performance for list updates (500 tasks)
- **Type safety**: TypeScript catches errors at compile time, especially for rank calculations
- **Ecosystem**: Rich library support (dnd-kit for drag-and-drop, React Query for state management)
- **Developer experience**: Hot module replacement, fast builds with Vite

### Alternatives Considered
- **Vue 3**: Rejected - Team familiarity with React, smaller drag-and-drop ecosystem
- **Svelte**: Rejected - Smaller ecosystem for IndexedDB wrappers and drag-and-drop libraries
- **Vanilla JS**: Rejected - Managing complex state (comparison workflow, rank shifting) error-prone without framework

### Implementation Notes
- Use React Context + hooks for global task state management
- Consider Zustand for simpler state management if Context becomes complex
- Component structure: Page components → Feature components → UI primitives

---

## R3: dnd-kit for Drag-and-Drop Reordering

### Decision
Use @dnd-kit/sortable for drag-and-drop task reordering (FR-030, FR-031, FR-032).

### Rationale
- **Modern API**: Built for React, supports touch devices (mobile requirement)
- **Performance**: Virtual scrolling support for 500-task lists
- **Accessibility**: Keyboard navigation built-in (WCAG compliance)
- **Flexible**: Supports both vertical reordering and custom drag previews
- **Maintained**: Active development, 15k+ GitHub stars

### Alternatives Considered
- **react-beautiful-dnd**: Rejected - No longer actively maintained, performance issues with large lists
- **react-dnd**: Rejected - Lower-level API requires more boilerplate, touch support requires additional setup
- **Native HTML5 drag**: Rejected - Poor mobile support, requires significant custom code

### Implementation Notes
- Use `SortableContext` wrapper around task list
- Implement `onDragEnd` handler to update ranks in IndexedDB
- Add visual feedback (FR-032): Drop zone indicator, dragged item preview

---

## R4: Express with Node.js for Optional Backend

### Decision
Build optional backend API using Express 4 on Node.js 20 LTS.

### Rationale
- **Shared language**: TypeScript for both frontend and backend reduces context switching
- **Simple deployment**: Lightweight server, easy to host on various platforms
- **JSON handling**: Native JSON support aligns with API contract needs
- **Middleware ecosystem**: Auth (JWT), CORS, request validation readily available
- **Optional architecture**: Backend only needed for cloud sync (FR-018), not MVP blocker

### Alternatives Considered
- **Fastify**: Rejected - Minimal performance benefit for this use case, smaller ecosystem
- **Serverless functions**: Rejected - Overkill for simple CRUD + sync, adds deployment complexity
- **No backend**: Rejected - Violates FR-018 (optional cloud backup requirement)

### Implementation Notes
- Backend is stateless - all state in PostgreSQL or client IndexedDB
- JWT for authentication (simple, stateless, works with optional auth model)
- Endpoints: GET/POST/PUT/DELETE /tasks, POST /auth/login, POST /sync

---

## R5: PostgreSQL for Cloud Backup Storage

### Decision
Use PostgreSQL 15 for optional cloud backup (FR-018, FR-019).

### Rationale
- **Relational model**: Tasks have clear schema (title, description, deadline, rank, timestamps)
- **ACID transactions**: Critical for rank consistency during sync conflicts
- **JSON support**: Can store flexible metadata without schema changes
- **Wide hosting**: Available on all major cloud providers (Heroku, Railway, Supabase)
- **Proven reliability**: Battle-tested for data integrity

### Alternatives Considered
- **MongoDB**: Rejected - Relational structure simpler for this use case, no need for schema flexibility
- **SQLite**: Rejected - File-based, harder to deploy in cloud environment for multi-user sync
- **Firebase**: Rejected - Vendor lock-in, real-time features unnecessary (local-first design)

### Implementation Notes
- Schema: `users` table (id, email, password_hash), `tasks` table (id, user_id, title, description, deadline, rank, completed_at, created_at, updated_at)
- Sync strategy: Last-write-wins for simplicity (single device assumption)
- Index on (user_id, rank) for fast sorted queries

---

## R6: Vitest + Playwright for Testing

### Decision
Use Vitest for unit/integration tests, Playwright for E2E tests.

### Rationale
- **Vitest**: Vite-native, fast (ESM support), Jest-compatible API, built-in TypeScript support
- **Playwright**: Cross-browser testing (Chrome, Firefox, Safari), reliable auto-wait, mobile viewport emulation
- **Coverage**: Vitest provides code coverage reports out-of-box
- **Developer experience**: Hot test reloading (Vitest), headed mode debugging (Playwright)

### Alternatives Considered
- **Jest**: Rejected - Slower than Vitest, requires additional config for ESM/TypeScript
- **Cypress**: Rejected - Heavier than Playwright, slower test execution
- **Testing Library only**: Rejected - Insufficient for E2E workflows (comparison process, drag-and-drop)

### Implementation Notes
- Unit tests: Rank shifting logic, comparison state machine, validation rules
- Integration tests: IndexedDB operations, API endpoints
- E2E tests: Complete user flows (add task with comparison, drag-and-drop, mark complete)
- Target: 80%+ coverage for services, 60%+ for components

---

## R7: Tailwind CSS for Styling

### Decision
Use Tailwind CSS 3 with custom design tokens for styling.

### Rationale
- **Utility-first**: Fast development, no CSS file management overhead
- **Responsive design**: Mobile-first utilities built-in (mobile browser requirement)
- **Design system**: Can define custom colors, spacing for visual differentiation (FR-014)
- **Performance**: PurgeCSS removes unused styles, small bundle size
- **Accessibility**: Includes focus-visible utilities for keyboard navigation

### Alternatives Considered
- **CSS Modules**: Rejected - More boilerplate, harder to maintain consistent spacing/colors
- **Styled Components**: Rejected - Runtime overhead, larger bundle size
- **Plain CSS**: Rejected - Hard to maintain responsive design, no utility classes

### Implementation Notes
- Custom colors: Priority ranks (rank-0: red, rank-1-3: orange, rank-4+: blue), overdue: yellow
- Custom animations: Drag preview, rank shift transitions, comparison modal
- Dark mode: Respect system preference (future enhancement, not MVP)

---

## R8: Rank Shifting Algorithm

### Decision
Implement efficient rank renumbering using array splice and batch update.

### Rationale
- **Simplicity**: Ranks are sequential integers (0, 1, 2, 3...), no complex scoring
- **Consistency**: Array index mapping prevents gaps in ranks
- **Performance**: Batch IndexedDB updates minimize transaction overhead
- **Predictability**: Users see immediate visual feedback (ranks update in UI)

### Algorithm Pseudocode
```
function insertTask(newTask, insertRank):
  1. Fetch all tasks sorted by rank
  2. For each task with rank >= insertRank:
       task.rank += 1
  3. newTask.rank = insertRank
  4. Batch update all affected tasks + new task in IndexedDB transaction
  5. Re-render UI with updated ranks

function moveTask(taskId, oldRank, newRank):
  1. Fetch all tasks sorted by rank
  2. Remove task from oldRank position
  3. If newRank < oldRank:
       For each task with rank in [newRank, oldRank):
         task.rank += 1
  4. Else if newRank > oldRank:
       For each task with rank in (oldRank, newRank]:
         task.rank -= 1
  5. task.rank = newRank
  6. Batch update all affected tasks in IndexedDB transaction
```

### Alternatives Considered
- **Fractional ranks**: Rejected - Complex, requires periodic renumbering, harder to display to users
- **Linked list**: Rejected - No performance benefit with IndexedDB, harder to query by rank range

### Implementation Notes
- Always operate within IndexedDB transaction for atomicity
- Optimistic UI updates: Shift ranks in state immediately, rollback on transaction failure
- Maximum 500 tasks means worst-case shift is O(500), acceptable for <1s target (SC-002)

---

## R9: Comparison Workflow State Machine

### Decision
Implement comparison process as a finite state machine with 5 states.

### Rationale
- **Clarity**: Clear state transitions prevent bugs in multi-step process
- **Testability**: Each state transition can be unit tested independently
- **UX consistency**: State machine ensures comparison never enters invalid state
- **10-step limit**: State tracks comparison count, enforces FR-033

### State Machine Design
```
States:
- IDLE: No comparison in progress
- COMPARING: Showing comparison task, awaiting user choice
- PLACING: User clicked "Skip/Place Here", determining final rank
- COMPLETE: Comparison done, final rank determined
- CANCELLED: User cancelled, discard new task

Transitions:
- IDLE → COMPARING: User submits new task form
- COMPARING → COMPARING: User clicks "More Important" (decrement comparison index) or "Less Important" (increment)
- COMPARING → PLACING: User clicks "Skip/Place Here" or 10 comparisons reached
- COMPARING → CANCELLED: User clicks "Cancel"
- PLACING → COMPLETE: Final rank calculated
- COMPLETE → IDLE: Task inserted, modal closes
- CANCELLED → IDLE: Modal closes without saving
```

### Implementation Notes
- Use XState library for state machine implementation (visual debugging, TypeScript support)
- Store state in React context for access across ComparisonModal components
- Emit analytics events on state transitions (future feature)

---

## R10: 90-Day Retention Cleanup

### Decision
Use periodic background job (daily) to delete completed tasks older than 90 days.

### Rationale
- **Spec requirement**: FR-024 mandates 90-day retention
- **Performance**: Prevents IndexedDB bloat, keeps queries fast
- **User expectation**: Completed tasks are "done" - no expectation of infinite history
- **Implementation simplicity**: Single daily job easier than per-task TTL

### Implementation Approach
```
Daily cleanup job (runs on page load if 24h since last run):
1. Query tasks where completedAt < (now - 90 days)
2. Delete in batches of 100 (prevent long transaction locks)
3. Store last cleanup timestamp in localStorage
4. Optional: Show notification "X old tasks archived"
```

### Alternatives Considered
- **Manual cleanup**: Rejected - Users forget, violates FR-024 automation
- **Per-task TTL**: Rejected - More complex, requires checking every task on every load
- **No cleanup**: Rejected - Violates FR-024

### Implementation Notes
- Run cleanup on app initialization (after IndexedDB opens)
- Add "View Archived Tasks" feature in future (export before deletion)
- Consider moving to backend job if cloud sync implemented

---

## Summary

All technology decisions resolved. Stack:
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + dnd-kit + Dexie.js
- **Backend**: Express 4 + Node.js 20 + PostgreSQL 15 + JWT
- **Testing**: Vitest + Playwright + React Testing Library
- **Key algorithms**: Sequential rank shifting, 5-state comparison FSM, daily 90-day cleanup

Next phase: Generate data model and API contracts based on these decisions.

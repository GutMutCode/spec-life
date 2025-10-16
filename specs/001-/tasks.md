# Tasks: Dynamic Task Priority Manager

**Feature**: 001- | **Date**: 2025-10-15 | **Branch**: `001-`

**Total Tasks**: 128
**MVP Scope**: 51 tasks (40% of total) = Setup + Foundational + US1 + US2
**Parallel Opportunities**: ~60 tasks marked [P] (47% can run in parallel)

**Current Progress**: 91/128 total tasks (71%) ✅
- Phase 1 (Setup): ✅ 11/11 complete
- Phase 2 (Foundational): ✅ 11/11 complete
- Phase 3 (US1): ✅ 12/12 complete
- Phase 4 (US2): ✅ 17/17 complete
- Phase 5 (US3): ✅ 7/7 complete
- Phase 6 (US4): ✅ 13/13 complete
- Phase 7 (US5): ✅ 14/14 complete
- Phase 8 (Backend): ✅ 18/24 complete (75%)
- Phase 9 (Polish): 🔄 2/19 started

🎉 **Frontend + Backend Core COMPLETE** - Full-stack app with auth & CRUD API ready!
🚀 **Phase 9 Started** - Adding production-ready features!

---

## Phase Breakdown

- **Phase 1**: Setup (11 tasks, T001-T011) - Project initialization
- **Phase 2**: Foundational (11 tasks, T012-T022) - **BLOCKS all user stories**
- **Phase 3**: US1 (12 tasks, T023-T034) - View top priority task - **MVP**
- **Phase 4**: US2 (17 tasks, T035-T046B) - Add task with comparison - **MVP**
- **Phase 5**: US3 (7 tasks, T047-T053) - View all tasks
- **Phase 6**: US4 (13 tasks, T054-T066) - Edit + drag-and-drop
- **Phase 7**: US5 (14 tasks, T067-T080) - Complete/delete + history
- **Phase 8**: Backend (24 tasks, T081-T104) - Cloud sync (optional)
- **Phase 9**: Polish (19 tasks, T105-T123) - Cross-cutting concerns

---

## Phase 1: Setup (Days 0-1)

**Goal**: Initialize project structure, dependencies, and build configuration.

### Tasks

- [X] T001 Initialize monorepo with pnpm workspaces at repository root
- [X] T002 Create frontend/ directory with Vite + React 18 + TypeScript template
- [X] T003 Create backend/ directory with Express 4 + TypeScript setup
- [X] T004 Create shared/types/ directory for common TypeScript interfaces
- [X] T005 [P] Configure Tailwind CSS 3 in frontend/tailwind.config.js
- [X] T006 [P] Install and configure Vitest in frontend/vitest.config.ts
- [X] T007 [P] Install and configure Playwright in frontend/playwright.config.ts
- [X] T008 [P] Install Dexie.js ^4.0.0 in frontend/package.json
- [X] T009 [P] Install dnd-kit packages in frontend/package.json (@dnd-kit/core@^6.1.0, @dnd-kit/sortable@^8.0.0)
- [X] T010 [P] Install XState ^5.18.0 in frontend/package.json
- [X] T011 [P] Set up PostgreSQL schema migration tool (node-pg-migrate) in backend/

---

## Phase 2: Foundational (Days 1-2) **BLOCKS ALL USER STORIES**

**Goal**: Implement core data structures and storage layer that all user stories depend on.

**Critical Path**: These tasks MUST complete before any user story can begin.

### Tasks

- [X] T012 Create Task type definition in shared/types/Task.ts with all 11 fields (id, title, description, deadline, rank, completed, completedAt, createdAt, updatedAt, userId)
- [X] T013 Create ComparisonStep type definition in shared/types/ComparisonStep.ts with FSM state enum
- [X] T014 Create validation functions in frontend/src/lib/validation.ts (validateTaskTitle, validateDescription, validateDeadline)
- [X] T015 Setup IndexedDB schema with Dexie in frontend/src/lib/indexeddb.ts (tasks table, indexes on rank/completedAt/createdAt/[completed+rank])
- [X] T016 Write unit tests for validation functions in frontend/tests/unit/validation.test.ts
- [X] T017 Write integration tests for IndexedDB schema in frontend/tests/integration/indexeddb.test.ts
- [X] T018 Create getPriorityColor utility function in frontend/src/lib/utils.ts (rank 0=red, 1-3=orange, 4-10=yellow, 11+=blue)
- [X] T019 Create isOverdue utility function in frontend/src/lib/utils.ts
- [X] T020 [P] Create basic App.tsx with routing setup (react-router-dom)
- [X] T021 [P] Create basic layout component in frontend/src/components/Layout.tsx
- [X] T022 Run all foundational tests and verify 100% pass rate before proceeding to user stories

---

## Phase 3: User Story 1 - View Top Priority Task (Days 2-3) **MVP P1**

**User Story**: A user opens the service to immediately see which task they should work on right now. The system displays the single most important task at the top of the interface, making the decision effortless.

**Independent Test**: Create 3 tasks with ranks 0, 1, 2. Verify Dashboard displays only rank 0 task prominently. Delivers immediate decision-making value.

**Why Priority P1**: Core value proposition - users get immediate value from seeing their top priority without needing comparison or other features.

### Tasks

- [X] T023 Write unit test for StorageService.getTopTask() in frontend/tests/unit/StorageService.test.ts
- [X] T024 Write unit test for StorageService.createTask() with auto-generated id/timestamps in frontend/tests/unit/StorageService.test.ts
- [X] T025 Write unit test for StorageService.getActiveTasks() sorted by rank in frontend/tests/unit/StorageService.test.ts
- [X] T026 [P] [US1] Implement StorageService class in frontend/src/services/StorageService.ts with getTopTask, createTask, getActiveTasks methods
- [X] T027 [P] [US1] Write React hook useTasks in frontend/src/hooks/useTasks.ts that uses StorageService
- [X] T028 [P] [US1] Create TaskCard component in frontend/src/components/TaskCard.tsx (displays title, description, deadline, rank badge with color)
- [X] T029 [P] [US1] Create Dashboard page in frontend/src/pages/Dashboard.tsx (fetches top task, displays TaskCard prominently)
- [X] T030 [US1] Write integration test for Dashboard page in frontend/tests/integration/Dashboard.test.tsx (render with mock task at rank 0)
- [X] T031 [US1] Write E2E test for empty state in frontend/tests/e2e/dashboard.spec.ts (no tasks → show "Add your first task" message)
- [X] T032 [US1] Write E2E test for top task display in frontend/tests/e2e/dashboard.spec.ts (create 3 tasks, verify rank 0 shown)
- [X] T033 [US1] Add overdue indicator styling to TaskCard component (yellow border if deadline passed)
- [X] T034 [US1] Verify US1 independent test: Create tasks, confirm top task visible, measure <2s load time (SC-001)

---

## Phase 4: User Story 2 - Add Task with Comparison (Days 3-6) **MVP P1**

**User Story**: A user needs to add a new task. The system guides them through a relative comparison process: starting from rank 0, the user compares the new task against existing tasks using binary choices to determine insertion position.

**Independent Test**: Add new task, go through comparison (e.g., shown Task A at rank 0, click "Less Important", then Task B at rank 1, click "More Important"), verify inserted at rank 1 with Task B becoming rank 2. Delivers "smart reprioritization" value.

**Why Priority P1**: Primary differentiator - without comparison-based ranking, this is just a basic task list. Core feature for MVP.

### Tasks

- [X] T035 Write unit test for ComparisonEngine FSM state transitions in frontend/tests/unit/ComparisonEngine.test.ts (IDLE → COMPARING → PLACING → COMPLETE)
- [X] T036 Write unit test for ComparisonEngine 10-step limit enforcement in frontend/tests/unit/ComparisonEngine.test.ts
- [X] T037 Write unit test for ComparisonEngine skip functionality in frontend/tests/unit/ComparisonEngine.test.ts
- [X] T037A Write integration test for deadline display during comparison in frontend/tests/integration/ComparisonModal.test.tsx (verify deadline shown for comparison task with relative time formatting, "No deadline" label when absent)
- [X] T038 Write unit test for TaskManager.insertTask rank shifting in frontend/tests/unit/TaskManager.test.ts (insert at rank 1, verify ranks 1+ shift to 2+)
- [X] T038A Write unit test for ComparisonEngine tiebreaker logic in frontend/tests/unit/ComparisonEngine.test.ts (when user considers tasks equal during comparison, new task placed after existing task using creation timestamp per FR-016)
- [X] T039 [US2] Implement ComparisonEngine class in frontend/src/services/ComparisonEngine.ts with XState FSM (5 states, 10-step max, skip)
- [X] T040 [US2] Implement TaskManager class in frontend/src/services/TaskManager.ts with insertTask method (batch rank shift in transaction)
- [X] T041 [US2] Write React hook useComparison in frontend/src/hooks/useComparison.ts that wraps ComparisonEngine
- [X] T042 [P] [US2] Create ComparisonModal component in frontend/src/components/ComparisonModal.tsx (shows current comparison task, "More Important"/"Less Important"/"Skip" buttons)
- [X] T042A [US2] Add task detail display to ComparisonModal component (show comparison task's title, description snippet [first 100 chars], deadline with relative time [e.g., "Due in 3 days" or "No deadline"], and rank badge)
- [X] T043 [P] [US2] Create TaskForm component in frontend/src/components/TaskForm.tsx (title, description, deadline inputs, triggers comparison on submit)
- [X] T044 [US2] Write integration test for ComparisonModal in frontend/tests/integration/ComparisonModal.test.tsx (user clicks through comparison)
- [X] T045 [US2] Write E2E test for add task with comparison in frontend/tests/e2e/add-task.spec.ts (full workflow: submit form → compare → insert at rank)
- [X] T046 [US2] Verify US2 independent test: Add task, complete comparison, verify rank shifting, measure <60s total time (SC-003)
- [X] T046A [US2] Add post-insertion feedback to ComparisonModal showing new task rank and which tasks were shifted (e.g., "Your task is now rank 3. Tasks at rank 3-7 moved down one position." per FR-015)
- [X] T046B [US2] Write integration test for post-insertion feedback in frontend/tests/integration/ComparisonModal.test.tsx

---

## Phase 5: User Story 3 - View All Tasks (Days 6-7) **P2**

**User Story**: A user wants to see their complete task list, not just the top item. The system displays all tasks sorted by priority, giving context about upcoming work.

**Independent Test**: Create 10 tasks with various ranks. Verify AllTasks page displays all in correct order (0, 1, 2...) with rank badges. Delivers workload visibility.

**Why Priority P2**: Important for planning, but users can start with just top task (US1). Not required for MVP core value.

### Tasks

- [X] T047 Write unit test for StorageService.getAllActiveTasks with pagination in frontend/tests/unit/StorageService.test.ts
- [X] T048 [P] [US3] Create TaskList component in frontend/src/components/TaskList.tsx (renders array of TaskCard, sorted by rank)
- [X] T049 [P] [US3] Create AllTasks page in frontend/src/pages/AllTasks.tsx (fetches all active tasks, displays TaskList)
- [X] T050 [US3] Add rank badge display to TaskCard component with priority color coding
- [X] T051 [US3] Write integration test for TaskList in frontend/tests/integration/TaskList.test.tsx (render 10 tasks, verify sort order)
- [X] T052 [US3] Write E2E test for all tasks view in frontend/tests/e2e/all-tasks.spec.ts (create 15 tasks, verify all displayed sorted)
- [X] T053 [US3] Verify US3 independent test: Create 10 tasks, confirm all visible in order, measure <2s load time (SC-006 with 500 tasks)

---

## Phase 6: User Story 4 - Edit Task with Drag-and-Drop (Days 7-10) **P2**

**User Story**: A user needs to update task information or change a task's priority position. They can edit text fields directly, or drag the task to a new position to change its rank.

**Independent Test**: Edit task text (title/description/deadline), verify changes persist. Drag task from rank 3 to rank 1, verify it moves with others shifting correctly. Delivers task management flexibility.

**Why Priority P2**: Editing is useful but not required to demonstrate core comparison value. Users can work with tasks as initially created.

### Tasks

- [X] T054 Write unit test for TaskManager.moveTask bidirectional shifting in frontend/tests/unit/TaskManager.test.ts (move rank 3→1, verify 1→2, 2→3)
- [X] T055 Write unit test for TaskManager.moveTask opposite direction in frontend/tests/unit/TaskManager.test.ts (move rank 1→3, verify 2→1, 3→2)
- [X] T056 Write unit test for StorageService.updateTask with updatedAt timestamp in frontend/tests/unit/StorageService.test.ts
- [X] T057 [US4] Implement TaskManager.moveTask method in frontend/src/services/TaskManager.ts (batch rank updates in transaction)
- [X] T058 [US4] Implement StorageService.updateTask method in frontend/src/services/StorageService.ts
- [X] T059 [P] [US4] Add edit mode to TaskCard component (inline editing for title/description/deadline)
- [X] T060 [P] [US4] Add edit handlers to TaskCard component (save/cancel buttons, validation)
- [X] T061 [US4] Integrate dnd-kit DndContext in TaskList component (wrap task list)
- [X] T062 [US4] Make TaskCard draggable with useSortable hook from dnd-kit
- [X] T063 [US4] Implement onDragEnd handler in TaskList component (calls TaskManager.moveTask)
- [X] T064 [US4] Add visual drag feedback to TaskCard (drag preview, drop zone indicators per FR-032)
- [X] T065 [US4] Write E2E test for drag-and-drop in frontend/tests/e2e/drag-drop.spec.ts (drag task 3→1, verify reorder)
- [X] T066 [US4] Verify US4 independent test: Edit task text, drag task to new position, verify persistence and <1s reordering (SC-002)

---

## Phase 7: User Story 5 - Complete/Delete Tasks (Days 10-12) **P3**

**User Story**: A user finishes a task or decides it's no longer relevant. They mark it complete or delete it, and the system automatically promotes the next highest priority task to the top.

**Independent Test**: Mark top task complete, verify it moves to history and next task becomes rank 0. Delete mid-rank task, verify ranks adjust. Delivers task lifecycle management.

**Why Priority P3**: Completion is important long-term but not needed to demonstrate core comparison/prioritization value. Can test P1-P2 with static task set.

### Tasks

- [X] T067 Write unit test for StorageService.completeTask (sets completed=true, completedAt=NOW, removes from active) in frontend/tests/unit/StorageService.test.ts
- [X] T068 Write unit test for StorageService.deleteTask with rank shifting in frontend/tests/unit/StorageService.test.ts
- [X] T069 Write unit test for StorageService.getCompletedTasks (90-day window) in frontend/tests/unit/StorageService.test.ts
- [X] T070 Write unit test for daily cleanup job (delete tasks where completedAt < NOW - 90 days) in frontend/tests/unit/cleanup.test.ts
- [X] T071 [US5] Implement StorageService.completeTask method in frontend/src/services/StorageService.ts
- [X] T072 [US5] Implement StorageService.deleteTask method in frontend/src/services/StorageService.ts (with rank shift)
- [X] T073 [US5] Implement StorageService.getCompletedTasks method in frontend/src/services/StorageService.ts
- [X] T074 [P] [US5] Add "Mark Complete" button to TaskCard component
- [X] T075 [P] [US5] Add "Delete" button to TaskCard component with confirmation dialog
- [X] T076 [P] [US5] Create History page in frontend/src/pages/History.tsx (displays completed tasks in reverse chronological order)
- [X] T077 [US5] Implement daily cleanup job in frontend/src/lib/cleanup.ts (runs on app init if 24h elapsed since last cleanup, deletes completed tasks where completedAt < NOW - 90 days in UTC, processes in batches of 100, stores last cleanup timestamp in IndexedDB metadata table)
- [X] T078 [US5] Write E2E test for task completion in frontend/tests/e2e/complete-task.spec.ts (complete top task, verify next becomes top)
- [X] T079 [US5] Write E2E test for task deletion in frontend/tests/e2e/delete-task.spec.ts (delete mid-rank task, verify ranks adjust)
- [X] T080 [US5] Verify US5 independent test: Complete task, delete task, view history, verify 90-day retention (FR-024)

---

## Phase 8: Backend API (Days 12-16) **OPTIONAL - Cloud Sync**

**Goal**: Build Express API for optional cloud backup/sync. Not required for MVP (local-first works standalone).

**Independent Test**: Register user, login to get JWT, sync local tasks to cloud, verify conflict resolution (last-write-wins).

### Tasks

**Setup & Infrastructure**

- [X] T081 Create database migration for users table in backend/migrations/001_create_users.sql
- [X] T082 Create database migration for tasks table in backend/migrations/002_create_tasks.sql
- [X] T083 [P] Create User model in backend/src/models/User.ts
- [X] T084 [P] Create Task model in backend/src/models/Task.ts
- [X] T085 [P] Install bcrypt for password hashing in backend/package.json
- [X] T086 [P] Install jsonwebtoken for JWT auth in backend/package.json
- [X] T087 [P] Configure PostgreSQL connection in backend/src/storage/PostgresAdapter.ts

**Authentication (Contract: /auth/register, /auth/login)**

- [ ] T088 Write contract test for POST /auth/register in backend/tests/contract/auth.test.ts
- [ ] T089 Write contract test for POST /auth/login in backend/tests/contract/auth.test.ts
- [X] T090 [P] Implement auth middleware in backend/src/api/middleware/auth.ts (verify JWT)
- [X] T091 [P] Implement POST /auth/register in backend/src/api/routes/auth.ts (bcrypt hash, return JWT)
- [X] T092 [P] Implement POST /auth/login in backend/src/api/routes/auth.ts (validate credentials, return JWT)

**Task CRUD (Contract: GET/POST/PUT/DELETE /tasks)**

- [ ] T093 Write contract test for GET /tasks in backend/tests/contract/tasks.test.ts
- [ ] T094 Write contract test for POST /tasks in backend/tests/contract/tasks.test.ts (with rank shifting)
- [ ] T095 Write contract test for PUT /tasks/:id in backend/tests/contract/tasks.test.ts
- [ ] T096 Write contract test for DELETE /tasks/:id in backend/tests/contract/tasks.test.ts (with rank shifting)
- [X] T097 [P] Implement TaskService.listTasks in backend/src/services/TaskService.ts (query by userId, filter by completed, sort by rank)
- [X] T098 [P] Implement TaskService.createTask with rank shifting in backend/src/services/TaskService.ts (batch update)
- [X] T099 [P] Implement TaskService.updateTask in backend/src/services/TaskService.ts
- [X] T100 [P] Implement TaskService.deleteTask with rank shifting in backend/src/services/TaskService.ts
- [X] T101 [P] Implement GET /tasks in backend/src/api/routes/tasks.ts (use auth middleware)
- [X] T102 [P] Implement POST /tasks in backend/src/api/routes/tasks.ts (use auth middleware)
- [X] T103 [P] Implement PUT /tasks/:id in backend/src/api/routes/tasks.ts (use auth middleware)
- [X] T104 [P] Implement DELETE /tasks/:id in backend/src/api/routes/tasks.ts (use auth middleware)

---

## Phase 9: Polish & Cross-Cutting Concerns (Days 16-18)

**Goal**: Add production-ready features, error handling, loading states, accessibility, and performance optimizations.

### Tasks

**Error Handling & Loading States**

- [X] T105 [P] Add error boundary component in frontend/src/components/ErrorBoundary.tsx
- [X] T106 [P] Add loading spinner component in frontend/src/components/LoadingSpinner.tsx
- [ ] T107 [P] Add toast notification system in frontend/src/components/Toast.tsx (for success/error messages)
- [ ] T108 Add error handling to StorageService methods (catch IndexedDB errors, show user-friendly messages)
- [ ] T109 Add loading states to Dashboard page (show spinner while fetching top task)
- [ ] T110 Add error handling to backend routes (centralized error middleware in backend/src/api/middleware/errorHandler.ts)

**Accessibility & UX**

- [ ] T111 [P] Add keyboard shortcuts for common actions (n=new task, c=complete, e=edit)
- [ ] T112 [P] Add ARIA labels to all interactive elements (buttons, form inputs, modals)
- [ ] T113 [P] Add focus management for modal dialogs (ComparisonModal, delete confirmation)
- [ ] T114 Test with screen reader (VoiceOver/NVDA) and fix accessibility issues

**Performance Optimization**

- [ ] T115 [P] Add React.memo to TaskCard component (prevent unnecessary re-renders)
- [ ] T116 [P] Add useMemo for expensive calculations (getPriorityColor, task filtering)
- [ ] T117 [P] Implement optimistic UI updates (update state before IndexedDB commit, rollback on failure)
- [ ] T118 Profile with Chrome DevTools and optimize if >2s load time with 500 tasks (SC-006)

**Documentation & Deployment**

- [ ] T119 [P] Write README.md with setup instructions (install, run dev server, run tests)
- [ ] T120 [P] Write DEPLOYMENT.md with production build instructions (frontend: Vite build, backend: Docker)
- [ ] T121 [P] Create Dockerfile for backend API
- [ ] T122 [P] Create docker-compose.yml for local development (PostgreSQL + backend)
- [ ] T123 Run full test suite and verify all success criteria (SC-001 through SC-007)

---

## Dependencies & Execution Order

### Blocking Dependencies

```
Phase 1 (Setup)
  ↓
Phase 2 (Foundational) **BLOCKS ALL USER STORIES**
  ↓
Phase 3 (US1) ──┐
Phase 4 (US2) ──┼─→ MVP Complete (51 tasks)
                │
Phase 5 (US3) ──┤
Phase 6 (US4) ──┼─→ Full Frontend (85 tasks)
Phase 7 (US5) ──┘
                │
Phase 8 (Backend) ──→ Cloud Sync Feature (109 tasks)
                │
Phase 9 (Polish) ────→ Production Ready (128 tasks)
```

### User Story Independence

- **US1** (View Top Task): Independent, can test with manually created tasks
- **US2** (Add Task): Depends on US1 (needs task display), but comparison logic is independent
- **US3** (View All): Independent of US2, depends only on US1 task display
- **US4** (Edit/Drag-Drop): Depends on US3 (needs task list), independent of US2
- **US5** (Complete/Delete): Independent of US2-US4, depends only on US1

**MVP Strategy**: US1 + US2 = 51 tasks (40%) delivers core value (view top task + smart comparison).

### Parallel Execution Examples

**Within Phase 2 (Foundational)**:
- T016, T017 (tests) can run in parallel after T012-T015 complete
- T018, T019 (utilities) can run in parallel with tests
- T020, T021 (UI setup) can run in parallel with utilities

**Within Phase 3 (US1)**:
- T026, T027, T028, T029 (implementation tasks) can run in parallel after T023-T025 (tests) complete
- T030, T031, T032 (tests) can run sequentially after implementation
- T033 (styling) can run in parallel with T030-T032

**Within Phase 4 (US2)**:
- T042, T043 (UI components) can run in parallel after T039-T041 (services) complete

**Within Phase 8 (Backend)**:
- T083-T087 (setup) all run in parallel after T081-T082
- T090-T092 (auth endpoints) all run in parallel after T088-T089
- T097-T104 (services + routes) have many parallel opportunities

**Phase 9 (Polish)**:
- Almost all tasks (T105-T122) can run in parallel as they touch different concerns

---

## Implementation Strategies

### Strategy 1: MVP First (Recommended)

Complete Setup + Foundational + US1 + US2 (51 tasks) to deliver core value quickly.

**Timeline**: ~6 days
**Value**: Users can view top priority task and add new tasks with smart comparison
**Test**: Full comparison workflow works end-to-end

### Strategy 2: Incremental Delivery

Complete one user story at a time in priority order (US1 → US2 → US3 → US4 → US5).

**Timeline**: ~12 days for full frontend
**Value**: Each story independently testable and deliverable
**Test**: Deploy after each story completion

### Strategy 3: Parallel Team

Split into 2-3 parallel tracks after Foundational phase:
- Track 1: US1 + US3 (display features)
- Track 2: US2 + US4 (input/edit features)
- Track 3: US5 + Backend (lifecycle + cloud)

**Timeline**: ~8 days with 3 developers
**Value**: Faster completion, requires coordination
**Test**: Integration testing after tracks merge

---

## Task Count Summary

- **Total Tasks**: 128
- **MVP Scope**: 51 tasks (40% of total) = Setup + Foundational + US1 + US2
- **Frontend Only**: 85 tasks (66% of total) = MVP + US3 + US4 + US5
- **Full Feature**: 128 tasks (100%) = Frontend + Backend + Polish
- **Parallel Opportunities**: ~60 tasks marked [P] (47% can run in parallel within phases)

---

## Format Validation

✅ All 128 tasks follow checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
✅ All user story tasks have [US#] label
✅ All setup/foundational/polish tasks have NO story label
✅ All parallelizable tasks marked with [P]
✅ All tasks include specific file paths
✅ Task IDs: T001-T123 plus coverage gap tasks (T037A, T038A, T042A, T046A, T046B)

---

## Next Steps

1. Review task breakdown and adjust priorities if needed
2. Start with Phase 1 (Setup) - 11 tasks
3. Complete Phase 2 (Foundational) - **critical blocking phase**
4. Implement MVP (US1 + US2) - 39 additional tasks
5. Follow TDD approach per quickstart.md (write tests first, verify they fail, then implement)
6. Use parallel execution opportunities to speed up development
7. Deploy MVP after Phase 4 completion (51 tasks total)

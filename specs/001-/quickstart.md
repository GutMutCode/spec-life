# Quickstart: Dynamic Task Priority Manager

**Feature**: 001- | **Date**: 2025-10-15 | **Phase**: 1 (Design & Contracts)

## Overview

This guide provides developers with the essential information to implement the Dynamic Task Priority Manager using a Test-Driven Development (TDD) approach.

---

## Prerequisites

**Development Environment**:
- Node.js 20 LTS
- TypeScript 5.3+
- Git

**Required Knowledge**:
- TypeScript/JavaScript fundamentals
- React 18 hooks and context
- IndexedDB concepts (or willingness to learn Dexie.js wrapper)
- Express.js routing (for backend)
- REST API design
- TDD principles (red-green-refactor)

**Tools**:
- VS Code (recommended) or preferred editor
- Chrome DevTools (for IndexedDB inspection)
- Postman/Insomnia (for API testing)

---

## Tech Stack Summary

**Frontend**:
- React 18 (UI framework)
- TypeScript 5.3+ (type safety)
- Vite (build tool)
- Tailwind CSS 3 (styling)
- Dexie.js (IndexedDB wrapper)
- @dnd-kit/sortable (drag-and-drop)
- XState (comparison FSM)
- Vitest + React Testing Library (unit/integration tests)
- Playwright (E2E tests)

**Backend** (optional, for cloud sync):
- Express 4 (API server)
- Node.js 20 LTS
- PostgreSQL 15 (database)
- JWT (authentication)
- Vitest (tests)

**Shared**:
- TypeScript types (frontend + backend)

---

## Project Structure

```
/backend
  /src
    /models       - Task.ts, User.ts
    /services     - TaskService.ts, SyncService.ts
    /storage      - PostgresAdapter.ts
    /api
      /routes     - tasks.ts, auth.ts, sync.ts
      /middleware - auth.ts, errorHandler.ts
    server.ts
  /tests
    /unit, /integration, /contract

/frontend
  /src
    /components   - TaskList.tsx, ComparisonModal.tsx, TaskCard.tsx, TaskForm.tsx
    /services     - StorageService.ts, TaskManager.ts, ComparisonEngine.ts, SyncManager.ts
    /hooks        - useTasks.ts, useComparison.ts, useSync.ts
    /pages        - Dashboard.tsx, AllTasks.tsx, History.tsx
    /lib          - indexeddb.ts, validation.ts
    App.tsx
  /tests
    /unit, /integration, /e2e

/shared
  /types          - Task.ts, ComparisonStep.ts, api.ts
```

---

## Implementation Phases

### Phase 1: Core Data Model (Days 1-2)

**Goal**: Define Task entity with validation

**TDD Cycle**:
1. Write test for Task validation (title required, 1-200 chars)
2. Implement validation logic
3. Write test for rank uniqueness constraint
4. Implement rank management

**Key Files**:
- `shared/types/Task.ts` - Task interface
- `frontend/src/lib/validation.ts` - Validation functions
- `frontend/tests/unit/validation.test.ts` - Validation tests

**Example Test**:
```typescript
describe('Task validation', () => {
  it('should reject empty title', () => {
    const task = { title: '   ', rank: 0, completed: false };
    expect(() => validateTask(task)).toThrow('Title must not be empty');
  });

  it('should accept valid task', () => {
    const task = { title: 'Buy groceries', rank: 0, completed: false };
    expect(() => validateTask(task)).not.toThrow();
  });
});
```

---

### Phase 2: IndexedDB Storage (Days 2-3)

**Goal**: Implement StorageService for task persistence

**TDD Cycle**:
1. Write test for createTask (insert and auto-generate id, timestamps)
2. Implement Dexie.js schema and createTask method
3. Write test for getActiveTasks (sorted by rank)
4. Implement compound index query

**Key Files**:
- `frontend/src/lib/indexeddb.ts` - Dexie schema
- `frontend/src/services/StorageService.ts` - CRUD operations
- `frontend/tests/integration/storage.test.ts` - Storage tests

**Example Test**:
```typescript
describe('StorageService', () => {
  let storage: StorageService;

  beforeEach(async () => {
    storage = new StorageService();
    await storage.clear(); // Clean slate for each test
  });

  it('should create task with auto-generated id and timestamps', async () => {
    const task = await storage.createTask({
      title: 'Test task',
      rank: 0,
      completed: false
    });

    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
    expect(task.updatedAt).toBeDefined();
  });

  it('should fetch active tasks sorted by rank', async () => {
    await storage.createTask({ title: 'A', rank: 0, completed: false });
    await storage.createTask({ title: 'B', rank: 1, completed: false });
    await storage.createTask({ title: 'C', rank: 2, completed: true });

    const tasks = await storage.getActiveTasks();
    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toBe('A');
    expect(tasks[1].title).toBe('B');
  });
});
```

---

### Phase 3: Rank Shifting Logic (Days 3-4)

**Goal**: Implement TaskManager with rank shifting algorithm

**TDD Cycle**:
1. Write test for insertTask (shifts existing tasks)
2. Implement batch rank update in transaction
3. Write test for moveTask (drag-and-drop)
4. Implement bidirectional shift logic

**Key Files**:
- `frontend/src/services/TaskManager.ts` - Rank operations
- `frontend/tests/unit/TaskManager.test.ts` - Algorithm tests

**Example Test**:
```typescript
describe('TaskManager.insertTask', () => {
  it('should shift ranks when inserting at rank 1', async () => {
    await storage.createTask({ title: 'A', rank: 0, completed: false });
    await storage.createTask({ title: 'B', rank: 1, completed: false });
    await storage.createTask({ title: 'C', rank: 2, completed: false });

    await taskManager.insertTask({ title: 'NEW', rank: 1, completed: false });

    const tasks = await storage.getActiveTasks();
    expect(tasks.map(t => ({ title: t.title, rank: t.rank }))).toEqual([
      { title: 'A', rank: 0 },
      { title: 'NEW', rank: 1 },
      { title: 'B', rank: 2 }, // Shifted from 1
      { title: 'C', rank: 3 }, // Shifted from 2
    ]);
  });
});
```

**Algorithm Reference**: See research.md R8 for pseudocode

---

### Phase 4: Comparison UI (Days 4-6)

**Goal**: Implement ComparisonEngine FSM and ComparisonModal

**TDD Cycle**:
1. Write test for FSM state transitions (IDLE → COMPARING → PLACING → COMPLETE)
2. Implement XState machine
3. Write test for 10-step limit enforcement
4. Implement skip logic
5. Build ComparisonModal component (tested with React Testing Library)

**Key Files**:
- `frontend/src/services/ComparisonEngine.ts` - FSM logic
- `frontend/src/components/ComparisonModal.tsx` - UI component
- `frontend/tests/unit/ComparisonEngine.test.ts` - FSM tests
- `frontend/tests/integration/comparison.test.tsx` - UI tests

**Example Test**:
```typescript
describe('ComparisonEngine', () => {
  it('should transition from IDLE to COMPARING when starting comparison', () => {
    const engine = new ComparisonEngine();
    engine.start({ title: 'New task', rank: 0 });
    expect(engine.state).toBe('COMPARING');
    expect(engine.comparisonIndex).toBe(0);
  });

  it('should enforce 10-step limit', () => {
    const engine = new ComparisonEngine();
    engine.start({ title: 'New task', rank: 0 });

    for (let i = 0; i < 10; i++) {
      engine.chooseLessImportant();
    }

    expect(engine.state).toBe('PLACING');
    expect(engine.determinedRank).toBe(10);
  });
});
```

**State Machine Reference**: See research.md R9 for FSM diagram

---

### Phase 5: Drag-and-Drop (Days 6-7)

**Goal**: Integrate dnd-kit for manual reordering

**TDD Cycle**:
1. Write E2E test for drag task from rank 3 to rank 1
2. Implement DndContext and SortableContext wrappers
3. Write test for visual feedback during drag
4. Implement drag preview and drop zone indicators

**Key Files**:
- `frontend/src/components/TaskList.tsx` - DndContext integration
- `frontend/src/components/TaskCard.tsx` - useSortable hook
- `frontend/tests/e2e/drag-drop.spec.ts` - E2E tests

**Example E2E Test** (Playwright):
```typescript
test('should reorder task via drag-and-drop', async ({ page }) => {
  await page.goto('/');

  // Setup: Create 3 tasks
  await createTask(page, 'Task A', 0);
  await createTask(page, 'Task B', 1);
  await createTask(page, 'Task C', 2);

  // Drag Task C (rank 2) to rank 0 position
  const taskC = page.locator('[data-testid="task-2"]');
  const taskA = page.locator('[data-testid="task-0"]');
  await taskC.dragTo(taskA);

  // Verify new order: C (0), A (1), B (2)
  const tasks = page.locator('[data-testid^="task-"]');
  await expect(tasks.nth(0)).toContainText('Task C');
  await expect(tasks.nth(1)).toContainText('Task A');
  await expect(tasks.nth(2)).toContainText('Task B');
});
```

---

### Phase 6: Backend API (Days 8-9)

**Goal**: Build Express API for cloud sync (optional feature)

**TDD Cycle**:
1. Write contract test for POST /auth/register
2. Implement registration endpoint with bcrypt
3. Write test for JWT authentication middleware
4. Implement auth middleware
5. Write test for POST /sync (last-write-wins)
6. Implement sync logic

**Key Files**:
- `backend/src/api/routes/auth.ts` - Auth endpoints
- `backend/src/api/routes/sync.ts` - Sync endpoint
- `backend/src/services/SyncService.ts` - Conflict resolution
- `backend/tests/contract/api-contract.test.ts` - Contract tests

**Example Contract Test**:
```typescript
describe('POST /auth/register', () => {
  it('should create user and return JWT', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'user@test.com', password: 'SecurePass123' })
      .expect(201);

    expect(response.body.token).toBeDefined();
    expect(response.body.userId).toBeDefined();
    expect(response.body.email).toBe('user@test.com');
  });

  it('should reject duplicate email', async () => {
    await registerUser('user@test.com', 'password123');

    await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'user@test.com', password: 'password456' })
      .expect(409);
  });
});
```

**API Contract Reference**: See contracts/api.yaml for OpenAPI spec

---

## Key Algorithms

### Rank Shifting (Insert)

```typescript
async insertTask(newTask: Partial<Task>, insertRank: number): Promise<Task> {
  return await this.db.transaction('rw', this.db.tasks, async () => {
    // Fetch all tasks with rank >= insertRank
    const tasksToShift = await this.db.tasks
      .where('rank')
      .aboveOrEqual(insertRank)
      .toArray();

    // Shift all affected tasks down by 1
    const updates = tasksToShift.map(task => ({
      ...task,
      rank: task.rank + 1,
      updatedAt: new Date().toISOString()
    }));

    await this.db.tasks.bulkPut(updates);

    // Insert new task at specified rank
    const task = {
      ...newTask,
      id: uuid(),
      rank: insertRank,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.db.tasks.add(task);
    return task;
  });
}
```

### Comparison State Machine (Simplified)

```typescript
class ComparisonEngine {
  state: ComparisonState = 'IDLE';
  comparisonIndex = 0;
  maxComparisons = 10;

  chooseLessImportant() {
    if (this.state !== 'COMPARING') return;

    this.comparisonIndex++;

    if (this.comparisonIndex >= this.maxComparisons) {
      this.state = 'PLACING';
      this.determinedRank = this.comparisonIndex;
    }
  }

  chooseMoreImportant() {
    if (this.state !== 'COMPARING') return;

    this.state = 'PLACING';
    this.determinedRank = this.comparisonIndex;
  }

  skip() {
    if (this.state !== 'COMPARING') return;

    this.state = 'PLACING';
    this.determinedRank = this.comparisonIndex;
  }
}
```

---

## Testing Strategy

### Unit Tests (Vitest)
- **Target**: 80%+ coverage for services
- **Focus**: Business logic (rank shifting, validation, FSM)
- **Run**: `npm run test:unit`

### Integration Tests (Vitest + Testing Library)
- **Target**: 60%+ coverage for components
- **Focus**: Component interaction with services (storage, comparison)
- **Run**: `npm run test:integration`

### E2E Tests (Playwright)
- **Target**: Critical user flows
- **Focus**: Add task with comparison, drag-and-drop, mark complete
- **Run**: `npm run test:e2e`

### Contract Tests (Vitest + Supertest)
- **Target**: 100% API endpoint coverage
- **Focus**: Request/response validation, auth, sync
- **Run**: `npm run test:contract`

---

## Performance Targets

Based on spec success criteria:

- **SC-001**: Top task visible in <2s (initial load)
- **SC-002**: Reprioritization completes in <1s (rank shift)
- **SC-003**: Task addition (with comparison) in <60s
- **SC-006**: Responsive with 500 tasks (<2s load)

**Optimization Tips**:
- Use IndexedDB compound indexes for active task queries
- Implement optimistic UI updates (update state before DB commit)
- Batch rank updates in single transaction
- Use `requestIdleCallback` for 90-day cleanup
- Consider virtual scrolling (react-window) if >500 tasks

---

## Common Pitfalls

1. **Rank gaps**: Always renumber ranks sequentially (0, 1, 2...), never skip
2. **Race conditions**: Use IndexedDB transactions for atomic rank shifts
3. **Comparison state leaks**: Always reset FSM to IDLE after complete/cancel
4. **Completed tasks**: Exclude from rank queries (use compound index [completed, rank])
5. **Timestamp consistency**: Always set updatedAt on any field change

---

## Next Steps

1. Run `/speckit.tasks` to generate detailed task breakdown
2. Start with Phase 1 (Core Data Model) - write tests first
3. Follow red-green-refactor TDD cycle for each phase
4. Verify performance targets with Chrome DevTools Performance tab
5. Deploy MVP (frontend only, local-first) before building backend

---

## References

- **Spec**: [spec.md](spec.md) - Full feature requirements
- **Research**: [research.md](research.md) - Technology decisions
- **Data Model**: [data-model.md](data-model.md) - Entity definitions
- **API Contract**: [contracts/api.yaml](contracts/api.yaml) - OpenAPI spec
- **Plan**: [plan.md](plan.md) - Implementation plan

For questions or clarifications, refer to spec.md clarifications section or run `/speckit.clarify`.

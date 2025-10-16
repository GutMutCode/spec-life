# Data Model: Dynamic Task Priority Manager

**Feature**: 001- | **Date**: 2025-10-15 | **Phase**: 1 (Design & Contracts)

## Overview

This document defines the data entities, their attributes, relationships, validation rules, and state transitions for the Dynamic Task Priority Manager.

---

## Entity: Task

### Description
Represents a single work item with a relative priority rank determined through comparison.

### Attributes

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID (string) | Yes | Unique, immutable | Primary identifier |
| `title` | string | Yes | 1-200 chars, non-empty after trim | Task name displayed to user |
| `description` | string | No | 0-2000 chars | Optional detailed description |
| `deadline` | ISO 8601 datetime | No | Must be future or null | Optional deadline for task completion |
| `rank` | integer | Yes | >= 0, unique per user | Priority rank (0 = highest priority) |
| `completed` | boolean | Yes | true/false | Whether task is marked complete |
| `completedAt` | ISO 8601 datetime | No | Set when completed = true, null otherwise | Timestamp of completion |
| `createdAt` | ISO 8601 datetime | Yes | Auto-set on creation, immutable | Task creation timestamp |
| `updatedAt` | ISO 8601 datetime | Yes | Auto-updated on any field change | Last modification timestamp |
| `userId` | UUID (string) | Yes (cloud), No (local) | Foreign key to User entity | Owner of the task (optional for local-only) |

### Validation Rules

**Title**:
- MUST NOT be empty string after trimming whitespace
- MUST be between 1 and 200 characters after trim
- Example valid: "Buy groceries", "Review PR #123"
- Example invalid: "", "   " (whitespace only), 201+ character string

**Description**:
- MAY be null or empty string
- MUST be <= 2000 characters if provided
- No sanitization required (stored as plain text, escaped on render)

**Deadline**:
- MUST be valid ISO 8601 datetime if provided
- MAY be null (no deadline)
- No validation for past dates (users can set past deadlines for overdue tasks)

**Rank**:
- MUST be integer >= 0
- MUST be unique among all active (not completed) tasks for the same user
- Automatically adjusted during insert/move/delete operations
- Never manually set by user (determined by comparison or drag-and-drop)

**Completed**:
- MUST be boolean (true/false)
- When changed from false → true, `completedAt` MUST be set to current timestamp
- When changed from true → false (un-completing), `completedAt` MUST be set to null

**Timestamps**:
- `createdAt`: Set once on creation, never changed
- `updatedAt`: Updated on every save operation
- `completedAt`: Set when `completed` changes to true, cleared when changed to false

### State Transitions

```
[New Task] → DRAFT
  ↓ (user submits, comparison starts)
COMPARING
  ↓ (comparison complete or skipped)
ACTIVE (rank assigned, visible in task list)
  ↓ (user marks complete)
COMPLETED (removed from active list, shown in history)
  ↓ (90 days elapsed)
ARCHIVED (deleted from database)

State transitions:
- DRAFT → COMPARING: User submits new task form (FR-026)
- COMPARING → ACTIVE: User completes comparison process, rank determined (FR-002)
- ACTIVE → COMPLETED: User marks task complete (FR-010)
- COMPLETED → ARCHIVED: 90 days since completedAt (FR-024)
- ACTIVE ↔ ACTIVE: User drags task to new position, rank updated (FR-030)
- COMPARING → DRAFT: User cancels comparison, task discarded
```

### Relationships

- **One Task belongs to one User** (optional, for cloud sync only)
  - Local-only mode: Tasks have no userId
  - Cloud sync mode: Tasks MUST have userId

- **Tasks are ordered by rank** (ascending, 0 = top)
  - Query: `SELECT * FROM tasks WHERE userId = ? AND completed = false ORDER BY rank ASC`

### Indexes (Database)

**IndexedDB (frontend)**:
```
Primary key: id
Indexes:
- rank (for sorted list queries)
- completedAt (for history view and cleanup queries)
- createdAt (for tiebreaker in equal comparisons, FR-016)
- compound: [completed, rank] (optimized for active task list)
```

**PostgreSQL (backend)**:
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL CHECK (LENGTH(TRIM(title)) > 0),
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  rank INTEGER NOT NULL CHECK (rank >= 0),
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, rank),
  CHECK (completed = false OR completed_at IS NOT NULL)
);

CREATE INDEX idx_tasks_user_rank ON tasks(user_id, rank);
CREATE INDEX idx_tasks_user_completed ON tasks(user_id, completed, completed_at);
CREATE INDEX idx_tasks_deadline ON tasks(deadline) WHERE completed = false;
```

---

## Entity: User

### Description
Represents an authenticated user (optional, for cloud backup feature only).

### Attributes

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID (string) | Yes | Unique, immutable | Primary identifier |
| `email` | string | Yes | Valid email format, unique | User's email address (login) |
| `passwordHash` | string | Yes | bcrypt hash | Hashed password (never plain text) |
| `createdAt` | ISO 8601 datetime | Yes | Auto-set on creation | Account creation timestamp |
| `lastSyncAt` | ISO 8601 datetime | No | Updated on successful sync | Last cloud sync timestamp |

### Validation Rules

**Email**:
- MUST match regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- MUST be lowercase (normalize on input)
- MUST be unique across all users

**Password**:
- MUST be >= 8 characters at creation (enforced client-side)
- Stored as bcrypt hash with cost factor 12
- Never returned in API responses (password_hash excluded)

### Relationships

- **One User has many Tasks**
  - Cascade delete: When user deleted, all their tasks deleted (ON DELETE CASCADE)

### Database Schema (PostgreSQL only)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE CHECK (email = LOWER(email)),
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_sync_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
```

---

## Entity: ComparisonStep (Frontend State Only)

### Description
Transient state object representing a single step in the task comparison workflow. Not persisted to database.

### Attributes

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `newTask` | Task (partial) | Yes | The task being added (title, description, deadline filled) |
| `comparisonIndex` | integer | Yes | Current comparison step (0-9, max 10 per FR-033) |
| `currentComparisonTask` | Task | Yes | The task being compared against (rank = comparisonIndex) |
| `determinedRank` | integer | No | Final rank once comparison complete (null until PLACING state) |
| `state` | ComparisonState enum | Yes | Current state: IDLE, COMPARING, PLACING, COMPLETE, CANCELLED |

### State Transitions (FSM)

See R9 in research.md for full state machine diagram.

```typescript
enum ComparisonState {
  IDLE = 'IDLE',
  COMPARING = 'COMPARING',
  PLACING = 'PLACING',
  COMPLETE = 'COMPLETE',
  CANCELLED = 'CANCELLED'
}

interface ComparisonStep {
  newTask: Partial<Task>;
  comparisonIndex: number;
  currentComparisonTask: Task | null;
  determinedRank: number | null;
  state: ComparisonState;
}
```

---

## Derived Data

### Overdue Indicator

Calculated client-side, not stored:

```typescript
function isOverdue(task: Task): boolean {
  if (!task.deadline || task.completed) return false;
  return new Date(task.deadline) < new Date();
}
```

Used for FR-022 visual warning.

### Task List Sections

Derived from rank ranges for UI display:

- **Top Priority**: rank = 0 (single task, displayed prominently)
- **High Priority**: rank 1-3
- **Medium Priority**: rank 4-10
- **Lower Priority**: rank 11+

Visual differentiation (FR-014) applied via Tailwind CSS classes:
```typescript
function getPriorityColor(rank: number): string {
  if (rank === 0) return 'bg-red-100 border-red-500';
  if (rank <= 3) return 'bg-orange-100 border-orange-500';
  if (rank <= 10) return 'bg-yellow-100 border-yellow-500';
  return 'bg-blue-100 border-blue-500';
}
```

---

## Data Lifecycle

### Task Creation Flow
1. User submits TaskForm with title, optional description, optional deadline
2. Frontend creates partial Task object (no id, rank, or timestamps)
3. ComparisonEngine initializes ComparisonStep state (IDLE → COMPARING)
4. User completes comparison (binary choices or skip)
5. Final rank determined, full Task object created with all fields
6. StorageService inserts into IndexedDB, shifts ranks for existing tasks >= new rank
7. Optional: SyncManager uploads to backend if authenticated

### Task Update Flow
1. User edits task title/description/deadline (FR-008)
   - Direct field updates, rank unchanged
2. User drags task to new position (FR-030)
   - Calculate oldRank and newRank from drag event
   - Call TaskManager.moveTask(taskId, oldRank, newRank)
   - Batch update all affected task ranks in transaction
3. StorageService updates updatedAt timestamp
4. Optional: SyncManager syncs changes to backend

### Task Completion Flow
1. User clicks "Mark Complete" button (FR-010)
2. Frontend updates: completed = true, completedAt = NOW()
3. StorageService removes from active list, adds to completed list
4. Ranks of tasks > completed task's rank shift down by 1
5. Optional: SyncManager syncs to backend

### Task Cleanup Flow (Daily)
1. On app initialization, check if 24 hours since last cleanup
2. Query tasks where: completed = true AND completedAt < (NOW() - 90 days)
3. Delete in batches of 100 (FR-024)
4. Update localStorage: lastCleanupAt = NOW()

---

## Performance Considerations

### Query Optimization

**Active Task List** (most frequent):
```typescript
// IndexedDB compound index [completed, rank] optimizes this query
db.tasks
  .where('[completed+rank]')
  .between([false, Dexie.minKey], [false, Dexie.maxKey])
  .toArray();
```

**Completed Task History**:
```typescript
// Index on completedAt optimizes this query
db.tasks
  .where('completedAt')
  .above(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
  .reverse() // Most recent first
  .toArray();
```

### Rank Shifting Performance

Worst case: Insert at rank 0 with 500 tasks → update 500 ranks.

With IndexedDB transactions and batch updates:
- Fetch 500 tasks: ~50ms
- Update 500 records in single transaction: ~200ms
- Re-render UI with optimistic update: ~50ms
- **Total: ~300ms** (well below 1s target, SC-002)

Optimization: Use requestIdleCallback for cleanup operations to avoid blocking UI.

---

## Summary

Two primary entities:
- **Task**: Core data model with rank-based ordering, 11 fields, complex validation
- **User**: Optional auth entity for cloud sync, 5 fields

One transient state object:
- **ComparisonStep**: Frontend FSM state for comparison workflow

All validation rules enforced client-side (TypeScript) and server-side (PostgreSQL constraints). Indexes optimized for frequent queries (active list, completion history). Performance target met with batch updates and compound indexes.

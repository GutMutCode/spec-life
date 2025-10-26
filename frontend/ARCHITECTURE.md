# Spec-Life Frontend Architecture

## Overview

The **Spec-Life Frontend** is a React-based task management application built with TypeScript, leveraging local-first storage (IndexedDB) for offline capability and a sophisticated binary search algorithm for intelligent task prioritization.

The architecture emphasizes:
- **Local-first data**: All data persists in browser's IndexedDB
- **Hierarchical task structure**: Support for nested subtasks with independent rank sequences
- **Intelligent prioritization**: Binary search algorithm with visual comparison interface
- **Responsive design**: Mobile-first Tailwind CSS styling
- **Accessibility**: ARIA labels, focus management, keyboard navigation
- **Performance**: Memoization, optimistic updates, lazy loading

---

## Directory Structure

```
frontend/src/
├── main.tsx                          # App entry point, DB initialization
├── App.tsx                           # Root router setup
├── index.css                         # Global Tailwind styles
│
├── components/                       # Reusable React components
│   ├── Layout.tsx                   # Main layout wrapper with header/footer
│   ├── TaskCard.tsx                 # Single task display/edit component
│   ├── TaskForm.tsx                 # Task input form with validation
│   ├── TaskList.tsx                 # List container with drag-drop support
│   ├── ComparisonModal.tsx          # Binary comparison UI
│   ├── ShortcutsModal.tsx           # Keyboard shortcuts help modal
│   ├── ShortcutHint.tsx             # Inline shortcut hint tooltip
│   ├── Toast.tsx                    # Toast notification system
│   ├── ErrorBoundary.tsx            # Error fallback UI
│   ├── LoadingSpinner.tsx           # Loading state indicator
│   └── __tests__/                   # Component tests
│
├── pages/                            # Page-level components (router targets)
│   ├── Dashboard.tsx                # US1: Top priority task display
│   ├── AddTask.tsx                  # US2: New task + comparison workflow
│   ├── AllTasks.tsx                 # US3: Complete hierarchical task list
│   └── History.tsx                  # US5: Completed tasks in history
│
├── hooks/                            # Custom React hooks
│   ├── useTasks.ts                  # Task CRUD operations + state management
│   ├── useComparison.ts             # Binary comparison FSM integration
│   ├── useKeyboardShortcuts.ts      # Global keyboard navigation
│   ├── useDeviceDetection.ts        # OS/device capability detection
│   ├── useShortcutsHelp.ts          # Keyboard help modal state
│   ├── useFocusTrap.ts              # Modal focus management
│   └── __tests__/                   # Hook tests
│
├── services/                         # Business logic layer
│   ├── TaskManager.ts               # Task insertion with rank shifting
│   ├── StorageService.ts            # IndexedDB operations abstraction
│   ├── ComparisonEngine.ts          # Binary search algorithm (class-based)
│   └── comparisonMachine.ts         # XState v5 FSM setup
│
├── lib/                              # Utility & helper functions
│   ├── indexeddb.ts                 # Dexie database schema & queries
│   ├── utils.ts                     # String formatting, date utilities
│   ├── validation.ts                # Form field validation rules
│   ├── cleanup.ts                   # Data retention utilities
│   └── seedData.ts                  # Test data generation
│
├── config/                           # Application configuration
│   ├── shortcuts.ts                 # Keyboard shortcut definitions
│   ├── shortcuts.types.ts           # Shortcut type definitions
│   └── __tests__/                   # Config tests
│
├── test/                             # Testing setup
│   └── setup.ts                     # Vitest/fake-indexeddb setup
│
└── vite-env.d.ts                    # Vite environment types
```

---

## Core Architecture Patterns

### 1. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Components                          │
│   (Dashboard, AddTask, AllTasks, History, TaskCard)         │
└────────────────────┬────────────────────────────────────────┘
                     │ useTasks hook
                     │ useComparison hook
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                  Service Layer                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ TaskManager          StorageService                  │  │
│  │ - insertTask()       - getTopTask()                  │  │
│  │ - moveTask()         - createTask()                  │  │
│  │ - Rank shifting      - getActiveTasks()             │  │
│  │   logic              - completeTask()               │  │
│  │                      - deleteTask()                 │  │
│  │                      - getCompletedTasks()          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ComparisonEngine / comparisonMachine                  │  │
│  │ - Binary search FSM                                  │  │
│  │ - 10-step limit logic                                │  │
│  │ - Convergence detection                              │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │ IndexedDB queries
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                  Data Access Layer                          │
│         (lib/indexeddb.ts - Dexie wrapper)                 │
│  - getIncompleteTasks()                                     │
│  - getCompletedTasks()                                      │
│  - addTask()                                                │
│  - updateTask() / bulkUpdateRanks()                         │
│  - deleteTask()                                             │
└────────────────────┬────────────────────────────────────────┘
                     │ Transactions
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              Browser IndexedDB                              │
│   Database: "TaskPriorityDB"                               │
│   Tables: tasks, metadata                                  │
└─────────────────────────────────────────────────────────────┘
```

### 2. Task Hierarchy Model

Tasks support arbitrary nesting depth with scoped rank sequences:

```
Top-level Tasks (parentId = null, depth = 0):
├── Task A (rank 0)
│   ├── Subtask A1 (parentId=A, rank 0)
│   ├── Subtask A2 (parentId=A, rank 1)
│   └── Subtask A3 (parentId=A, rank 2)
├── Task B (rank 1)
│   └── Subtask B1 (parentId=B, rank 0)
└── Task C (rank 2)

Key Properties:
- Rank sequence independent per (parentId, depth) combination
- Ranks always start at 0 within each parent
- No rank gaps (sequential integers)
- All rank shifting operations scoped to same parentId
```

### 3. Rank Management & Shifting

The system maintains sequential ranks (0, 1, 2, ..., N) within each parent by automatically shifting:

**On Task Insertion:**
```
Before: rank[0,1,2] → After: rank[0,1,2,3]
        (inserting at rank 1 shifts existing ranks 1,2 down)
```

**On Task Completion:**
```
Before: rank[0,1,2,3] → After: rank[0,1,2]
        (completing rank 1 task shifts ranks 2,3 up)
```

**On Task Deletion:**
```
Before: rank[0,1,2,3] → After: rank[0,1,2]
        (deleting rank 2 task shifts rank 3 up)
```

**On Drag-Drop Reordering:**
```
Dragging rank 3 → rank 1:
- Shift ranks 1,2 down (become 2,3)
- Move task to rank 1
```

All shifting operations are transactional in IndexedDB for consistency.

---

## Key Components & Responsibilities

### Pages (Router Targets)

#### `Dashboard.tsx`
- **Purpose**: Display the single most important task (rank 0)
- **Features**:
  - Prominent display of top task
  - Hierarchical subtask expansion/collapse
  - Add new task button
  - Quick navigation to other pages
  - Empty state handling
- **Data**: Uses `useTasks()` hook, filtered for rank 0 top-level task
- **User Story**: US1 - "See which task to work on right now"

#### `AddTask.tsx`
- **Purpose**: Multi-step workflow to add new task with intelligent prioritization
- **Features**:
  - Task form (title, description, deadline, collaborators)
  - Modal comparison workflow
  - Subtask support (via location state)
  - Form validation with error feedback
- **Workflow**:
  1. User fills TaskForm with task details
  2. Form submission opens ComparisonModal
  3. Binary comparison or manual placement
  4. Task inserted via useComparison hook
  5. Redirect to dashboard
- **User Story**: US2 - "Add task with intelligent prioritization via comparison"

#### `AllTasks.tsx`
- **Purpose**: View complete task hierarchy in priority order
- **Features**:
  - Complete task tree with visual hierarchy (32px indentation per depth level)
  - Expand/collapse all controls
  - Drag-drop task reordering
  - Inline task editing
  - Add subtask capability
  - Responsive task count indicator
- **Data**: All incomplete tasks in hierarchical order
- **User Story**: US3 - "See complete task list beyond top priority"

#### `History.tsx`
- **Purpose**: View completed tasks
- **Features**:
  - Reverse chronological display (newest first)
  - Relative date formatting ("Today", "3 days ago", etc.)
  - Task metadata display (title, description, deadline info)
  - 90-day retention note
- **Data**: All completed tasks from StorageService
- **User Story**: US5 - "View completed tasks in history"

### Core Components

#### `TaskCard.tsx` (memoized)
- **Purpose**: Single task display and inline editing
- **Props**:
  - `task`: Task object to display
  - `showRank`: Whether to show priority rank badge
  - `variant`: "prominent" (dashboard) or "compact" (lists)
  - `editable`: Enable inline edit mode
  - `onComplete`, `onDelete`: Callback handlers
  - `onAddSubtask`: Create subtask button
  - `dragHandleProps`: For drag-and-drop
  - `hasSubtasks`, `isExpanded`, `onToggleExpand`: Hierarchy control
- **Features**:
  - View mode with rich task display
  - Edit mode with validation
  - Drag handle (when draggable)
  - Expand/collapse arrow (when has subtasks)
  - Priority color coding (red/orange/yellow/blue)
  - Overdue indicator
  - Collaborator badges
  - Action buttons (Edit, Complete, Delete, Add Subtask)
  - Delete confirmation dialog with focus trap
- **Memoization**: Custom memo with deep task comparison to prevent re-renders

#### `TaskList.tsx`
- **Purpose**: Container for multiple TaskCard components
- **Features**:
  - Drag-and-drop reordering (@dnd-kit)
  - Responsive 4-pixel spacing between items
  - Visual indentation based on task depth
  - Empty state message
  - Task count indicator
  - Optimistic UI updates on drag
- **Props**: Array of tasks + callbacks for operations
- **Accessibility**: Keyboard drag support via KeyboardSensor

#### `TaskForm.tsx`
- **Purpose**: Reusable form for task creation/editing
- **Fields**:
  - Title (required, 0-200 chars)
  - Description (optional, 0-2000 chars)
  - Deadline (optional, future date only)
  - Collaborators (optional, comma-separated)
- **Features**:
  - Real-time character count indicators
  - Field-level validation with error messages
  - Submit/Cancel buttons
  - Collaborator tag management (add via Enter key)
- **Validation**: Delegates to lib/validation.ts

#### `ComparisonModal.tsx`
- **Purpose**: Binary search UI for task prioritization
- **States**:
  - COMPARING: Show new task vs existing task, user chooses "more" or "less" important
  - PLACING: Manual rank selection UI
  - COMPLETE: Success message with insertion feedback
  - COMPARING transitions to PLACING after 10 steps or user skip
- **Features**:
  - Side-by-side task comparison with full details
  - Progress indicator (Step N of 10)
  - Skip button to go to manual placement
  - Rank badges showing existing task's priority
  - Relative deadline display (e.g., "Due in 3 days")
  - Text truncation for long descriptions
  - Insertion summary with shift feedback
  - Focus trap for accessibility (T113)
- **Integration**: Uses `useComparison()` hook for FSM state

#### `Layout.tsx`
- **Purpose**: Consistent wrapper for all pages
- **Features**:
  - Header with app title and navigation links
  - Navigation links with shortcut hints
  - Main content area for page Outlet
  - Footer with keyboard shortcut hint
  - Global keyboard shortcuts enabled

#### `Toast.tsx`
- **Purpose**: Toast notification system
- **Features**: Toast context provider + Toast display component

### Service Layer

#### `StorageService` (class)
- **Purpose**: Business logic abstraction over IndexedDB
- **Key Methods**:
  - `getTopTask()`: Get highest-priority top-level task
  - `createTask()`: Auto-generate ID, timestamps
  - `getActiveTasks()`: Get all incomplete tasks
  - `completeTask()`: Mark complete + shift ranks down
  - `deleteTask()`: Delete + shift ranks down
  - `getCompletedTasks()`: Get history in reverse chronological order
- **Error Handling**: Throws `StorageError` with operation name and cause

#### `TaskManager` (class)
- **Purpose**: Task insertion with rank shifting algorithm
- **Key Methods**:
  - `insertTask(taskData, insertionRank)`: Insert with automatic rank shifting
    - Gets all incomplete tasks at/after insertion rank
    - Shifts their ranks up by 1
    - Inserts new task at specified rank
    - Returns InsertTaskResult with shift info
  - `moveTask(taskId, newRank)`: Move task between ranks
    - Bidirectional shifting (up or down based on direction)
    - Only shifts siblings (same parentId)
- **Transactions**: All operations atomic via Dexie transactions

#### `ComparisonEngine` / `comparisonMachine`
- **Purpose**: Binary search finite state machine for priority placement
- **Algorithm**: Binary search with 10-step limit
  - Maintains: low, high, currentRank pointers
  - User answers: "higher" (move up) or "lower" (move down)
  - Converges to insertion point
- **States** (via XState v5):
  - `idle`: Initial state
  - `comparing`: Binary search in progress
  - `placing`: Manual rank selection
  - `complete`: Workflow finished, ready to insert
  - `cancelled`: User cancelled
- **Transitions**:
  - START → comparing (or complete if no existing tasks)
  - ANSWER → comparing (continue search) or placing/complete (termination conditions)
  - SKIP → placing (skip to manual placement)
  - PLACE → complete (place at rank and finalize)
  - CANCEL → cancelled
- **Guards**:
  - `hasNoTasks`: No existing tasks → skip to placement
  - `isHigherAndAtTop`: Answer "higher" at rank 0 → complete
  - `isLowerAndAtBottom`: Answer "lower" at max rank → complete
  - `isHigherAnd10Steps` / `isLowerAnd10Steps`: Hit 10-step limit → placing
  - `isHigherAndConverged` / `isLowerAndConverged`: Convergence detected → complete

### Hooks

#### `useTasks()`
- **Purpose**: Task state management with optimistic updates
- **State**:
  - `topTask`: Highest priority incomplete top-level task
  - `activeTasks`: All incomplete tasks
  - `loading`, `error`: Async state
- **Methods**:
  - `refresh()`: Reload tasks from storage
  - `createTask(data)`: Create new task + refresh
  - `completeTask(id)`: Complete + optimistic update
  - `deleteTask(id)`: Delete + optimistic update
  - `updateTask(id, updates)`: Edit + optimistic update
  - `getTaskById(id)`: Fetch single task
- **Optimistic Updates** (T117): Update UI immediately, revert on error

#### `useComparison()`
- **Purpose**: Binary search workflow management
- **State** (from XState):
  - `state`: Current FSM state
  - `currentTask`: Task being compared
  - `newTask`: Task being added
  - `stepCount`: Comparison step counter
  - `finalRank`: Determined insertion rank
  - `existingTasks`: Tasks to compare against
- **Methods**:
  - `start(newTask)`: Begin comparison (filters tasks by parentId)
  - `answer(direction)`: Respond to comparison
  - `skip()`: Skip to manual placement
  - `place(rank)`: Choose rank manually
  - `cancel()`: Abort workflow
- **Side Effect**: Auto-inserts task when state reaches `complete`

#### `useKeyboardShortcuts()` / `usePageShortcuts()`
- **Purpose**: Global and page-specific keyboard navigation
- **Global Shortcuts**:
  - `n`: Navigate to Add Task
  - `a`: Navigate to All Tasks
  - `h`: Navigate to History
  - `d`: Navigate to Dashboard
- **Disabled When**: User is typing in input/textarea

#### `useDeviceDetection()`
- **Purpose**: Detect OS and device capabilities
- **Returns**:
  - `os`: OperatingSystem enum (Mac, Windows, Linux, Unknown)
  - `isTouchOnly`: Boolean (for hiding shortcuts on mobile)
  - `isMac`, `isWindows`, `isLinux`: Boolean flags

#### `useFocusTrap()`
- **Purpose**: Modal accessibility (trap focus within modal)
- **Usage**: Used by ComparisonModal and TaskCard delete dialog

---

## IndexedDB Schema & Queries

### Database Structure

```typescript
// Database: TaskPriorityDB
// Schema Version: 2

// Table: tasks
{
  id: string,              // Primary key (UUID)
  title: string,
  description?: string,
  deadline?: Date,
  rank: number,
  parentId: string | null,
  depth: number,
  completed: boolean,
  completedAt?: Date,
  createdAt: Date,
  updatedAt: Date,
  userId?: string,
  collaborators?: string[]
}

// Indexes on tasks table:
// - id (primary key)
// - rank (for ordering by priority)
// - completedAt (for filtering completed)
// - createdAt (for chronological sorting)
// - [completed+rank] (compound for filtering incomplete by rank)

// Table: metadata
{
  key: string,            // Primary key
  value: string | number | boolean
}
```

### Key Queries

**Get incomplete tasks sorted by rank:**
```typescript
const allTasks = await db.tasks.toArray();
return allTasks
  .filter(t => !t.completed)
  .sort((a, b) => a.rank - b.rank);
```

**Get completed tasks sorted by date (newest first):**
```typescript
const allTasks = await db.tasks.toArray();
return allTasks
  .filter(t => t.completed)
  .sort((a, b) => b.completedAt - a.completedAt);
```

**Get tasks to shift for rank operation:**
```typescript
const tasksToShift = await db.tasks
  .where('rank')
  .above(completedRank)
  .and(task => !task.completed && task.parentId === parentId)
  .toArray();
```

**Bulk update ranks (transactional):**
```typescript
await db.transaction('rw', db.tasks, async () => {
  for (const { id, rank } of updates) {
    await db.tasks.update(id, { rank, updatedAt: new Date() });
  }
});
```

---

## State Management Strategy

### Local State
- **Per-component state**: Form inputs, edit mode, delete dialog
- **Hook state**: Task lists, loading/error, comparison progress
- **No global Redux/Zustand**: Overkill for single-user local-first app

### Persistent State
- **IndexedDB**: Primary source of truth
- **No in-memory cache**: Always query fresh from DB (performance sufficient)
- **Dexie as ORM**: Handles schema, transactions, live queries

### Real-time Updates
- **Optimistic UI** (T117): Update state immediately, revert on error
- **No WebSocket/polling**: Local-first, no backend sync yet
- **Manual refresh**: Page refresh or navigation triggers data reload

---

## Data Flow Examples

### Example 1: Add Task with Binary Comparison

```
1. User navigates to /add
   → AddTask page renders TaskForm

2. User fills form, clicks "Continue to Comparison"
   → onSubmit callback sets newTaskData state
   → Shows ComparisonModal

3. ComparisonModal mounts
   → useComparison hook starts FSM
   → FSM initializes with newTask + filtered existingTasks (same parentId)
   → Displays comparing state: new task vs middle task

4. User clicks "This is MORE important"
   → send({ type: 'ANSWER', answer: 'higher' })
   → moveToHigherRank action executes
   → currentRank moves to midpoint of lower half
   → FSM stays in comparing state
   → Modal re-renders with new comparison

5. After 10 steps or convergence
   → FSM transitions to placing state
   → Modal shows manual placement UI with rank options

6. User clicks "Place at Rank 2"
   → send({ type: 'PLACE', rank: 2 })
   → FSM finalRank = 2, transitions to complete

7. useComparison useEffect detects complete state
   → Calls taskManager.insertTask(newTask, 2)
   → taskManager shifts existing tasks at rank >= 2
   → Returns InsertTaskResult
   → useComparison state updates with insertResult

8. Modal detects isComplete = true
   → Shows success screen with insertion summary
   → User clicks "Close"
   → onComplete callback fires
   → AddTask navigates to "/" (Dashboard)

9. Dashboard renders
   → useTasks hook refreshes from IndexedDB
   → Displays updated top task
```

### Example 2: Complete Task with Rank Shifting

```
1. User clicks "Mark Complete" on task at rank 2
   → onClick handler calls completeTask(taskId)

2. useTasks hook optimistically removes task from UI
   → activeTasks state updates (filters out completed task)
   → topTask updated if it was the completed task
   → UI updates immediately for fast feedback

3. StorageService.completeTask() executes async
   → Updates task: completed=true, completedAt=now
   → Queries tasks with rank > 2 and same parentId
   → Bulk shifts them: rank 3→2, rank 4→3, etc.
   → All updates in single transaction

4. If error occurs
   → Catch block reverts optimistic state
   → Shows error toast/message

5. On success
   → useTasks refresh() reloads from DB
   → Tasks re-rendered with updated ranks
```

### Example 3: Drag-Drop Reordering

```
1. User drags task at rank 3 to rank 1 (within same parent)
   → onDragStart: Set activeId for visual feedback

2. onDragEnd callback executes
   → Find dragged task (id=3) and target task (id=1)
   → Verify same parentId (same hierarchy level)
   → Calculate sibling reordering via arrayMove()
   → Optimistically setItems() with new order

3. taskManager.moveTask(taskId, 1) executes async
   → Detects moving up (newRank 1 < oldRank 3)
   → Queries tasks with rank >= 1 and < 3
   → Shifts them down: rank 1→2, rank 2→3
   → Updates moved task: rank=1

4. onTasksChange() callback fires
   → Parent component (AllTasks/Dashboard) calls refresh()
   → Tasks re-loaded from DB
   → UI re-syncs with DB state

5. If drag fails
   → Revert optimistic setItems() to original order
   → Log error
```

---

## Component Lifecycle Examples

### TaskCard Mount/Update Cycle

```
1. Mount: TaskCard({ task, onComplete, ... })
   → Memoization checks previous props
   → Initialize local state: isEditing=false, errors={}, etc.
   → If memoization passes, skips rendering

2. User hovers over deadline
   → No state change, component doesn't re-render (memoized)

3. User clicks Edit
   → handleEdit() sets isEditing=true
   → Local state updates, component re-renders edit form

4. User edits title
   → setEditTitle() updates local state
   → Form re-renders with new input value
   → Validation happens on blur or submit

5. User clicks Save
   → handleSave() validates, calls onSave(id, updates)
   → onSave async operation (StorageService.updateTask)
   → Component shows "Saving..." state
   → On completion: setIsEditing(false)
   → Component re-renders back to view mode

6. Parent (TaskList) refreshes from DB
   → Passes updated task via props
   → Memoization comparison detects changes
   → Component re-renders with new task data

7. User clicks Delete
   → handleDeleteClick() sets showDeleteDialog=true
   → Dialog overlay appears (fixed position)
   → useFocusTrap() traps focus within dialog
   → User clicks Confirm
   → handleDeleteConfirm() calls onDelete(id)
   → Dialog closes, parent refreshes
```

### Dashboard Hierarchy Expansion

```
1. Dashboard mounts
   → useTasks loads data
   → Queries top task + all active tasks
   → Initializes expandedTaskIds = new Set()

2. Renders top task with subtasks section
   → getSubtasks() filters tasks where parentId=topTask.id
   → Sorts by rank
   → Displays only direct subtasks initially (expanded=false)

3. User clicks expand arrow on a subtask
   → toggleExpanded(taskId) adds taskId to Set
   → hierarchicalSubtasks useMemo recalculates
   → Adds that task's subtasks to display (recursive)
   → Component re-renders with expanded subtasks

4. User collapses
   → toggleExpanded() removes from Set
   → useMemo recalculates, subtasks removed from render list
   → Component re-renders collapsed view
```

---

## Performance Optimizations

### Memoization (T115, T116)

1. **TaskCard**: Custom memo with deep task property comparison
   - Prevents unnecessary re-renders when parent updates
   - Only re-renders if task data or key props change

2. **TaskList**: useMemo for activeTask lookup
   - Prevents O(n) search on every render during drag

3. **useComparison**: useMemo for currentTask
   - Prevents object recreation on state updates

4. **Dashboard**: useMemo for hierarchicalSubtasks
   - Prevents recalculation of subtask tree unless dependencies change

5. **AllTasks**: useMemo for hierarchicalTasks
   - Same recursive subtask tree calculation

### Optimistic Updates (T117)

- **Complete/Delete/Update**: Update UI immediately
- **Error handling**: Revert to previous state if operation fails
- **Perceived performance**: Feels instant even with async DB operations

### Drag-Drop Optimization

- **Activation distance**: 8px threshold before drag starts
- **Collision detection**: closestCenter for minimal calculations
- **Sorted keys**: Items array mapped to IDs for dnd-kit

### IndexedDB Performance

- **Compound indexes**: [completed+rank] for efficient filtering
- **Transactional writes**: Bulk operations atomic
- **No schema migrations**: V2 keeps V1 data, additive only

---

## Validation & Error Handling

### Form Validation (lib/validation.ts)

- **Title**: Required, 1-200 characters
- **Description**: Optional, 0-2000 characters
- **Deadline**: Optional, must be future date
- Real-time error display in form
- Prevents submission if any field invalid

### Storage Error Handling (StorageError)

- Custom error class with operation name and cause
- User-friendly error messages in UI
- Logged to console for debugging
- Toasts on error (not yet fully implemented)

### Async Error Handling

- Try-catch blocks in hooks
- Error state updated in hooks
- Components render error UI with retry buttons
- No unhandled promise rejections

---

## Accessibility Features

### ARIA & Semantic HTML

- Proper heading hierarchy (h1, h2, h3)
- Form labels with htmlFor
- aria-label for buttons
- aria-describedby for error messages
- aria-required, aria-invalid for form fields
- role="dialog" for modals
- aria-modal="true" for non-dismissible modals

### Keyboard Navigation

- Global shortcuts: n, a, h, d for navigation
- Tab focus through interactive elements
- Escape to close modals (delete dialog)
- Enter to submit forms / add collaborators
- Focus trap in modals (T113)

### Focus Management

- useFocusTrap hook manages focus in modals
- Initial focus set when modal opens
- Return focus to trigger element on close
- Prevents focus escaping modal while open

### Screen Reader Support

- descriptive aria-labels on all buttons
- Error messages announced via role="alert"
- Live region updates for comparison step count (aria-live="polite")

### Visual Accessibility

- Color not only indicator of information
- Rank badges show numeric value, not just color
- Overdue indicated with text + color
- Sufficient contrast ratios
- Large touch targets (48px minimum)

---

## Testing Strategy

### Unit Tests (Vitest)

- Individual hook tests (useTasks, useComparison, etc.)
- Validation function tests
- Utility function tests
- Shortcut configuration tests

### Component Tests (React Testing Library)

- Component renders without crashing
- User interactions trigger correct callbacks
- Conditional rendering (loading, error, empty states)
- Form validation and error display

### E2E Tests (Playwright)

- Full workflows: add task → compare → dashboard
- Navigation shortcuts
- Drag-drop reordering
- Task completion and history

### Test Setup (test/setup.ts)

- fake-indexeddb for browser-less IndexedDB
- jsdom for DOM simulation
- Vitest configuration

---

## Current Implementation Status

### Completed Features (Phase 1-2)

| Feature | User Story | Status |
|---------|-----------|--------|
| View top priority task | US1 | ✅ Working |
| Add task with comparison | US2 | ✅ Working |
| View all tasks | US3 | ✅ Working |
| View completed history | US5 | ✅ Working |
| Inline task editing | T059/T060 | ✅ Working |
| Drag-drop reordering | T061-T064 | ✅ Working |
| Task completion | T071 | ✅ Working |
| Task deletion | T072 | ✅ Working |
| Complete rank shifting | T071/T072 | ✅ Working |
| Keyboard shortcuts | T111 | ✅ Working |
| Shortcuts help modal | T012/T011 | ✅ Working |
| Form validation | FR-031/032 | ✅ Working |
| Error handling | T108 | ✅ Working |
| Optimistic updates | T117 | ✅ Working |
| Memoization | T115/T116 | ✅ Working |
| Modal accessibility | T113 | ✅ Working |
| Task subtasks | T043+ | ✅ Working |
| Task hierarchy | FR-043+ | ✅ Working |
| Collaborators | FR-044+ | ✅ Working |
| Relative deadlines | T042A | ✅ Working |

### Missing Features (Future Phases)

- Backend API integration (Phase 8)
- Cloud sync
- Undo/redo
- Collaborative editing
- Notifications
- 90-day auto-cleanup
- Analytics
- Mobile app (React Native)

### Known Limitations

- No offline sync (local-first only)
- No persistent state across browsers
- No real-time collaboration
- No API integration yet
- Limited to browser storage capacity

---

## Key Design Decisions

### Why Local-First IndexedDB?

- **Offline capability**: Works without internet
- **Fast performance**: No network latency
- **Privacy**: Data never leaves device (yet)
- **Simplicity**: No server infrastructure for Phase 1-2

### Why Binary Search for Comparison?

- **Efficient**: O(log n) comparisons vs O(n) sequential
- **User-friendly**: Max 10 questions, then manual placement
- **Intuitive**: Natural human decision-making
- **Scalable**: Works with any number of tasks

### Why XState FSM?

- **Deterministic**: Clear state transitions
- **Debuggable**: Visualizable state machine
- **Testable**: Mock state transitions
- **Extensible**: Easy to add new states/guards

### Why Dexie over Raw IndexedDB?

- **Type-safe**: TypeScript support
- **Simpler API**: Promises instead of events
- **Transactions**: Easy atomic operations
- **Live queries**: Real-time updates possible

### Why Tailwind CSS?

- **Utility-first**: Rapid prototyping
- **Consistent**: Pre-defined spacing/colors
- **Responsive**: Mobile-first classes
- **Build size**: PurgeCSS removes unused styles

---

## Architecture Constraints & Trade-offs

### Constraint: Single User

- No user authentication yet
- No sharing/collaboration
- All data in localStorage

### Constraint: No Backend

- Comparison logic entirely client-side
- No persistence beyond browser
- No sync across devices

### Trade-off: Simplicity vs Scalability

- Chose: Simpler code, fewer abstractions
- Cost: Less flexible for future changes
- Benefit: Faster initial development

### Trade-off: Real-time Updates

- Chose: Manual refresh via useCallback
- Cost: Doesn't update across tabs
- Benefit: Avoids WebSocket complexity

---

## Future Architecture Improvements

1. **Backend API Integration** (Phase 8)
   - Add REST endpoints for task CRUD
   - Migrate IndexedDB to sync source
   - Implement conflict resolution

2. **State Management Upgrade**
   - Add React Query for server state
   - Keep local state in zustand (if needed)
   - Implement optimistic mutations

3. **Real-time Collaboration**
   - Add WebSocket for live updates
   - Implement CRDT for conflict-free merging
   - Add presence awareness

4. **Performance Improvements**
   - Virtualize long task lists (React Window)
   - Lazy load historical tasks
   - Implement service worker for caching

5. **Testing Infrastructure**
   - Add Percy for visual regression
   - Add Lighthouse CI for performance
   - Increase E2E test coverage

---

## Conclusion

The Spec-Life Frontend is a well-architected, local-first task management application that prioritizes:
- **User experience** through intelligent comparison-based prioritization
- **Performance** via optimistic updates and memoization
- **Accessibility** with ARIA support and keyboard navigation
- **Reliability** with error handling and validation

The service layer abstracts business logic, hooks manage state reactively, and Dexie provides efficient data persistence. The binary search FSM algorithm intelligently helps users prioritize tasks in minimal clicks. Support for nested subtasks and independent rank sequences enables flexible task organization.

This foundation is ready for Phase 3+ enhancements like backend integration, real-time collaboration, and advanced features.

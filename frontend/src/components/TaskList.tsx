/**
 * @file TaskList.tsx
 * @description Task list container with drag-and-drop reordering
 *
 * CURRENT IMPLEMENTATION: Local-only UI component
 * - Renders array of TaskCard components
 * - Drag-and-drop reordering using @dnd-kit (T061, T062, T063, T064)
 * - Optimistic UI updates on drag (reverts on error)
 * - Calls TaskManager for rank shifting operations
 * - Hierarchical display with indentation (32px per depth level)
 * - No backend synchronization
 *
 * KEY FEATURES:
 * - Two rendering modes: draggable and non-draggable
 * - Keyboard accessibility for drag operations (T116)
 * - Visual drag overlay feedback (T032)
 * - Empty state with icon
 * - Task count indicator
 * - Hierarchical task display (parentId-based grouping)
 * - Restricts dragging to same parent level only
 * - Memoized active task lookup for performance
 *
 * DRAG-AND-DROP BEHAVIOR:
 * - Only allows reordering within same parent (siblings)
 * - Updates ranks in IndexedDB via TaskManager.moveTask()
 * - Optimistically updates UI, reverts on error
 * - 8px activation distance to prevent accidental drags
 * - Supports both pointer and keyboard dragging
 *
 * TODO: Cloud Sync Integration
 * - [ ] Show sync status for entire list (synced, syncing, offline)
 * - [ ] Add bulk sync indicator when multiple tasks pending
 * - [ ] Handle conflicts when server rejects rank changes
 * - [ ] Display per-task sync indicators in list view
 * - [ ] Add pull-to-refresh for loading server changes
 * - [ ] Show real-time updates from other users/devices
 * - [ ] Add offline queue status (e.g., "3 changes pending")
 *
 * @see /frontend/ARCHITECTURE.md for system architecture
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@shared/Task';
import TaskCard from './TaskCard';
import { TaskManager } from '@/services/TaskManager';
import { StorageService } from '@/services/StorageService';

/**
 * Props for TaskList component
 *
 * RENDERING MODES:
 * - draggable=true: Enables drag-and-drop reordering with @dnd-kit
 * - draggable=false: Static list (read-only, no reordering)
 *
 * DISPLAY VARIANTS:
 * - variant='prominent': Large cards for dashboard (top priority task)
 * - variant='compact': Normal cards for list views
 *
 * HIERARCHICAL DISPLAY:
 * - Tasks with depth > 0 are indented (32px per level)
 * - Drag-and-drop restricted to same parentId (siblings only)
 * - Expand/collapse controlled by hasSubtasks, isExpanded, onToggleExpand
 *
 * CALLBACKS:
 * All callbacks are optional. If not provided, corresponding features are disabled.
 * - onTasksChange: Called after successful drag reorder (triggers parent refresh)
 * - onComplete: Enables "Mark Complete" button on cards
 * - onDelete: Enables "Delete" button with confirmation dialog
 * - onAddSubtask: Enables "Add Subtask" button on cards
 * - onToggleExpand: Enables expand/collapse chevron for parent tasks
 */
interface TaskListProps {
  /** Array of tasks to display, should be pre-sorted by rank (ascending) */
  tasks: Task[];
  /** Show rank badges on cards (e.g., #0, #1, #2) with priority color coding */
  showRank?: boolean;
  /** Display variant for task cards - 'prominent' for dashboard, 'compact' for lists */
  variant?: 'prominent' | 'compact';
  /** Optional CSS className for container styling */
  className?: string;
  /** Enable drag-and-drop reordering (uses @dnd-kit library) */
  draggable?: boolean;
  /** Enable inline editing on cards (shows Edit button) */
  editable?: boolean;
  /** Callback after drag reorder completes successfully - triggers parent data refresh */
  onTasksChange?: () => void;
  /** Callback when task marked complete (T074) - receives task ID, should update storage */
  onComplete?: (taskId: string) => Promise<void>;
  /** Callback when task deleted (T075) - receives task ID, should remove from storage */
  onDelete?: (taskId: string) => Promise<void>;
  /** Callback when user clicks "Add Subtask" - receives parent task object */
  onAddSubtask?: (parentTask: Task) => void;
  /** Function to check if task has children - used to show/hide expand button */
  hasSubtasks?: (taskId: string) => boolean;
  /** Function to check if task's children are visible - controls chevron direction */
  isExpanded?: (taskId: string) => boolean;
  /** Callback when user toggles expand/collapse - receives task ID */
  onToggleExpand?: (taskId: string) => void;
}

/**
 * Sortable task card wrapper component
 *
 * Wraps TaskCard with @dnd-kit sortable functionality for drag-and-drop reordering.
 * This component is used inside DndContext and SortableContext when draggable=true.
 *
 * DND-KIT INTEGRATION:
 * - useSortable hook provides drag functionality
 * - setNodeRef: Attach to draggable element (outer div)
 * - attributes: Accessibility attributes (role, aria-*)
 * - listeners: Event handlers for drag (onPointerDown, onKeyDown)
 * - transform: CSS transform for drag animation
 * - transition: CSS transition for smooth animation
 * - isDragging: Boolean flag for current drag state
 *
 * HIERARCHICAL INDENTATION:
 * - Calculates padding-left based on task.depth
 * - Formula: 32px × depth
 * - Example: depth=0 → 0px, depth=1 → 32px, depth=2 → 64px
 * - Applied to inner div to indent card content
 *
 * DRAG HANDLE:
 * - listeners passed to TaskCard as dragHandleProps
 * - TaskCard renders drag handle icon with these props
 * - Only drag handle is draggable (not entire card)
 *
 * VISUAL FEEDBACK:
 * - isDragging passed to TaskCard for opacity reduction
 * - Transform and transition applied for smooth movement
 * - Original position maintained via CSS
 *
 * @component
 * @param {Object} props - Task card props with drag handlers
 * @param {Task} props.task - Task data to display
 * @param {boolean} props.showRank - Show rank badge
 * @param {'prominent' | 'compact'} props.variant - Display variant
 * @param {boolean} props.editable - Enable inline editing
 * @param {function} [props.onSave] - Save callback
 * @param {function} [props.onComplete] - Complete callback
 * @param {function} [props.onDelete] - Delete callback
 * @param {function} [props.onAddSubtask] - Add subtask callback
 * @param {boolean} [props.hasSubtasks] - Whether task has children
 * @param {boolean} [props.isExpanded] - Whether subtasks are expanded
 * @param {function} [props.onToggleExpand] - Toggle expand callback
 * @returns {JSX.Element} Sortable task card with drag handle
 */
function SortableTaskCard({
  task,
  showRank,
  variant,
  editable,
  onSave,
  onComplete,
  onDelete,
  onAddSubtask,
  hasSubtasks,
  isExpanded,
  onToggleExpand,
}: {
  task: Task;
  showRank: boolean;
  variant: 'prominent' | 'compact';
  editable: boolean;
  onSave?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onComplete?: (taskId: string) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  onAddSubtask?: (parentTask: Task) => void;
  hasSubtasks?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (taskId: string) => void;
}) {
  // Register with @dnd-kit sortable system
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  // Apply drag transform and transition
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calculate indentation based on hierarchy depth
  // Formula: 32px per level (0 → 0px, 1 → 32px, 2 → 64px, etc.)
  const indentStyle = {
    paddingLeft: `${task.depth * 32}px`,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div style={indentStyle}>
        <TaskCard
          task={task}
          showRank={showRank}
          variant={variant}
          editable={editable}
          onSave={onSave}
          onComplete={onComplete}
          onDelete={onDelete}
          onAddSubtask={onAddSubtask}
          dragHandleProps={listeners}
          isDragging={isDragging}
          hasSubtasks={hasSubtasks}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand}
        />
      </div>
    </div>
  );
}

/**
 * TaskList component displays a list of tasks sorted by priority.
 *
 * Features:
 * - Renders array of TaskCard components
 * - Maintains task order (should be pre-sorted by rank)
 * - Supports rank badge display
 * - Drag-and-drop reordering (T061, T062, T063, T064)
 * - Visual drag feedback
 * - Inline task editing
 * - Responsive design with proper spacing
 * - Empty state handling
 *
 * Per FR-001: Tasks are displayed in priority order (rank 0 first).
 * Per FR-032: Provides visual feedback during drag operations.
 *
 * @component
 * @param {TaskListProps} props - Component props
 * @param {Task[]} props.tasks - Array of tasks to display, should be pre-sorted by rank
 * @param {boolean} [props.showRank=true] - Show rank badges on cards
 * @param {'prominent' | 'compact'} [props.variant='compact'] - Display variant
 * @param {string} [props.className=''] - Optional CSS className
 * @param {boolean} [props.draggable=false] - Enable drag-and-drop reordering
 * @param {boolean} [props.editable=false] - Enable inline editing on cards
 * @param {function} [props.onTasksChange] - Callback after drag reorder completes
 * @param {function} [props.onComplete] - Callback when task marked complete
 * @param {function} [props.onDelete] - Callback when task deleted
 * @param {function} [props.onAddSubtask] - Callback when user clicks "Add Subtask"
 * @param {function} [props.hasSubtasks] - Function to check if task has children
 * @param {function} [props.isExpanded] - Function to check if task's children are visible
 * @param {function} [props.onToggleExpand] - Callback when user toggles expand/collapse
 * @returns {JSX.Element} Rendered task list component
 */
export default function TaskList({
  tasks,
  showRank = true,
  variant = 'compact',
  className = '',
  draggable = false,
  editable = false,
  onTasksChange,
  onComplete,
  onDelete,
  onAddSubtask,
  hasSubtasks,
  isExpanded,
  onToggleExpand,
}: TaskListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [items, setItems] = useState(tasks);

  const taskManager = useMemo(() => new TaskManager(), []);
  const storageService = useMemo(() => new StorageService(), []);

  // Update items when tasks prop changes
  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  // ============================================================================
  // DND-KIT SENSORS (T116: Accessibility Configuration)
  // ============================================================================

  /**
   * Configure drag sensors for @dnd-kit
   *
   * POINTER SENSOR:
   * - Handles mouse and touch dragging
   * - activationConstraint.distance = 8px
   * - Prevents accidental drags (user must drag 8px before activation)
   * - Allows clicks and taps to pass through
   *
   * KEYBOARD SENSOR:
   * - Handles keyboard-based dragging (Arrow keys, Space, Enter)
   * - sortableKeyboardCoordinates: Standard coordinate system
   * - Accessibility: Users can drag without mouse/touch
   * - Usage: Focus card, press Space, use arrows, press Space to drop
   *
   * WHY 8PX ACTIVATION?
   * - Prevents unintentional drags when clicking to edit/complete/delete
   * - Balances drag sensitivity with accidental activation
   * - Standard UX pattern for draggable lists
   */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ============================================================================
  // EVENT HANDLERS - DRAG AND DROP
  // ============================================================================

  /**
   * Handle drag start event
   *
   * BEHAVIOR:
   * - Stores dragged task ID in activeId state
   * - Triggers DragOverlay to show preview
   * - Called by DndContext when drag begins
   *
   * @param {DragStartEvent} event - DragStartEvent from @dnd-kit
   * @returns {void}
   */
  const handleDragStart = useCallback((event: DragStartEvent): void => {
    setActiveId(event.active.id as string);
  }, []);

  /**
   * Handle drag end event
   *
   * WORKFLOW:
   * 1. Validate drag operation (same parent check)
   * 2. Calculate new position in sibling list
   * 3. Optimistically update UI (arrayMove)
   * 4. Persist to storage (TaskManager.moveTask)
   * 5. Notify parent component (onTasksChange)
   * 6. On error: Revert UI to original state
   *
   * HIERARCHICAL CONSTRAINT:
   * Only allows dragging within same parentId (siblings).
   * Example:
   * - Can drag Task A (parentId=null) among other top-level tasks
   * - Cannot drag Task A into Task B's subtasks
   * - Can drag Subtask C (parentId=B) among B's other subtasks
   *
   * RANK CALCULATION:
   * newRank = newIndex in siblings array
   * Example:
   * - Siblings: [Task1, Task2, Task3, Task4]
   * - Drag Task4 to position 1 (after Task1)
   * - newRank = 1
   * - TaskManager shifts: Task2→rank2, Task3→rank3, Task4→rank1
   *
   * OPTIMISTIC UPDATE:
   * UI updates immediately (arrayMove), doesn't wait for storage.
   * If storage fails, UI reverts to original state.
   * Provides fast UX with error recovery.
   *
   * @async
   * @param {DragEndEvent} event - DragEndEvent from @dnd-kit
   * @returns {Promise<void>}
   */
  const handleDragEnd = useCallback(async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event;

    // Guard: No drop target or dropped on self
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    // Find dragged and target tasks
    const draggedTask = items.find((item) => item.id === active.id);
    const targetTask = items.find((item) => item.id === over.id);

    if (!draggedTask || !targetTask) {
      setActiveId(null);
      return;
    }

    // Hierarchical constraint: Only allow drag within same parent
    if (draggedTask.parentId !== targetTask.parentId) {
      console.warn('Cannot move task to different parent level');
      setActiveId(null);
      return;
    }

    // Get all sibling tasks (same parentId)
    const siblings = items.filter((item) => item.parentId === draggedTask.parentId);
    const oldIndex = siblings.findIndex((item) => item.id === draggedTask.id);
    const newIndex = siblings.findIndex((item) => item.id === targetTask.id);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      // === OPTIMISTIC UPDATE ===
      const newItems = arrayMove(items, items.indexOf(draggedTask), items.indexOf(targetTask));
      setItems(newItems);

      try {
        // === PERSIST TO STORAGE ===
        // newRank is the new position in siblings array
        const newRank = newIndex;
        await taskManager.moveTask(draggedTask.id, newRank);

        // === NOTIFY PARENT ===
        if (onTasksChange) {
          onTasksChange();
        }
      } catch (error) {
        console.error('Failed to move task:', error);
        // === REVERT ON ERROR ===
        setItems(items);
      }
    }

    setActiveId(null);
  }, [items, onTasksChange, taskManager]);

  /**
   * Handle drag cancel event
   *
   * BEHAVIOR:
   * - Clears activeId (hides DragOverlay)
   * - Called when user presses Escape or drag is cancelled
   * - No storage changes (drag was cancelled)
   *
   * @returns {void}
   */
  const handleDragCancel = useCallback((): void => {
    setActiveId(null);
  }, []);

  // ============================================================================
  // EVENT HANDLERS - TASK OPERATIONS
  // ============================================================================

  /**
   * Handle task edit save
   *
   * BEHAVIOR:
   * - Persists changes to StorageService
   * - Notifies parent to refresh task list
   * - Used by inline editing in TaskCard
   *
   * @async
   * @param {string} taskId - ID of task being edited
   * @param {Partial<Task>} updates - Partial task object with changed fields
   * @returns {Promise<void>}
   */
  const handleSave = useCallback(async (taskId: string, updates: Partial<Task>): Promise<void> => {
    await storageService.updateTask(taskId, updates);
    if (onTasksChange) {
      onTasksChange();
    }
  }, [onTasksChange, storageService]);

  /**
   * EMPTY STATE RENDERING
   *
   * Displayed when tasks array is empty (no tasks to display).
   *
   * UI ELEMENTS:
   * - Clipboard icon (SVG, 16x16, gray-300)
   * - Message: "No tasks to display"
   * - Centered layout with vertical padding
   *
   * USE CASES:
   * - User has no tasks yet (new user)
   * - All tasks filtered out (search/filter result)
   * - All tasks completed (if showing only incomplete)
   *
   * TESTABILITY:
   * data-testid="task-list-empty" for integration tests
   */
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500" data-testid="task-list-empty">
        <svg
          className="w-16 h-16 text-gray-300 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-lg font-medium">No tasks to display</p>
      </div>
    );
  }

  /**
   * ACTIVE TASK MEMOIZATION (Performance optimization - T116)
   *
   * Memoizes lookup of currently dragging task to prevent unnecessary re-renders.
   *
   * WHEN COMPUTED:
   * - Only when activeId or items array changes
   * - Not recomputed on other state changes (e.g., drag position)
   *
   * RETURN VALUE:
   * - Task object: When activeId is set and task found in items
   * - null: When no drag in progress (activeId is null) or task not found
   *
   * USAGE:
   * Used in DragOverlay to render the dragging task preview.
   * DragOverlay shows semi-transparent copy of task being dragged.
   *
   * PERFORMANCE IMPACT:
   * Without memoization, task lookup would run on every drag position update,
   * causing unnecessary array.find() calls (O(n) complexity).
   * With memoization, lookup only runs when drag starts/ends.
   *
   * REFERENCE:
   * T116 = Performance optimization ticket
   */
  const activeTask = useMemo(
    () => (activeId ? items.find((task) => task.id === activeId) : null),
    [activeId, items]
  );

  /**
   * DRAGGABLE LIST RENDERING
   *
   * Renders task list with drag-and-drop reordering enabled.
   * Uses @dnd-kit library for DND functionality.
   *
   * COMPONENT HIERARCHY:
   * DndContext (drag context provider)
   * └─ div.task-list (container)
   *    ├─ SortableContext (sortable items provider)
   *    │  └─ div.space-y-4 (vertical spacing)
   *    │     └─ SortableTaskCard[] (draggable task cards)
   *    ├─ DragOverlay (drag preview layer)
   *    │  └─ TaskCard (semi-transparent copy of dragging task)
   *    └─ div (task count indicator)
   *
   * DndContext PROPS:
   * - sensors: Pointer and keyboard sensors (configured above)
   * - collisionDetection: closestCenter algorithm (determines drop target)
   * - onDragStart: Sets activeId state (triggers DragOverlay)
   * - onDragEnd: Persists new position, validates constraints
   * - onDragCancel: Resets activeId on ESC or invalid drop
   *
   * SortableContext PROPS:
   * - items: Array of task IDs (must be strings for @dnd-kit)
   * - strategy: verticalListSortingStrategy (optimized for vertical lists)
   *
   * DragOverlay:
   * Portal-rendered overlay that follows cursor during drag.
   * Shows semi-transparent copy of dragging task (opacity-90, shadow-2xl).
   * Provides visual feedback separate from sortable list.
   *
   * TASK COUNT INDICATOR:
   * Shows "Showing N task(s)" below list.
   * Uses correct singular/plural form based on count.
   *
   * ACCESSIBILITY:
   * - Keyboard navigation via keyboard sensor (Arrow keys, Space, Enter)
   * - ARIA attributes from useSortable hook
   * - Screen reader announcements for drag operations
   *
   * TESTABILITY:
   * data-testid="task-list" for integration tests
   */
  if (draggable) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className={`task-list ${className}`} data-testid="task-list">
          <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {items.map((task) => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  showRank={showRank}
                  variant={variant}
                  editable={editable}
                  onSave={handleSave}
                  onComplete={onComplete}
                  onDelete={onDelete}
                  onAddSubtask={onAddSubtask}
                  hasSubtasks={hasSubtasks ? hasSubtasks(task.id) : undefined}
                  isExpanded={isExpanded ? isExpanded(task.id) : undefined}
                  onToggleExpand={onToggleExpand}
                />
              ))}
            </div>
          </SortableContext>

          {/* Drag overlay for visual feedback */}
          <DragOverlay>
            {activeTask ? (
              <div className="opacity-90 shadow-2xl">
                <TaskCard task={activeTask} showRank={showRank} variant={variant} />
              </div>
            ) : null}
          </DragOverlay>

          {/* Task count indicator */}
          <div className="mt-6 text-center text-sm text-gray-500">
            Showing {items.length} {items.length === 1 ? 'task' : 'tasks'}
          </div>
        </div>
      </DndContext>
    );
  }

  /**
   * NON-DRAGGABLE LIST RENDERING
   *
   * Renders static task list without drag-and-drop functionality.
   * Used when draggable=false (read-only, display-only contexts).
   *
   * COMPONENT HIERARCHY:
   * div.task-list (container)
   * ├─ div.space-y-4 (vertical spacing)
   * │  └─ div[] (wrapper for each task)
   * │     └─ TaskCard (static task card)
   * └─ div (task count indicator)
   *
   * HIERARCHICAL INDENTATION:
   * Each task wrapped in div with paddingLeft = task.depth × 32px
   * - depth=0: 0px (top-level tasks)
   * - depth=1: 32px (first-level subtasks)
   * - depth=2: 64px (second-level subtasks)
   * - etc.
   *
   * DIFFERENCES FROM DRAGGABLE LIST:
   * - No DndContext, SortableContext, DragOverlay
   * - No drag event handlers
   * - TaskCard used directly (not wrapped in SortableTaskCard)
   * - Manual indentation via paddingLeft (vs useSortable transform)
   *
   * CONDITIONAL onSave:
   * onSave passed only if editable=true, otherwise undefined.
   * Prevents edit functionality in read-only contexts.
   *
   * USE CASES:
   * - Read-only task views (e.g., completed tasks archive)
   * - Mobile views where drag-and-drop is disabled
   * - Print/export views
   * - Accessibility fallback for users who cannot drag
   *
   * TASK COUNT INDICATOR:
   * Shows "Showing N task(s)" below list.
   * Uses correct singular/plural form based on count.
   *
   * TESTABILITY:
   * data-testid="task-list" for integration tests
   * Same test ID as draggable list (UI tests can treat both uniformly)
   */
  return (
    <div className={`task-list ${className}`} data-testid="task-list">
      <div className="space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            style={{ paddingLeft: `${task.depth * 32}px` }}
          >
            <TaskCard
              task={task}
              showRank={showRank}
              variant={variant}
              editable={editable}
              onSave={editable ? handleSave : undefined}
              onComplete={onComplete}
              onDelete={onDelete}
              onAddSubtask={onAddSubtask}
              hasSubtasks={hasSubtasks ? hasSubtasks(task.id) : undefined}
              isExpanded={isExpanded ? isExpanded(task.id) : undefined}
              onToggleExpand={onToggleExpand}
            />
          </div>
        ))}
      </div>

      {/* Task count indicator */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Showing {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
      </div>
    </div>
  );
}

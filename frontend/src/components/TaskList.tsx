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

interface TaskListProps {
  /** Array of tasks to display, should be sorted by rank */
  tasks: Task[];
  /** Whether to show rank badges on each task card */
  showRank?: boolean;
  /** Display variant for task cards */
  variant?: 'prominent' | 'compact';
  /** Optional className for custom styling */
  className?: string;
  /** Enable drag-and-drop reordering */
  draggable?: boolean;
  /** Enable inline editing */
  editable?: boolean;
  /** Callback when tasks are reordered */
  onTasksChange?: () => void;
  /** Callback when task is completed (T074) */
  onComplete?: (taskId: string) => Promise<void>;
  /** Callback when task is deleted (T075) */
  onDelete?: (taskId: string) => Promise<void>;
  /** Callback when user wants to add a subtask */
  onAddSubtask?: (parentTask: Task) => void;
  /** Function to check if task has subtasks */
  hasSubtasks?: (taskId: string) => boolean;
  /** Function to check if task is expanded */
  isExpanded?: (taskId: string) => boolean;
  /** Callback when user toggles expand/collapse */
  onToggleExpand?: (taskId: string) => void;
}

/**
 * Sortable task card wrapper component
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calculate indentation based on depth (32px per level)
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

  // Drag-and-drop sensors (T116: configured for accessibility)
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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const draggedTask = items.find((item) => item.id === active.id);
    const targetTask = items.find((item) => item.id === over.id);

    if (!draggedTask || !targetTask) {
      setActiveId(null);
      return;
    }

    // Only allow drag within same parentId (same hierarchy level)
    if (draggedTask.parentId !== targetTask.parentId) {
      console.warn('Cannot move task to different parent level');
      setActiveId(null);
      return;
    }

    // Get all tasks with same parentId (siblings)
    const siblings = items.filter((item) => item.parentId === draggedTask.parentId);
    const oldIndex = siblings.findIndex((item) => item.id === draggedTask.id);
    const newIndex = siblings.findIndex((item) => item.id === targetTask.id);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      // Optimistically update UI
      const newItems = arrayMove(items, items.indexOf(draggedTask), items.indexOf(targetTask));
      setItems(newItems);

      try {
        // Calculate new rank within siblings
        const newRank = newIndex;
        await taskManager.moveTask(draggedTask.id, newRank);

        // Notify parent
        if (onTasksChange) {
          onTasksChange();
        }
      } catch (error) {
        console.error('Failed to move task:', error);
        // Revert on error
        setItems(items);
      }
    }

    setActiveId(null);
  }, [items, onTasksChange, taskManager]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleSave = useCallback(async (taskId: string, updates: Partial<Task>) => {
    await storageService.updateTask(taskId, updates);
    if (onTasksChange) {
      onTasksChange();
    }
  }, [onTasksChange, storageService]);

  // Empty state
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

  // Memoize active task lookup (T116)
  const activeTask = useMemo(
    () => (activeId ? items.find((task) => task.id === activeId) : null),
    [activeId, items]
  );

  // Draggable list
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

  // Non-draggable list
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

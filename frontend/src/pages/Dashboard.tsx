import { useTasks } from '@/hooks/useTasks';
import { useMemo, useState, useCallback } from 'react';
import TaskCard from '@/components/TaskCard';
import TaskList from '@/components/TaskList';
import LoadingSpinner from '@/components/LoadingSpinner';
import ShortcutHint from '@/components/ShortcutHint';
import { useNavigate } from 'react-router-dom';
import type { Task } from '@shared/Task';

/**
 * Dashboard page - displays the top priority task and its subtasks.
 *
 * Per US1: "A user opens the service to immediately see which task they
 * should work on right now. The system displays the single most important
 * task at the top of the interface, making the decision effortless."
 *
 * Features:
 * - Shows task with rank 0 (or lowest available rank) prominently
 * - Shows subtasks of the top task
 * - Loading state while fetching data (T109)
 * - Empty state when no tasks exist
 * - Error handling
 */
export default function Dashboard() {
  const { topTask, activeTasks, loading, error, completeTask, deleteTask, refresh } = useTasks();
  const navigate = useNavigate();

  // Track which subtasks are expanded (showing their own subtasks)
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());

  // Toggle expand/collapse for a subtask
  const toggleExpanded = useCallback((taskId: string) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  // Get subtasks for a given task
  const getSubtasks = useCallback(
    (taskId: string) => {
      return activeTasks
        .filter((t) => t.parentId === taskId)
        .sort((a, b) => a.rank - b.rank);
    },
    [activeTasks]
  );

  // Build hierarchical subtask list (for top task's subtasks only)
  const hierarchicalSubtasks = useMemo(() => {
    if (!topTask) return [];

    const directSubtasks = activeTasks
      .filter((task) => task.parentId === topTask.id)
      .sort((a, b) => a.rank - b.rank);

    const result: Task[] = [];

    // Helper function to add task and its subtasks recursively
    const addTaskWithSubtasks = (task: Task) => {
      result.push(task);

      // Only add subtasks if this task is expanded
      if (expandedTaskIds.has(task.id)) {
        const subtasks = getSubtasks(task.id);
        subtasks.forEach((subtask) => addTaskWithSubtasks(subtask));
      }
    };

    // Add all direct subtasks of top task with their nested subtasks
    directSubtasks.forEach((task) => addTaskWithSubtasks(task));

    return result;
  }, [topTask, activeTasks, expandedTaskIds, getSubtasks]);

  // Handler for adding subtask
  const handleAddSubtask = (parentTask: Task) => {
    navigate('/add', {
      state: {
        parentId: parentTask.id,
        depth: parentTask.depth + 1,
        parentTitle: parentTask.title,
      },
    });
  };

  // Loading state (T109)
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="loading-state">
        <LoadingSpinner size="large" text="Loading your top priority..." />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="bg-red-50 border border-red-200 rounded-lg p-6 text-center"
        data-testid="error-state"
      >
        <svg
          className="w-12 h-12 text-red-500 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to load tasks</h3>
        <p className="text-red-700">{error.message}</p>
      </div>
    );
  }

  // Empty state - no tasks
  if (!topTask) {
    return (
      <div className="text-center py-12" data-testid="empty-state">
        <div className="max-w-md mx-auto">
          <svg
            className="w-24 h-24 text-gray-300 mx-auto mb-6"
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
          <h2 className="text-2xl font-bold text-gray-900 mb-3">No tasks yet</h2>
          <p className="text-gray-600 mb-6">
            Add your first task to start prioritizing your work.
          </p>
          <ShortcutHint shortcutKey="n" description="Add new task">
            <button
              onClick={() => navigate('/add')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Add Your First Task
            </button>
          </ShortcutHint>
        </div>
      </div>
    );
  }

  // Top task display
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Top Priority</h2>
          <p className="text-gray-600">Focus on this task to make the most impact right now.</p>
        </div>
        <ShortcutHint shortcutKey="n" description="Add new task">
          <button
            onClick={() => navigate('/add')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>
        </ShortcutHint>
      </div>

      <div className="mb-8">
        <TaskCard
          task={topTask}
          showRank
          variant="prominent"
          onComplete={completeTask}
          onDelete={deleteTask}
          onAddSubtask={handleAddSubtask}
        />
      </div>

      {/* Subtasks Section */}
      {hierarchicalSubtasks.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Subtasks ({hierarchicalSubtasks.length})
          </h3>
          <TaskList
            tasks={hierarchicalSubtasks}
            showRank={true}
            variant="compact"
            draggable={false}
            editable={true}
            onTasksChange={refresh}
            onComplete={completeTask}
            onDelete={deleteTask}
            onAddSubtask={handleAddSubtask}
            hasSubtasks={(taskId) => getSubtasks(taskId).length > 0}
            isExpanded={(taskId) => expandedTaskIds.has(taskId)}
            onToggleExpand={toggleExpanded}
          />
        </div>
      )}

      <div className="mt-8 text-center">
        <button
          onClick={() => navigate('/tasks')}
          className="text-blue-600 font-medium hover:text-blue-700 transition-colors"
        >
          View all tasks →
        </button>
      </div>
    </div>
  );
}

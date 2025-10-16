import { useNavigate } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';

/**
 * AllTasks page - displays the complete task list sorted by priority.
 *
 * Per US3: "A user wants to see their complete task list, not just the top item.
 * The system displays all tasks sorted by priority, giving context about upcoming work."
 *
 * Features:
 * - Fetches all active tasks from storage
 * - Displays tasks in priority order (rank 0 first)
 * - Shows rank badges for each task
 * - Loading state while fetching data
 * - Empty state when no tasks exist
 * - Error handling
 * - Navigation back to dashboard
 * - Add new task button
 *
 * Per FR-001: Tasks are ordered by rank (0 = highest priority).
 */
export default function AllTasks() {
  const navigate = useNavigate();
  const { activeTasks, loading, error, refresh, completeTask, deleteTask } = useTasks();

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="loading-state">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
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
        <p className="text-red-700 mb-4">{error.message}</p>
        <button
          onClick={() => refresh()}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (activeTasks.length === 0) {
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
          <button
            onClick={() => navigate('/add')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Add Your First Task
          </button>
        </div>
      </div>
    );
  }

  // Main task list view
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Tasks</h1>
          <p className="text-gray-600">
            Your complete task list in priority order
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Dashboard
          </button>
          <button
            onClick={() => navigate('/add')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>
        </div>
      </div>

      {/* Task List */}
      <TaskList
        tasks={activeTasks}
        showRank={true}
        variant="compact"
        draggable={true}
        editable={true}
        onTasksChange={refresh}
        onComplete={completeTask}
        onDelete={deleteTask}
      />
    </div>
  );
}

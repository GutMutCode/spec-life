import { useTasks } from '@/hooks/useTasks';
import TaskCard from '@/components/TaskCard';
import { useNavigate } from 'react-router-dom';

/**
 * Dashboard page - displays the top priority task.
 *
 * Per US1: "A user opens the service to immediately see which task they
 * should work on right now. The system displays the single most important
 * task at the top of the interface, making the decision effortless."
 *
 * Features:
 * - Shows task with rank 0 (or lowest available rank) prominently
 * - Loading state while fetching data
 * - Empty state when no tasks exist
 * - Error handling
 */
export default function Dashboard() {
  const { topTask, loading, error, refresh, completeTask, deleteTask } = useTasks();
  const navigate = useNavigate();

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="loading-state">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Loading your top priority...</p>
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

  // Top task display
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Top Priority</h2>
          <p className="text-gray-600">Focus on this task to make the most impact right now.</p>
        </div>
        <button
          onClick={() => navigate('/add')}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </button>
      </div>

      <div className="mb-8">
        <TaskCard
          task={topTask}
          showRank
          variant="prominent"
          onComplete={completeTask}
          onDelete={deleteTask}
        />
      </div>

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

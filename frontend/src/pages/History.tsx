import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '@/services/StorageService';
import type { Task } from '@shared/Task';
import { formatDeadline } from '@/lib/utils';

/**
 * Format completion date relative to now (T116: memoization helper).
 */
function formatCompletionDate(date: Date | undefined): string {
  if (!date) return 'Unknown date';

  const now = new Date();
  const completedDate = new Date(date);
  const diffMs = now.getTime() - completedDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return completedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: completedDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * History page - displays completed tasks in reverse chronological order.
 *
 * Per US5: "A user completes a task and wants to see their history.
 * The system shows completed tasks in reverse chronological order."
 *
 * Features:
 * - Fetches completed tasks from storage
 * - Displays tasks in reverse chronological order (newest first)
 * - Shows completion date
 * - Loading state while fetching data
 * - Empty state when no completed tasks exist
 * - Error handling
 * - Navigation back to dashboard
 *
 * Per FR-023: "Completed tasks move to history with 90-day retention."
 * Per FR-024: "90-day retention for completed tasks."
 */
export default function History() {
  const navigate = useNavigate();
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    const fetchCompletedTasks = async () => {
      try {
        setLoading(true);
        setError(undefined);
        const storageService = new StorageService();
        const tasks = await storageService.getCompletedTasks();
        setCompletedTasks(tasks);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load completed tasks'));
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedTasks();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="loading-state">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Loading history...</p>
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
        <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to load history</h3>
        <p className="text-red-700">{error.message}</p>
      </div>
    );
  }

  // Empty state
  if (completedTasks.length === 0) {
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">No completed tasks yet</h2>
          <p className="text-gray-600 mb-6">
            Complete some tasks to see them appear here. Completed tasks are stored for 90 days.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Main history view
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Task History</h1>
          <p className="text-gray-600">
            Completed tasks from the last 90 days ({completedTasks.length} task
            {completedTasks.length === 1 ? '' : 's'})
          </p>
        </div>
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
      </div>

      {/* Completed tasks list */}
      <div className="space-y-4" data-testid="completed-tasks-list">
        {completedTasks.map((task) => (
          <div
            key={task.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            data-testid="completed-task-card"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Task info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {/* Checkmark icon */}
                  <div className="flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  {/* Title */}
                  <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                </div>

                {/* Description */}
                {task.description && (
                  <p className="text-gray-600 mb-2 ml-9">{task.description}</p>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-4 ml-9 text-sm text-gray-500">
                  {/* Completion date */}
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Completed {formatCompletionDate(task.completedAt)}</span>
                  </div>

                  {/* Original deadline (if existed) */}
                  {task.deadline && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>Deadline was {formatDeadline(task.deadline)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

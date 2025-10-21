import { useComparison } from '@/hooks/useComparison';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useEffect, useRef } from 'react';
import { getRelativeDeadlineText, truncateText } from '@/lib/utils';
import type { Task } from '@shared/Task';

interface ComparisonModalProps {
  isOpen: boolean;
  newTask: Partial<Task>;
  onComplete: (task: Task) => void;
  onCancel: () => void;
}

/**
 * Modal component for task comparison workflow (US2).
 *
 * Displays binary comparison questions to determine task priority:
 * - Shows new task vs existing task
 * - Collects user's priority judgment
 * - Supports skip to manual placement
 * - Shows progress (step count)
 * - Handles completion and cancellation
 *
 * Per FR-033: Max 10 comparison steps before auto-skip to manual placement.
 * Per FR-034: Displays both tasks with full details during comparison.
 */
export default function ComparisonModal({
  isOpen,
  newTask,
  onComplete,
  onCancel,
}: ComparisonModalProps) {
  const {
    isComparing,
    isPlacing,
    isComplete,
    currentTask,
    stepCount,
    currentRank,
    insertedTask,
    insertResult,
    error,
    existingTasks,
    start,
    answer,
    skip,
    place,
    cancel,
  } = useComparison();

  // Track previous isOpen value to detect open transition
  const prevIsOpenRef = useRef(false);

  // Handle cancel - if already complete, treat as close instead
  const handleCancel = () => {
    if (isComplete && insertedTask) {
      onComplete(insertedTask);
    } else {
      cancel();
      onCancel();
    }
  };

  // T113: Focus trap for modal accessibility
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen, handleCancel);

  // Initialize comparison when modal transitions from closed to open
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    // Start comparison only when transitioning from closed (false) to open (true)
    if (!wasOpen && isOpen) {
      start(newTask);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Note: We don't auto-call onComplete here anymore
  // User must click the Close button in the success screen

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      data-testid="comparison-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-modal-title"
      aria-describedby="comparison-modal-description"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        tabIndex={-1}
      >
        {/* Header - T112 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2
                id="comparison-modal-title"
                className="text-2xl font-bold text-gray-900"
              >
                {isComparing ? 'Compare Tasks' : isPlacing ? 'Choose Position' : 'Adding Task'}
              </h2>
              {isComparing && (
                <p
                  id="comparison-modal-description"
                  className="text-sm text-gray-600 mt-1"
                  aria-live="polite"
                >
                  Step {stepCount + 1} of 10 - Which task is more important?
                </p>
              )}
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              data-testid="cancel-button"
              aria-label={
                isComplete
                  ? "Close and return to dashboard"
                  : "Close comparison and cancel task creation"
              }
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Error State - T112 */}
        {error && (
          <div className="px-6 py-4 bg-red-50 border-b border-red-200" role="alert">
            <p className="text-red-800 font-medium">Error: {error.message}</p>
          </div>
        )}

        {/* Comparing State */}
        {isComparing && currentTask && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* New Task */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <h3 className="font-semibold text-gray-900">New Task</h3>
                </div>
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-lg text-gray-900 mb-2">{newTask.title}</h4>
                  {newTask.description && (
                    <p className="text-gray-700 text-sm mb-3" data-testid="new-task-description">
                      {truncateText(newTask.description, 100)}
                    </p>
                  )}
                  <div className="text-sm text-gray-600" data-testid="new-task-deadline">
                    <span className="font-medium">Deadline:</span>{' '}
                    {getRelativeDeadlineText(newTask.deadline)}
                  </div>
                </div>
                <button
                  onClick={() => answer('higher')}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  data-testid="answer-higher"
                  aria-label={`Mark "${newTask.title}" as more important than "${currentTask?.title}"`}
                >
                  This is MORE important
                </button>
              </div>

              {/* Existing Task */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <h3 className="font-semibold text-gray-900">Existing Task (Rank {currentRank})</h3>
                </div>
                <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-lg text-gray-900 flex-1">{currentTask.title}</h4>
                    <span
                      className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-semibold text-white shrink-0"
                      data-testid="existing-task-rank-badge"
                      style={{
                        backgroundColor:
                          currentTask.rank === 0
                            ? '#ef4444' // red
                            : currentTask.rank <= 3
                            ? '#f97316' // orange
                            : currentTask.rank <= 10
                            ? '#eab308' // yellow
                            : '#3b82f6', // blue
                      }}
                    >
                      #{currentTask.rank}
                    </span>
                  </div>
                  {currentTask.description && (
                    <p className="text-gray-700 text-sm mb-3" data-testid="existing-task-description">
                      {truncateText(currentTask.description, 100)}
                    </p>
                  )}
                  <div className="text-sm text-gray-600" data-testid="existing-task-deadline">
                    <span className="font-medium">Deadline:</span>{' '}
                    {getRelativeDeadlineText(currentTask.deadline)}
                  </div>
                </div>
                <button
                  onClick={() => answer('lower')}
                  className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                  data-testid="answer-lower"
                  aria-label={`Mark "${newTask.title}" as less important than "${currentTask?.title}"`}
                >
                  This is LESS important
                </button>
              </div>
            </div>

            {/* Skip Button - T112 */}
            <div className="mt-6 text-center">
              <button
                onClick={skip}
                className="text-gray-600 hover:text-gray-800 font-medium underline"
                data-testid="skip-button"
                aria-label="Skip comparison and manually choose task position"
              >
                Skip and choose position manually
              </button>
            </div>
          </div>
        )}

        {/* Placing State (Manual Placement) */}
        {isPlacing && (
          <div className="p-6">
            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                Choose where to place "{newTask.title}" in your priority list:
              </p>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {/* Rank 0 option always available - T112 */}
              <button
                onClick={() => place(0)}
                className="w-full text-left px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                data-testid="place-rank-0"
                aria-label={`Place "${newTask.title}" at top priority (Rank 0)`}
              >
                <div className="font-semibold text-gray-900">Place at top (Rank 0)</div>
                <div className="text-sm text-gray-600">Highest priority</div>
              </button>

              {/* Show other rank options based on existing tasks - T112 */}
              {Array.from({ length: Math.max(5, existingTasks.length) }, (_, i) => i + 1).map(
                (rank) => (
                  <button
                    key={rank}
                    onClick={() => place(rank)}
                    className="w-full text-left px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    data-testid={`place-rank-${rank}`}
                    aria-label={`Place "${newTask.title}" at rank ${rank}`}
                  >
                    <div className="font-semibold text-gray-900">Place at Rank {rank}</div>
                  </button>
                )
              )}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={handleCancel}
                className="text-gray-600 hover:text-gray-800 font-medium underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Complete State */}
        {isComplete && insertedTask && insertResult && (
          <div className="p-6 text-center">
            <div className="mb-4">
              <svg
                className="w-16 h-16 text-green-500 mx-auto"
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">Task Added Successfully!</h3>
            <div className="text-gray-700 mb-6 space-y-2">
              <p data-testid="insertion-summary">
                <span className="font-semibold">"{insertedTask.title}"</span> has been added at{' '}
                <span className="font-semibold">rank {insertedTask.rank}</span>.
              </p>
              {insertResult.shiftedCount > 0 && insertResult.shiftRange && (
                <p className="text-sm text-gray-600" data-testid="shift-feedback">
                  {insertResult.shiftedCount === 1 ? (
                    <>
                      Task at rank {insertResult.shiftRange.oldStart} moved to rank{' '}
                      {insertResult.shiftRange.oldStart + 1}.
                    </>
                  ) : (
                    <>
                      Tasks at ranks {insertResult.shiftRange.oldStart}-
                      {insertResult.shiftRange.newEnd - 1} moved down one position to ranks{' '}
                      {insertResult.shiftRange.oldStart + 1}-{insertResult.shiftRange.newEnd}.
                    </>
                  )}
                </p>
              )}
            </div>
            <button
              onClick={() => onComplete(insertedTask)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              data-testid="close-button"
              aria-label="Close comparison modal and return to dashboard"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

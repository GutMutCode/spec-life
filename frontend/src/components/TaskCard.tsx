import { useState, memo } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { Task } from '@shared/Task';
import { getPriorityColor, isOverdue, formatDeadline } from '@/lib/utils';
import { validateTaskTitle, validateDescription, validateDeadline } from '@/lib/validation';

interface TaskCardProps {
  task: Task;
  /** Show rank badge with priority color */
  showRank?: boolean;
  /** Display mode - 'prominent' for dashboard, 'compact' for lists */
  variant?: 'prominent' | 'compact';
  /** Enable edit mode */
  editable?: boolean;
  /** Callback when task is saved */
  onSave?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  /** Callback when task is completed (T074) */
  onComplete?: (taskId: string) => Promise<void>;
  /** Callback when task is deleted (T075) */
  onDelete?: (taskId: string) => Promise<void>;
  /** Callback when user wants to add a subtask */
  onAddSubtask?: (parentTask: Task) => void;
  /** Additional drag-and-drop props */
  dragHandleProps?: any;
  /** Is being dragged */
  isDragging?: boolean;
  /** Whether this task has subtasks */
  hasSubtasks?: boolean;
  /** Whether subtasks are expanded */
  isExpanded?: boolean;
  /** Callback when expand/collapse is toggled */
  onToggleExpand?: (taskId: string) => void;
}

/**
 * TaskCard component displays a single task with its details.
 *
 * Features:
 * - Title and description display
 * - Deadline with overdue indicator
 * - Optional rank badge with priority color coding
 * - Overdue styling (yellow border)
 * - Inline editing mode (T059, T060)
 * - Save/cancel handlers with validation
 * - Drag-and-drop support (T062, T064)
 * - Responsive design
 * - Memoized for performance (T115)
 */
function TaskCard({
  task,
  showRank = false,
  variant = 'compact',
  editable = false,
  onSave,
  onComplete,
  onDelete,
  onAddSubtask,
  dragHandleProps,
  isDragging = false,
  hasSubtasks = false,
  isExpanded = false,
  onToggleExpand,
}: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [editDeadline, setEditDeadline] = useState(
    task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : ''
  );
  const [editCollaborators, setEditCollaborators] = useState<string[]>(task.collaborators || []);
  const [collaboratorInput, setCollaboratorInput] = useState('');
  const [errors, setErrors] = useState<{ title?: string; description?: string; deadline?: string }>(
    {}
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const priorityColor = getPriorityColor(task.rank);
  const overdue = isOverdue(task.deadline);

  // Define handleDeleteCancel before useFocusTrap
  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  // T113: Focus trap for delete dialog
  const deleteDialogRef = useFocusTrap<HTMLDivElement>(showDeleteDialog, handleDeleteCancel);

  const addCollaborator = () => {
    const name = collaboratorInput.trim();
    if (name && !editCollaborators.includes(name)) {
      setEditCollaborators([...editCollaborators, name]);
      setCollaboratorInput('');
    }
  };

  const removeCollaborator = (name: string) => {
    setEditCollaborators(editCollaborators.filter((c) => c !== name));
  };

  const handleCollaboratorKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCollaborator();
    }
  };

  const handleEdit = () => {
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditDeadline(task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '');
    setEditCollaborators(task.collaborators || []);
    setCollaboratorInput('');
    setErrors({});
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
  };

  const handleSave = async () => {
    // Validate
    const newErrors: { title?: string; description?: string; deadline?: string } = {};

    const titleValidation = validateTaskTitle(editTitle);
    if (!titleValidation.valid) {
      newErrors.title = titleValidation.error;
    }

    if (editDescription) {
      const descValidation = validateDescription(editDescription);
      if (!descValidation.valid) {
        newErrors.description = descValidation.error;
      }
    }

    if (editDeadline) {
      const deadlineDate = new Date(editDeadline);
      const deadlineValidation = validateDeadline(deadlineDate);
      if (!deadlineValidation.valid) {
        newErrors.deadline = deadlineValidation.error;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Save
    setIsSaving(true);
    try {
      const updates: Partial<Task> = {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        deadline: editDeadline ? new Date(editDeadline) : undefined,
        collaborators: editCollaborators.length > 0 ? editCollaborators : undefined,
      };

      if (onSave) {
        await onSave(task.id, updates);
      }

      setIsEditing(false);
      setErrors({});
    } catch (error) {
      console.error('Failed to save task:', error);
      setErrors({ title: 'Failed to save. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!onComplete) return;

    setIsCompleting(true);
    try {
      await onComplete(task.id);
    } catch (error) {
      console.error('Failed to complete task:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(task.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const cardClasses = [
    'task-card',
    overdue && !isEditing && 'task-card-overdue',
    variant === 'prominent' && 'p-8',
    variant === 'compact' && 'p-4',
    isDragging && 'opacity-50',
    isEditing && 'ring-2 ring-blue-500',
  ]
    .filter(Boolean)
    .join(' ');

  // Edit mode
  if (isEditing) {
    return (
      <div className={cardClasses} data-testid="task-card-editing">
        <div className="space-y-4">
          {/* Title input */}
          <div>
            <label htmlFor={`edit-title-${task.id}`} className="block text-sm font-medium mb-1">
              Title
            </label>
            <input
              id={`edit-title-${task.id}`}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={200}
              data-testid="edit-title-input"
              aria-required="true"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? `edit-title-error-${task.id}` : undefined}
            />
            {errors.title && (
              <p
                id={`edit-title-error-${task.id}`}
                className="text-sm text-red-600 mt-1"
                data-testid="edit-title-error"
                role="alert"
              >
                {errors.title}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">{editTitle.length}/200</p>
          </div>

          {/* Description input */}
          <div>
            <label htmlFor={`edit-desc-${task.id}`} className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              id={`edit-desc-${task.id}`}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              rows={3}
              maxLength={2000}
              data-testid="edit-description-input"
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? `edit-desc-error-${task.id}` : undefined}
            />
            {errors.description && (
              <p
                id={`edit-desc-error-${task.id}`}
                className="text-sm text-red-600 mt-1"
                role="alert"
              >
                {errors.description}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">{editDescription.length}/2000</p>
          </div>

          {/* Deadline input */}
          <div>
            <label htmlFor={`edit-deadline-${task.id}`} className="block text-sm font-medium mb-1">
              Deadline
            </label>
            <input
              id={`edit-deadline-${task.id}`}
              type="date"
              value={editDeadline}
              onChange={(e) => setEditDeadline(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.deadline ? 'border-red-500' : 'border-gray-300'
              }`}
              data-testid="edit-deadline-input"
              aria-invalid={!!errors.deadline}
              aria-describedby={errors.deadline ? `edit-deadline-error-${task.id}` : undefined}
            />
            {errors.deadline && (
              <p
                id={`edit-deadline-error-${task.id}`}
                className="text-sm text-red-600 mt-1"
                role="alert"
              >
                {errors.deadline}
              </p>
            )}
          </div>

          {/* Collaborators input */}
          <div>
            <label htmlFor={`edit-collaborators-${task.id}`} className="block text-sm font-medium mb-1">
              Collaborators
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id={`edit-collaborators-${task.id}`}
                value={collaboratorInput}
                onChange={(e) => setCollaboratorInput(e.target.value)}
                onKeyPress={handleCollaboratorKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter name and press Enter"
                data-testid="edit-collaborator-input"
              />
              <button
                type="button"
                onClick={addCollaborator}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                data-testid="edit-add-collaborator-button"
                aria-label="Add collaborator"
              >
                Add
              </button>
            </div>
            {editCollaborators.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {editCollaborators.map((collaborator) => (
                  <span
                    key={collaborator}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    data-testid="edit-collaborator-tag"
                  >
                    {collaborator}
                    <button
                      type="button"
                      onClick={() => removeCollaborator(collaborator)}
                      className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                      aria-label={`Remove ${collaborator}`}
                      data-testid="edit-remove-collaborator-button"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
              data-testid="save-button"
              aria-label={isSaving ? 'Saving task changes' : 'Save task changes'}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 disabled:bg-gray-100 transition-colors"
              data-testid="cancel-button"
              aria-label="Cancel editing and discard changes"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // View mode
  return (
    <div className={cardClasses} data-testid="task-card">
      {/* Drag handle (if provided) - T112 */}
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing mb-2"
          data-testid="drag-handle"
          role="button"
          aria-label={`Drag to reorder task: ${task.title}`}
          tabIndex={0}
        >
          <svg
            className="w-5 h-5 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </div>
      )}

      {/* Header with title and rank badge */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2 flex-1">
          {/* Expand/Collapse button (only if has subtasks) */}
          {hasSubtasks && onToggleExpand && (
            <button
              onClick={() => onToggleExpand(task.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              aria-label={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
              data-testid="toggle-subtasks-button"
            >
              <svg
                className={`w-5 h-5 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          <h3
            className={`font-semibold ${
              variant === 'prominent' ? 'text-3xl' : 'text-xl'
            } text-gray-900`}
          >
            {task.title}
          </h3>
        </div>

        {showRank && (
          <span
            className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold bg-${priorityColor} text-white shrink-0`}
            data-testid="rank-badge"
            aria-label={`Priority rank ${task.rank}${
              task.rank === 0 ? ' - highest priority' :
              task.rank <= 3 ? ' - high priority' :
              task.rank <= 10 ? ' - medium priority' :
              ' - low priority'
            }`}
            style={{
              backgroundColor:
                task.rank === 0
                  ? '#ef4444' // red
                  : task.rank <= 3
                  ? '#f97316' // orange
                  : task.rank <= 10
                  ? '#eab308' // yellow
                  : '#3b82f6', // blue
            }}
          >
            #{task.rank}
          </span>
        )}
      </div>

      {/* Description */}
      {task.description && (
        <p
          className={`text-gray-600 mb-3 ${variant === 'prominent' ? 'text-lg' : 'text-base'}`}
        >
          {task.description}
        </p>
      )}

      {/* Deadline */}
      {task.deadline && (
        <div className="flex items-center gap-2 mb-3">
          <svg
            className={`w-4 h-4 ${overdue ? 'text-yellow-600' : 'text-gray-400'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span
            className={`text-sm ${overdue ? 'text-yellow-700 font-semibold' : 'text-gray-500'}`}
            data-testid="deadline-text"
          >
            {formatDeadline(task.deadline)}
          </span>
        </div>
      )}

      {/* Overdue indicator text */}
      {overdue && (
        <div className="mb-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800 font-medium">⚠️ This task is overdue</p>
        </div>
      )}

      {/* Collaborators */}
      {task.collaborators && task.collaborators.length > 0 && (
        <div className="mb-3">
          <p className="text-sm text-gray-500 mb-2">Collaborators:</p>
          <div className="flex flex-wrap gap-2">
            {task.collaborators.map((collaborator) => (
              <span
                key={collaborator}
                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                data-testid="collaborator-badge"
              >
                {collaborator}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        {/* Add Subtask button */}
        {onAddSubtask && (
          <button
            onClick={() => onAddSubtask(task)}
            className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
            data-testid="add-subtask-button"
            aria-label={`Add subtask to: ${task.title}`}
          >
            + Add Subtask
          </button>
        )}

        {/* Edit button (if editable) - T112 */}
        {editable && onSave && (
          <button
            onClick={handleEdit}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            data-testid="edit-button"
            aria-label={`Edit task: ${task.title}`}
          >
            Edit
          </button>
        )}

        {/* Complete button (T074, T112) */}
        {onComplete && (
          <button
            onClick={handleComplete}
            disabled={isCompleting}
            className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:bg-green-400 transition-colors"
            data-testid="complete-button"
            aria-label={isCompleting ? `Completing task: ${task.title}` : `Mark task complete: ${task.title}`}
            aria-busy={isCompleting}
          >
            {isCompleting ? 'Completing...' : 'Mark Complete'}
          </button>
        )}

        {/* Delete button (T075, T112) */}
        {onDelete && (
          <button
            onClick={handleDeleteClick}
            className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
            data-testid="delete-button"
            aria-label={`Delete task: ${task.title}`}
          >
            Delete
          </button>
        )}
      </div>

      {/* Delete confirmation dialog (T075, T112, T113) */}
      {showDeleteDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          data-testid="delete-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-dialog-title-${task.id}`}
          aria-describedby={`delete-dialog-desc-${task.id}`}
        >
          <div
            ref={deleteDialogRef}
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            data-testid="delete-dialog"
            tabIndex={-1}
          >
            <h3
              id={`delete-dialog-title-${task.id}`}
              className="text-lg font-semibold text-gray-900 mb-2"
            >
              Delete Task
            </h3>
            <p
              id={`delete-dialog-desc-${task.id}`}
              className="text-gray-600 mb-4"
            >
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 disabled:bg-gray-100 transition-colors"
                data-testid="delete-cancel-button"
                aria-label="Cancel deletion"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 disabled:bg-red-400 transition-colors"
                data-testid="delete-confirm-button"
                aria-label={isDeleting ? 'Deleting task...' : 'Confirm deletion'}
                aria-busy={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Memoized TaskCard component (T115).
 *
 * Only re-renders when task data or key props change.
 * Compares task properties deeply to prevent unnecessary re-renders.
 */
export default memo(TaskCard, (prevProps, nextProps) => {
  // Compare task object properties
  const taskEqual =
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.title === nextProps.task.title &&
    prevProps.task.description === nextProps.task.description &&
    prevProps.task.rank === nextProps.task.rank &&
    prevProps.task.deadline?.getTime() === nextProps.task.deadline?.getTime() &&
    prevProps.task.completedAt?.getTime() === nextProps.task.completedAt?.getTime() &&
    JSON.stringify(prevProps.task.collaborators) === JSON.stringify(nextProps.task.collaborators);

  // Compare primitive props
  const propsEqual =
    prevProps.showRank === nextProps.showRank &&
    prevProps.variant === nextProps.variant &&
    prevProps.editable === nextProps.editable &&
    prevProps.isDragging === nextProps.isDragging;

  // Return true to skip re-render, false to re-render
  return taskEqual && propsEqual;
});

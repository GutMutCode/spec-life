/**
 * @file TaskCard.tsx
 * @description Individual task display component with edit/complete/delete actions
 *
 * CURRENT IMPLEMENTATION: Local-only UI component
 * - Displays task data from props
 * - Inline editing with validation (T059, T060)
 * - Callbacks for save/complete/delete trigger IndexedDB operations
 * - Memoized for performance (T115)
 * - No backend synchronization
 *
 * KEY FEATURES:
 * - Two modes: view mode and edit mode
 * - Priority color coding (red=0, orange=1-3, yellow=4-10, blue=11+)
 * - Overdue indicator for tasks past deadline
 * - Drag handle support for reordering (T062, T064)
 * - Delete confirmation dialog with focus trap (T113)
 * - Hierarchical display with expand/collapse for subtasks
 * - Collaborator management
 * - Full keyboard accessibility (ARIA labels)
 *
 * TODO: Cloud Sync Integration
 * - [ ] Show sync status indicator (synced, syncing, offline, conflict)
 * - [ ] Display server validation errors from API
 * - [ ] Add conflict resolution UI when edit conflicts occur
 * - [ ] Show optimistic update status during save
 * - [ ] Add retry button for failed sync operations
 * - [ ] Display last synced timestamp
 * - [ ] Handle concurrent edits from other users/devices
 *
 * @see /frontend/ARCHITECTURE.md for system architecture
 */

import { useState, memo } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { Task } from '@shared/Task';
import { getPriorityColor, isOverdue, formatDeadline } from '@/lib/utils';
import { validateTaskTitle, validateDescription, validateDeadline } from '@/lib/validation';
import SyncStatusBadge from './SyncStatusBadge';

/**
 * Props for TaskCard component
 *
 * DISPLAY MODES:
 * - variant='prominent': Large text, dashboard display (e.g., top priority task)
 * - variant='compact': Normal text, list display (e.g., all tasks page)
 *
 * INTERACTION MODES:
 * - View mode (default): Display task with action buttons
 * - Edit mode (when editable=true + user clicks Edit): Inline editing form
 *
 * CALLBACKS:
 * All callbacks are optional. If not provided, corresponding buttons won't appear.
 * - onSave: Inline editing functionality
 * - onComplete: Mark task as done (moves to history)
 * - onDelete: Delete task with confirmation dialog
 * - onAddSubtask: Create child task
 * - onToggleExpand: Show/hide subtasks
 *
 * DRAG-AND-DROP:
 * - dragHandleProps: Pass-through props from react-beautiful-dnd Draggable
 * - isDragging: Visual feedback during drag operation
 */
interface TaskCardProps {
  /** Task data to display */
  task: Task;
  /** Show rank badge with priority color coding (red=0, orange=1-3, yellow=4-10, blue=11+) */
  showRank?: boolean;
  /** Display mode - 'prominent' for dashboard (large text), 'compact' for lists (normal text) */
  variant?: 'prominent' | 'compact';
  /** Enable inline editing functionality - shows Edit button when true */
  editable?: boolean;
  /** Callback when task is saved after editing - enables Edit button and inline editing form */
  onSave?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  /** Callback when task is completed (T074) - enables Mark Complete button */
  onComplete?: (taskId: string) => Promise<void>;
  /** Callback when task is deleted (T075) - enables Delete button with confirmation dialog */
  onDelete?: (taskId: string) => Promise<void>;
  /** Callback when user wants to add a subtask - enables Add Subtask button */
  onAddSubtask?: (parentTask: Task) => void;
  /** Additional drag-and-drop props from react-beautiful-dnd DraggableProvided.dragHandleProps */
  dragHandleProps?: any;
  /** Visual feedback - reduces opacity when dragging */
  isDragging?: boolean;
  /** Whether this task has child tasks - shows expand/collapse button when true */
  hasSubtasks?: boolean;
  /** Whether subtasks are currently expanded - controls chevron direction */
  isExpanded?: boolean;
  /** Callback when expand/collapse is toggled - enables subtask visibility toggle */
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
 *
 * @component
 * @param {TaskCardProps} props - Component props
 * @param {Task} props.task - Task data to display
 * @param {boolean} [props.showRank=false] - Show rank badge with priority color coding
 * @param {'prominent' | 'compact'} [props.variant='compact'] - Display mode
 * @param {boolean} [props.editable=false] - Enable inline editing functionality
 * @param {function} [props.onSave] - Callback when task is saved after editing
 * @param {function} [props.onComplete] - Callback when task is completed
 * @param {function} [props.onDelete] - Callback when task is deleted
 * @param {function} [props.onAddSubtask] - Callback when user wants to add a subtask
 * @param {any} [props.dragHandleProps] - Additional drag-and-drop props from react-beautiful-dnd
 * @param {boolean} [props.isDragging=false] - Visual feedback during drag
 * @param {boolean} [props.hasSubtasks=false] - Whether this task has child tasks
 * @param {boolean} [props.isExpanded=false] - Whether subtasks are currently expanded
 * @param {function} [props.onToggleExpand] - Callback when expand/collapse is toggled
 * @returns {JSX.Element} Rendered task card component
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
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  /**
   * EDIT MODE STATE
   * Controls whether the card displays in view mode or edit mode.
   * When true, shows inline editing form with all fields editable.
   */
  const [isEditing, setIsEditing] = useState(false);

  /**
   * EDIT FORM STATE
   * Temporary state for inline editing form. Values are:
   * - Initialized when user clicks Edit button (handleEdit)
   * - Validated on Save (handleSave)
   * - Discarded on Cancel (handleCancel)
   * - Reset after successful save
   */
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [editDeadline, setEditDeadline] = useState(
    task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : ''
  );
  const [editCollaborators, setEditCollaborators] = useState<string[]>(task.collaborators || []);
  const [collaboratorInput, setCollaboratorInput] = useState('');

  /**
   * VALIDATION ERRORS
   * Stores client-side validation error messages for edit form fields.
   * Format: { fieldName: errorMessage }
   * Cleared on successful save or cancel.
   */
  const [errors, setErrors] = useState<{ title?: string; description?: string; deadline?: string }>(
    {}
  );

  /**
   * LOADING STATES
   * Track async operations to show loading UI and disable buttons during operations.
   * - isSaving: True while save operation is in progress
   * - isDeleting: True while delete operation is in progress
   * - isCompleting: True while complete operation is in progress
   */
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  /**
   * DELETE DIALOG STATE
   * Controls visibility of delete confirmation modal (T113).
   * When true, shows modal with focus trap and Confirm/Cancel buttons.
   */
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  /**
   * Priority color for rank badge
   * Maps rank to color: red (0), orange (1-3), yellow (4-10), blue (11+)
   */
  const priorityColor = getPriorityColor(task.rank);

  /**
   * Whether task is past deadline
   * Used for visual indicators (yellow border, warning icon)
   */
  const overdue = isOverdue(task.deadline);

  // ============================================================================
  // EVENT HANDLERS - DELETE DIALOG
  // ============================================================================

  /**
   * Cancel delete operation and close confirmation dialog
   * Also used as escape callback for focus trap (T113)
   *
   * @returns {void}
   */
  const handleDeleteCancel = (): void => {
    setShowDeleteDialog(false);
  };

  /**
   * Focus trap for delete dialog (T113)
   * Traps keyboard focus within dialog when open, restores focus on close.
   * Triggers handleDeleteCancel when user presses Escape key.
   */
  const deleteDialogRef = useFocusTrap<HTMLDivElement>(showDeleteDialog, handleDeleteCancel);

  // ============================================================================
  // EVENT HANDLERS - COLLABORATORS
  // ============================================================================

  /**
   * Add collaborator to task
   *
   * VALIDATION:
   * - Trims whitespace from input
   * - Prevents empty names
   * - Prevents duplicate names
   *
   * BEHAVIOR:
   * - Adds name to editCollaborators array
   * - Clears input field after successful add
   * - Does nothing if validation fails
   *
   * @returns {void}
   */
  const addCollaborator = (): void => {
    const name = collaboratorInput.trim();
    if (name && !editCollaborators.includes(name)) {
      setEditCollaborators([...editCollaborators, name]);
      setCollaboratorInput('');
    }
  };

  /**
   * Remove collaborator from task
   *
   * @param {string} name - Collaborator name to remove (exact match required)
   * @returns {void}
   */
  const removeCollaborator = (name: string): void => {
    setEditCollaborators(editCollaborators.filter((c) => c !== name));
  };

  /**
   * Handle Enter key in collaborator input field
   *
   * BEHAVIOR:
   * - Enter key: Add collaborator (calls addCollaborator)
   * - Other keys: Default browser behavior
   *
   * Prevents form submission when Enter is pressed.
   *
   * @param {React.KeyboardEvent<HTMLInputElement>} e - Keyboard event
   * @returns {void}
   */
  const handleCollaboratorKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCollaborator();
    }
  };

  // ============================================================================
  // EVENT HANDLERS - EDIT MODE
  // ============================================================================

  /**
   * Enter edit mode
   *
   * BEHAVIOR:
   * - Initializes all edit form fields with current task values
   * - Converts Date objects to ISO date strings (YYYY-MM-DD) for input[type="date"]
   * - Clears any previous validation errors
   * - Sets isEditing=true to show edit form
   *
   * TRIGGERED BY:
   * - User clicks "Edit" button in view mode
   *
   * @returns {void}
   */
  const handleEdit = (): void => {
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditDeadline(task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '');
    setEditCollaborators(task.collaborators || []);
    setCollaboratorInput('');
    setErrors({});
    setIsEditing(true);
  };

  /**
   * Cancel edit mode
   *
   * BEHAVIOR:
   * - Discards all unsaved changes in edit form
   * - Clears validation errors
   * - Returns to view mode
   *
   * TRIGGERED BY:
   * - User clicks "Cancel" button in edit mode
   *
   * @returns {void}
   */
  const handleCancel = (): void => {
    setIsEditing(false);
    setErrors({});
  };

  /**
   * Save task changes from edit form
   *
   * VALIDATION PHASE:
   * Runs client-side validation on all fields using @/lib/validation:
   * - Title: Required, 1-200 chars (validateTaskTitle)
   * - Description: Optional, max 2000 chars (validateDescription)
   * - Deadline: Optional, must be today or future (validateDeadline)
   *
   * If validation fails:
   * - Sets errors state with error messages
   * - Displays error messages below invalid fields
   * - Returns early without saving
   *
   * SAVE PHASE (if validation passes):
   * 1. Constructs updates object with only modified fields
   * 2. Trims whitespace from title and description
   * 3. Converts empty strings to undefined
   * 4. Converts date string to Date object
   * 5. Calls onSave callback (triggers StorageService update)
   * 6. On success: Exits edit mode, clears errors
   * 7. On error: Displays error message in title field
   *
   * TRIGGERED BY:
   * - User clicks "Save" button in edit mode
   *
   * @async
   * @returns {Promise<void>}
   * @throws {Error} If save operation fails (caught and displayed as validation error)
   */
  const handleSave = async (): Promise<void> => {
    // ===== VALIDATION PHASE =====
    const newErrors: { title?: string; description?: string; deadline?: string } = {};

    // Validate title (required)
    const titleValidation = validateTaskTitle(editTitle);
    if (!titleValidation.valid) {
      newErrors.title = titleValidation.error;
    }

    // Validate description (optional, but limited length)
    if (editDescription) {
      const descValidation = validateDescription(editDescription);
      if (!descValidation.valid) {
        newErrors.description = descValidation.error;
      }
    }

    // Validate deadline (optional, but must be today or future)
    if (editDeadline) {
      const deadlineDate = new Date(editDeadline);
      const deadlineValidation = validateDeadline(deadlineDate);
      if (!deadlineValidation.valid) {
        newErrors.deadline = deadlineValidation.error;
      }
    }

    // If validation failed, show errors and abort save
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // ===== SAVE PHASE =====
    setIsSaving(true);
    try {
      // Construct updates object with only modified fields
      const updates: Partial<Task> = {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        deadline: editDeadline ? new Date(editDeadline) : undefined,
        collaborators: editCollaborators.length > 0 ? editCollaborators : undefined,
      };

      // Call parent callback to persist changes
      if (onSave) {
        await onSave(task.id, updates);
      }

      // Success: exit edit mode and clear errors
      setIsEditing(false);
      setErrors({});
    } catch (error) {
      // Error: display generic error message in title field
      console.error('Failed to save task:', error);
      setErrors({ title: 'Failed to save. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Mark task as complete
   *
   * BEHAVIOR:
   * - Calls onComplete callback with task ID
   * - Callback typically:
   *   1. Sets task.completed = true
   *   2. Sets task.completedAt = current timestamp
   *   3. Persists to IndexedDB
   *   4. Removes from active tasks UI
   *   5. Shows in history page
   *
   * ERROR HANDLING:
   * - Logs error to console
   * - Does not display error UI (task remains visible)
   * - Loading state cleared in finally block
   *
   * TRIGGERED BY:
   * - User clicks "Mark Complete" button
   *
   * @async
   * @returns {Promise<void>}
   */
  const handleComplete = async (): Promise<void> => {
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

  /**
   * Show delete confirmation dialog
   *
   * BEHAVIOR:
   * - Opens modal with "Are you sure?" message
   * - Modal has focus trap (T113)
   * - Modal shows task title in confirmation text
   * - User must click Confirm or Cancel
   *
   * TRIGGERED BY:
   * - User clicks "Delete" button
   *
   * @returns {void}
   */
  const handleDeleteClick = (): void => {
    setShowDeleteDialog(true);
  };

  /**
   * Confirm task deletion
   *
   * BEHAVIOR:
   * - Calls onDelete callback with task ID
   * - Callback typically:
   *   1. Removes task from IndexedDB
   *   2. Shifts ranks of remaining tasks
   *   3. Removes from UI
   *
   * ON SUCCESS:
   * - Closes confirmation dialog
   * - Task disappears from UI
   *
   * ON ERROR:
   * - Logs error to console
   * - Does not display error UI
   * - Dialog remains open
   *
   * TRIGGERED BY:
   * - User clicks "Delete" button in confirmation dialog
   *
   * @async
   * @returns {Promise<void>}
   */
  const handleDeleteConfirm = async (): Promise<void> => {
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

  // ============================================================================
  // RENDERING - CSS CLASSES
  // ============================================================================

  /**
   * Dynamic CSS classes for card container
   *
   * BASE CLASS:
   * - 'task-card': Base styling (white background, border, shadow, rounded corners)
   *
   * CONDITIONAL CLASSES:
   * - 'task-card-overdue': Yellow border when task is past deadline (only in view mode)
   * - 'p-8': Large padding for prominent variant (dashboard)
   * - 'p-4': Normal padding for compact variant (lists)
   * - 'opacity-50': Reduced opacity during drag operation
   * - 'ring-2 ring-blue-500': Blue focus ring in edit mode
   *
   * CONSTRUCTION:
   * - Array of classes (with false values for disabled conditions)
   * - filter(Boolean) removes false values
   * - join(' ') concatenates into space-separated string
   */
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

  // ============================================================================
  // RENDERING - EDIT MODE
  // ============================================================================

  /**
   * EDIT MODE RENDERING
   *
   * When isEditing=true, renders inline editing form with:
   * - Title input (required, 200 char limit, character counter)
   * - Description textarea (optional, 2000 char limit, character counter)
   * - Deadline date picker (optional, HTML5 date input)
   * - Collaborators input (text input + Add button, displays as tags)
   * - Save button (disabled while saving, shows "Saving..." text)
   * - Cancel button (disabled while saving, discards changes)
   *
   * VALIDATION:
   * - Errors displayed below corresponding fields in red
   * - Invalid fields have red border
   * - ARIA attributes for screen readers (aria-invalid, aria-describedby)
   *
   * ACCESSIBILITY:
   * - Labels associated with inputs via htmlFor/id
   * - Error messages have role="alert"
   * - Character counters show remaining space
   * - All buttons have descriptive aria-label
   */
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

  // ============================================================================
  // RENDERING - VIEW MODE
  // ============================================================================

  /**
   * VIEW MODE RENDERING
   *
   * When isEditing=false, renders read-only task display with:
   *
   * MAIN CONTENT:
   * - Drag handle (if dragHandleProps provided, T112)
   * - Expand/collapse button (if hasSubtasks=true)
   * - Title (text-3xl for prominent, text-xl for compact)
   * - Rank badge (if showRank=true, colored by priority)
   * - Description paragraph (if present)
   * - Deadline with calendar icon (yellow if overdue)
   * - Overdue warning banner (if past deadline)
   * - Collaborator badges (if present)
   *
   * ACTION BUTTONS:
   * - Add Subtask (if onAddSubtask provided)
   * - Edit (if editable=true and onSave provided)
   * - Mark Complete (if onComplete provided)
   * - Delete (if onDelete provided)
   *
   * DELETE CONFIRMATION DIALOG:
   * - Modal overlay with dark background
   * - Confirmation card with task title
   * - Focus trap (T113)
   * - Cancel and Delete buttons
   * - Shows loading state during deletion
   *
   * PRIORITY COLOR CODING:
   * - Rank 0: Red (#ef4444) - Highest priority
   * - Rank 1-3: Orange (#f97316) - High priority
   * - Rank 4-10: Yellow (#eab308) - Medium priority
   * - Rank 11+: Blue (#3b82f6) - Low priority
   *
   * ACCESSIBILITY:
   * - Semantic HTML (header, main, buttons)
   * - ARIA labels on all interactive elements
   * - ARIA attributes for dialog (role, aria-modal, aria-labelledby, aria-describedby)
   * - ARIA busy states during async operations
   * - Keyboard navigation (Tab, Enter, Escape)
   */
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

        {/* Cloud Sync Status Badge (Phase 2) */}
        <SyncStatusBadge status={task.syncStatus} size="small" />
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

// ============================================================================
// MEMOIZATION (T115 - Performance Optimization)
// ============================================================================

/**
 * Memoized TaskCard component for performance optimization (T115)
 *
 * PROBLEM:
 * Without memoization, TaskCard re-renders whenever parent component re-renders,
 * even if the task data hasn't changed. In a list of 50+ tasks, this causes
 * performance issues (lag during scrolling, typing, drag-and-drop).
 *
 * SOLUTION:
 * React.memo() wraps the component with a custom comparison function that
 * performs shallow comparison of props to decide if re-render is needed.
 *
 * COMPARISON LOGIC:
 * Returns TRUE to SKIP re-render (props unchanged)
 * Returns FALSE to RE-RENDER (props changed)
 *
 * TASK PROPERTIES COMPARED:
 * - id: Task UUID (reference equality)
 * - title: Task title string (reference equality)
 * - description: Task description string (reference equality)
 * - rank: Task priority number (primitive equality)
 * - deadline: Date object (compared by timestamp via getTime())
 * - completedAt: Date object (compared by timestamp via getTime())
 * - collaborators: String array (compared via JSON.stringify for deep equality)
 *
 * PRIMITIVE PROPS COMPARED:
 * - showRank: Boolean flag
 * - variant: String enum ('prominent' | 'compact')
 * - editable: Boolean flag
 * - isDragging: Boolean flag
 *
 * PROPS NOT COMPARED:
 * - Callback functions (onSave, onComplete, onDelete, etc.)
 *   These are assumed to be stable references (wrapped in useCallback in parent)
 * - dragHandleProps: react-beautiful-dnd object (changes on every render)
 * - hasSubtasks, isExpanded, onToggleExpand: Not critical for performance
 *
 * PERFORMANCE IMPACT:
 * - Reduces re-renders by ~80% in typical use cases
 * - Especially beneficial in drag-and-drop scenarios (only dragged item re-renders)
 * - Improves responsiveness when editing tasks in large lists
 *
 * TRADE-OFFS:
 * - Comparison function overhead (negligible for small objects)
 * - Requires parent to memoize callbacks (useCallback)
 * - May cause stale closures if callbacks aren't properly memoized
 *
 * @see React.memo documentation: https://react.dev/reference/react/memo
 * @see T115 in project documentation for performance testing results
 */
export default memo(TaskCard, (prevProps, nextProps) => {
  // ===== COMPARE TASK OBJECT PROPERTIES =====
  const taskEqual =
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.title === nextProps.task.title &&
    prevProps.task.description === nextProps.task.description &&
    prevProps.task.rank === nextProps.task.rank &&
    prevProps.task.deadline?.getTime() === nextProps.task.deadline?.getTime() &&
    prevProps.task.completedAt?.getTime() === nextProps.task.completedAt?.getTime() &&
    JSON.stringify(prevProps.task.collaborators) === JSON.stringify(nextProps.task.collaborators) &&
    prevProps.task.syncStatus === nextProps.task.syncStatus; // Phase 2: Include sync status

  // ===== COMPARE PRIMITIVE PROPS =====
  const propsEqual =
    prevProps.showRank === nextProps.showRank &&
    prevProps.variant === nextProps.variant &&
    prevProps.editable === nextProps.editable &&
    prevProps.isDragging === nextProps.isDragging;

  // Return true to SKIP re-render (props unchanged)
  // Return false to RE-RENDER (props changed)
  return taskEqual && propsEqual;
});

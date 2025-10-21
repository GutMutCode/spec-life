import { useState, FormEvent } from 'react';
import { validateTaskTitle, validateDescription, validateDeadline } from '@/lib/validation';
import type { Task } from '@shared/Task';

interface TaskFormProps {
  onSubmit: (taskData: Partial<Task>) => void;
  onCancel: () => void;
  initialData?: Partial<Task>;
}

interface FormErrors {
  title?: string;
  description?: string;
  deadline?: string;
}

/**
 * Form component for creating/editing tasks.
 *
 * Features:
 * - Title input (required, max 200 chars)
 * - Description textarea (optional, max 2000 chars)
 * - Deadline date picker (optional, must be future date)
 * - Real-time validation with error messages
 * - Character count indicators
 * - Accessible form labels and error messages
 *
 * Per FR-031: Validates all inputs before submission.
 * Per FR-032: Provides clear error feedback.
 */
export default function TaskForm({ onSubmit, onCancel, initialData }: TaskFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [deadline, setDeadline] = useState(
    initialData?.deadline ? new Date(initialData.deadline).toISOString().split('T')[0] : ''
  );
  const [collaborators, setCollaborators] = useState<string[]>(initialData?.collaborators || []);
  const [collaboratorInput, setCollaboratorInput] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  /**
   * Adds a collaborator from the input field.
   */
  const addCollaborator = () => {
    const name = collaboratorInput.trim();
    if (name && !collaborators.includes(name)) {
      setCollaborators([...collaborators, name]);
      setCollaboratorInput('');
    }
  };

  /**
   * Removes a collaborator by name.
   */
  const removeCollaborator = (name: string) => {
    setCollaborators(collaborators.filter((c) => c !== name));
  };

  /**
   * Handles key press in collaborator input (Enter to add).
   */
  const handleCollaboratorKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCollaborator();
    }
  };

  /**
   * Validates all form fields and returns true if valid.
   */
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate title
    const titleValidation = validateTaskTitle(title);
    if (!titleValidation.valid) {
      newErrors.title = titleValidation.error;
    }

    // Validate description if provided
    if (description) {
      const descValidation = validateDescription(description);
      if (!descValidation.valid) {
        newErrors.description = descValidation.error;
      }
    }

    // Validate deadline if provided
    if (deadline) {
      const deadlineDate = new Date(deadline);
      const deadlineValidation = validateDeadline(deadlineDate);
      if (!deadlineValidation.valid) {
        newErrors.deadline = deadlineValidation.error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles form submission with validation.
   */
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const taskData: Partial<Task> = {
      title: title.trim(),
      description: description.trim() || undefined,
      deadline: deadline ? new Date(deadline) : undefined,
      collaborators: collaborators.length > 0 ? collaborators : undefined,
    };

    onSubmit(taskData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      data-testid="task-form"
      aria-label="Create new task form"
    >
      {/* Title Field - T112 */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Task Title <span className="text-red-500" aria-label="required">*</span>
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.title ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter task title"
          maxLength={200}
          data-testid="title-input"
          aria-required="true"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
        />
        <div className="flex justify-between mt-1">
          <div>
            {errors.title && (
              <p
                id="title-error"
                className="text-sm text-red-600"
                data-testid="title-error"
                role="alert"
              >
                {errors.title}
              </p>
            )}
          </div>
          <p className="text-sm text-gray-500" aria-label={`${title.length} of 200 characters used`}>
            {title.length}/200
          </p>
        </div>
      </div>

      {/* Description Field - T112 */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Add more details about this task"
          rows={4}
          maxLength={2000}
          data-testid="description-input"
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'description-error' : undefined}
        />
        <div className="flex justify-between mt-1">
          <div>
            {errors.description && (
              <p
                id="description-error"
                className="text-sm text-red-600"
                data-testid="description-error"
                role="alert"
              >
                {errors.description}
              </p>
            )}
          </div>
          <p className="text-sm text-gray-500" aria-label={`${description.length} of 2000 characters used`}>
            {description.length}/2000
          </p>
        </div>
      </div>

      {/* Deadline Field - T112 */}
      <div>
        <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
          Deadline <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="date"
          id="deadline"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.deadline ? 'border-red-500' : 'border-gray-300'
          }`}
          data-testid="deadline-input"
          aria-invalid={!!errors.deadline}
          aria-describedby={errors.deadline ? 'deadline-error' : undefined}
        />
        {errors.deadline && (
          <p
            id="deadline-error"
            className="text-sm text-red-600 mt-1"
            data-testid="deadline-error"
            role="alert"
          >
            {errors.deadline}
          </p>
        )}
      </div>

      {/* Collaborators Field */}
      <div>
        <label htmlFor="collaborator-input" className="block text-sm font-medium text-gray-700 mb-2">
          Collaborators <span className="text-gray-400">(optional)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            id="collaborator-input"
            value={collaboratorInput}
            onChange={(e) => setCollaboratorInput(e.target.value)}
            onKeyPress={handleCollaboratorKeyPress}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter name and press Enter"
            data-testid="collaborator-input"
          />
          <button
            type="button"
            onClick={addCollaborator}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            data-testid="add-collaborator-button"
            aria-label="Add collaborator"
          >
            Add
          </button>
        </div>
        {collaborators.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {collaborators.map((collaborator) => (
              <span
                key={collaborator}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                data-testid="collaborator-tag"
              >
                {collaborator}
                <button
                  type="button"
                  onClick={() => removeCollaborator(collaborator)}
                  className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                  aria-label={`Remove ${collaborator}`}
                  data-testid="remove-collaborator-button"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Form Actions - T112 */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          data-testid="submit-button"
          aria-label="Submit task and continue to priority comparison"
        >
          Continue to Comparison
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          data-testid="cancel-button"
          aria-label="Cancel task creation and return to dashboard"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

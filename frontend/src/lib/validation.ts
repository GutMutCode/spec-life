/**
 * Validation functions for task input fields.
 *
 * These enforce the constraints defined in spec.md:
 * - FR-004: Title max 200 chars
 * - FR-006: Description max 2000 chars
 * - FR-017: Deadline must be future date
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates task title meets requirements.
 *
 * Rules:
 * - Must not be empty (after trimming whitespace)
 * - Must not exceed 200 characters
 *
 * @param title - The task title to validate
 * @returns ValidationResult with valid flag and optional error message
 */
export const validateTaskTitle = (title: string): ValidationResult => {
  const trimmed = title.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Title is required' };
  }

  if (title.length > 200) {
    return { valid: false, error: 'Title must not exceed 200 characters' };
  }

  return { valid: true };
};

/**
 * Validates task description meets requirements.
 *
 * Rules:
 * - Optional field (undefined/empty is valid)
 * - If provided, must not exceed 2000 characters
 *
 * @param description - The task description to validate (optional)
 * @returns ValidationResult with valid flag and optional error message
 */
export const validateDescription = (description?: string): ValidationResult => {
  if (!description) return { valid: true };

  if (description.length > 2000) {
    return { valid: false, error: 'Description must not exceed 2000 characters' };
  }

  return { valid: true };
};

/**
 * Validates deadline is a future date.
 *
 * Rules:
 * - Optional field (undefined is valid)
 * - If provided, must be >= current date (not in the past)
 *
 * @param deadline - The deadline date to validate (optional)
 * @returns ValidationResult with valid flag and optional error message
 */
export const validateDeadline = (deadline?: Date): ValidationResult => {
  if (!deadline) return { valid: true };

  const now = new Date();
  // Compare date only (ignore time) to avoid timezone issues
  const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (deadlineDate < todayDate) {
    return { valid: false, error: 'Deadline cannot be in the past' };
  }

  return { valid: true };
};

/**
 * Utility functions for task management UI.
 */

/**
 * Maps task rank to priority color class.
 *
 * Color mapping (per FR-014 and tailwind.config.js):
 * - Rank 0: Red (highest priority)
 * - Ranks 1-3: Orange (high priority)
 * - Ranks 4-10: Yellow (medium priority)
 * - Ranks 11+: Blue (low priority)
 *
 * @param rank - Task priority rank (0 = highest)
 * @returns Tailwind CSS color class name
 */
export const getPriorityColor = (rank: number): string => {
  if (rank === 0) return 'priority-highest'; // red
  if (rank >= 1 && rank <= 3) return 'priority-high'; // orange
  if (rank >= 4 && rank <= 10) return 'priority-medium'; // yellow
  return 'priority-low'; // blue (11+)
};

/**
 * Determines if a task's deadline has passed.
 *
 * Compares deadline date (ignoring time) to current date.
 * Returns false if no deadline is set.
 *
 * @param deadline - Optional deadline date
 * @returns true if deadline is in the past, false otherwise
 */
export const isOverdue = (deadline?: Date): boolean => {
  if (!deadline) return false;

  const now = new Date();
  const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return deadlineDate < todayDate;
};

/**
 * Formats a date to a human-readable string.
 *
 * @param date - Date to format
 * @returns Formatted date string (e.g., "Jan 15, 2025")
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

/**
 * Formats a deadline with overdue indicator.
 *
 * @param deadline - Deadline date
 * @returns Formatted string with "(overdue)" suffix if past
 */
export const formatDeadline = (deadline: Date): string => {
  const formatted = formatDate(deadline);
  return isOverdue(deadline) ? `${formatted} (overdue)` : formatted;
};

/**
 * Generates a unique task ID using UUID v4.
 *
 * @returns UUID string
 */
export const generateTaskId = (): string => {
  return crypto.randomUUID();
};

/**
 * Clamps a value between min and max bounds.
 *
 * @param value - Value to clamp
 * @param min - Minimum bound
 * @param max - Maximum bound
 * @returns Clamped value
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Formats a deadline as relative time (e.g., "Due in 3 days", "Due tomorrow").
 *
 * Per T042A requirement for comparison modal deadline display.
 *
 * @param deadline - Optional deadline date
 * @returns Relative time string or "No deadline" if undefined
 */
export const getRelativeDeadlineText = (deadline?: Date): string => {
  if (!deadline) return 'No deadline';

  const now = new Date();
  const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = deadlineDate.getTime() - todayDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return absDays === 1 ? 'Overdue by 1 day' : `Overdue by ${absDays} days`;
  } else if (diffDays === 0) {
    return 'Due today';
  } else if (diffDays === 1) {
    return 'Due tomorrow';
  } else if (diffDays <= 7) {
    return `Due in ${diffDays} days`;
  } else if (diffDays <= 30) {
    const weeks = Math.ceil(diffDays / 7);
    return weeks === 1 ? 'Due in 1 week' : `Due in ${weeks} weeks`;
  } else {
    const months = Math.ceil(diffDays / 30);
    return months === 1 ? 'Due in 1 month' : `Due in ${months} months`;
  }
};

/**
 * Truncates text to a maximum length, adding ellipsis if truncated.
 *
 * Per T042A requirement for description snippet display (max 100 chars).
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length (default 100)
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

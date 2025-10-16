/**
 * Task entity representing a user task with priority ranking.
 *
 * Priority is determined by the `rank` field:
 * - 0 = highest priority (only one task can have rank 0)
 * - Lower ranks = higher priority
 * - Sequential integers (no gaps)
 */
export interface Task {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Task title (max 200 characters) */
  title: string;

  /** Optional detailed description (max 2000 characters) */
  description?: string;

  /** Optional deadline (informational only, not used for ranking algorithm) */
  deadline?: Date;

  /** Priority rank: 0 = highest, sequential integers */
  rank: number;

  /** Completion status */
  completed: boolean;

  /** Timestamp when task was completed (set when completed=true) */
  completedAt?: Date;

  /** Timestamp when task was created */
  createdAt: Date;

  /** Timestamp when task was last modified */
  updatedAt: Date;

  /** User ID for cloud sync (optional, used in Phase 8) */
  userId?: string;
}

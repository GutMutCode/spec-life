/**
 * Task entity representing a user task with priority ranking and hierarchical structure.
 *
 * Priority is determined by the `rank` field:
 * - 0 = highest priority (only one task can have rank 0 within the same parent)
 * - Lower ranks = higher priority
 * - Sequential integers (no gaps)
 * - Ranks are scoped to tasks with the same parentId
 *
 * Hierarchy is determined by the `parentId` and `depth` fields:
 * - parentId = null: Top-level task
 * - parentId = task ID: Subtask of that task
 * - depth = 0: Top-level, 1: First level subtask, 2: Second level subtask, etc.
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

  /** Priority rank within the same parent: 0 = highest, sequential integers */
  rank: number;

  /** Parent task ID (null for top-level tasks) */
  parentId: string | null;

  /** Hierarchy depth (0 = top-level, 1 = first subtask, 2 = second subtask, etc.) */
  depth: number;

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

  /** List of collaborators working on this task */
  collaborators?: string[];
}

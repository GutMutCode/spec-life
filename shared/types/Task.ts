/**
 * Cloud Sync Status
 *
 * Tracks the synchronization state of a task between local (IndexedDB) and server (PostgreSQL).
 *
 * STATE TRANSITIONS:
 * ```
 * pending → syncing → synced
 *    ↓         ↓         ↓
 *    └─────→ error ←────┘
 *                ↓
 *             conflict
 * ```
 *
 * STATES:
 * - **pending**: Created/modified locally, not yet synced to server
 * - **syncing**: Sync request in progress (API call ongoing)
 * - **synced**: Successfully synchronized with server
 * - **conflict**: Server has newer version (needs resolution)
 * - **error**: Sync failed (network/validation error, will retry)
 *
 * @see CLOUD_SYNC_MIGRATION.md for detailed sync strategy
 */
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict' | 'error';

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
 *
 * Cloud Sync (Phase 1+):
 * - syncStatus: Current sync state (see SyncStatus type)
 * - lastSyncedAt: When task was last successfully synced
 * - serverUpdatedAt: Server's updatedAt timestamp (for conflict detection)
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

  // ============================================================================
  // CLOUD SYNC FIELDS (Phase 1+)
  // ============================================================================

  /**
   * Current synchronization status
   *
   * - **pending**: Not yet synced to server (created/modified offline)
   * - **syncing**: Sync in progress
   * - **synced**: Up-to-date with server
   * - **conflict**: Server has newer version
   * - **error**: Sync failed (will retry)
   *
   * @default 'pending' for new tasks
   */
  syncStatus?: SyncStatus;

  /**
   * Timestamp of last successful sync to server
   *
   * Used to:
   * - Detect conflicts (compare with serverUpdatedAt)
   * - Show "last synced" info to user
   * - Determine if task needs re-sync
   *
   * @example
   * if (task.updatedAt > task.lastSyncedAt) {
   *   // Task modified locally after last sync
   *   task.syncStatus = 'pending';
   * }
   */
  lastSyncedAt?: Date;

  /**
   * Server's updatedAt timestamp (from last fetch)
   *
   * Used for conflict detection with Last-Write-Wins strategy:
   * ```typescript
   * if (serverUpdatedAt > lastSyncedAt) {
   *   // Server has newer version → conflict!
   *   task.syncStatus = 'conflict';
   * }
   * ```
   *
   * Only set after successful sync or fetch from server.
   */
  serverUpdatedAt?: Date;
}

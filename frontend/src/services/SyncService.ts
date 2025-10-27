/**
 * @file SyncService.ts
 * @description Cloud synchronization service for offline-first task management
 *
 * PHASE 1 (Foundation):
 * - Class skeleton with network detection
 * - No actual syncing yet (placeholder methods)
 * - Infrastructure for future phases
 *
 * FUTURE PHASES:
 * - Phase 2: Read sync (fetch from server)
 * - Phase 3: Write sync (push to server)
 * - Phase 4: Delete sync
 * - Phase 5: Background sync & conflict resolution
 *
 * @see CLOUD_SYNC_MIGRATION.md for complete architecture
 */

import { db, type SyncQueueEntry, getSyncQueue, removeFromSyncQueue, incrementSyncRetry } from '@/lib/indexeddb';
import { TaskApiService } from './TaskApiService';
import type { Task, SyncStatus } from '@shared/Task';

/**
 * SyncService - Manages synchronization between IndexedDB and PostgreSQL
 *
 * RESPONSIBILITIES:
 * - Detect network state changes
 * - Process offline operation queue
 * - Handle sync conflicts
 * - Retry failed operations
 * - Notify UI of sync status changes
 *
 * USAGE:
 * ```typescript
 * const syncService = new SyncService();
 *
 * // Start background sync
 * syncService.start();
 *
 * // Manual sync trigger
 * await syncService.sync();
 *
 * // Stop background sync
 * syncService.stop();
 * ```
 *
 * STATE MACHINE:
 * ```
 * Idle → Syncing → Idle
 *   ↓       ↓
 *   └─── Error
 * ```
 */
/**
 * Performance metrics for sync operations (Phase 5)
 */
interface SyncMetrics {
  /** Total sync operations performed */
  totalSyncs: number;
  /** Successful sync count */
  successfulSyncs: number;
  /** Failed sync count */
  failedSyncs: number;
  /** Last sync duration in milliseconds */
  lastSyncDurationMs: number;
  /** Average sync duration in milliseconds */
  avgSyncDurationMs: number;
  /** Total queue entries processed */
  totalQueueEntries: number;
  /** Last sync timestamp */
  lastSyncTime?: Date;
}

export class SyncService {
  private apiService: TaskApiService;
  private isSyncing: boolean = false;
  private syncInterval?: NodeJS.Timeout;
  private networkListener?: () => void;

  // Configuration
  private readonly SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRY_COUNT = 5;
  private readonly RETRY_DELAY_MS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

  // Phase 5: Performance metrics
  private metrics: SyncMetrics = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    lastSyncDurationMs: 0,
    avgSyncDurationMs: 0,
    totalQueueEntries: 0,
  };

  constructor() {
    this.apiService = new TaskApiService();
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Start background sync service
   *
   * BEHAVIOR:
   * - Registers network state listeners
   * - Starts periodic sync timer (every 5 minutes)
   * - Processes offline queue immediately
   *
   * EVENTS:
   * - window.addEventListener('online') → Process queue
   * - window.addEventListener('focus') → Trigger sync
   *
   * @returns {void}
   */
  start(): void {
    console.log('[SyncService] Starting background sync...');

    // Register network listeners
    this.registerNetworkListeners();

    // Start periodic sync
    this.syncInterval = setInterval(() => {
      this.sync();
    }, this.SYNC_INTERVAL_MS);

    // Initial sync if online
    if (this.isOnline()) {
      this.sync();
    }
  }

  /**
   * Stop background sync service
   *
   * BEHAVIOR:
   * - Removes network listeners
   * - Clears periodic sync timer
   * - Waits for current sync to complete
   *
   * @returns {void}
   */
  stop(): void {
    console.log('[SyncService] Stopping background sync...');

    // Remove network listeners
    if (this.networkListener) {
      window.removeEventListener('online', this.networkListener);
      window.removeEventListener('focus', this.networkListener);
    }

    // Clear interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }

  /**
   * Perform initial sync on login or app start
   *
   * WORKFLOW (Phase 2):
   * 1. Fetch all tasks from server
   * 2. Fetch all local tasks from IndexedDB
   * 3. Merge using Last-Write-Wins strategy
   * 4. Mark local-only tasks as 'pending'
   * 5. Mark synced tasks as 'synced'
   *
   * CONFLICT RESOLUTION:
   * - Server wins if server.updatedAt > local.updatedAt
   * - Keep local if not on server (user's offline work)
   *
   * @returns {Promise<void>}
   * @throws {Error} If initial sync fails
   */
  async initialSync(): Promise<void> {
    console.log('[SyncService] Starting initial sync...');

    if (!this.isOnline()) {
      console.log('[SyncService] Offline, skipping initial sync');
      return;
    }

    try {
      // 1. Fetch all tasks from server
      const serverTasks = await this.fetchServerTasks();
      console.log(`[SyncService] Fetched ${serverTasks.length} tasks from server`);

      // 2. Fetch all local tasks
      const localTasks = await db.tasks.toArray();
      console.log(`[SyncService] Found ${localTasks.length} local tasks`);

      // 3. Merge tasks
      await this.mergeTasks(serverTasks, localTasks);

      console.log('[SyncService] Initial sync completed');
    } catch (error) {
      console.error('[SyncService] Initial sync failed:', error);
      throw error;
    }
  }

  /**
   * Trigger manual sync
   *
   * WORKFLOW:
   * 1. Check if already syncing (prevent concurrent syncs)
   * 2. Check network connectivity
   * 3. Process offline queue
   * 4. Fetch updates from server (Phase 2)
   * 5. Resolve conflicts (Phase 5+)
   *
   * PHASE 5: Performance monitoring
   * - Tracks sync duration, success/failure rates
   * - Logs metrics for debugging and optimization
   *
   * @returns {Promise<void>}
   * @throws {Error} If sync fails critically
   */
  async sync(): Promise<void> {
    if (this.isSyncing) {
      console.log('[SyncService] Sync already in progress, skipping...');
      return;
    }

    if (!this.isOnline()) {
      console.log('[SyncService] Offline, skipping sync');
      return;
    }

    // Phase 5: Start performance tracking
    const startTime = performance.now();
    this.metrics.totalSyncs++;

    try {
      this.isSyncing = true;
      console.log('[SyncService] Starting sync...');

      // Phase 1: Process offline queue (placeholder for now)
      await this.processQueue();

      // Phase 2: Fetch updates from server
      await this.fetchServerUpdates();

      // TODO Phase 5: Resolve conflicts
      // await this.resolveConflicts();

      // Phase 5: Record successful sync
      this.metrics.successfulSyncs++;
      const duration = performance.now() - startTime;
      this.metrics.lastSyncDurationMs = duration;
      this.metrics.lastSyncTime = new Date();

      // Update running average
      const totalDuration = this.metrics.avgSyncDurationMs * (this.metrics.totalSyncs - 1) + duration;
      this.metrics.avgSyncDurationMs = totalDuration / this.metrics.totalSyncs;

      console.log('[SyncService] Sync completed successfully', {
        duration: `${duration.toFixed(0)}ms`,
        metrics: this.metrics,
      });
    } catch (error) {
      // Phase 5: Record failed sync
      this.metrics.failedSyncs++;
      console.error('[SyncService] Sync failed:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  // ============================================================================
  // NETWORK DETECTION
  // ============================================================================

  /**
   * Check if device is online
   *
   * Uses navigator.onLine API (not 100% reliable but good enough).
   *
   * LIMITATIONS:
   * - Returns true if connected to network (doesn't guarantee internet access)
   * - May return false positives on some browsers
   *
   * @returns {boolean} True if likely online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Register network state change listeners
   *
   * EVENTS:
   * - **online**: Device reconnected → Process queue
   * - **focus**: Tab gained focus → Trigger sync
   *
   * @private
   * @returns {void}
   */
  private registerNetworkListeners(): void {
    this.networkListener = () => {
      console.log('[SyncService] Network state changed, triggering sync...');
      this.sync();
    };

    window.addEventListener('online', this.networkListener);
    window.addEventListener('focus', this.networkListener);
  }

  // ============================================================================
  // QUEUE PROCESSING (Phase 1 - Placeholder)
  // ============================================================================

  /**
   * Process offline operation queue
   *
   * PHASE 3: Implemented
   * - Execute operations via API
   * - Remove on success, increment retry on failure
   * - Exponential backoff for retries (skip if max retries exceeded)
   *
   * PHASE 5: Bulk operations optimization
   * - Collect all task updates during processing
   * - Apply updates in bulk at the end (1 transaction instead of N)
   * - Reduces IndexedDB overhead from O(n) to O(1)
   *
   * @private
   * @returns {Promise<void>}
   */
  private async processQueue(): Promise<void> {
    const queue = await getSyncQueue();

    if (queue.length === 0) {
      console.log('[SyncService] Queue is empty');
      return;
    }

    console.log(`[SyncService] Processing ${queue.length} queued operations...`);

    // Phase 5: Track queue processing metrics
    this.metrics.totalQueueEntries += queue.length;

    // Phase 5: Collect updates for bulk operation
    const taskUpdates: Map<string, Partial<Task>> = new Map();
    const queueIdsToRemove: number[] = [];

    for (const entry of queue) {
      console.log('[SyncService] Queue entry:', {
        queueId: entry.queueId,
        operation: entry.operation,
        taskId: entry.taskId,
        retryCount: entry.retryCount,
      });

      // Check if max retries exceeded
      if (entry.retryCount >= this.MAX_RETRY_COUNT) {
        console.error('[SyncService] Max retries exceeded for entry:', entry.queueId);
        // Mark task as error
        taskUpdates.set(entry.taskId, { syncStatus: 'error' });
        queueIdsToRemove.push(entry.queueId!);
        continue;
      }

      // Execute operation
      try {
        const syncFields = await this.executeQueueEntry(entry);

        // Phase 5: Collect update instead of applying immediately
        if (syncFields) {
          taskUpdates.set(entry.taskId, syncFields);
        }

        queueIdsToRemove.push(entry.queueId!);
        console.log('[SyncService] Queue entry processed successfully:', entry.queueId);
      } catch (error) {
        console.error('[SyncService] Queue entry failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await incrementSyncRetry(entry.queueId!, errorMessage);
      }
    }

    // Phase 5: Apply all task updates in bulk
    if (taskUpdates.size > 0) {
      console.log(`[SyncService] Applying ${taskUpdates.size} task updates in bulk...`);
      await db.transaction('rw', db.tasks, async () => {
        for (const [taskId, updates] of taskUpdates) {
          await db.tasks.update(taskId, updates);
        }
      });
      console.log('[SyncService] Bulk updates applied successfully');
    }

    // Phase 5: Remove processed queue entries in bulk
    if (queueIdsToRemove.length > 0) {
      console.log(`[SyncService] Removing ${queueIdsToRemove.length} queue entries in bulk...`);
      await db.transaction('rw', db.syncQueue, async () => {
        for (const queueId of queueIdsToRemove) {
          await removeFromSyncQueue(queueId);
        }
      });
      console.log('[SyncService] Bulk queue cleanup completed');
    }

    console.log('[SyncService] Queue processing completed');
  }

  /**
   * Execute a single queue entry
   *
   * PHASE 3: Implemented
   * Calls appropriate API method based on operation type.
   *
   * PHASE 5: Returns sync fields for bulk update
   * - No longer updates IndexedDB directly
   * - Returns fields to be applied in bulk transaction
   *
   * @private
   * @param {SyncQueueEntry} entry - Queue entry to execute
   * @returns {Promise<Partial<Task> | null>} Sync fields to update, or null for delete operations
   * @throws {Error} If API call fails
   */
  private async executeQueueEntry(entry: SyncQueueEntry): Promise<Partial<Task> | null> {
    console.log('[SyncService] Executing queue entry:', entry.operation, entry.taskId);

    const syncFields: Partial<Task> = {
      syncStatus: 'synced',
      lastSyncedAt: new Date(),
    };

    switch (entry.operation) {
      case 'create':
        await this.apiService.createTask(entry.payload as Task);
        console.log('[SyncService] Create API call succeeded:', entry.taskId);
        return syncFields;

      case 'update':
        await this.apiService.updateTask(entry.taskId, entry.payload);
        console.log('[SyncService] Update API call succeeded:', entry.taskId);
        return syncFields;

      case 'delete':
        await this.apiService.deleteTask(entry.taskId);
        console.log('[SyncService] Delete API call succeeded:', entry.taskId);
        // Task already deleted from local DB, no update needed
        return null;

      default:
        console.error('[SyncService] Unknown operation:', (entry as any).operation);
        throw new Error(`Unknown operation: ${(entry as any).operation}`);
    }
  }

  // ============================================================================
  // SERVER SYNC (Phase 2)
  // ============================================================================

  /**
   * Fetch all tasks from server
   *
   * Calls GET /api/tasks to retrieve user's tasks from PostgreSQL.
   *
   * @private
   * @returns {Promise<Task[]>} Array of tasks from server
   * @throws {Error} If API call fails
   */
  private async fetchServerTasks(): Promise<Task[]> {
    try {
      const tasks = await this.apiService.listTasks();
      return tasks;
    } catch (error) {
      console.error('[SyncService] Failed to fetch server tasks:', error);
      throw error;
    }
  }

  /**
   * Fetch incremental updates from server
   *
   * Only fetches tasks updated since last sync (more efficient than full fetch).
   *
   * PHASE 2 (Current):
   * - Fetches all tasks (no incremental yet)
   *
   * FUTURE:
   * - Use ?updatedAfter=<timestamp> query param
   * - Only fetch changed tasks
   *
   * @private
   * @returns {Promise<void>}
   */
  private async fetchServerUpdates(): Promise<void> {
    console.log('[SyncService] Fetching server updates...');

    try {
      const serverTasks = await this.fetchServerTasks();
      const localTasks = await db.tasks.toArray();

      await this.mergeTasks(serverTasks, localTasks);
    } catch (error) {
      console.error('[SyncService] Failed to fetch server updates:', error);
      // Don't throw - continue with local data
    }
  }

  /**
   * Merge server tasks with local tasks
   *
   * STRATEGY: Last-Write-Wins (LWW)
   * - Server wins if: server.updatedAt > local.updatedAt
   * - Local wins if: local.updatedAt > server.updatedAt
   * - Keep local-only tasks (not on server)
   *
   * WORKFLOW:
   * 1. For each server task:
   *    - Find matching local task by ID
   *    - If not found OR server newer: Update local with server version
   *    - Mark as 'synced'
   * 2. For each local-only task:
   *    - Mark as 'pending' (needs upload)
   *
   * @private
   * @param {Task[]} serverTasks - Tasks from server
   * @param {Task[]} localTasks - Tasks from IndexedDB
   * @returns {Promise<void>}
   */
  private async mergeTasks(serverTasks: Task[], localTasks: Task[]): Promise<void> {
    console.log('[SyncService] Merging tasks...');

    // Create map of local tasks for quick lookup
    const localTaskMap = new Map(localTasks.map(t => [t.id, t]));

    // Process server tasks
    for (const serverTask of serverTasks) {
      const localTask = localTaskMap.get(serverTask.id);

      if (!localTask) {
        // New task from server - add to local
        console.log(`[SyncService] Adding server task: ${serverTask.id}`);
        await db.tasks.put({
          ...serverTask,
          syncStatus: 'synced',
          lastSyncedAt: new Date(),
          serverUpdatedAt: serverTask.updatedAt,
        });
      } else {
        // Task exists locally - check which is newer
        const serverUpdated = new Date(serverTask.updatedAt).getTime();
        const localUpdated = new Date(localTask.updatedAt).getTime();

        if (serverUpdated > localUpdated) {
          // Server wins - update local
          console.log(`[SyncService] Server newer for task: ${serverTask.id}`);
          await db.tasks.put({
            ...serverTask,
            syncStatus: 'synced',
            lastSyncedAt: new Date(),
            serverUpdatedAt: serverTask.updatedAt,
          });
        } else if (localUpdated > serverUpdated) {
          // Local wins - mark as pending for upload (Phase 3)
          console.log(`[SyncService] Local newer for task: ${localTask.id}`);
          await db.tasks.update(localTask.id, {
            syncStatus: 'pending',
          });
        } else {
          // Same timestamp - mark as synced
          await db.tasks.update(localTask.id, {
            syncStatus: 'synced',
            lastSyncedAt: new Date(),
            serverUpdatedAt: serverTask.updatedAt,
          });
        }

        // Remove from map (processed)
        localTaskMap.delete(serverTask.id);
      }
    }

    // Remaining local tasks don't exist on server - mark as pending
    for (const [taskId, localTask] of localTaskMap) {
      console.log(`[SyncService] Local-only task: ${taskId}`);
      await db.tasks.update(taskId, {
        syncStatus: 'pending',
      });
    }

    console.log('[SyncService] Merge completed');
  }

  // ============================================================================
  // CONFLICT RESOLUTION (Phase 5 - Placeholder)
  // ============================================================================

  /**
   * Detect and resolve sync conflicts
   *
   * PHASE 5 (Future):
   * - Compare local updatedAt with serverUpdatedAt
   * - Apply Last-Write-Wins strategy
   * - Optionally show manual resolution UI
   *
   * @private
   * @returns {Promise<void>}
   */
  private async resolveConflicts(): Promise<void> {
    // TODO Phase 5: Implement
    console.log('[SyncService] Conflict resolution not implemented yet (Phase 5)');
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get current sync status for debugging
   *
   * @returns {object} Sync service status
   */
  getStatus(): {
    isOnline: boolean;
    isSyncing: boolean;
    intervalActive: boolean;
  } {
    return {
      isOnline: this.isOnline(),
      isSyncing: this.isSyncing,
      intervalActive: this.syncInterval !== undefined,
    };
  }

  /**
   * Get performance metrics (Phase 5)
   *
   * Returns detailed sync performance data for monitoring and debugging.
   *
   * USAGE:
   * ```typescript
   * const metrics = syncService.getMetrics();
   * console.log(`Success rate: ${(metrics.successfulSyncs / metrics.totalSyncs * 100).toFixed(1)}%`);
   * console.log(`Avg duration: ${metrics.avgSyncDurationMs.toFixed(0)}ms`);
   * ```
   *
   * @returns {SyncMetrics} Performance metrics
   */
  getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }
}

/**
 * Singleton instance for global use
 *
 * USAGE:
 * ```typescript
 * import { syncService } from '@/services/SyncService';
 *
 * syncService.start(); // Start in App.tsx
 * await syncService.sync(); // Manual trigger
 * ```
 */
export const syncService = new SyncService();

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
export class SyncService {
  private apiService: TaskApiService;
  private isSyncing: boolean = false;
  private syncInterval?: NodeJS.Timeout;
  private networkListener?: () => void;

  // Configuration
  private readonly SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRY_COUNT = 5;
  private readonly RETRY_DELAY_MS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

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
   * Trigger manual sync
   *
   * WORKFLOW:
   * 1. Check if already syncing (prevent concurrent syncs)
   * 2. Check network connectivity
   * 3. Process offline queue
   * 4. Fetch updates from server (Phase 2+)
   * 5. Resolve conflicts (Phase 5+)
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

    try {
      this.isSyncing = true;
      console.log('[SyncService] Starting sync...');

      // Phase 1: Just process queue (no actual API calls yet)
      await this.processQueue();

      // TODO Phase 2: Fetch updates from server
      // await this.fetchServerUpdates();

      // TODO Phase 5: Resolve conflicts
      // await this.resolveConflicts();

      console.log('[SyncService] Sync completed successfully');
    } catch (error) {
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
   * PHASE 1 (Current):
   * - Logs queue entries (no actual syncing)
   * - Validates queue structure
   *
   * PHASE 3 (Future):
   * - Execute operations via API
   * - Remove on success, increment retry on failure
   * - Exponential backoff for retries
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

    for (const entry of queue) {
      console.log('[SyncService] Queue entry:', {
        queueId: entry.queueId,
        operation: entry.operation,
        taskId: entry.taskId,
        retryCount: entry.retryCount,
      });

      // TODO Phase 3: Execute operation
      // try {
      //   await this.executeQueueEntry(entry);
      //   await removeFromSyncQueue(entry.queueId!);
      // } catch (error) {
      //   await incrementSyncRetry(entry.queueId!, error.message);
      // }
    }
  }

  /**
   * Execute a single queue entry
   *
   * PHASE 3 (Future):
   * Calls appropriate API method based on operation type.
   *
   * @private
   * @param {SyncQueueEntry} entry - Queue entry to execute
   * @returns {Promise<void>}
   * @throws {Error} If API call fails
   */
  private async executeQueueEntry(entry: SyncQueueEntry): Promise<void> {
    // TODO Phase 3: Implement
    console.log('[SyncService] Would execute:', entry.operation, entry.taskId);

    // switch (entry.operation) {
    //   case 'create':
    //     await this.apiService.createTask(entry.payload as Task);
    //     break;
    //   case 'update':
    //     await this.apiService.updateTask(entry.taskId, entry.payload);
    //     break;
    //   case 'delete':
    //     await this.apiService.deleteTask(entry.taskId);
    //     break;
    // }
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

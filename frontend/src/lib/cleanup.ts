import { db } from './indexeddb';

/**
 * Daily cleanup job for completed tasks (T077).
 *
 * Deletes completed tasks where completedAt < NOW - 90 days in UTC.
 * Processes in batches of 100 tasks at a time.
 * Stores last cleanup timestamp in IndexedDB metadata table.
 * Runs on app init if 24h has elapsed since last cleanup.
 *
 * Per FR-024: "90-day retention for completed tasks."
 */

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RETENTION_DAYS = 90;
const BATCH_SIZE = 100;

/**
 * Checks if cleanup should run based on last cleanup timestamp.
 *
 * @returns Promise<boolean> - true if cleanup should run, false otherwise
 */
async function shouldRunCleanup(): Promise<boolean> {
  try {
    // Check if metadata table exists
    if (!db.metadata) {
      return true; // First run, no metadata table yet
    }

    const lastCleanup = await db.metadata.get('lastCleanup');

    if (!lastCleanup) {
      return true; // Never run before
    }

    const lastCleanupTime = new Date(lastCleanup.value as string).getTime();
    const now = Date.now();

    return now - lastCleanupTime >= CLEANUP_INTERVAL_MS;
  } catch (error) {
    console.error('Error checking cleanup schedule:', error);
    return true; // Run cleanup on error to be safe
  }
}

/**
 * Updates the last cleanup timestamp in metadata.
 */
async function updateLastCleanupTimestamp(): Promise<void> {
  try {
    if (db.metadata) {
      await db.metadata.put({
        key: 'lastCleanup',
        value: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error updating cleanup timestamp:', error);
  }
}

/**
 * Deletes completed tasks older than 90 days.
 *
 * @returns Promise<number> - Number of tasks deleted
 */
async function deleteOldCompletedTasks(): Promise<number> {
  try {
    const now = new Date();
    const cutoffDate = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - RETENTION_DAYS,
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
      )
    );

    let totalDeleted = 0;

    // Process in batches of 100
    while (true) {
      // Get batch of old completed tasks
      const oldTasks = await db.tasks
        .filter((task) => {
          // Only delete completed tasks with completedAt older than cutoff
          if (!task.completed) {
            return false; // Skip non-completed tasks
          }
          if (!task.completedAt) {
            return false; // Keep tasks without completedAt
          }
          return task.completedAt < cutoffDate;
        })
        .limit(BATCH_SIZE)
        .toArray();

      if (oldTasks.length === 0) {
        break; // No more old tasks to delete
      }

      // Delete batch
      const idsToDelete = oldTasks.map((task) => task.id);
      await db.tasks.bulkDelete(idsToDelete);

      totalDeleted += oldTasks.length;

      // If we got less than batch size, we're done
      if (oldTasks.length < BATCH_SIZE) {
        break;
      }
    }

    return totalDeleted;
  } catch (error) {
    console.error('Error deleting old completed tasks:', error);
    return 0;
  }
}

/**
 * Runs the cleanup job.
 *
 * Checks if 24h has elapsed since last cleanup.
 * If yes, deletes completed tasks older than 90 days and updates timestamp.
 *
 * @returns Promise<boolean> - true if cleanup ran, false if skipped
 */
export async function runCleanup(): Promise<boolean> {
  try {
    const shouldRun = await shouldRunCleanup();

    if (!shouldRun) {
      console.log('Cleanup skipped: less than 24h since last run');
      return false;
    }

    console.log('Running cleanup job...');

    const deletedCount = await deleteOldCompletedTasks();

    await updateLastCleanupTimestamp();

    console.log(`Cleanup complete: deleted ${deletedCount} old tasks`);

    return true;
  } catch (error) {
    console.error('Cleanup job failed:', error);
    return false;
  }
}

/**
 * Initializes cleanup on app start.
 *
 * Call this function when the app initializes to run cleanup if needed.
 */
export function initCleanup(): void {
  // Run cleanup asynchronously, don't block app init
  runCleanup().catch((error) => {
    console.error('Failed to run cleanup on init:', error);
  });
}

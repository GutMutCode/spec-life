import { db, bulkUpdateRanks } from '@/lib/indexeddb';
import { generateTaskId } from '@/lib/utils';
import type { Task } from '@shared/Task';

/**
 * Result of task insertion operation.
 */
export interface InsertTaskResult {
  /** The newly inserted task */
  task: Task;
  /** Number of tasks that were shifted down */
  shiftedCount: number;
  /** Range of ranks that were affected by the shift (if any) */
  shiftRange?: { oldStart: number; newEnd: number };
}

/**
 * TaskManager handles task insertion with rank shifting.
 *
 * Responsibilities:
 * - Insert task at specific rank
 * - Shift existing task ranks to maintain sequential order
 * - Perform all updates in a single transaction
 */
export class TaskManager {
  /**
   * Inserts a new task at the specified rank and shifts existing tasks.
   *
   * Algorithm:
   * 1. Get all incomplete tasks with rank >= insertionRank
   * 2. Increment their ranks by 1
   * 3. Insert new task at insertionRank
   * 4. All operations in single transaction for atomicity
   *
   * Example: Insert at rank 1 with existing tasks at ranks 0, 1, 2
   * - Task at rank 1 → rank 2
   * - Task at rank 2 → rank 3
   * - New task inserted at rank 1
   *
   * @param taskData - Partial task with at least title
   * @param insertionRank - Rank to insert at (0 = highest priority)
   * @returns Promise resolving to insertion result with task and shift info
   */
  async insertTask(taskData: Partial<Task>, insertionRank: number): Promise<InsertTaskResult> {
    const now = new Date();

    // Create new task with auto-generated fields
    const newTask: Task = {
      id: generateTaskId(),
      title: taskData.title!,
      description: taskData.description,
      deadline: taskData.deadline,
      rank: insertionRank,
      completed: false,
      createdAt: now,
      updatedAt: now,
      userId: taskData.userId,
    };

    // Track shift information
    let shiftedCount = 0;
    let shiftRange: { oldStart: number; newEnd: number } | undefined;

    // Perform insertion and rank shifting in transaction
    await db.transaction('rw', db.tasks, async () => {
      // Get all incomplete tasks at or after insertion rank
      const allTasks = await db.tasks.toArray();
      const tasksToShift = allTasks.filter(
        (task) => !task.completed && task.rank >= insertionRank
      );

      // Shift ranks up by 1
      if (tasksToShift.length > 0) {
        shiftedCount = tasksToShift.length;
        const minRank = Math.min(...tasksToShift.map((t) => t.rank));
        const maxRank = Math.max(...tasksToShift.map((t) => t.rank));
        shiftRange = {
          oldStart: minRank,
          newEnd: maxRank + 1,
        };

        const updates = tasksToShift.map((task) => ({
          id: task.id,
          rank: task.rank + 1,
        }));

        await bulkUpdateRanks(updates);
      }

      // Insert new task
      await db.tasks.add(newTask);
    });

    return {
      task: newTask,
      shiftedCount,
      shiftRange,
    };
  }

  /**
   * Moves a task from one rank to another with bidirectional shifting.
   *
   * Algorithm:
   * - If moving up (lower rank number): shift tasks between newRank and oldRank down
   * - If moving down (higher rank number): shift tasks between oldRank and newRank up
   *
   * Example: Move rank 3 → rank 1
   * - Task at rank 1 → rank 2
   * - Task at rank 2 → rank 3
   * - Moved task → rank 1
   *
   * @param taskId - ID of task to move
   * @param newRank - Target rank
   */
  async moveTask(taskId: string, newRank: number): Promise<void> {
    const task = await db.tasks.get(taskId);
    if (!task) throw new Error('Task not found');

    const oldRank = task.rank;
    if (oldRank === newRank) return; // No move needed

    await db.transaction('rw', db.tasks, async () => {
      const allTasks = await db.tasks.toArray();

      if (newRank < oldRank) {
        // Moving up (to lower rank number) - shift tasks down
        const tasksToShift = allTasks.filter(
          (t) => !t.completed && t.rank >= newRank && t.rank < oldRank
        );

        const updates = tasksToShift.map((t) => ({
          id: t.id,
          rank: t.rank + 1,
        }));

        await bulkUpdateRanks(updates);
      } else {
        // Moving down (to higher rank number) - shift tasks up
        const tasksToShift = allTasks.filter(
          (t) => !t.completed && t.rank > oldRank && t.rank <= newRank
        );

        const updates = tasksToShift.map((t) => ({
          id: t.id,
          rank: t.rank - 1,
        }));

        await bulkUpdateRanks(updates);
      }

      // Update moved task
      await db.tasks.update(taskId, { rank: newRank, updatedAt: new Date() });
    });
  }
}

/**
 * Task Routes
 *
 * CRUD endpoints for task management with authentication.
 * Created: 2025-10-16
 * Tasks: T101-T104
 */

import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { taskService } from '../../services/TaskService.js';
import { CreateTaskDTO, UpdateTaskDTO, toTaskResponseDTO } from '../../models/Task.js';

const router = Router();

// Apply authentication middleware to all task routes
router.use(authenticate);

/**
 * GET /tasks
 *
 * List all tasks for the authenticated user.
 *
 * Query parameters:
 * - completed: boolean (optional) - Filter by completion status
 *
 * Response (200):
 * {
 *   "tasks": [ { task objects } ]
 * }
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const completed = req.query.completed === 'true' ? true : req.query.completed === 'false' ? false : undefined;

    const tasks = await taskService.listTasks(userId, completed);

    res.status(200).json({
      tasks: tasks.map(toTaskResponseDTO),
    });
  } catch (error) {
    console.error('List tasks error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list tasks',
    });
  }
});

/**
 * POST /tasks
 *
 * Create a new task with automatic rank shifting.
 *
 * Request body:
 * {
 *   "id": "optional-uuid",
 *   "title": "Task title",
 *   "description": "Optional description",
 *   "deadline": "2025-12-31T23:59:59.000Z",
 *   "rank": 0,
 *   "completed": false,
 *   "completedAt": null,
 *   "createdAt": "2025-10-16T...",
 *   "updatedAt": "2025-10-16T..."
 * }
 *
 * Response (201):
 * {
 *   "task": { task object }
 * }
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const taskData: CreateTaskDTO = req.body;

    // Validation
    if (!taskData.title || taskData.title.trim().length === 0) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Task title is required',
      });
      return;
    }

    if (taskData.rank === undefined || taskData.rank < 0) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Task rank must be a non-negative integer',
      });
      return;
    }

    // Convert ISO strings to Date objects
    if (taskData.deadline && typeof taskData.deadline === 'string') {
      taskData.deadline = new Date(taskData.deadline);
    }
    if (taskData.completedAt && typeof taskData.completedAt === 'string') {
      taskData.completedAt = new Date(taskData.completedAt);
    }
    if (taskData.createdAt && typeof taskData.createdAt === 'string') {
      taskData.createdAt = new Date(taskData.createdAt);
    }
    if (taskData.updatedAt && typeof taskData.updatedAt === 'string') {
      taskData.updatedAt = new Date(taskData.updatedAt);
    }

    const task = await taskService.createTask(userId, taskData);

    res.status(201).json({
      task: toTaskResponseDTO(task),
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create task',
    });
  }
});

/**
 * PUT /tasks/:id
 *
 * Update an existing task.
 *
 * Request body (all fields optional):
 * {
 *   "title": "Updated title",
 *   "description": "Updated description",
 *   "deadline": "2025-12-31T23:59:59.000Z",
 *   "completed": true,
 *   "completedAt": "2025-10-16T..."
 * }
 *
 * Response (200):
 * {
 *   "task": { task object }
 * }
 *
 * Response (404):
 * {
 *   "error": "Not Found",
 *   "message": "Task not found"
 * }
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const taskId = req.params.id;
    const updates: UpdateTaskDTO = req.body;

    // Convert ISO strings to Date objects
    if (updates.deadline && typeof updates.deadline === 'string') {
      updates.deadline = new Date(updates.deadline);
    }
    if (updates.completedAt && typeof updates.completedAt === 'string') {
      updates.completedAt = new Date(updates.completedAt);
    }
    if (updates.updatedAt && typeof updates.updatedAt === 'string') {
      updates.updatedAt = new Date(updates.updatedAt);
    }

    const task = await taskService.updateTask(userId, taskId, updates);

    if (!task) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Task not found',
      });
      return;
    }

    res.status(200).json({
      task: toTaskResponseDTO(task),
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update task',
    });
  }
});

/**
 * DELETE /tasks/:id
 *
 * Delete a task with automatic rank shifting.
 *
 * Response (204):
 * No content
 *
 * Response (404):
 * {
 *   "error": "Not Found",
 *   "message": "Task not found"
 * }
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const taskId = req.params.id;

    const deleted = await taskService.deleteTask(userId, taskId);

    if (!deleted) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Task not found',
      });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete task',
    });
  }
});

export default router;

/**
 * Task Model (Backend)
 *
 * Backend version of Task entity for cloud sync.
 * Matches shared/types/Task.ts schema with added userId for multi-user support.
 * Created: 2025-10-16
 * Task: T084
 */

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  deadline?: Date;
  rank: number;
  parentId: string | null;
  depth: number;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  collaborators?: string[];
}

export interface CreateTaskDTO {
  id?: string; // Optional: client can provide UUID
  title: string;
  description?: string;
  deadline?: Date;
  rank: number;
  parentId?: string | null;
  depth?: number;
  completed?: boolean;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  collaborators?: string[];
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  deadline?: Date;
  rank?: number;
  parentId?: string | null;
  depth?: number;
  completed?: boolean;
  completedAt?: Date;
  updatedAt?: Date;
  collaborators?: string[];
}

export interface TaskResponseDTO {
  id: string;
  title: string;
  description?: string;
  deadline?: string; // ISO 8601 format
  rank: number;
  parentId: string | null;
  depth: number;
  completed: boolean;
  completedAt?: string; // ISO 8601 format
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
  collaborators?: string[];
}

/**
 * Converts a Task entity to response DTO (excludes userId, formats dates)
 */
export function toTaskResponseDTO(task: Task): TaskResponseDTO {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    deadline: task.deadline?.toISOString(),
    rank: task.rank,
    parentId: task.parentId,
    depth: task.depth,
    completed: task.completed,
    completedAt: task.completedAt?.toISOString(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    collaborators: task.collaborators,
  };
}

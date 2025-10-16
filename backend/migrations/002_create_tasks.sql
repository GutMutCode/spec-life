-- Migration: Create tasks table for cloud sync
-- Created: 2025-10-16
-- Feature: Dynamic Task Priority Manager - Backend API (Phase 8)

-- Up Migration
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  rank INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Constraints
  CONSTRAINT title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT rank_non_negative CHECK (rank >= 0),
  CONSTRAINT completed_at_requires_completed CHECK (
    (completed = TRUE AND completed_at IS NOT NULL) OR
    (completed = FALSE AND completed_at IS NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_user_rank ON tasks(user_id, rank) WHERE completed = FALSE;
CREATE INDEX idx_tasks_user_completed_at ON tasks(user_id, completed_at DESC) WHERE completed = TRUE;
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_updated_at ON tasks(updated_at);

-- Unique constraint: each user has unique ranks for active tasks
CREATE UNIQUE INDEX idx_tasks_user_active_rank ON tasks(user_id, rank) WHERE completed = FALSE;

-- Comments
COMMENT ON TABLE tasks IS 'User tasks with priority ranking and completion tracking';
COMMENT ON COLUMN tasks.id IS 'Primary key, matches client-side UUID';
COMMENT ON COLUMN tasks.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN tasks.title IS 'Task title, max 500 characters';
COMMENT ON COLUMN tasks.description IS 'Optional task description';
COMMENT ON COLUMN tasks.deadline IS 'Optional deadline timestamp';
COMMENT ON COLUMN tasks.rank IS 'Priority rank (0=highest, sequential)';
COMMENT ON COLUMN tasks.completed IS 'Completion status';
COMMENT ON COLUMN tasks.completed_at IS 'Completion timestamp (set when completed=true)';
COMMENT ON COLUMN tasks.created_at IS 'Task creation timestamp';
COMMENT ON COLUMN tasks.updated_at IS 'Last update timestamp (used for sync conflict resolution)';

-- Down Migration (for rollback)
-- DROP TABLE IF EXISTS tasks CASCADE;

-- Migration: Add hierarchy fields (parentId, depth) to tasks table
-- Created: 2025-10-18
-- Feature: Hierarchical Task Structure - Allow nested subtasks

-- Up Migration
ALTER TABLE tasks ADD COLUMN parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN depth INTEGER NOT NULL DEFAULT 0;

-- Comments
COMMENT ON COLUMN tasks.parent_id IS 'Parent task ID (null for top-level tasks)';
COMMENT ON COLUMN tasks.depth IS 'Hierarchy depth (0=top-level, 1=first subtask, 2=second subtask, etc.)';

-- Index for efficient parent-child queries
CREATE INDEX idx_tasks_parent_id ON tasks(parent_id);
CREATE INDEX idx_tasks_depth ON tasks(depth);

-- Update existing tasks to have null parent_id and depth 0
UPDATE tasks SET parent_id = NULL, depth = 0 WHERE parent_id IS NULL;

-- Down Migration (for rollback)
-- DROP INDEX IF EXISTS idx_tasks_depth;
-- DROP INDEX IF EXISTS idx_tasks_parent_id;
-- ALTER TABLE tasks DROP COLUMN depth;
-- ALTER TABLE tasks DROP COLUMN parent_id;

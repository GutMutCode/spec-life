-- Migration: Add collaborators column to tasks table
-- Created: 2025-10-18
-- Feature: Task Collaborators - Allow multiple collaborators per task

-- Up Migration
ALTER TABLE tasks ADD COLUMN collaborators TEXT[];

-- Comment
COMMENT ON COLUMN tasks.collaborators IS 'Array of collaborator names working on this task';

-- Down Migration (for rollback)
-- ALTER TABLE tasks DROP COLUMN collaborators;

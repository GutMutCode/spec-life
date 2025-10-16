import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComparisonModal from '@/components/ComparisonModal';
import { db } from '@/lib/indexeddb';
import type { Task } from '@shared/Task';

/**
 * Integration tests for ComparisonModal component.
 *
 * Tests the complete comparison workflow including:
 * - FSM state transitions
 * - User interactions (answer, skip, place)
 * - Task insertion with rank shifting
 * - UI state updates
 *
 * These tests verify US2 (Add Task with Comparison) end-to-end.
 */
describe('ComparisonModal Integration Tests', () => {
  const mockOnComplete = vi.fn();
  const mockOnCancel = vi.fn();

  const newTaskData: Partial<Task> = {
    title: 'New Task',
    description: 'Test description',
    deadline: new Date('2025-12-31'),
  };

  beforeEach(async () => {
    // Clear database
    await db.tasks.clear();

    // Reset mocks
    mockOnComplete.mockClear();
    mockOnCancel.mockClear();
  });

  describe('Modal Rendering', () => {
    it('should render modal when isOpen is true', async () => {
      render(
        <ComparisonModal
          isOpen={true}
          newTask={newTaskData}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('comparison-modal')).toBeInTheDocument();
      });
    });

    it('should not render modal when isOpen is false', () => {
      render(
        <ComparisonModal
          isOpen={false}
          newTask={newTaskData}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByTestId('comparison-modal')).not.toBeInTheDocument();
    });
  });

  describe('Empty Database Scenario', () => {
    it('should complete immediately when no existing tasks', async () => {
      render(
        <ComparisonModal
          isOpen={true}
          newTask={newTaskData}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      // Should automatically complete without comparison
      await waitFor(
        () => {
          expect(mockOnComplete).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      const insertedTask = mockOnComplete.mock.calls[0][0] as Task;
      expect(insertedTask.title).toBe('New Task');
      expect(insertedTask.rank).toBe(0);
    });
  });

  describe('Comparison Workflow', () => {
    it('should show comparison UI with existing tasks', async () => {
      // Seed 3 existing tasks
      const existingTasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          title: 'Task 2',
          rank: 1,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.tasks.bulkAdd(existingTasks);

      render(
        <ComparisonModal
          isOpen={true}
          newTask={newTaskData}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      // Should show comparison UI
      await waitFor(() => {
        expect(screen.getByText('Compare Tasks')).toBeInTheDocument();
      });

      // Should show new task title
      expect(screen.getByText('New Task')).toBeInTheDocument();
    });

    it('should allow user to skip to manual placement', async () => {
      const user = userEvent.setup();

      // Seed tasks
      await db.tasks.bulkAdd([
        {
          id: '1',
          title: 'Task 1',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      render(
        <ComparisonModal
          isOpen={true}
          newTask={newTaskData}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      // Wait for comparison UI
      await waitFor(() => {
        expect(screen.getByText('Compare Tasks')).toBeInTheDocument();
      });

      // Click skip button
      const skipButton = screen.getByTestId('skip-button');
      await user.click(skipButton);

      // Should show manual placement UI
      await waitFor(() => {
        expect(screen.getByText('Choose Position')).toBeInTheDocument();
      });
    });
  });

  describe('Manual Placement', () => {
    it('should allow manual placement at specific rank', async () => {
      const user = userEvent.setup();

      // Seed tasks
      await db.tasks.bulkAdd([
        {
          id: '1',
          title: 'Task 1',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          title: 'Task 2',
          rank: 1,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      render(
        <ComparisonModal
          isOpen={true}
          newTask={newTaskData}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      // Wait for comparison and skip
      await waitFor(() => {
        expect(screen.getByText('Compare Tasks')).toBeInTheDocument();
      });

      const skipButton = screen.getByTestId('skip-button');
      await user.click(skipButton);

      await waitFor(() => {
        expect(screen.getByText('Choose Position')).toBeInTheDocument();
      });

      // Click place at rank 1
      const placeButton = screen.getByTestId('place-rank-1');
      await user.click(placeButton);

      // Should complete
      await waitFor(
        () => {
          expect(mockOnComplete).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      const insertedTask = mockOnComplete.mock.calls[0][0] as Task;
      expect(insertedTask.rank).toBe(1);
    });
  });

  describe('Cancellation', () => {
    it('should handle cancellation during comparison', async () => {
      const user = userEvent.setup();

      // Seed task
      await db.tasks.add({
        id: '1',
        title: 'Task 1',
        rank: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      render(
        <ComparisonModal
          isOpen={true}
          newTask={newTaskData}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByTestId('comparison-modal')).toBeInTheDocument();
      });

      // Click cancel button
      const cancelButton = screen.getByTestId('cancel-button');
      await user.click(cancelButton);

      // Should call onCancel
      await waitFor(() => {
        expect(mockOnCancel).toHaveBeenCalled();
      });

      // Should not insert task
      expect(mockOnComplete).not.toHaveBeenCalled();
    });
  });

  describe('Post-Insertion Feedback (T046B)', () => {
    it('should show feedback when inserting at rank 0 with no shifts', async () => {
      // Empty database - no shifts should occur
      render(
        <ComparisonModal
          isOpen={true}
          newTask={newTaskData}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      // Wait for completion
      await waitFor(
        () => {
          expect(mockOnComplete).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      // Verify insertion summary is shown
      expect(screen.getByTestId('insertion-summary')).toBeInTheDocument();
      expect(screen.getByTestId('insertion-summary')).toHaveTextContent(
        '"New Task" has been added at rank 0'
      );

      // Should NOT show shift feedback when no tasks shifted
      expect(screen.queryByTestId('shift-feedback')).not.toBeInTheDocument();
    });

    it('should show shift feedback when inserting at middle rank', async () => {
      const user = userEvent.setup();

      // Seed tasks at ranks 0, 1, 2
      await db.tasks.bulkAdd([
        {
          id: '1',
          title: 'Task at rank 0',
          rank: 0,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          title: 'Task at rank 1',
          rank: 1,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '3',
          title: 'Task at rank 2',
          rank: 2,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      render(
        <ComparisonModal
          isOpen={true}
          newTask={newTaskData}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      // Wait for comparison UI
      await waitFor(() => {
        expect(screen.getByText('Compare Tasks')).toBeInTheDocument();
      });

      // Skip to manual placement
      const skipButton = screen.getByTestId('skip-button');
      await user.click(skipButton);

      await waitFor(() => {
        expect(screen.getByText('Choose Position')).toBeInTheDocument();
      });

      // Place at rank 1 (should shift tasks at 1 and 2 down)
      const placeButton = screen.getByTestId('place-rank-1');
      await user.click(placeButton);

      // Wait for completion UI
      await waitFor(
        () => {
          expect(screen.getByText('Task Added Successfully!')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Verify shift feedback is shown
      const shiftFeedback = screen.getByTestId('shift-feedback');
      expect(shiftFeedback).toBeInTheDocument();

      // Should show range of tasks that were shifted
      expect(shiftFeedback).toHaveTextContent('Tasks at ranks 1-2');
      expect(shiftFeedback).toHaveTextContent('moved down one position to ranks 2-3');
    });

    it('should show specific feedback when only one task is shifted', async () => {
      const user = userEvent.setup();

      // Seed only one task at rank 0
      await db.tasks.add({
        id: '1',
        title: 'Task at rank 0',
        rank: 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      render(
        <ComparisonModal
          isOpen={true}
          newTask={newTaskData}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      // Wait for comparison UI
      await waitFor(() => {
        expect(screen.getByText('Compare Tasks')).toBeInTheDocument();
      });

      // Skip to manual placement
      const skipButton = screen.getByTestId('skip-button');
      await user.click(skipButton);

      await waitFor(() => {
        expect(screen.getByText('Choose Position')).toBeInTheDocument();
      });

      // Place at rank 0 (should shift existing rank 0 task to rank 1)
      const placeButton = screen.getByTestId('place-rank-0');
      await user.click(placeButton);

      // Wait for completion UI
      await waitFor(
        () => {
          expect(screen.getByText('Task Added Successfully!')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Verify single task shift feedback
      const shiftFeedback = screen.getByTestId('shift-feedback');
      expect(shiftFeedback).toBeInTheDocument();
      expect(shiftFeedback).toHaveTextContent('Task at rank 0 moved to rank 1');
    });

    it('should show correct feedback when inserting at end with shifts', async () => {
      const user = userEvent.setup();

      // Seed tasks at ranks 0, 1, 2, 3
      const tasks = Array.from({ length: 4 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        rank: i,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.tasks.bulkAdd(tasks);

      render(
        <ComparisonModal
          isOpen={true}
          newTask={newTaskData}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      // Wait for comparison UI
      await waitFor(() => {
        expect(screen.getByText('Compare Tasks')).toBeInTheDocument();
      });

      // Skip to manual placement
      const skipButton = screen.getByTestId('skip-button');
      await user.click(skipButton);

      await waitFor(() => {
        expect(screen.getByText('Choose Position')).toBeInTheDocument();
      });

      // Place at rank 2 (should shift tasks at 2 and 3 down)
      const placeButton = screen.getByTestId('place-rank-2');
      await user.click(placeButton);

      // Wait for completion UI
      await waitFor(
        () => {
          expect(screen.getByText('Task Added Successfully!')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Verify shift feedback
      const shiftFeedback = screen.getByTestId('shift-feedback');
      expect(shiftFeedback).toBeInTheDocument();
      expect(shiftFeedback).toHaveTextContent('Tasks at ranks 2-3');
      expect(shiftFeedback).toHaveTextContent('moved down one position to ranks 3-4');
    });
  });
});

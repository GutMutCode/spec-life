import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskList from '@/components/TaskList';
import type { Task } from '@shared/Task';

describe('TaskList Integration Tests (T051)', () => {
  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: crypto.randomUUID(),
    title: 'Test Task',
    rank: 0,
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('Empty State', () => {
    it('should display empty state when tasks array is empty', () => {
      render(<TaskList tasks={[]} />);

      expect(screen.getByTestId('task-list-empty')).toBeInTheDocument();
      expect(screen.getByText('No tasks to display')).toBeInTheDocument();
    });

    it('should not display task list when empty', () => {
      render(<TaskList tasks={[]} />);

      expect(screen.queryByTestId('task-list')).not.toBeInTheDocument();
    });
  });

  describe('Task Display', () => {
    it('should render all tasks in provided order', () => {
      const tasks: Task[] = [
        createMockTask({ title: 'Task 0', rank: 0 }),
        createMockTask({ title: 'Task 1', rank: 1 }),
        createMockTask({ title: 'Task 2', rank: 2 }),
      ];

      render(<TaskList tasks={tasks} />);

      const taskCards = screen.getAllByTestId('task-card');
      expect(taskCards).toHaveLength(3);

      // Verify order is preserved
      expect(taskCards[0]).toHaveTextContent('Task 0');
      expect(taskCards[1]).toHaveTextContent('Task 1');
      expect(taskCards[2]).toHaveTextContent('Task 2');
    });

    it('should display task count', () => {
      const tasks: Task[] = [
        createMockTask({ rank: 0 }),
        createMockTask({ rank: 1 }),
        createMockTask({ rank: 2 }),
      ];

      render(<TaskList tasks={tasks} />);

      expect(screen.getByText('Showing 3 tasks')).toBeInTheDocument();
    });

    it('should display singular "task" for single task', () => {
      const tasks: Task[] = [createMockTask({ rank: 0 })];

      render(<TaskList tasks={tasks} />);

      expect(screen.getByText('Showing 1 task')).toBeInTheDocument();
    });
  });

  describe('Rank Badge Display', () => {
    it('should show rank badges when showRank is true', () => {
      const tasks: Task[] = [
        createMockTask({ rank: 0 }),
        createMockTask({ rank: 1 }),
      ];

      render(<TaskList tasks={tasks} showRank={true} />);

      const rankBadges = screen.getAllByTestId('rank-badge');
      expect(rankBadges).toHaveLength(2);
      expect(rankBadges[0]).toHaveTextContent('#0');
      expect(rankBadges[1]).toHaveTextContent('#1');
    });

    it('should hide rank badges when showRank is false', () => {
      const tasks: Task[] = [
        createMockTask({ rank: 0 }),
        createMockTask({ rank: 1 }),
      ];

      render(<TaskList tasks={tasks} showRank={false} />);

      expect(screen.queryAllByTestId('rank-badge')).toHaveLength(0);
    });

    it('should show rank badges by default', () => {
      const tasks: Task[] = [createMockTask({ rank: 0 })];

      render(<TaskList tasks={tasks} />);

      expect(screen.getByTestId('rank-badge')).toBeInTheDocument();
    });
  });

  describe('Sort Order', () => {
    it('should render 10 tasks in correct order (rank 0-9)', () => {
      const tasks: Task[] = [];
      for (let i = 0; i < 10; i++) {
        tasks.push(createMockTask({ title: `Task ${i}`, rank: i }));
      }

      render(<TaskList tasks={tasks} />);

      const taskCards = screen.getAllByTestId('task-card');
      expect(taskCards).toHaveLength(10);

      // Verify all tasks are in order
      for (let i = 0; i < 10; i++) {
        expect(taskCards[i]).toHaveTextContent(`Task ${i}`);
      }
    });

    it('should maintain order when tasks have non-sequential ranks', () => {
      const tasks: Task[] = [
        createMockTask({ title: 'Rank 0', rank: 0 }),
        createMockTask({ title: 'Rank 5', rank: 5 }),
        createMockTask({ title: 'Rank 12', rank: 12 }),
        createMockTask({ title: 'Rank 25', rank: 25 }),
      ];

      render(<TaskList tasks={tasks} />);

      const taskCards = screen.getAllByTestId('task-card');
      expect(taskCards[0]).toHaveTextContent('Rank 0');
      expect(taskCards[1]).toHaveTextContent('Rank 5');
      expect(taskCards[2]).toHaveTextContent('Rank 12');
      expect(taskCards[3]).toHaveTextContent('Rank 25');
    });
  });

  describe('Large Dataset', () => {
    it('should handle 100 tasks efficiently', () => {
      const tasks: Task[] = [];
      for (let i = 0; i < 100; i++) {
        tasks.push(createMockTask({ title: `Task ${i}`, rank: i }));
      }

      const startTime = performance.now();
      render(<TaskList tasks={tasks} />);
      const endTime = performance.now();

      const taskCards = screen.getAllByTestId('task-card');
      expect(taskCards).toHaveLength(100);
      expect(screen.getByText('Showing 100 tasks')).toBeInTheDocument();

      // Rendering should be fast (< 500ms for 100 tasks)
      expect(endTime - startTime).toBeLessThan(500);
    });

    it('should display first and last tasks correctly in large list', () => {
      const tasks: Task[] = [];
      for (let i = 0; i < 50; i++) {
        tasks.push(createMockTask({ title: `Task ${i}`, rank: i }));
      }

      render(<TaskList tasks={tasks} />);

      const taskCards = screen.getAllByTestId('task-card');
      expect(taskCards[0]).toHaveTextContent('Task 0');
      expect(taskCards[49]).toHaveTextContent('Task 49');
    });
  });

  describe('Task Details', () => {
    it('should display task titles', () => {
      const tasks: Task[] = [
        createMockTask({ title: 'Important Meeting' }),
        createMockTask({ title: 'Code Review' }),
      ];

      render(<TaskList tasks={tasks} />);

      expect(screen.getByText('Important Meeting')).toBeInTheDocument();
      expect(screen.getByText('Code Review')).toBeInTheDocument();
    });

    it('should display task descriptions when present', () => {
      const tasks: Task[] = [
        createMockTask({
          title: 'Task with description',
          description: 'This is a detailed description',
        }),
      ];

      render(<TaskList tasks={tasks} />);

      expect(screen.getByText('This is a detailed description')).toBeInTheDocument();
    });

    it('should display deadlines when present', () => {
      const deadline = new Date('2025-12-31');
      const tasks: Task[] = [
        createMockTask({
          title: 'Task with deadline',
          deadline,
        }),
      ];

      render(<TaskList tasks={tasks} />);

      expect(screen.getByTestId('deadline-text')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const tasks: Task[] = [createMockTask()];

      const { container } = render(<TaskList tasks={tasks} className="custom-class" />);

      const taskList = container.querySelector('.task-list');
      expect(taskList).toHaveClass('custom-class');
    });

    it('should support compact variant', () => {
      const tasks: Task[] = [createMockTask()];

      render(<TaskList tasks={tasks} variant="compact" />);

      expect(screen.getByTestId('task-card')).toBeInTheDocument();
    });

    it('should support prominent variant', () => {
      const tasks: Task[] = [createMockTask()];

      render(<TaskList tasks={tasks} variant="prominent" />);

      expect(screen.getByTestId('task-card')).toBeInTheDocument();
    });
  });
});

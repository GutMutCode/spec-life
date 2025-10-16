import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import { db } from '@/lib/indexeddb';
import type { Task } from '@shared/Task';

// Wrapper component to provide Router context
const DashboardWithRouter = () => (
  <BrowserRouter>
    <Dashboard />
  </BrowserRouter>
);

describe('Dashboard Integration Tests (T030)', () => {
  beforeEach(async () => {
    // Clear database before each test
    await db.tasks.clear();
  });

  it('should display top task (rank 0) prominently', async () => {
    const topTask: Task = {
      id: crypto.randomUUID(),
      title: 'Most Important Task',
      description: 'This is the highest priority task',
      rank: 0,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.tasks.add(topTask);

    render(<DashboardWithRouter />);

    // Wait for task to load
    await waitFor(() => {
      expect(screen.getByText('Most Important Task')).toBeInTheDocument();
    });

    expect(screen.getByText('This is the highest priority task')).toBeInTheDocument();
    expect(screen.getByTestId('task-card')).toBeInTheDocument();
  });

  it('should show empty state when no tasks exist', async () => {
    render(<DashboardWithRouter />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    expect(screen.getByText('Add your first task to start prioritizing your work.')).toBeInTheDocument();
  });

  it('should display task with lowest rank when rank 0 does not exist', async () => {
    const tasks: Task[] = [
      {
        id: crypto.randomUUID(),
        title: 'Rank 5 Task',
        rank: 5,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        title: 'Rank 2 Task',
        rank: 2,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await db.tasks.bulkAdd(tasks);

    render(<DashboardWithRouter />);

    await waitFor(() => {
      expect(screen.getByText('Rank 2 Task')).toBeInTheDocument();
    });

    expect(screen.queryByText('Rank 5 Task')).not.toBeInTheDocument();
  });

  it('should show empty state when all tasks are completed', async () => {
    const completedTask: Task = {
      id: crypto.randomUUID(),
      title: 'Completed Task',
      rank: 0,
      completed: true,
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.tasks.add(completedTask);

    render(<DashboardWithRouter />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
  });

  it('should display task with deadline', async () => {
    const taskWithDeadline: Task = {
      id: crypto.randomUUID(),
      title: 'Task with Deadline',
      deadline: new Date('2025-12-31'),
      rank: 0,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.tasks.add(taskWithDeadline);

    render(<DashboardWithRouter />);

    await waitFor(() => {
      expect(screen.getByText('Task with Deadline')).toBeInTheDocument();
    });

    expect(screen.getByTestId('deadline-text')).toBeInTheDocument();
  });

  it('should display rank badge for top task', async () => {
    const topTask: Task = {
      id: crypto.randomUUID(),
      title: 'Top Priority',
      rank: 0,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.tasks.add(topTask);

    render(<DashboardWithRouter />);

    await waitFor(() => {
      expect(screen.getByTestId('rank-badge')).toBeInTheDocument();
    });

    expect(screen.getByTestId('rank-badge')).toHaveTextContent('#0');
  });

  it('should show loading state initially', () => {
    render(<DashboardWithRouter />);

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.getByText('Loading your top priority...')).toBeInTheDocument();
  });
});

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TaskForm from '@/components/TaskForm';
import ComparisonModal from '@/components/ComparisonModal';
import type { Task } from '@shared/Task';

/**
 * AddTask page - Implements US2 add task workflow.
 *
 * Workflow:
 * 1. User fills out TaskForm (title, description, deadline)
 * 2. Form validation on submit
 * 3. Opens ComparisonModal for priority placement
 * 4. Binary comparison or manual placement
 * 5. Task inserted into database
 * 6. Redirect to dashboard showing updated top priority
 *
 * Hierarchical behavior:
 * - Can receive parentId and depth from location state for subtask creation
 * - If parentId provided, creates subtask under that parent
 * - If not provided, creates top-level task (parentId=null, depth=0)
 *
 * Per US2: "A user wants to add a new task. The system asks a series of
 * simple comparison questions ('Is this more important than Task X?')
 * to determine where it fits in the priority list."
 */
export default function AddTask() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get parentId and depth from location state (for subtask creation)
  const parentId = (location.state as any)?.parentId ?? null;
  const depth = (location.state as any)?.depth ?? 0;
  const parentTitle = (location.state as any)?.parentTitle;

  const [newTaskData, setNewTaskData] = useState<Partial<Task> | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [modalKey, setModalKey] = useState(0);

  /**
   * Handles TaskForm submission - opens comparison modal.
   * Includes parentId and depth for subtask creation.
   */
  const handleFormSubmit = (taskData: Partial<Task>) => {
    setNewTaskData({
      ...taskData,
      parentId,
      depth,
    });
    setModalKey((prev) => prev + 1); // Increment key to force new modal instance
    setShowComparison(true);
  };

  /**
   * Handles form cancellation - returns to dashboard.
   */
  const handleFormCancel = () => {
    navigate('/');
  };

  /**
   * Handles comparison completion - returns to dashboard.
   */
  const handleComparisonComplete = (insertedTask: Task) => {
    console.log('Task added successfully:', insertedTask);
    setShowComparison(false);
    setNewTaskData(null);
    navigate('/');
  };

  /**
   * Handles comparison cancellation - returns to form.
   */
  const handleComparisonCancel = () => {
    setShowComparison(false);
    // Keep newTaskData so user can edit and retry
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {parentId ? 'Add Subtask' : 'Add New Task'}
        </h1>
        <p className="text-gray-600">
          {parentId
            ? `Adding a subtask under: "${parentTitle}"`
            : 'Fill out the details below, then we\'ll help you prioritize it.'}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <TaskForm
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          initialData={newTaskData || undefined}
        />
      </div>

      {/* Comparison Modal */}
      {showComparison && newTaskData && (
        <ComparisonModal
          key={modalKey} // Stable key that changes only when form is submitted
          isOpen={showComparison}
          newTask={newTaskData}
          onComplete={handleComparisonComplete}
          onCancel={handleComparisonCancel}
        />
      )}
    </div>
  );
}

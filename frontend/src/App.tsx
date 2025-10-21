import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AddTask from './pages/AddTask';
import AllTasks from './pages/AllTasks';
import History from './pages/History';
import ShortcutsModal from './components/ShortcutsModal';
import { useShortcutsHelp } from './hooks/useShortcutsHelp';

/**
 * Main application component with routing configuration.
 *
 * Routes:
 * - / : Dashboard (US1 - top priority task)
 * - /add : Add task with comparison workflow (US2)
 * - /tasks : All tasks view (US3)
 * - /history : Completed tasks history (US5 - T076)
 *
 * T105: Wrapped entire app with ErrorBoundary for error handling
 * T107: Added ToastProvider for success/error notifications
 * T011: Added keyboard shortcuts help modal (002-ui)
 */
function App() {
  // T011: Keyboard shortcuts help modal state (002-ui)
  const { isOpen, close } = useShortcutsHelp();

  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="/add" element={<AddTask />} />
              <Route path="/tasks" element={<AllTasks />} />
              <Route path="/history" element={<History />} />
              {/* 404 - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>

        {/* T011: Shortcuts help modal - available on all pages (002-ui) */}
        <ShortcutsModal isOpen={isOpen} onClose={close} />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;

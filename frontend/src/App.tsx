import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AddTask from './pages/AddTask';
import AllTasks from './pages/AllTasks';
import History from './pages/History';
import Login from './pages/Login';
import Register from './pages/Register';
import ShortcutsModal from './components/ShortcutsModal';
import { useShortcutsHelp } from './hooks/useShortcutsHelp';

/**
 * Main application component with routing configuration.
 *
 * AUTHENTICATION:
 * - /login : Login page (public)
 * - /register : Registration page (public)
 * - All other routes require authentication (protected)
 *
 * PROTECTED ROUTES (require login):
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
            {/* Public routes - no authentication required */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes - authentication required */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="/add" element={<AddTask />} />
              <Route path="/tasks" element={<AllTasks />} />
              <Route path="/history" element={<History />} />
            </Route>

            {/* 404 - redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>

        {/* T011: Shortcuts help modal - available on all pages (002-ui) */}
        <ShortcutsModal isOpen={isOpen} onClose={close} />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;

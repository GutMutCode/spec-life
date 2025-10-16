import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AddTask from './pages/AddTask';
import AllTasks from './pages/AllTasks';
import History from './pages/History';

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
 */
function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

export default App;

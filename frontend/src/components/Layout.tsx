import { Outlet, Link } from 'react-router-dom';

/**
 * Main layout component with header and navigation.
 *
 * Wraps all pages with consistent header and container styling.
 * Navigation will be expanded in Phase 3+ with links to:
 * - Dashboard (/)
 * - All Tasks (/tasks)
 * - Add Task (/add)
 */
export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Task Priority Manager
              </h1>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-4">
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/tasks"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                All Tasks
              </Link>
              <Link
                to="/history"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                History
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-sm text-gray-500">
        <p>Built with React + TypeScript + Tailwind CSS</p>
      </footer>
    </div>
  );
}

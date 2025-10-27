import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAuth } from '@/hooks/useAuth';
import ShortcutHint from './ShortcutHint';

/**
 * Main layout component with header and navigation.
 *
 * Wraps all pages with consistent header and container styling.
 * Navigation includes:
 * - Dashboard (/)
 * - All Tasks (/tasks)
 * - History (/history)
 * - User info and logout button
 *
 * T111: Added global keyboard shortcuts
 */
export default function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Enable global keyboard shortcuts (T111)
  useKeyboardShortcuts();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - T112 */}
      <header className="bg-white shadow-sm border-b border-gray-200" role="banner">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center" aria-label="Task Priority Manager - Go to homepage">
              <h1 className="text-2xl font-bold text-gray-900">
                Task Priority Manager
              </h1>
            </Link>

            {/* Navigation - T112, T022 (added ShortcutHints) */}
            <nav className="flex items-center gap-6" aria-label="Main navigation">
              <div className="flex items-center gap-4">
                <ShortcutHint shortcutKey="d" description="Dashboard (home)">
                  <Link
                    to="/"
                    className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                    aria-label="Go to Dashboard page"
                  >
                    Dashboard
                  </Link>
                </ShortcutHint>
                <ShortcutHint shortcutKey="a" description="View all tasks">
                  <Link
                    to="/tasks"
                    className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                    aria-label="View all tasks"
                  >
                    All Tasks
                  </Link>
                </ShortcutHint>
                <ShortcutHint shortcutKey="h" description="View history">
                  <Link
                    to="/history"
                    className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                    aria-label="View completed tasks history"
                  >
                    History
                  </Link>
                </ShortcutHint>
              </div>

              {/* User info and logout */}
              <div className="flex items-center gap-3 border-l border-gray-300 pl-6">
                <span className="text-sm text-gray-600" title={user?.email}>
                  {user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                  aria-label="Sign out"
                >
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content area - T112 */}
      <main
        className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8"
        role="main"
        aria-label="Page content"
      >
        <Outlet />
      </main>

      {/* Footer (T111, T112) */}
      <footer className="mt-auto py-6 text-center text-sm text-gray-500" role="contentinfo">
        <p>Built with React + TypeScript + Tailwind CSS</p>
        <p className="mt-2">
          <kbd
            className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono"
            aria-label="Question mark key"
          >
            ?
          </kbd>{' '}
          for keyboard shortcuts
        </p>
      </footer>
    </div>
  );
}

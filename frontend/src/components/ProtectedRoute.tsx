/**
 * @file ProtectedRoute.tsx
 * @description Route guard component that requires authentication
 *
 * FEATURES:
 * - Checks authentication status before rendering children
 * - Redirects to login page if not authenticated
 * - Preserves intended destination for redirect after login
 * - Shows loading state while checking authentication
 *
 * USAGE:
 * ```tsx
 * <Route path="/dashboard" element={
 *   <ProtectedRoute>
 *     <Dashboard />
 *   </ProtectedRoute>
 * } />
 * ```
 *
 * @see /hooks/useAuth.ts for authentication state
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  /** Children components to render if authenticated */
  children: ReactNode;
}

/**
 * Protected route wrapper component
 *
 * Requires user to be authenticated to access the wrapped component.
 * Redirects to /login if not authenticated, preserving the intended
 * destination in location state for redirect after successful login.
 *
 * @param props.children - Child components to render if authenticated
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login, saving the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

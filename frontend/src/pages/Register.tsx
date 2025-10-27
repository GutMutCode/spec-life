/**
 * @file Register.tsx
 * @description Registration page component for new user accounts
 *
 * FEATURES:
 * - Email and password input with validation
 * - Password confirmation field
 * - Password strength requirements display
 * - Form submission with error handling
 * - Loading state during registration
 * - Link to login page
 * - Redirects to dashboard on successful registration
 * - Responsive design matching app style
 *
 * @see /hooks/useAuth.ts for authentication logic
 */

import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Register page component
 *
 * Provides email/password registration form with validation and error display.
 * Automatically logs in and redirects to dashboard on successful registration.
 */
export default function Register() {
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  /**
   * Validate form inputs
   */
  const validate = (): boolean => {
    const errors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    // Email validation
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    } else if (password.length > 100) {
      errors.password = 'Password must be less than 100 characters';
    }

    // Confirm password validation
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Clear previous validation errors
    setValidationErrors({});

    // Validate inputs
    if (!validate()) {
      return;
    }

    try {
      await register({ email: email.trim(), password });
      // Redirect to dashboard on success (user is automatically logged in)
      navigate('/');
    } catch (err) {
      // Error is handled by useAuth hook and displayed via error state
      console.error('Registration failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Task Priority Manager</h1>
          <p className="text-gray-600">Create your account to get started</p>
        </div>

        {/* Register Form Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Create Account</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  validationErrors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="you@example.com"
                disabled={loading}
                autoComplete="email"
                aria-invalid={!!validationErrors.email}
                aria-describedby={validationErrors.email ? 'email-error' : undefined}
              />
              {validationErrors.email && (
                <p id="email-error" className="text-sm text-red-600 mt-1" role="alert">
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  validationErrors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="At least 6 characters"
                disabled={loading}
                autoComplete="new-password"
                aria-invalid={!!validationErrors.password}
                aria-describedby={validationErrors.password ? 'password-error' : 'password-hint'}
              />
              {validationErrors.password ? (
                <p id="password-error" className="text-sm text-red-600 mt-1" role="alert">
                  {validationErrors.password}
                </p>
              ) : (
                <p id="password-hint" className="text-xs text-gray-500 mt-1">
                  Must be at least 6 characters long
                </p>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Re-enter your password"
                disabled={loading}
                autoComplete="new-password"
                aria-invalid={!!validationErrors.confirmPassword}
                aria-describedby={
                  validationErrors.confirmPassword ? 'confirm-password-error' : undefined
                }
              />
              {validationErrors.confirmPassword && (
                <p id="confirm-password-error" className="text-sm text-red-600 mt-1" role="alert">
                  {validationErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* API Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
              aria-busy={loading}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:underline"
              >
                Sign in instead
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-gray-500 mt-6">
          By creating an account, your tasks will be securely synced to the cloud
        </p>
      </div>
    </div>
  );
}

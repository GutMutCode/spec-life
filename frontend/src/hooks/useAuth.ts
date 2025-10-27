/**
 * @file useAuth.ts
 * @description React hook for authentication state management
 *
 * FEATURES:
 * - JWT token-based authentication
 * - Persistent login (localStorage)
 * - Login, register, logout functionality
 * - User state management
 * - Automatic token validation on mount
 *
 * CURRENT IMPLEMENTATION:
 * - Stores token and user data in localStorage
 * - Calls backend API for authentication
 * - Provides authentication state to components
 *
 * TODO: Future enhancements
 * - [ ] Add token refresh logic before expiration
 * - [ ] Add remember me functionality
 * - [ ] Add session timeout warning
 * - [ ] Add multi-device session management
 *
 * @see /lib/api.ts for API client configuration
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient, getErrorMessage } from '@/lib/api';
import { syncService } from '@/services/SyncService';

/**
 * User data structure
 */
export interface User {
  id: string;
  email: string;
}

/**
 * Authentication response from backend
 */
interface AuthResponse {
  token: string;
  user: User;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data
 */
export interface RegisterData {
  email: string;
  password: string;
}

/**
 * Authentication hook return type
 */
export interface UseAuthReturn {
  /** Current authenticated user, null if not authenticated */
  user: User | null;
  /** Loading state during authentication operations */
  loading: boolean;
  /** Error message from last failed operation */
  error: string | null;
  /** Login function */
  login: (credentials: LoginCredentials) => Promise<void>;
  /** Register function */
  register: (data: RegisterData) => Promise<void>;
  /** Logout function */
  logout: () => void;
  /** Check if user is authenticated */
  isAuthenticated: boolean;
}

/**
 * React hook for authentication state and operations
 *
 * Automatically restores authentication state from localStorage on mount.
 * Provides login, register, and logout functions for authentication management.
 *
 * @example
 * ```tsx
 * function LoginPage() {
 *   const { login, loading, error } = useAuth();
 *
 *   const handleSubmit = async (email, password) => {
 *     await login({ email, password });
 *   };
 *
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Restore authentication state from localStorage on mount
   */
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
      } catch (err) {
        console.error('Failed to parse stored user:', err);
        // Clear invalid data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  /**
   * Login with email and password
   *
   * Calls POST /api/auth/login endpoint and stores token + user data.
   *
   * @param credentials - Email and password
   * @throws Will set error state if login fails
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/login', credentials);
      const { token, user: userData } = response.data;

      // Store token and user data
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);

      // Phase 2: Trigger initial sync after successful login
      // Don't block login if sync fails
      try {
        console.log('[useAuth] Login successful, triggering initial sync...');
        await syncService.initialSync();
        console.log('[useAuth] Initial sync completed');
      } catch (syncError) {
        console.error('[useAuth] Initial sync failed, will retry in background:', syncError);
        // Don't throw - sync will retry automatically in background
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Register new user account
   *
   * Calls POST /api/auth/register endpoint and automatically logs in.
   *
   * @param data - Email and password for new account
   * @throws Will set error state if registration fails
   */
  const register = useCallback(async (data: RegisterData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/register', data);
      const { token, user: userData } = response.data;

      // Store token and user data
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);

      // Phase 2: Trigger initial sync after successful registration
      // Don't block registration if sync fails
      try {
        console.log('[useAuth] Registration successful, triggering initial sync...');
        await syncService.initialSync();
        console.log('[useAuth] Initial sync completed');
      } catch (syncError) {
        console.error('[useAuth] Initial sync failed, will retry in background:', syncError);
        // Don't throw - sync will retry automatically in background
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout current user
   *
   * Clears token and user data from state and localStorage.
   */
  const logout = useCallback(() => {
    // Clear stored data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');

    setUser(null);
    setError(null);
  }, []);

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: user !== null,
  };
}

/**
 * @file api.ts
 * @description Axios-based API client for backend communication
 *
 * FEATURES:
 * - Configured with base URL from environment variable
 * - Automatic JWT token injection via interceptors
 * - Request/response logging for debugging
 * - Error handling and transformation
 * - Token management (get from localStorage)
 *
 * USAGE:
 * - Import apiClient and use for all backend API calls
 * - Token is automatically included in Authorization header if present
 * - Handles JSON content-type automatically
 *
 * @see VITE_API_URL environment variable for backend URL configuration
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * Base API client instance configured with backend URL
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

/**
 * Request interceptor to add JWT token to all requests
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage
    const token = localStorage.getItem('auth_token');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request for debugging (remove in production)
    console.log('[API Request]', config.method?.toUpperCase(), config.url);

    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling and logging
 */
apiClient.interceptors.response.use(
  (response) => {
    // Log successful response (remove in production)
    console.log('[API Response]', response.status, response.config.url);
    return response;
  },
  (error: AxiosError) => {
    // Log error response
    console.error('[API Error]', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      data: error.response?.data,
    });

    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      // Clear invalid token
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');

      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

/**
 * API error response structure from backend
 */
export interface ApiError {
  message: string;
  error?: string;
}

/**
 * Helper function to extract error message from API error
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    return apiError?.message || error.message || 'An unexpected error occurred';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

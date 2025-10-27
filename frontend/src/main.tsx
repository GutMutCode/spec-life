import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';
import App from './App';
import './index.css';
import { db } from './lib/indexeddb';

/**
 * SENTRY INITIALIZATION
 *
 * Initialize Sentry error tracking for production monitoring.
 *
 * CONFIGURATION (via environment variables):
 * - VITE_SENTRY_DSN: Sentry project DSN (Data Source Name)
 *   - Required for error reporting to work
 *   - Get from Sentry.io project settings
 *   - Example: https://abc123@o123.ingest.sentry.io/456
 *
 * - VITE_SENTRY_ENVIRONMENT: Environment name (development, staging, production)
 *   - Default: import.meta.env.MODE (vite environment)
 *   - Used to filter errors by environment in Sentry dashboard
 *
 * - VITE_APP_VERSION: Application version for release tracking
 *   - Optional, defaults to 'unknown'
 *   - Useful for tracking which version caused errors
 *
 * FEATURES:
 * - Browser tracing: Tracks page loads and navigation performance
 * - React integration: Captures React component errors via ErrorBoundary
 * - Automatic breadcrumbs: Logs user actions (clicks, navigation, console)
 * - Session replay: Records user sessions for debugging (when enabled)
 * - Source maps: Shows original TypeScript source in error stack traces
 *
 * SAMPLE RATES:
 * - tracesSampleRate: 0.1 (10% of transactions captured in production)
 *   - Adjust based on traffic volume and Sentry quota
 *   - Set to 1.0 for 100% sampling in development
 *
 * DISABLED WHEN:
 * - VITE_SENTRY_DSN is not set (local development default)
 * - Prevents sending errors to Sentry during local testing
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/react/
 */
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || 'unknown',

    // Performance monitoring
    integrations: [
      // Automatically instrument React components
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect: React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      // Capture replay sessions for debugging
      Sentry.replayIntegration({
        maskAllText: true, // Privacy: mask all text content
        blockAllMedia: true, // Privacy: block all media (images, video)
      }),
    ],

    // Performance Monitoring sample rate
    // 0.1 = 10% of transactions sent to Sentry (adjust based on traffic)
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,

    // Session Replay sample rate
    // Only capture 10% of sessions by default
    replaysSessionSampleRate: 0.1,
    // Capture 100% of sessions with errors for debugging
    replaysOnErrorSampleRate: 1.0,

    // Ignore common errors that don't need tracking
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Random plugins/extensions
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      // Network errors (handled by retry logic)
      'NetworkError',
      'Network request failed',
    ],

    // Filter sensitive data before sending to Sentry
    beforeSend(event) {
      // Remove sensitive query parameters from URLs
      if (event.request?.url) {
        const url = new URL(event.request.url);
        // Remove auth tokens, passwords, etc. from query params
        url.searchParams.delete('token');
        url.searchParams.delete('password');
        url.searchParams.delete('api_key');
        event.request.url = url.toString();
      }
      return event;
    },
  });
}

// Expose database globally for E2E tests
if (import.meta.env.MODE !== 'production') {
  (window as any).db = db;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

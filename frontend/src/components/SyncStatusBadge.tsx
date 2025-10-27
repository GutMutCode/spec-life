/**
 * @file SyncStatusBadge.tsx
 * @description Visual indicator for task sync status
 *
 * PHASE 1:
 * - Shows sync status icon and color
 * - No click interaction yet
 *
 * FUTURE:
 * - Click to see sync details
 * - Show last synced time
 * - Manual sync trigger
 *
 * @see CLOUD_SYNC_MIGRATION.md Phase 1
 */

import type { SyncStatus } from '@shared/Task';

/**
 * Sync Status Badge Props
 */
interface SyncStatusBadgeProps {
  /**
   * Current sync status
   * - pending: Gray (not synced yet)
   * - syncing: Blue (sync in progress)
   * - synced: Green (up-to-date)
   * - conflict: Yellow (needs resolution)
   * - error: Red (sync failed)
   */
  status?: SyncStatus;

  /**
   * Show label text alongside icon
   * @default false
   */
  showLabel?: boolean;

  /**
   * Size variant
   * @default 'small'
   */
  size?: 'small' | 'medium';
}

/**
 * Sync Status Badge Component
 *
 * Displays a small visual indicator of task sync status.
 *
 * USAGE:
 * ```typescript
 * <SyncStatusBadge status={task.syncStatus} />
 * <SyncStatusBadge status="synced" showLabel size="medium" />
 * ```
 *
 * STATES:
 * - **No status**: Hidden (local-only task)
 * - **pending**: Gray cloud icon
 * - **syncing**: Blue spinning icon
 * - **synced**: Green checkmark
 * - **conflict**: Yellow warning
 * - **error**: Red error icon
 *
 * @component
 * @param {SyncStatusBadgeProps} props - Component props
 * @returns {JSX.Element | null} Rendered badge or null if no status
 */
export default function SyncStatusBadge({
  status,
  showLabel = false,
  size = 'small',
}: SyncStatusBadgeProps): JSX.Element | null {
  // Don't show badge if no sync status (local-only mode)
  if (!status) {
    return null;
  }

  const sizeClasses = size === 'small' ? 'w-4 h-4' : 'w-5 h-5';
  const textSize = size === 'small' ? 'text-xs' : 'text-sm';

  // Render based on status
  switch (status) {
    case 'pending':
      return (
        <span
          className="inline-flex items-center gap-1 text-gray-500"
          title="Not synced yet"
          data-testid="sync-badge-pending"
        >
          <svg className={sizeClasses} fill="currentColor" viewBox="0 0 20 20">
            <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
          </svg>
          {showLabel && <span className={textSize}>Pending</span>}
        </span>
      );

    case 'syncing':
      return (
        <span
          className="inline-flex items-center gap-1 text-blue-500"
          title="Syncing..."
          data-testid="sync-badge-syncing"
        >
          <svg
            className={`${sizeClasses} animate-spin`}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {showLabel && <span className={textSize}>Syncing</span>}
        </span>
      );

    case 'synced':
      return (
        <span
          className="inline-flex items-center gap-1 text-green-500"
          title="Synced"
          data-testid="sync-badge-synced"
        >
          <svg className={sizeClasses} fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          {showLabel && <span className={textSize}>Synced</span>}
        </span>
      );

    case 'conflict':
      return (
        <span
          className="inline-flex items-center gap-1 text-yellow-500"
          title="Sync conflict - newer version on server"
          data-testid="sync-badge-conflict"
        >
          <svg className={sizeClasses} fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {showLabel && <span className={textSize}>Conflict</span>}
        </span>
      );

    case 'error':
      return (
        <span
          className="inline-flex items-center gap-1 text-red-500"
          title="Sync failed - will retry"
          data-testid="sync-badge-error"
        >
          <svg className={sizeClasses} fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          {showLabel && <span className={textSize}>Error</span>}
        </span>
      );

    default:
      return null;
  }
}

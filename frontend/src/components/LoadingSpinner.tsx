/**
 * Loading Spinner Component
 *
 * A reusable loading spinner with customizable size and optional text.
 * Used throughout the app to indicate loading states.
 *
 * Created: 2025-10-16
 * Task: T106
 */

import React from 'react';

export type SpinnerSize = 'small' | 'medium' | 'large';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizeClasses: Record<SpinnerSize, string> = {
  small: 'w-4 h-4 border-2',
  medium: 'w-8 h-8 border-2',
  large: 'w-12 h-12 border-3',
};

const textSizeClasses: Record<SpinnerSize, string> = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
};

/**
 * LoadingSpinner component displays an animated spinner indicator
 *
 * @param size - Size of the spinner (small, medium, large). Default: medium
 * @param text - Optional text to display below the spinner
 * @param className - Additional CSS classes to apply to the container
 * @param fullScreen - If true, renders as a full-screen centered overlay
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  text,
  className = '',
  fullScreen = false,
}) => {
  const spinnerContent = (
    <div
      className={`flex flex-col items-center justify-center ${className}`}
      data-testid="loading-spinner"
    >
      {/* Spinner SVG */}
      <div
        className={`${sizeClasses[size]} border-blue-200 border-t-blue-600 rounded-full animate-spin`}
        role="status"
        aria-label={text || 'Loading'}
      />

      {/* Optional Loading Text */}
      {text && (
        <p
          className={`mt-3 text-gray-600 ${textSizeClasses[size]}`}
          data-testid="loading-text"
        >
          {text}
        </p>
      )}

      {/* Screen reader only text */}
      <span className="sr-only">{text || 'Loading...'}</span>
    </div>
  );

  // Full-screen overlay mode
  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-80"
        data-testid="loading-spinner-fullscreen"
      >
        {spinnerContent}
      </div>
    );
  }

  // Inline mode
  return spinnerContent;
};

export default LoadingSpinner;

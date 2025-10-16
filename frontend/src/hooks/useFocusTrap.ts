import { useEffect, useRef } from 'react';

/**
 * Focus trap hook for modal dialogs (T113).
 *
 * Traps keyboard focus within a modal dialog for accessibility:
 * - Saves the previously focused element
 * - Moves focus to the modal when it opens
 * - Keeps focus within modal when using Tab/Shift+Tab
 * - Restores focus to previous element when modal closes
 * - Supports Escape key to close
 *
 * Usage:
 * ```tsx
 * function Modal({ isOpen, onClose }) {
 *   const modalRef = useFocusTrap(isOpen, onClose);
 *
 *   if (!isOpen) return null;
 *
 *   return (
 *     <div ref={modalRef} role="dialog">
 *       ...modal content...
 *     </div>
 *   );
 * }
 * ```
 */
export function useFocusTrap<T extends HTMLElement>(
  isOpen: boolean,
  onClose?: () => void
) {
  const elementRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save the currently focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Move focus to the modal
    const element = elementRef.current;
    if (element) {
      // Try to focus the first focusable element, otherwise focus the container
      const focusableElements = getFocusableElements(element);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        element.focus();
      }
    }

    // Handle keyboard events
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!element) return;

      // Handle Escape key
      if (event.key === 'Escape' && onClose) {
        event.preventDefault();
        onClose();
        return;
      }

      // Handle Tab key for focus trapping
      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements(element);

        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Shift + Tab
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        }
        // Tab
        else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Cleanup: restore focus when modal closes
    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to the previous element
      if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  return elementRef;
}

/**
 * Gets all focusable elements within a container.
 * Includes buttons, links, inputs, and elements with tabindex >= 0.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const elements = Array.from(container.querySelectorAll(selector)) as HTMLElement[];

  // Filter out elements that are not visible
  return elements.filter((element) => {
    return (
      element.offsetWidth > 0 &&
      element.offsetHeight > 0 &&
      window.getComputedStyle(element).visibility !== 'hidden'
    );
  });
}

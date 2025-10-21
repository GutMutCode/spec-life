import { useEffect, useMemo } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { shortcuts as defaultShortcuts, groupShortcutsByCategory } from '@/config/shortcuts';
import { ShortcutCategory, type KeyboardShortcut } from '@/config/shortcuts.types';

interface ShortcutsModalProps {
  /** Whether the modal is currently open */
  isOpen: boolean;

  /** Callback when modal should close */
  onClose: () => void;

  /** Optional custom shortcuts array (defaults to global config) */
  shortcuts?: KeyboardShortcut[];

  /** Optional className for custom styling */
  className?: string;
}

/**
 * Displays a modal dialog showing all available keyboard shortcuts organized by category.
 *
 * Features:
 * - FR-001: Opens/closes with ? key toggle
 * - FR-002: Displays all shortcuts grouped by category
 * - FR-004: Closes via Escape, click outside, close button
 * - FR-007: Shows OS-specific modifier keys
 * - FR-008: Fully accessible with ARIA labels and focus trap
 * - FR-009: Visually distinct overlay modal
 */
export default function ShortcutsModal({
  isOpen,
  onClose,
  shortcuts = defaultShortcuts,
  className = ''
}: ShortcutsModalProps) {
  // Device detection for OS-specific key display
  const { isMac } = useDeviceDetection();

  // Focus trap for accessibility (handles Escape key internally)
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  // Group shortcuts by category (memoized for performance - SC-007)
  const groupedShortcuts = useMemo(
    () => groupShortcutsByCategory(shortcuts),
    [shortcuts]
  );

  // Category display order per contract
  const categoryOrder: ShortcutCategory[] = [
    ShortcutCategory.Navigation,
    ShortcutCategory.TaskManagement,
    ShortcutCategory.History,
    ShortcutCategory.Accessibility,
    ShortcutCategory.Help
  ];

  // Body scroll lock when modal is open (FR-009)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup: restore scroll on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle overlay click (FR-004)
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking the overlay itself, not the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="presentation"
      onClick={handleOverlayClick}
      data-testid="shortcuts-modal-overlay"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        className={`bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto mx-4 ${className}`}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2
            id="shortcuts-modal-title"
            className="text-2xl font-bold text-gray-900"
          >
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts help"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body - Shortcuts grouped by category */}
        <div className="p-6 space-y-6">
          {shortcuts.length === 0 ? (
            <p className="text-gray-600 text-center">No keyboard shortcuts available</p>
          ) : (
            categoryOrder.map((category) => {
              const categoryShortcuts = groupedShortcuts.get(category);

              // Only render category if it has shortcuts
              if (!categoryShortcuts || categoryShortcuts.length === 0) {
                return null;
              }

              return (
                <section key={category} className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {category}
                  </h3>
                  <ul className="space-y-2">
                    {categoryShortcuts.map((shortcut) => (
                      <li
                        key={shortcut.id}
                        className="flex items-center justify-between"
                      >
                        <span className="text-gray-700">{shortcut.description}</span>
                        <kbd className="px-2 py-1 text-sm font-mono bg-gray-100 border border-gray-300 rounded">
                          {shortcut.key}
                        </kbd>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

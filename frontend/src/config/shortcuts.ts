import { ShortcutCategory, KeyboardShortcut } from './shortcuts.types';

export const shortcuts: KeyboardShortcut[] = [
  // Navigation
  {
    id: 'navigation-n',
    key: 'n',
    description: 'Add new task',
    category: ShortcutCategory.Navigation
  },
  {
    id: 'navigation-a',
    key: 'a',
    description: 'View all tasks',
    category: ShortcutCategory.Navigation
  },
  {
    id: 'navigation-h',
    key: 'h',
    description: 'View history',
    category: ShortcutCategory.Navigation
  },
  {
    id: 'navigation-d',
    key: 'd',
    description: 'Dashboard (home)',
    category: ShortcutCategory.Navigation
  },

  // Help
  {
    id: 'help-question',
    key: '?',
    description: 'Show keyboard shortcuts help',
    category: ShortcutCategory.Help
  },

  // Accessibility
  {
    id: 'accessibility-tab',
    key: 'Tab',
    description: 'Navigate to next element',
    category: ShortcutCategory.Accessibility
  },
  {
    id: 'accessibility-shift-tab',
    key: 'Shift+Tab',
    description: 'Navigate to previous element',
    category: ShortcutCategory.Accessibility
  },
  {
    id: 'accessibility-enter',
    key: 'Enter',
    description: 'Activate focused element',
    category: ShortcutCategory.Accessibility
  },
  {
    id: 'accessibility-space',
    key: 'Space',
    description: 'Activate focused element',
    category: ShortcutCategory.Accessibility
  },
  {
    id: 'accessibility-escape',
    key: 'Escape',
    description: 'Close modal or cancel',
    category: ShortcutCategory.Accessibility
  }
];

/**
 * Group shortcuts by category helper
 * Returns a Map with categories as keys and arrays of shortcuts as values
 */
export function groupShortcutsByCategory(
  shortcuts: KeyboardShortcut[]
): Map<ShortcutCategory, KeyboardShortcut[]> {
  const grouped = new Map<ShortcutCategory, KeyboardShortcut[]>();

  for (const shortcut of shortcuts) {
    const category = shortcut.category;
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(shortcut);
  }

  return grouped;
}

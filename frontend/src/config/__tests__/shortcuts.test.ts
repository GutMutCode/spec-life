import { describe, it, expect } from 'vitest';
import { shortcuts, groupShortcutsByCategory } from '../shortcuts';
import { ShortcutCategory } from '../shortcuts.types';

describe('shortcuts configuration', () => {
  it('should have at least one shortcut defined', () => {
    expect(shortcuts.length).toBeGreaterThan(0);
  });

  it('should have all required fields for each shortcut', () => {
    shortcuts.forEach(shortcut => {
      expect(shortcut).toHaveProperty('id');
      expect(shortcut).toHaveProperty('key');
      expect(shortcut).toHaveProperty('description');
      expect(shortcut).toHaveProperty('category');

      expect(typeof shortcut.id).toBe('string');
      expect(typeof shortcut.key).toBe('string');
      expect(typeof shortcut.description).toBe('string');
      expect(shortcut.id.length).toBeGreaterThan(0);
      expect(shortcut.key.length).toBeGreaterThan(0);
      expect(shortcut.description.length).toBeGreaterThan(0);
    });
  });

  it('should have unique IDs for all shortcuts', () => {
    const ids = shortcuts.map(s => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have valid category values', () => {
    const validCategories = Object.values(ShortcutCategory);
    shortcuts.forEach(shortcut => {
      expect(validCategories).toContain(shortcut.category);
    });
  });
});

describe('groupShortcutsByCategory', () => {
  it('should group shortcuts by category correctly', () => {
    const grouped = groupShortcutsByCategory(shortcuts);

    expect(grouped).toBeInstanceOf(Map);
    expect(grouped.size).toBeGreaterThan(0);

    // Verify each category has at least one shortcut
    grouped.forEach((shortcutList, category) => {
      expect(Array.isArray(shortcutList)).toBe(true);
      expect(shortcutList.length).toBeGreaterThan(0);

      // Verify all shortcuts in the group have the correct category
      shortcutList.forEach(shortcut => {
        expect(shortcut.category).toBe(category);
      });
    });
  });

  it('should handle empty shortcuts array', () => {
    const grouped = groupShortcutsByCategory([]);
    expect(grouped.size).toBe(0);
  });

  it('should include Navigation category shortcuts', () => {
    const grouped = groupShortcutsByCategory(shortcuts);
    const navigationShortcuts = grouped.get(ShortcutCategory.Navigation);

    expect(navigationShortcuts).toBeDefined();
    expect(navigationShortcuts!.length).toBeGreaterThan(0);
  });

  it('should include Help category shortcuts', () => {
    const grouped = groupShortcutsByCategory(shortcuts);
    const helpShortcuts = grouped.get(ShortcutCategory.Help);

    expect(helpShortcuts).toBeDefined();
    expect(helpShortcuts!.length).toBeGreaterThan(0);
  });

  it('should include Accessibility category shortcuts', () => {
    const grouped = groupShortcutsByCategory(shortcuts);
    const accessibilityShortcuts = grouped.get(ShortcutCategory.Accessibility);

    expect(accessibilityShortcuts).toBeDefined();
    expect(accessibilityShortcuts!.length).toBeGreaterThan(0);
  });
});

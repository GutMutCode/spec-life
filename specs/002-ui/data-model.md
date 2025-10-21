# Phase 1: Data Model - Keyboard Shortcuts Help UI

**Feature Branch**: `002-ui` | **Date**: 2025-10-17
**Input**: Research from `/specs/002-ui/research.md`, Spec from `/specs/002-ui/spec.md`

## Overview

This document defines the data structures for the keyboard shortcuts help UI feature. Per the research phase, all data is stored in-memory via TypeScript configuration (no database persistence required).

## Entity Definitions

### 1. KeyboardShortcut

Represents a single keyboard shortcut and its associated action.

**TypeScript Interface**:
```typescript
export interface KeyboardShortcut {
  /** Unique identifier for the shortcut */
  id: string;

  /** The key combination (e.g., "n", "Ctrl+S", "Shift+?") */
  key: string;

  /** Human-readable description of the action */
  description: string;

  /** Category for grouping (e.g., "Navigation", "Task Management") */
  category: ShortcutCategory;

  /** Optional handler function for executing the shortcut */
  handler?: () => void;

  /** Whether this shortcut is available on current page/context */
  isAvailable?: (context: PageContext) => boolean;
}
```

**Attributes**:
- `id`: Auto-generated from `${category}-${key}` (e.g., "navigation-n")
- `key`: Raw key value from `KeyboardEvent.key` (lowercase)
- `description`: Action description shown in help UI
- `category`: Enum value from `ShortcutCategory`
- `handler`: Optional function reference for programmatic execution
- `isAvailable`: Optional predicate for context-specific shortcuts

**Example Instances**:
```typescript
{
  id: 'navigation-n',
  key: 'n',
  description: 'Add new task',
  category: ShortcutCategory.Navigation,
  handler: () => navigate('/add')
}

{
  id: 'help-question',
  key: '?',
  description: 'Show keyboard shortcuts help',
  category: ShortcutCategory.Help,
  handler: () => toggleShortcutsModal()
}
```

**Validation Rules**:
- `id` must be unique across all shortcuts
- `key` must be a valid `KeyboardEvent.key` value
- `description` must be non-empty string
- `category` must be a valid `ShortcutCategory` enum value

### 2. ShortcutCategory

Enumeration of shortcut categories for grouping in the help UI.

**TypeScript Enum**:
```typescript
export enum ShortcutCategory {
  Navigation = 'Navigation',
  TaskManagement = 'Task Management',
  History = 'History',
  Help = 'Help',
  Accessibility = 'Accessibility'
}
```

**Display Order** (in help modal):
1. Navigation
2. Task Management
3. History
4. Accessibility
5. Help

**Category Descriptions** (shown in help modal):
- **Navigation**: Move between pages and sections
- **Task Management**: Create, edit, and organize tasks
- **History**: View and manage completed tasks
- **Accessibility**: Navigate using keyboard only
- **Help**: Get assistance and view shortcuts

### 3. ShortcutHint

Configuration for contextual tooltip hints on interactive elements.

**TypeScript Interface**:
```typescript
export interface ShortcutHint {
  /** CSS selector or ref to target element */
  targetElement: string | React.RefObject<HTMLElement>;

  /** Associated keyboard shortcut */
  shortcut: KeyboardShortcut;

  /** Hint text template (defaults to "{description} ({key})") */
  hintTemplate?: string;

  /** Tooltip position preference */
  position?: 'top' | 'bottom' | 'left' | 'right';
}
```

**Attributes**:
- `targetElement`: DOM selector (e.g., `[data-action="add-task"]`) or React ref
- `shortcut`: Reference to `KeyboardShortcut` instance
- `hintTemplate`: Optional custom format (default: "Add new task (n)")
- `position`: Tooltip positioning (default: 'bottom')

**Example Instances**:
```typescript
{
  targetElement: '[data-action="add-task"]',
  shortcut: shortcuts.find(s => s.key === 'n'),
  hintTemplate: '{description} ({key})',
  position: 'bottom'
}
```

### 4. OperatingSystem

Enumeration for OS-specific key display.

**TypeScript Enum**:
```typescript
export enum OperatingSystem {
  Mac = 'Mac',
  Windows = 'Windows',
  Linux = 'Linux',
  Unknown = 'Unknown'
}
```

**Modifier Key Mapping**:
```typescript
export const ModifierKeys: Record<OperatingSystem, ModifierKeyLabels> = {
  [OperatingSystem.Mac]: {
    ctrl: '⌃',
    alt: '⌥',
    shift: '⇧',
    meta: '⌘'
  },
  [OperatingSystem.Windows]: {
    ctrl: 'Ctrl',
    alt: 'Alt',
    shift: 'Shift',
    meta: 'Win'
  },
  [OperatingSystem.Linux]: {
    ctrl: 'Ctrl',
    alt: 'Alt',
    shift: 'Shift',
    meta: 'Super'
  },
  [OperatingSystem.Unknown]: {
    ctrl: 'Ctrl',
    alt: 'Alt',
    shift: 'Shift',
    meta: 'Meta'
  }
};

interface ModifierKeyLabels {
  ctrl: string;
  alt: string;
  shift: string;
  meta: string;
}
```

### 5. PageContext

Context information for determining shortcut availability.

**TypeScript Interface**:
```typescript
export interface PageContext {
  /** Current route path (from React Router) */
  pathname: string;

  /** Whether user is currently typing in an input */
  isTyping: boolean;

  /** Whether a modal is currently open */
  hasOpenModal: boolean;

  /** Current operating system */
  os: OperatingSystem;

  /** Whether device is touch-only mobile */
  isTouchOnly: boolean;
}
```

**Usage**:
```typescript
// Example: Disable shortcuts when typing
if (context.isTyping) {
  return; // Don't execute shortcut
}

// Example: Context-specific shortcuts
{
  key: 'c',
  description: 'Complete top task',
  category: ShortcutCategory.TaskManagement,
  isAvailable: (ctx) => ctx.pathname === '/' // Dashboard only
}
```

## Data Flow

### 1. Configuration → UI Rendering

```
shortcuts.ts (config)
    ↓
useShortcutsHelp() hook (state management)
    ↓
ShortcutsModal component (renders grouped shortcuts)
    ↓
User sees help modal with all categories
```

### 2. User Interaction → Shortcut Execution

```
User presses key
    ↓
useKeyboardShortcuts() hook captures event
    ↓
Check PageContext (not typing, no modal open)
    ↓
Find matching shortcut by key
    ↓
Execute shortcut.handler()
```

### 3. Tooltip Display Flow

```
User hovers over button with data-shortcut="n"
    ↓
ShortcutHint component detects hover
    ↓
Wait 500ms (FR-006 requirement)
    ↓
Look up shortcut by key
    ↓
Format hint: "Add new task (n)"
    ↓
Show tooltip positioned below button
```

## Data Relationships

```
┌─────────────────────┐
│ ShortcutCategory    │
│ (enum)              │
└──────────┬──────────┘
           │
           │ categorizes
           │
           ↓
┌─────────────────────┐         ┌─────────────────────┐
│ KeyboardShortcut    │←────────│ ShortcutHint        │
│                     │ targets │                     │
│ - id                │         │ - targetElement     │
│ - key               │         │ - shortcut (ref)    │
│ - description       │         │ - hintTemplate      │
│ - category          │         │ - position          │
│ - handler           │         └─────────────────────┘
│ - isAvailable       │
└─────────────────────┘
           ↑
           │ uses
           │
┌─────────────────────┐
│ PageContext         │
│                     │
│ - pathname          │
│ - isTyping          │
│ - hasOpenModal      │
│ - os                │
│ - isTouchOnly       │
└─────────────────────┘
```

## Storage Strategy

**Location**: `frontend/src/config/shortcuts.ts`

**Format**: TypeScript module export

**Example**:
```typescript
// frontend/src/config/shortcuts.ts
import { ShortcutCategory, KeyboardShortcut } from './types';

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

// Group by category helper
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
```

## Type Definitions Location

**File**: `frontend/src/config/shortcuts.types.ts`

```typescript
export enum ShortcutCategory {
  Navigation = 'Navigation',
  TaskManagement = 'Task Management',
  History = 'History',
  Help = 'Help',
  Accessibility = 'Accessibility'
}

export enum OperatingSystem {
  Mac = 'Mac',
  Windows = 'Windows',
  Linux = 'Linux',
  Unknown = 'Unknown'
}

export interface KeyboardShortcut {
  id: string;
  key: string;
  description: string;
  category: ShortcutCategory;
  handler?: () => void;
  isAvailable?: (context: PageContext) => boolean;
}

export interface ShortcutHint {
  targetElement: string | React.RefObject<HTMLElement>;
  shortcut: KeyboardShortcut;
  hintTemplate?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface PageContext {
  pathname: string;
  isTyping: boolean;
  hasOpenModal: boolean;
  os: OperatingSystem;
  isTouchOnly: boolean;
}

export interface ModifierKeyLabels {
  ctrl: string;
  alt: string;
  shift: string;
  meta: string;
}

export const ModifierKeys: Record<OperatingSystem, ModifierKeyLabels> = {
  [OperatingSystem.Mac]: {
    ctrl: '⌃',
    alt: '⌥',
    shift: '⇧',
    meta: '⌘'
  },
  [OperatingSystem.Windows]: {
    ctrl: 'Ctrl',
    alt: 'Alt',
    shift: 'Shift',
    meta: 'Win'
  },
  [OperatingSystem.Linux]: {
    ctrl: 'Ctrl',
    alt: 'Alt',
    shift: 'Shift',
    meta: 'Super'
  },
  [OperatingSystem.Unknown]: {
    ctrl: 'Ctrl',
    alt: 'Alt',
    shift: 'Shift',
    meta: 'Meta'
  }
};
```

## Validation & Constraints

### Uniqueness Constraints
- `KeyboardShortcut.id` must be unique across all shortcuts
- `KeyboardShortcut.key` should be unique within same `PageContext` (no conflicts)

### Required Fields
- `KeyboardShortcut.id`: Required
- `KeyboardShortcut.key`: Required
- `KeyboardShortcut.description`: Required
- `KeyboardShortcut.category`: Required

### Optional Fields
- `KeyboardShortcut.handler`: Optional (display-only shortcuts like Tab, Enter)
- `KeyboardShortcut.isAvailable`: Optional (defaults to always available)
- `ShortcutHint.hintTemplate`: Optional (defaults to "{description} ({key})")
- `ShortcutHint.position`: Optional (defaults to 'bottom')

## Testing Considerations

### Unit Test Data
```typescript
// Test fixture: minimal shortcut
const testShortcut: KeyboardShortcut = {
  id: 'test-t',
  key: 't',
  description: 'Test action',
  category: ShortcutCategory.Help
};

// Test fixture: full shortcut with handler
const testShortcutWithHandler: KeyboardShortcut = {
  id: 'test-h',
  key: 'h',
  description: 'Test handler',
  category: ShortcutCategory.Navigation,
  handler: jest.fn(),
  isAvailable: (ctx) => ctx.pathname === '/test'
};

// Test fixture: page context
const testContext: PageContext = {
  pathname: '/',
  isTyping: false,
  hasOpenModal: false,
  os: OperatingSystem.Mac,
  isTouchOnly: false
};
```

### Edge Cases to Test
1. **Duplicate keys**: Same key in different categories (should warn or prevent)
2. **Invalid key values**: Non-standard `KeyboardEvent.key` values
3. **Missing handlers**: Shortcuts without handlers (display-only is valid)
4. **Context conflicts**: Multiple shortcuts available in same context
5. **Mobile detection**: Touch+keyboard hybrids (iPad with Smart Keyboard)
6. **OS detection**: Unknown platforms (should default to Windows/Linux style)

## Migration Path (Future Enhancements)

If future requirements add shortcut customization (out of scope per spec):

1. **Add persistence layer**:
   - Store user overrides in IndexedDB
   - Merge with default config on load

2. **Add customization UI**:
   - Settings page for remapping shortcuts
   - Conflict detection and resolution

3. **Add versioning**:
   - Config schema version for migrations
   - Default reset option

**Current scope**: Read-only display, no customization, no persistence.

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

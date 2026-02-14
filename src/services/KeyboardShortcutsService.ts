/**
 * KEYBOARD SHORTCUTS SERVICE
 * 
 * Manages keyboard shortcuts throughout the application.
 * Supports Cmd/Ctrl modifiers for cross-platform compatibility.
 */

import { KeyboardShortcut, ShortcutKey, ShortcutCategory } from '../types/workflow';

class KeyboardShortcutsService {
  private shortcuts: Map<ShortcutKey, KeyboardShortcut> = new Map();
  private listeners: Set<(e: KeyboardEvent) => void> = new Set();
  private enabled: boolean = true;

  constructor() {
    this.initializeGlobalListener();
  }

  /**
   * Initialize global keyboard event listener
   */
  private initializeGlobalListener() {
    if (typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!this.enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        // Exception: Cmd+K should work everywhere
        if (!(e.key === 'k' && (e.metaKey || e.ctrlKey))) {
          return;
        }
      }

      const shortcutKey = this.eventToShortcutKey(e);
      if (shortcutKey) {
        const shortcut = this.shortcuts.get(shortcutKey);
        if (shortcut && shortcut.enabled !== false) {
          e.preventDefault();
          e.stopPropagation();
          shortcut.action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
  }

  /**
   * Convert keyboard event to shortcut key
   */
  private eventToShortcutKey(e: KeyboardEvent): ShortcutKey | null {
    const isMod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();

    // Modifier + key shortcuts
    if (isMod) {
      if (key === 'k') return 'mod+k';
      if (key === 'n') return 'mod+n';
      if (key === 'b') return 'mod+b';
      if (key === 'r') return 'mod+r';
      if (key === 'd') return 'mod+d';
      if (key === 's') return 'mod+s';
      if (key === '/') return 'mod+/';
      if (key === ',') return 'mod+,';
      if (key === '[') return 'mod+[';
      if (key === ']') return 'mod+]';
    }

    // Single key shortcuts
    if (key === 'escape') return 'esc';
    if (key === '?') return '?';

    // Vim-style 'g' shortcuts (sequential)
    if (this.lastKey === 'g') {
      if (key === 'd') return 'g+d';
      if (key === 'b') return 'g+b';
      if (key === 'r') return 'g+r';
      if (key === 'p') return 'g+p';
      if (key === 's') return 'g+s';
    }

    // Remember last key for sequential shortcuts
    this.lastKey = key;
    setTimeout(() => { this.lastKey = null; }, 1000);

    return null;
  }

  private lastKey: string | null = null;

  /**
   * Register a keyboard shortcut
   */
  register(shortcut: KeyboardShortcut): void {
    this.shortcuts.set(shortcut.key, shortcut);
  }

  /**
   * Register multiple shortcuts
   */
  registerMultiple(shortcuts: KeyboardShortcut[]): void {
    shortcuts.forEach(s => this.register(s));
  }

  /**
   * Unregister a shortcut
   */
  unregister(key: ShortcutKey): void {
    this.shortcuts.delete(key);
  }

  /**
   * Get all registered shortcuts
   */
  getAll(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts grouped by category
   */
  getByCategory(): ShortcutCategory[] {
    const shortcuts = this.getAll();
    const categories: { [key: string]: KeyboardShortcut[] } = {
      navigation: [],
      actions: [],
      general: []
    };

    shortcuts.forEach(s => {
      categories[s.category].push(s);
    });

    return [
      { id: 'navigation', label: 'Navigation', shortcuts: categories.navigation },
      { id: 'actions', label: 'Actions', shortcuts: categories.actions },
      { id: 'general', label: 'General', shortcuts: categories.general }
    ].filter(c => c.shortcuts.length > 0);
  }

  /**
   * Enable/disable all shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Format shortcut key for display
   */
  formatKey(key: ShortcutKey): string {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? '⌘' : 'Ctrl';

    return key
      .replace('mod+', `${modKey}+`)
      .replace('+', ' ')
      .toUpperCase()
      .replace('ESC', 'Esc')
      .replace('G+', 'g ');
  }

  /**
   * Check if a shortcut is registered
   */
  has(key: ShortcutKey): boolean {
    return this.shortcuts.has(key);
  }

  /**
   * Clear all shortcuts
   */
  clear(): void {
    this.shortcuts.clear();
  }
}

// Singleton instance
export const keyboardShortcuts = new KeyboardShortcutsService();

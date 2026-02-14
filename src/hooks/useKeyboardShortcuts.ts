/**
 * CUSTOM HOOK: useKeyboardShortcuts
 * 
 * Manages keyboard shortcuts for a component.
 * Automatically registers and unregisters shortcuts on mount/unmount.
 */

import { useEffect } from 'react';
import { KeyboardShortcut } from '../types/workflow';
import { keyboardShortcuts } from '../services/KeyboardShortcutsService';

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    // Register all shortcuts
    keyboardShortcuts.registerMultiple(shortcuts);

    // Cleanup on unmount
    return () => {
      shortcuts.forEach(s => keyboardShortcuts.unregister(s.key));
    };
  }, [shortcuts]);
}

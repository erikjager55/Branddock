/**
 * SHORTCUT HINT COMPONENT
 * 
 * Displays keyboard shortcut hints next to buttons and menu items.
 * Usage: <ShortcutHint keys={['⌘', 'K']} />
 */

import React from 'react';

interface ShortcutHintProps {
  keys: string[];
  className?: string;
}

export function ShortcutHint({ keys, className = '' }: ShortcutHintProps) {
  return (
    <div className={`hidden sm:flex items-center gap-0.5 ${className}`}>
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded border border-border">
            {key}
          </kbd>
          {index < keys.length - 1 && (
            <span className="text-xs text-muted-foreground">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * Get platform-specific modifier key
 */
export function getModifierKey(): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return isMac ? '⌘' : 'Ctrl';
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: string): string[] {
  const mod = getModifierKey();
  return shortcut
    .replace('mod+', `${mod}+`)
    .split('+')
    .map(k => k.trim());
}

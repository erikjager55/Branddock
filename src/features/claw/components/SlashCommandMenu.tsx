'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SlashCommand } from '@/lib/claw/slash-commands';

interface Props {
  commands: SlashCommand[];
  highlightedIndex: number;
  onHover: (index: number) => void;
  onSelect: (id: SlashCommand['id']) => void;
}

/**
 * Floating auto-suggest menu for slash commands. Rendered above the input
 * card while the user is typing a "/" prefix.
 *
 * Keyboard navigation (ArrowUp/Down, Enter, Tab, Escape) is handled by the
 * parent InputBar's `onKeyDown` — this component only paints UI + handles
 * pointer events.
 */
export function SlashCommandMenu({
  commands,
  highlightedIndex,
  onHover,
  onSelect,
}: Props) {
  const { t } = useTranslation('claw');
  if (commands.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label={t('slash.ariaLabel')}
      className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-20"
    >
      <div className="px-3 py-1.5 border-b border-gray-100 text-[10px] uppercase tracking-wide font-medium text-gray-400">
        {t('slash.commands')}
      </div>
      <ul className="max-h-64 overflow-y-auto py-1">
        {commands.map((cmd, index) => {
          const Icon = cmd.icon;
          const isHighlighted = index === highlightedIndex;
          return (
            <li key={cmd.id} role="option" aria-selected={isHighlighted}>
              <button
                type="button"
                onMouseEnter={() => onHover(index)}
                // onMouseDown (not onClick) so the selection fires before
                // the textarea loses focus-related state.
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(cmd.id);
                }}
                className={`flex items-center gap-3 w-full px-3 py-2 text-left transition-colors ${
                  isHighlighted ? 'bg-teal-50' : 'hover:bg-gray-50'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                    isHighlighted ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {cmd.label}
                    </span>
                    <span className="text-[11px] font-mono text-gray-400 flex-shrink-0">
                      {cmd.id}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {cmd.description}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="px-3 py-1.5 border-t border-gray-100 text-[10px] text-gray-400">
        <span className="inline-flex items-center gap-2">
          <span><kbd className="px-1 py-0.5 rounded bg-gray-100 font-mono text-[10px]">↑↓</kbd> {t('slash.navigate')}</span>
          <span><kbd className="px-1 py-0.5 rounded bg-gray-100 font-mono text-[10px]">↵</kbd> {t('slash.select')}</span>
          <span><kbd className="px-1 py-0.5 rounded bg-gray-100 font-mono text-[10px]">esc</kbd> {t('slash.dismiss')}</span>
        </span>
      </div>
    </div>
  );
}

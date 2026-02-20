'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface RepeatableListInputProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  max?: number;
  label?: string;
  description?: string;
  icon?: LucideIcon;
  addLabel?: string;
}

export function RepeatableListInput({
  items,
  onChange,
  placeholder = 'Add an item...',
  max = 10,
  label,
  description,
  icon: Icon,
  addLabel = 'Add Item',
}: RepeatableListInputProps) {
  const [draft, setDraft] = useState('');

  const handleAdd = () => {
    const val = draft.trim();
    if (!val || items.length >= max) return;
    onChange([...items, val]);
    setDraft('');
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      {/* Header */}
      {label && (
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
            <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}

      {/* Items list */}
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2 group rounded-lg border border-gray-200 px-3 py-2">
              <span className="flex-1 text-sm text-gray-700">{item}</span>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Input */}
      {items.length < max && (
        <div className="space-y-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!draft.trim()}
            className="w-full border border-dashed border-gray-200 rounded-lg py-2 text-sm text-muted-foreground hover:border-emerald-300 hover:text-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {addLabel}
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface RepeatableListInputProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  max?: number;
  label?: string;
}

export function RepeatableListInput({
  items,
  onChange,
  placeholder = 'Add an item...',
  max = 10,
  label,
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
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      <ul className="space-y-1.5 mb-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 group">
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
      {items.length < max && (
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!draft.trim()}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}
    </div>
  );
}

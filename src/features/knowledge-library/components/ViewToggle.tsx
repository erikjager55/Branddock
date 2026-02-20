'use client';

import { LayoutGrid, List } from 'lucide-react';

interface ViewToggleProps {
  mode: 'grid' | 'list';
  onChange: (mode: 'grid' | 'list') => void;
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden" data-testid="view-toggle">
      <button
        onClick={() => onChange('grid')}
        data-testid="grid-view-button"
        className={`p-2 transition-colors ${
          mode === 'grid'
            ? 'bg-green-50 text-green-600'
            : 'bg-white text-gray-400 hover:text-gray-600'
        }`}
        aria-label="Grid view"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        onClick={() => onChange('list')}
        data-testid="list-view-button"
        className={`p-2 transition-colors ${
          mode === 'list'
            ? 'bg-green-50 text-green-600'
            : 'bg-white text-gray-400 hover:text-gray-600'
        }`}
        aria-label="List view"
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}

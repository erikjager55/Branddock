'use client';

import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';

export interface BrandContextTagsEditorProps {
  /** Tags pulled from the resolved workspace brand context */
  initialTags: string[];
  /** Custom tags added by the user (rendered alongside initial tags) */
  customTags: string[];
  /** Currently selected tags (both initial and custom) */
  selectedTags: Set<string>;
  /** Toggle a single tag */
  onToggleTag: (tag: string) => void;
  /** Add a new custom tag — returns void if it's a duplicate */
  onAddCustomTag: (tag: string) => void;
  /** Optional loading state for the initial fetch */
  isLoading?: boolean;
}

/**
 * Brand context tag selector — pills + add-custom input.
 * Shared between AI Trainer (reference generation) and AI Studio (ad-hoc generation).
 */
export function BrandContextTagsEditor({
  initialTags,
  customTags,
  selectedTags,
  onToggleTag,
  onAddCustomTag,
  isLoading = false,
}: BrandContextTagsEditorProps) {
  const [newTagInput, setNewTagInput] = useState('');

  const handleAdd = useCallback(() => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    onAddCustomTag(trimmed);
    setNewTagInput('');
  }, [newTagInput, onAddCustomTag]);

  const allTags = [...initialTags, ...customTags];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900">Brand Context Tags</h3>
      <p className="mt-1 text-sm text-gray-500">
        Select the brand keywords to include in the generation prompts. Deselect tags you
        don&apos;t want to influence the output.
      </p>

      {isLoading ? (
        <p className="mt-3 text-sm text-gray-400 italic">Loading brand context…</p>
      ) : allTags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedTags.has(tag)
                  ? 'bg-teal-100 text-teal-700 border border-teal-300'
                  : 'bg-gray-100 text-gray-400 border border-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-400 italic">
          No brand context available. Images will be generated with default prompts.
        </p>
      )}

      {/* Add keyword */}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={newTagInput}
          onChange={(e) => setNewTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Add keyword..."
          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newTagInput.trim()}
          className="flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>
    </div>
  );
}

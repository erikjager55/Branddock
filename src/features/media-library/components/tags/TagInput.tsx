'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Tag, X, Plus, Check } from 'lucide-react';
import { useMediaTags, useCreateMediaTag } from '../../hooks/index';
import type { MediaTagWithCount } from '../../types/media.types';

interface TagInputProps {
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
}

/** Reusable autocomplete tag input with selected pills and dropdown. */
export function TagInput({ selectedTagIds, onChange }: TagInputProps) {
  const { data: tags } = useMediaTags();
  const createTag = useCreateMediaTag();

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allTags = tags ?? [];
  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id));

  const filteredTags = allTags.filter((t) => {
    if (selectedTagIds.includes(t.id)) return false;
    if (!query.trim()) return true;
    return t.name.toLowerCase().includes(query.toLowerCase());
  });

  const exactMatch = allTags.some(
    (t) => t.name.toLowerCase() === query.trim().toLowerCase(),
  );
  const showCreateOption = query.trim().length > 0 && !exactMatch;

  const handleSelect = useCallback(
    (tagId: string) => {
      if (!selectedTagIds.includes(tagId)) {
        onChange([...selectedTagIds, tagId]);
      }
      setQuery('');
    },
    [selectedTagIds, onChange],
  );

  const handleRemove = useCallback(
    (tagId: string) => {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    },
    [selectedTagIds, onChange],
  );

  function handleCreate() {
    const trimmed = query.trim();
    if (!trimmed) return;
    createTag.mutate(
      { name: trimmed },
      {
        onSuccess: (newTag) => {
          handleSelect(newTag.id);
        },
      },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
    if (e.key === 'Backspace' && query === '' && selectedTagIds.length > 0) {
      handleRemove(selectedTagIds[selectedTagIds.length - 1]);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTags.length > 0) {
        handleSelect(filteredTags[0].id);
      } else if (showCreateOption) {
        handleCreate();
      }
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Input area with selected pills */}
      <div
        className={`flex flex-wrap items-center gap-1.5 min-h-[38px] border rounded-lg px-2 py-1.5 transition-colors cursor-text ${
          isOpen
            ? 'border-teal-500 ring-2 ring-teal-500/20'
            : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => {
          inputRef.current?.focus();
          setIsOpen(true);
        }}
      >
        {selectedTags.map((tag) => (
          <SelectedPill key={tag.id} tag={tag} onRemove={() => handleRemove(tag.id)} />
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? 'Search or create tags...' : ''}
          className="flex-1 min-w-[80px] border-0 p-0 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 bg-transparent"
        />
        {selectedTags.length === 0 && !isOpen && (
          <Tag className="w-4 h-4 text-gray-300 flex-shrink-0" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (filteredTags.length > 0 || showCreateOption) && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredTags.map((tag) => (
            <DropdownItem
              key={tag.id}
              tag={tag}
              onSelect={() => handleSelect(tag.id)}
            />
          ))}

          {showCreateOption && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={createTag.isPending}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4 text-teal-600" />
              <span className="text-teal-600 font-medium">
                Create &ldquo;{query.trim()}&rdquo;
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Selected tag pill with remove button. */
function SelectedPill({
  tag,
  onRemove,
}: {
  tag: MediaTagWithCount;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
      {tag.color && (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: tag.color }}
        />
      )}
      <span>{tag.name}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="p-0.5 rounded-full hover:bg-gray-200 transition-colors"
        aria-label={`Remove ${tag.name}`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

/** Dropdown item for available tags. */
function DropdownItem({
  tag,
  onSelect,
}: {
  tag: MediaTagWithCount;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex items-center justify-between w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: tag.color ?? '#9CA3AF' }}
        />
        <span className="text-gray-900 truncate">{tag.name}</span>
      </div>
      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
        {tag._count.assets}
      </span>
    </button>
  );
}

'use client';

import React from 'react';
import { Settings } from 'lucide-react';
import { useMediaTags } from '../../hooks/index';
import { useMediaLibraryStore } from '../../stores/useMediaLibraryStore';

/** Horizontal scrollable row of tag pills for filtering media assets by tag. */
export function TagFilterPills() {
  const { data: tags, isLoading } = useMediaTags();
  const tagFilter = useMediaLibraryStore((s) => s.tagFilter);
  const setTagFilter = useMediaLibraryStore((s) => s.setTagFilter);
  const setTagManagerModalOpen = useMediaLibraryStore((s) => s.setTagManagerModalOpen);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 rounded-full bg-gray-100 animate-pulse flex-shrink-0"
          />
        ))}
      </div>
    );
  }

  if (!tags || tags.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">No tags yet</span>
        <button
          onClick={() => setTagManagerModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          Manage Tags
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {tags.map((tag) => {
        const isActive = tagFilter === tag.id;

        return (
          <button
            key={tag.id}
            onClick={() => setTagFilter(isActive ? null : tag.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
              isActive
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tag.color && (
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'ring-1 ring-white/40' : ''}`}
                style={{ backgroundColor: tag.color }}
              />
            )}
            <span>{tag.name}</span>
            <span
              className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] leading-none ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {tag._count.assets}
            </span>
          </button>
        );
      })}

      <button
        onClick={() => setTagManagerModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-colors flex-shrink-0"
      >
        <Settings className="w-3.5 h-3.5" />
        Manage Tags
      </button>
    </div>
  );
}

'use client';

import { LayoutGrid, List } from 'lucide-react';
import { SearchInput, Select } from '@/components/shared';
import { useMediaLibraryStore } from '../stores/useMediaLibraryStore';
import { MEDIA_TYPE_ICONS, MEDIA_CATEGORY_CONFIG, SORT_OPTIONS } from '../constants/media-constants';
import type { MediaViewMode } from '../constants/media-constants';
import type { MediaType, MediaCategory } from '../types/media.types';

const TYPE_OPTIONS = Object.entries(MEDIA_TYPE_ICONS).map(([value, config]) => ({
  value,
  label: config.label,
}));

const CATEGORY_OPTIONS = Object.entries(MEDIA_CATEGORY_CONFIG).map(([value, config]) => ({
  value,
  label: config.label,
}));

const SORT_OPTIONS_LIST = SORT_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}));

/** Search and filter bar for the Media Library. */
export function MediaSearchFilter() {
  const store = useMediaLibraryStore();

  return (
    <div className="flex items-center gap-3 flex-wrap mb-4" data-testid="media-filters">
      <div className="flex-1 min-w-[200px]" data-testid="media-search">
        <SearchInput
          value={store.searchQuery}
          onChange={store.setSearchQuery}
          placeholder="Search media..."
        />
      </div>

      <div data-testid="media-type-filter">
        <Select
          value={store.mediaTypeFilter ?? ''}
          onChange={(val) => store.setMediaTypeFilter((val || null) as MediaType | null)}
          options={TYPE_OPTIONS}
          placeholder="All Types"
          allowClear
        />
      </div>

      <div data-testid="media-category-filter">
        <Select
          value={store.categoryFilter ?? ''}
          onChange={(val) => store.setCategoryFilter((val || null) as MediaCategory | null)}
          options={CATEGORY_OPTIONS}
          placeholder="All Categories"
          allowClear
        />
      </div>

      <div data-testid="media-sort">
        <Select
          value={store.sortBy + ':' + store.sortOrder}
          onChange={(val) => {
            if (val) {
              const [field, order] = val.split(':');
              store.setSortBy(field);
              store.setSortOrder(order as 'asc' | 'desc');
            }
          }}
          options={SORT_OPTIONS_LIST}
          placeholder="Sort by"
        />
      </div>

      <ViewToggle mode={store.viewMode} onChange={store.setViewMode} />
    </div>
  );
}

/** Inline grid/list view toggle. */
function ViewToggle({
  mode,
  onChange,
}: {
  mode: MediaViewMode;
  onChange: (mode: MediaViewMode) => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-gray-200" data-testid="media-view-toggle">
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={`p-2 rounded-l-lg transition-colors ${
          mode === 'grid' ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-700'
        }`}
        aria-label="Grid view"
        aria-pressed={mode === 'grid'}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={`p-2 rounded-r-lg transition-colors ${
          mode === 'list' ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-700'
        }`}
        aria-label="List view"
        aria-pressed={mode === 'list'}
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}

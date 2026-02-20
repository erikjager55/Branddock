'use client';

import { SearchInput, Select } from '@/components/shared';
import { useKnowledgeLibraryStore } from '@/stores/useKnowledgeLibraryStore';
import { ViewToggle } from './ViewToggle';
import { RESOURCE_TYPE_ICONS, RESOURCE_CATEGORIES } from '../constants/library-constants';
import type { ResourceType } from '../types/knowledge-library.types';

const TYPE_OPTIONS = Object.entries(RESOURCE_TYPE_ICONS).map(([value, config]) => ({
  value,
  label: config.label,
}));

const CATEGORY_OPTIONS = RESOURCE_CATEGORIES.map((c) => ({
  value: c,
  label: c,
}));

export function ResourceSearchFilter() {
  const store = useKnowledgeLibraryStore();

  return (
    <div className="flex items-center gap-3 flex-wrap mb-4" data-testid="resource-filters">
      <div className="flex-1 min-w-[200px]" data-testid="resource-search">
        <SearchInput
          value={store.searchQuery}
          onChange={store.setSearchQuery}
          placeholder="Search resources..."
        />
      </div>

      <div data-testid="resource-type-filter">
        <Select
          value={store.typeFilter ?? ''}
          onChange={(val) => store.setTypeFilter((val || null) as ResourceType | null)}
          options={TYPE_OPTIONS}
          placeholder="All Types"
          allowClear
        />
      </div>

      <div data-testid="resource-category-filter">
        <Select
          value={store.categoryFilter ?? ''}
          onChange={(val) => store.setCategoryFilter(val || null)}
          options={CATEGORY_OPTIONS}
          placeholder="All Categories"
          allowClear
        />
      </div>

      <ViewToggle mode={store.viewMode} onChange={store.setViewMode} />
    </div>
  );
}

'use client';

import { useTranslation } from 'react-i18next';
import { SearchInput, Select } from '@/components/shared';
import { useKnowledgeLibraryStore } from '@/stores/useKnowledgeLibraryStore';
import { ViewToggle } from './ViewToggle';
import { RESOURCE_TYPE_ICONS, RESOURCE_CATEGORIES } from '../constants/library-constants';
import type { ResourceType } from '../types/knowledge-library.types';

export function ResourceSearchFilter() {
  const { t } = useTranslation('knowledge-library');
  const store = useKnowledgeLibraryStore();

  const typeOptions = Object.keys(RESOURCE_TYPE_ICONS).map((value) => ({
    value,
    label: t(`types.${value}`),
  }));

  const categoryOptions = RESOURCE_CATEGORIES.map((c) => ({
    value: c,
    label: t(`claw-content-registry:categories.${c}`, { defaultValue: c }),
  }));

  return (
    <div className="flex items-center gap-3 flex-wrap mb-4" data-testid="resource-filters">
      <div className="flex-1 min-w-[200px]" data-testid="resource-search">
        <SearchInput
          value={store.searchQuery}
          onChange={store.setSearchQuery}
          placeholder={t('filters.searchPlaceholder')}
        />
      </div>

      <div data-testid="resource-type-filter">
        <Select
          value={store.typeFilter ?? ''}
          onChange={(val) => store.setTypeFilter((val || null) as ResourceType | null)}
          options={typeOptions}
          placeholder={t('filters.allTypes')}
          allowClear
        />
      </div>

      <div data-testid="resource-category-filter">
        <Select
          value={store.categoryFilter ?? ''}
          onChange={(val) => store.setCategoryFilter(val || null)}
          options={categoryOptions}
          placeholder={t('filters.allCategories')}
          allowClear
        />
      </div>

      <ViewToggle mode={store.viewMode} onChange={store.setViewMode} />
    </div>
  );
}

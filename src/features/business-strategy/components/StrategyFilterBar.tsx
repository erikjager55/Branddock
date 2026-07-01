'use client';

import { RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SearchInput, Select, Button } from '@/components/shared';
import { useBusinessStrategyStore } from '../stores/useBusinessStrategyStore';
import { STRATEGY_TYPES } from '../constants/strategy-types';
import type { StrategyStatus, StrategyType } from '../types/business-strategy.types';

const STATUS_VALUES: StrategyStatus[] = ['ACTIVE', 'DRAFT', 'COMPLETED', 'ARCHIVED'];
const SORT_VALUES = ['updatedAt', 'name', 'progress', 'startDate'] as const;

export function StrategyFilterBar() {
  const { t } = useTranslation('business-strategy');
  const {
    searchQuery,
    statusFilter,
    typeFilter,
    sortBy,
    setSearchQuery,
    setStatusFilter,
    setTypeFilter,
    setSortBy,
    resetFilters,
  } = useBusinessStrategyStore();

  const hasFilters = !!(searchQuery || statusFilter || typeFilter || sortBy !== 'updatedAt');

  const statusOptions = STATUS_VALUES.map((v) => ({
    value: v,
    label: t(`filters.statusOptions.${v}`),
  }));
  const typeOptions = STRATEGY_TYPES.map((type) => ({
    value: type.key,
    label: t(`types.${type.key}.label`),
  }));
  const sortOptions = SORT_VALUES.map((v) => ({ value: v, label: t(`filters.sortOptions.${v}`) }));

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[200px]">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('filters.searchPlaceholder')}
        />
      </div>
      <Select
        value={statusFilter ?? ''}
        onChange={(v) => setStatusFilter((v || undefined) as StrategyStatus | undefined)}
        options={statusOptions}
        placeholder={t('filters.status')}
        allowClear
      />
      <Select
        value={typeFilter ?? ''}
        onChange={(v) => setTypeFilter((v || undefined) as StrategyType | undefined)}
        options={typeOptions}
        placeholder={t('filters.type')}
        allowClear
      />
      <Select
        value={sortBy}
        onChange={(v) => setSortBy((v || 'updatedAt') as 'name' | 'updatedAt' | 'progress' | 'startDate')}
        options={sortOptions}
        placeholder={t('filters.sortBy')}
      />
      {hasFilters && (
        <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetFilters}>
          {t('filters.reset')}
        </Button>
      )}
    </div>
  );
}

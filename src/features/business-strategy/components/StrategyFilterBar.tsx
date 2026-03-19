'use client';

import { RotateCcw } from 'lucide-react';
import { SearchInput, Select, Button } from '@/components/shared';
import { useBusinessStrategyStore } from '../stores/useBusinessStrategyStore';
import { STRATEGY_TYPES } from '../constants/strategy-types';
import type { StrategyStatus, StrategyType } from '../types/business-strategy.types';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const TYPE_OPTIONS = STRATEGY_TYPES.map((t) => ({
  value: t.key,
  label: t.label,
}));

const SORT_OPTIONS = [
  { value: 'updatedAt', label: 'Last Updated' },
  { value: 'name', label: 'Name' },
  { value: 'progress', label: 'Progress' },
  { value: 'startDate', label: 'Start Date' },
];

export function StrategyFilterBar() {
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

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[200px]">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search strategies..."
        />
      </div>
      <Select
        value={statusFilter ?? ''}
        onChange={(v) => setStatusFilter((v || undefined) as StrategyStatus | undefined)}
        options={STATUS_OPTIONS}
        placeholder="Status"
        allowClear
      />
      <Select
        value={typeFilter ?? ''}
        onChange={(v) => setTypeFilter((v || undefined) as StrategyType | undefined)}
        options={TYPE_OPTIONS}
        placeholder="Type"
        allowClear
      />
      <Select
        value={sortBy}
        onChange={(v) => setSortBy((v || 'updatedAt') as 'name' | 'updatedAt' | 'progress' | 'startDate')}
        options={SORT_OPTIONS}
        placeholder="Sort by"
      />
      {hasFilters && (
        <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetFilters}>
          Reset
        </Button>
      )}
    </div>
  );
}

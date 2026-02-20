import React from 'react';
import { RotateCcw } from 'lucide-react';
import { SearchInput, Select, Button } from '@/components/shared';
import { useBrandAssetStore } from '@/stores/useBrandAssetStore';
import type { AssetCategory, AssetStatus } from '@/types/brand-asset';

// ─── Filter options ────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: 'PURPOSE', label: 'Purpose' },
  { value: 'COMMUNICATION', label: 'Communication' },
  { value: 'STRATEGY', label: 'Strategy' },
  { value: 'NARRATIVE', label: 'Narrative' },
  { value: 'CORE', label: 'Core' },
  { value: 'PERSONALITY', label: 'Personality' },
  { value: 'FOUNDATION', label: 'Foundation' },
  { value: 'CULTURE', label: 'Culture' },
];

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'NEEDS_ATTENTION', label: 'Needs Attention' },
  { value: 'READY', label: 'Ready' },
];

// ─── Component ─────────────────────────────────────────────

export function BrandAssetFilters() {
  const searchQuery = useBrandAssetStore((s) => s.searchQuery);
  const categoryFilter = useBrandAssetStore((s) => s.categoryFilter);
  const statusFilter = useBrandAssetStore((s) => s.statusFilter);
  const setSearchQuery = useBrandAssetStore((s) => s.setSearchQuery);
  const setCategoryFilter = useBrandAssetStore((s) => s.setCategoryFilter);
  const setStatusFilter = useBrandAssetStore((s) => s.setStatusFilter);

  const hasActiveFilters = !!searchQuery || !!categoryFilter || !!statusFilter;

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter(null);
    setStatusFilter(null);
  };

  return (
    <div data-testid="asset-filters" className="flex flex-wrap items-center gap-3 mb-6">
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search brand assets..."
        className="flex-1 min-w-[200px]"
      />

      <Select
        value={categoryFilter}
        onChange={(v) => setCategoryFilter(v as AssetCategory | null)}
        options={CATEGORY_OPTIONS}
        placeholder="All Categories"
        className="w-auto"
      />

      <Select
        value={statusFilter}
        onChange={(v) => setStatusFilter(v as AssetStatus | null)}
        options={STATUS_OPTIONS}
        placeholder="All Statuses"
        className="w-auto"
      />

      {hasActiveFilters && (
        <Button variant="ghost" icon={RotateCcw} onClick={resetFilters}>
          Reset
        </Button>
      )}
    </div>
  );
}

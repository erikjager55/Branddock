// =============================================================
// BrandAssetGrid — responsive grid of BrandAssetCard instances
//
// Reads context (mock BrandAsset[]), converts to BrandAssetWithMeta,
// applies Zustand store filters, renders cards.
//
// Shared primitives: EmptyState, SkeletonCard
// =============================================================

'use client';

import React, { useMemo } from 'react';
import { FileText, AlertTriangle } from 'lucide-react';
import { EmptyState, SkeletonCard } from '@/components/shared';
import { useBrandAssets } from '@/contexts';
import { useBrandAssetStore } from '@/stores/useBrandAssetStore';
import { BrandAssetCard } from '@/components/brand-assets/BrandAssetCard';
import { mockToMeta } from '@/lib/api/mock-to-meta-adapter';
import type { BrandAssetWithMeta, AssetCategory } from '@/types/brand-asset';

// ─── Category sort order ─────────────────────────────────

const CATEGORY_ORDER: Record<AssetCategory, number> = {
  PURPOSE: 0,
  FOUNDATION: 1,
  CORE: 2,
  STRATEGY: 3,
  PERSONALITY: 4,
  NARRATIVE: 5,
  COMMUNICATION: 6,
  CULTURE: 7,
};

// ─── Props ───────────────────────────────────────────────

interface BrandAssetGridProps {
  onAssetClick?: (asset: BrandAssetWithMeta) => void;
}

// ─── Component ───────────────────────────────────────────

export function BrandAssetGrid({ onAssetClick }: BrandAssetGridProps) {
  const { brandAssets, isLoading, error } = useBrandAssets();
  const searchQuery = useBrandAssetStore((s) => s.searchQuery);
  const categoryFilter = useBrandAssetStore((s) => s.categoryFilter);
  const statusFilter = useBrandAssetStore((s) => s.statusFilter);
  const setSearchQuery = useBrandAssetStore((s) => s.setSearchQuery);
  const setCategoryFilter = useBrandAssetStore((s) => s.setCategoryFilter);
  const setStatusFilter = useBrandAssetStore((s) => s.setStatusFilter);

  const hasActiveFilters = !!searchQuery || !!categoryFilter || !!statusFilter;

  // Convert mock → BrandAssetWithMeta + filter + sort
  const filteredAssets = useMemo(() => {
    let result: BrandAssetWithMeta[] = brandAssets.map(mockToMeta);

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q),
      );
    }

    // Category filter
    if (categoryFilter) {
      result = result.filter((a) => a.category === categoryFilter);
    }

    // Status filter
    if (statusFilter) {
      result = result.filter((a) => a.status === statusFilter);
    }

    // Sort: by category order, then by name
    return result.sort((a, b) => {
      const catA = CATEGORY_ORDER[a.category] ?? 99;
      const catB = CATEGORY_ORDER[b.category] ?? 99;
      if (catA !== catB) return catA - catB;
      return a.name.localeCompare(b.name);
    });
  }, [brandAssets, searchQuery, categoryFilter, statusFilter]);

  // Loading state
  if (isLoading) {
    return (
      <div data-testid="skeleton-loader" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div data-testid="error-message" className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <h3 className="text-base font-semibold text-gray-900">Failed to load brand assets</h3>
        <p className="text-sm text-gray-500 max-w-md">{error.message || 'An unexpected error occurred. Please try again later.'}</p>
      </div>
    );
  }

  // Empty state
  if (filteredAssets.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No assets found"
        description={
          hasActiveFilters
            ? 'Try adjusting your filters to find what you are looking for.'
            : 'Your brand foundation is empty. Add your first asset to get started.'
        }
        action={
          hasActiveFilters
            ? {
                label: 'Reset Filters',
                onClick: () => {
                  setSearchQuery('');
                  setCategoryFilter(null);
                  setStatusFilter(null);
                },
                variant: 'secondary',
              }
            : undefined
        }
      />
    );
  }

  return (
    <div data-testid="asset-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {filteredAssets.map((asset) => (
        <BrandAssetCard
          key={asset.id}
          asset={asset}
          onClick={onAssetClick}
        />
      ))}
    </div>
  );
}

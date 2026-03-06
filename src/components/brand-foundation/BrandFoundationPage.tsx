// =============================================================
// BrandFoundationPage — orchestrator for the Brand Foundation view
//
// Composes: Header, Stats, Filters, Grid, DetailPanel
//
// This is the reference implementation for all module views:
//  Page → Header + Stats + Filters + Grid + Detail
// =============================================================

'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import { PageShell, PageHeader } from '@/components/ui/layout';
import { BrandFoundationStats } from './BrandFoundationStats';
import { BrandAssetFilters } from './BrandAssetFilters';
import { BrandAssetGrid } from './BrandAssetGrid';
import { BrandAssetDetailPanel } from '@/components/brand-assets/BrandAssetDetailPanel';
import { useBrandAssetStore } from '@/stores/useBrandAssetStore';
import { useBrandAssets } from '@/contexts';
import { mockToMeta } from '@/lib/api/mock-to-meta-adapter';
import type { BrandAssetWithMeta } from '@/types/brand-asset';
import type { ResearchMethodType } from '@/utils/research-method-helpers';

// ─── Props ───────────────────────────────────────────────

interface BrandFoundationPageProps {
  onAssetClick?: (assetId: string) => void;
  onNavigateToResearchMethod?: (
    assetId: string,
    methodType: ResearchMethodType,
    mode: 'work' | 'results',
  ) => void;
  onNavigate?: (route: string) => void;
}

// ─── Component ───────────────────────────────────────────

export function BrandFoundationPage({
  onAssetClick,
  onNavigate,
}: BrandFoundationPageProps) {
  const { brandAssets, refetch } = useBrandAssets();

  // Refresh data when the page mounts (ensures fresh data on navigation)
  useEffect(() => { refetch(); }, [refetch]);

  const selectedAssetId = useBrandAssetStore((s) => s.selectedAssetId);
  const setSelectedAssetId = useBrandAssetStore((s) => s.setSelectedAssetId);

  // Resolve selected asset as BrandAssetWithMeta
  const selectedAsset: BrandAssetWithMeta | null = useMemo(() => {
    if (!selectedAssetId) return null;
    const mockAsset = brandAssets.find((a) => a.id === selectedAssetId);
    return mockAsset ? mockToMeta(mockAsset) : null;
  }, [selectedAssetId, brandAssets]);

  // Card click → open detail panel OR navigate (if parent handler)
  const handleAssetClick = useCallback(
    (asset: BrandAssetWithMeta) => {
      if (onAssetClick) {
        // Parent handles navigation (e.g., to asset detail route)
        onAssetClick(asset.id);
      } else {
        // Open detail panel in-page
        setSelectedAssetId(asset.id);
      }
    },
    [onAssetClick, setSelectedAssetId],
  );

  // Close detail panel
  const handleDetailClose = useCallback(() => {
    setSelectedAssetId(null);
  }, [setSelectedAssetId]);

  return (
    <PageShell>
      <div data-testid="brand-foundation-page">
      <PageHeader
        moduleKey="brand-foundation"
        title="Brand Foundation"
        subtitle="Your core brand assets and identity"
      />
      <div className="space-y-6">
        <BrandFoundationStats />
        <BrandAssetFilters />
        <BrandAssetGrid onAssetClick={handleAssetClick} />
      </div>

      {/* Detail Panel — conditional on selection */}

      <BrandAssetDetailPanel
        asset={selectedAsset}
        isOpen={!!selectedAsset}
        onClose={handleDetailClose}
        onEdit={onAssetClick ? (a) => onAssetClick(a.id) : undefined}
      />
      </div>
    </PageShell>
  );
}

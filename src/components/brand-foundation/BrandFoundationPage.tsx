// =============================================================
// BrandFoundationPage — orchestrator for the Brand Foundation view
//
// Composes: Header, Stats, Filters, Grid, DetailPanel, CreateModal
//
// This is the reference implementation for all module views:
//  Page → Header + Stats + Filters + Grid + Detail + Create
// =============================================================

'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { PageShell, PageHeader } from '@/components/ui/layout';
import { Button } from '@/components/shared';
import { BrandFoundationStats } from './BrandFoundationStats';
import { BrandAssetFilters } from './BrandAssetFilters';
import { BrandAssetGrid } from './BrandAssetGrid';
import { BrandAssetDetailPanel } from '@/components/brand-assets/BrandAssetDetailPanel';
import { BrandAssetCreateModal } from '@/components/brand-assets/BrandAssetCreateModal';
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

  const isCreateModalOpen = useBrandAssetStore((s) => s.isCreateModalOpen);
  const setCreateModalOpen = useBrandAssetStore((s) => s.setCreateModalOpen);
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

  // After create: close modal and refresh data
  const handleCreated = useCallback(() => {
    setCreateModalOpen(false);
    refetch();
  }, [setCreateModalOpen, refetch]);

  return (
    <PageShell>
      <div data-testid="brand-foundation-page">
      <PageHeader
        moduleKey="brand-foundation"
        title="Brand Foundation"
        subtitle="Your core brand assets and identity"
        actions={
          <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Asset
          </Button>
        }
      />
      <div className="space-y-6">
        <BrandFoundationStats />
        <BrandAssetFilters />
        <BrandAssetGrid onAssetClick={handleAssetClick} />
      </div>

      {/* Detail Panel — conditioneel bij selectie */}

      <BrandAssetDetailPanel
        asset={selectedAsset}
        isOpen={!!selectedAsset}
        onClose={handleDetailClose}
        onEdit={onAssetClick ? (a) => onAssetClick(a.id) : undefined}
      />

      {/* Create Modal — conditioneel bij open */}
      <BrandAssetCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleCreated}
      />
      </div>
    </PageShell>
  );
}

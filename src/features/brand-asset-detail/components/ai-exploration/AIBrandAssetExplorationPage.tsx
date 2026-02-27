// ─── AI Brand Asset Exploration — Slug-Aware Wrapper ─────────
// Delegates to the generic AIExplorationPage with brand asset config.
// Resolves dimensions and field mappings based on asset slug.
// ────────────────────────────────────────────────────────────

'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AIExplorationPage } from '@/components/ai-exploration';
import { useAssetDetail } from '../../hooks/useBrandAssetDetail';
import { getDimensionsForSlug, getFieldMappingForSlug } from '../../constants/brand-asset-exploration-config';
import { SkeletonCard } from '@/components/shared';
import { PageShell } from '@/components/ui/layout';
import * as explorationApi from '@/lib/api/exploration.api';

interface AIBrandAssetExplorationPageProps {
  assetId: string;
  onBack: () => void;
}

export function AIBrandAssetExplorationPage({ assetId, onBack }: AIBrandAssetExplorationPageProps) {
  const { data: asset } = useAssetDetail(assetId);
  const queryClient = useQueryClient();

  const handleApplyChanges = useCallback(async (updates: Record<string, unknown>) => {
    if (!asset) return;

    const contentUpdates: Record<string, unknown> = {};
    const frameworkUpdates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (key.startsWith('frameworkData.')) {
        frameworkUpdates[key] = value;
      } else if (key.startsWith('content.')) {
        contentUpdates[key.replace('content.', '')] = value;
      } else {
        contentUpdates[key] = value;
      }
    }

    // PATCH content updates
    if (Object.keys(contentUpdates).length > 0) {
      const isJsonContent = Object.keys(contentUpdates).some(k =>
        ['why', 'how', 'impact'].includes(k),
      );
      if (isJsonContent) {
        // Purpose statement: merge into existing JSON content
        let currentContent: Record<string, unknown> = {};
        try {
          currentContent = JSON.parse((asset.content as string) || '{}');
        } catch { /* noop */ }
        const merged = { ...currentContent, ...contentUpdates };
        await fetch(`/api/brand-assets/${assetId}/content`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: JSON.stringify(merged) }),
        });
      } else if (contentUpdates.content) {
        await fetch(`/api/brand-assets/${assetId}/content`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: contentUpdates.content }),
        });
      }

      if (contentUpdates.description) {
        await fetch(`/api/brand-assets/${assetId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: contentUpdates.description }),
        });
      }
    }

    // PATCH framework updates
    if (Object.keys(frameworkUpdates).length > 0) {
      let currentFramework: Record<string, unknown> = {};
      try {
        currentFramework = JSON.parse((asset.frameworkData as string) || '{}');
      } catch { /* noop */ }

      for (const [key, value] of Object.entries(frameworkUpdates)) {
        const path = key.replace('frameworkData.', '').split('.');
        let obj: Record<string, unknown> = currentFramework;
        for (let i = 0; i < path.length - 1; i++) {
          obj[path[i]] = obj[path[i]] || {};
          obj = obj[path[i]] as Record<string, unknown>;
        }
        obj[path[path.length - 1]] = value;
      }

      await fetch(`/api/brand-assets/${assetId}/framework`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameworkData: JSON.stringify(currentFramework) }),
      });
    }

    // Invalidate cache
    queryClient.invalidateQueries({ queryKey: ['brand-asset-detail', assetId] });
    queryClient.invalidateQueries({ queryKey: ['brand-assets'] });
  }, [asset, assetId, queryClient]);

  if (!asset) {
    return (
      <PageShell>
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </PageShell>
    );
  }

  const slug = asset.slug ?? '';
  const frameworkType = (asset.frameworkType as string) ?? undefined;
  const dimensions = getDimensionsForSlug(slug, frameworkType);
  const fieldMapping = getFieldMappingForSlug(slug, frameworkType);

  return (
    <AIExplorationPage
      config={{
        itemType: 'brand_asset',
        itemId: assetId,
        itemName: asset.name,
        itemSubType: frameworkType?.toLowerCase(),
        pageTitle: 'AI Brand Asset Exploration',
        pageDescription: 'Answer questions to validate and strengthen this brand asset',
        backLabel: 'Back to Brand Asset',
        onBack,
        dimensions,
        fieldMapping,
        onApplyChanges: handleApplyChanges,
      }}
      onStartSession={() =>
        explorationApi.startExplorationSession('brand_asset', assetId)
      }
      onSendAnswer={(sessionId, content) =>
        explorationApi.sendExplorationAnswer('brand_asset', assetId, sessionId, content)
      }
      onComplete={(sessionId) =>
        explorationApi.completeExploration('brand_asset', assetId, sessionId)
      }
    />
  );
}

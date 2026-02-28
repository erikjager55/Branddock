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

    const regularUpdates: Record<string, unknown> = {};
    const frameworkUpdates: Record<string, unknown> = {};
    const contentUpdates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (key.startsWith('frameworkData.')) {
        const subKey = key.replace('frameworkData.', '');
        frameworkUpdates[subKey] = value;
      } else if (key.startsWith('content.')) {
        contentUpdates[key.replace('content.', '')] = value;
      } else {
        regularUpdates[key] = value;
      }
    }

    // Framework updates → /framework endpoint (server merges at top level)
    if (Object.keys(frameworkUpdates).length > 0) {
      // Deep-set nested paths (e.g. "why.statement" → { why: { statement: value } })
      const existingData = (typeof asset.frameworkData === 'string'
        ? JSON.parse(asset.frameworkData || '{}')
        : (asset.frameworkData as Record<string, unknown>)) ?? {};
      const mergedData = JSON.parse(JSON.stringify(existingData));

      function deepSet(obj: Record<string, unknown>, path: string, value: unknown): void {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!(keys[i] in current) || typeof current[keys[i]] !== 'object' || current[keys[i]] === null) {
            current[keys[i]] = {};
          }
          current = current[keys[i]] as Record<string, unknown>;
        }
        current[keys[keys.length - 1]] = value;
      }

      for (const [key, value] of Object.entries(frameworkUpdates)) {
        deepSet(mergedData, key, value);
      }

      await fetch(`/api/brand-assets/${assetId}/framework`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameworkData: mergedData }),
      });
    }

    // Content updates → /content endpoint
    if (Object.keys(contentUpdates).length > 0) {
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
    }

    // Regular updates → base endpoint
    if (Object.keys(regularUpdates).length > 0) {
      await fetch(`/api/brand-assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regularUpdates),
      });
    }

    // Invalidate cache so page refreshes
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

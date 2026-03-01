// ─── AI Brand Asset Exploration — Thin Wrapper ──────────────
// Delegates to the generic AIExplorationPage with brand asset config.
// Uses dynamic field mapping — the backend handles field detection.
// ────────────────────────────────────────────────────────────

'use client';

import { useQueryClient } from '@tanstack/react-query';
import { AIExplorationPage } from '@/components/ai-exploration';
import { useAssetDetail } from '../../hooks/useBrandAssetDetail';
import { getDimensionsForSlug } from '../../constants/brand-asset-exploration-config';
import { SkeletonCard } from '@/components/shared';
import { PageShell } from '@/components/ui/layout';
import * as explorationApi from '@/lib/api/exploration.api';

// ─── Deep Set Helper ───────────────────────────────────────

function deepSet(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}

// ─── Component ─────────────────────────────────────────────

interface AIBrandAssetExplorationPageProps {
  assetId: string;
  onBack: () => void;
}

export function AIBrandAssetExplorationPage({ assetId, onBack }: AIBrandAssetExplorationPageProps) {
  const { data: asset } = useAssetDetail(assetId);
  const queryClient = useQueryClient();

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

  return (
    <AIExplorationPage
      config={{
        itemType: 'brand_asset',
        itemId: assetId,
        itemName: asset.name,
        pageTitle: 'AI Brand Asset Exploration',
        pageDescription: 'Answer questions to validate and strengthen this brand asset',
        backLabel: 'Back to Brand Asset',
        onBack,
        dimensions: getDimensionsForSlug(asset.slug ?? '', asset.frameworkType ?? ''),
        fieldMapping: [], // Dynamic — backend generates field mapping from actual frameworkData
        onApplyChanges: async (updates: Record<string, unknown>) => {
          // Only these are valid top-level brand asset fields.
          // Everything else is a frameworkData field — the LLM may or may not
          // include the 'frameworkData.' prefix, so we handle both cases.
          const TOP_LEVEL_FIELDS = new Set(['description', 'name', 'status', 'category']);

          const regularUpdates: Record<string, unknown> = {};
          const frameworkUpdates: Record<string, unknown> = {};

          for (const [key, value] of Object.entries(updates)) {
            if (key.startsWith('frameworkData.')) {
              // Explicit prefix — strip it and add to framework updates
              frameworkUpdates[key.replace('frameworkData.', '')] = value;
            } else if (TOP_LEVEL_FIELDS.has(key)) {
              // Known top-level field
              regularUpdates[key] = value;
            } else {
              // Unknown key without prefix — treat as frameworkData field
              // This handles the case where the LLM returns 'statement' instead of 'frameworkData.statement'
              console.log(`[onApplyChanges] Treating "${key}" as frameworkData field`);
              frameworkUpdates[key] = value;
            }
          }

          // Send frameworkData updates to /framework endpoint (deep merge)
          if (Object.keys(frameworkUpdates).length > 0) {
            const existing = asset?.frameworkData
              ? (typeof asset.frameworkData === 'string'
                  ? JSON.parse(asset.frameworkData as string)
                  : asset.frameworkData)
              : {};
            const merged = JSON.parse(JSON.stringify(existing));

            for (const [key, value] of Object.entries(frameworkUpdates)) {
              deepSet(merged, key, value);
            }

            console.log('[onApplyChanges] Sending to /framework:', JSON.stringify(merged).slice(0, 200));

            const fwResponse = await fetch(`/api/brand-assets/${assetId}/framework`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ frameworkData: merged }),
            });

            if (!fwResponse.ok) {
              const errText = await fwResponse.text();
              console.error('[onApplyChanges] framework PATCH failed:', fwResponse.status, errText);
              throw new Error(`Framework update failed: ${fwResponse.status}`);
            }

            console.log('[onApplyChanges] Framework updated successfully');
          }

          // Send regular field updates to base PATCH endpoint
          if (Object.keys(regularUpdates).length > 0) {
            const baseResponse = await fetch(`/api/brand-assets/${assetId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(regularUpdates),
            });

            if (!baseResponse.ok) {
              const errText = await baseResponse.text();
              console.error('[onApplyChanges] base PATCH failed:', baseResponse.status, errText);
              throw new Error(`Base update failed: ${baseResponse.status}`);
            }
          }

          // Invalidate cache to refresh the detail page
          queryClient.invalidateQueries({ queryKey: ['brand-asset-detail', assetId] });
          queryClient.invalidateQueries({ queryKey: ['brand-assets'] });
        },
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

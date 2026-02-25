// ─── AI Brand Asset Exploration — Thin Wrapper ──────────────
// Delegates to the generic AIExplorationPage with brand asset config.
// All logic lives in the universal ai-exploration module.
// ────────────────────────────────────────────────────────────

'use client';

import { AIExplorationPage } from '@/components/ai-exploration';
import { useAssetDetail } from '../../hooks/useBrandAssetDetail';
import { BRAND_ASSET_DIMENSIONS, BRAND_ASSET_FIELD_MAPPING } from '../../constants/brand-asset-exploration-config';
import { SkeletonCard } from '@/components/shared';
import { PageShell } from '@/components/ui/layout';
import * as explorationApi from '@/lib/api/exploration.api';

interface AIBrandAssetExplorationPageProps {
  assetId: string;
  onBack: () => void;
}

export function AIBrandAssetExplorationPage({ assetId, onBack }: AIBrandAssetExplorationPageProps) {
  const { data: asset } = useAssetDetail(assetId);

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
        dimensions: BRAND_ASSET_DIMENSIONS,
        fieldMapping: BRAND_ASSET_FIELD_MAPPING,
        onApplyChanges: async (updates) => {
          await fetch(`/api/brand-assets/${assetId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });
        },
      }}
      onStartSession={(modelId) =>
        explorationApi.startExplorationSession('brand_asset', assetId, modelId)
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

// ─── AI Brand Asset Exploration — Thin Wrapper ──────────────
// Delegates to the generic AIExplorationPage with brand asset config.
// Uses dynamic field mapping — the backend handles field detection.
// ────────────────────────────────────────────────────────────

'use client';

import { useQueryClient } from '@tanstack/react-query';
import { AIExplorationPage } from '@/components/ai-exploration';
import { useAssetDetail } from '../../hooks/useBrandAssetDetail';
import { getDimensionsForSlug } from '../../constants/brand-asset-exploration-config';
import { buildAutoFillData, ARCHETYPES } from '../../constants/archetype-constants';
import { SkeletonCard } from '@/components/shared';
import { PageShell } from '@/components/ui/layout';
import * as explorationApi from '@/lib/api/exploration.api';

/** Valid archetype IDs for validation */
const VALID_ARCHETYPE_IDS = new Set(ARCHETYPES.map(a => a.id));

// ─── Deep Set Helper ───────────────────────────────────────

function deepSet(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const rawKey = keys[i];
    const arrMatch = rawKey.match(/^(.+)\[(\d+)\]$/);

    if (arrMatch) {
      const arrName = arrMatch[1];
      const idx = parseInt(arrMatch[2]);
      if (!Array.isArray(current[arrName])) current[arrName] = [];
      const arr = current[arrName] as unknown[];
      while (arr.length <= idx) arr.push({});
      if (typeof arr[idx] !== 'object' || arr[idx] === null) arr[idx] = {};
      current = arr[idx] as Record<string, unknown>;
    } else {
      if (!(rawKey in current) || typeof current[rawKey] !== 'object' || current[rawKey] === null) {
        current[rawKey] = {};
      }
      current = current[rawKey] as Record<string, unknown>;
    }
  }

  const lastKey = keys[keys.length - 1];
  const lastArrMatch = lastKey.match(/^(.+)\[(\d+)\]$/);
  if (lastArrMatch) {
    const arrName = lastArrMatch[1];
    const idx = parseInt(lastArrMatch[2]);
    if (!Array.isArray(current[arrName])) current[arrName] = [];
    const arr = current[arrName] as unknown[];
    while (arr.length <= idx) arr.push({});
    arr[idx] = value;
  } else {
    current[lastKey] = value;
  }
}

/**
 * Try to parse a string value as JSON (for objects/arrays that were serialized).
 * Falls back to the original value if not valid JSON or if it's a plain string.
 */
function maybeParseJSON(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  // Parse JSON objects and arrays
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  // Restore bare numbers (e.g. scores serialized as "42" or "3.5")
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  return value;
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

          // ─── Brand Archetype Auto-Fill Cascade ─────────────────
          // When the AI suggests a primaryArchetype, first apply all
          // reference data from the archetype constants, then let
          // individual AI field suggestions override on top.
          const isBrandArchetype = asset.frameworkType === 'BRAND_ARCHETYPE';
          if (isBrandArchetype) {
            const newPrimary = frameworkUpdates.primaryArchetype as string | undefined;

            // Normalize: LLM might return "Hero" instead of "hero"
            if (newPrimary) {
              const normalized = newPrimary.toLowerCase();
              if (VALID_ARCHETYPE_IDS.has(normalized)) {
                frameworkUpdates.primaryArchetype = normalized;
              }
            }

            const effectivePrimary = (frameworkUpdates.primaryArchetype as string) ??
              ((asset.frameworkData as Record<string, unknown> | null)?.primaryArchetype as string);

            // Only cascade if we have a valid primary archetype (new or existing)
            if (effectivePrimary && VALID_ARCHETYPE_IDS.has(effectivePrimary)) {
              const autoFillData = buildAutoFillData(effectivePrimary);

              console.log('[onApplyChanges] Archetype auto-fill cascade:', effectivePrimary);

              // Apply auto-fill FIRST, then let AI suggestions override on top.
              const aiOverrides = { ...frameworkUpdates };
              for (const [key, value] of Object.entries(autoFillData)) {
                if (!(key in frameworkUpdates) || key === 'primaryArchetype') {
                  frameworkUpdates[key] = value;
                }
              }
              // Re-apply AI overrides on top (they take priority)
              Object.assign(frameworkUpdates, aiOverrides);
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
              // Parse JSON strings back to objects/arrays (e.g. dimensionScores, personalityTraits)
              deepSet(merged, key, maybeParseJSON(value));
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

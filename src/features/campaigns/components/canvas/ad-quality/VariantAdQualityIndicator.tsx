'use client';

// =============================================================
// VariantAdQualityIndicator — bundels badge + drawer + auto-trigger.
//
// Gebruikt op Step 2 Content Variants per variant-card. Encapsuleert:
//   1. Fire-and-forget POST trigger bij eerste render (idempotent
//      via contentHash unique-key)
//   2. useAdQualityScore hook voor latest score
//   3. AdQualityBadge render bovenaan
//   4. Drawer collapse/expand state
//
// Alleen actief voor content-types die in de validator-registry
// staan. Andere types renderen niets (geen badge, geen trigger).
// =============================================================

import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AdQualityBadge, AdQualityBadgeSkeleton } from './AdQualityBadge';
import { AdQualityDrawer } from './AdQualityDrawer';
import { useAdQualityScore, triggerAdQualityScore } from './useAdQualityScore';
import { isFallback, type AdQualityLabel, type L2JudgeResult, type RuleResult } from '@/lib/ad-validation';

// Keep in sync with src/lib/ad-validation/setup.ts registrations.
const SUPPORTED_CONTENT_TYPES = new Set<string>(['search-ad']);

interface VariantAdQualityIndicatorProps {
  deliverableId: string;
  variantIndex: number;
  contentType: string;
  /** True when the variant has actual content (not mid-generation). */
  hasContent: boolean;
}

export function VariantAdQualityIndicator({
  deliverableId,
  variantIndex,
  contentType,
  hasContent,
}: VariantAdQualityIndicatorProps) {
  const supported = SUPPORTED_CONTENT_TYPES.has(contentType);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const queryClient = useQueryClient();
  const triggerRef = useRef<{ deliverableId: string; variantIndex: number; triggered: boolean }>({
    deliverableId,
    variantIndex,
    triggered: false,
  });

  // Reset trigger flag when deliverable or variant changes
  useEffect(() => {
    if (
      triggerRef.current.deliverableId !== deliverableId ||
      triggerRef.current.variantIndex !== variantIndex
    ) {
      triggerRef.current = { deliverableId, variantIndex, triggered: false };
    }
  }, [deliverableId, variantIndex]);

  const query = useAdQualityScore(deliverableId, variantIndex);

  // Auto-trigger: fire-and-forget once per (deliverable, variant) when
  // content is available and no score exists yet.
  useEffect(() => {
    if (!supported || !hasContent) return;
    if (triggerRef.current.triggered) return;
    if (query.isLoading) return;
    if (query.data) return;

    triggerRef.current.triggered = true;
    triggerAdQualityScore(deliverableId, variantIndex)
      .then(() => {
        // Invalidate so useAdQualityScore re-fetches the persisted row
        queryClient.invalidateQueries({ queryKey: ['ad-quality', deliverableId] });
      })
      .catch((err) => {
        console.warn('[ad-quality] trigger failed', err);
        // Reset so a later content-update can re-attempt
        triggerRef.current.triggered = false;
      });
  }, [supported, hasContent, query.isLoading, query.data, deliverableId, variantIndex, queryClient]);

  if (!supported) return null;

  if (query.isLoading) return <AdQualityBadgeSkeleton />;

  const score = query.data;
  if (!score) return <AdQualityBadgeSkeleton />;

  const l2 = score.l2Results as unknown as L2JudgeResult;
  const l1 = score.l1Results as unknown as RuleResult[];

  return (
    <>
      <AdQualityBadge
        score={score.overallScore}
        label={score.ratingLabel as AdQualityLabel}
        l2Unavailable={isFallback(l2)}
        onClick={() => setDrawerOpen((v) => !v)}
      />
      {drawerOpen && (
        <AdQualityDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          score={score.overallScore}
          ratingLabel={score.ratingLabel}
          l1Results={l1}
          l2Results={l2}
        />
      )}
    </>
  );
}

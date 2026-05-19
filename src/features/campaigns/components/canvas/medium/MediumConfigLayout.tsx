'use client';

import React, { useMemo, useCallback, useState } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { useCanvasOrchestration } from '../../../hooks/useCanvasOrchestration';
import { resolvePreviewComponent } from '../previews/preview-map';
import { STUDIO } from '@/lib/constants/design-tokens';
import { CheckCircle2, Video, AlertTriangle } from 'lucide-react';
import type { PreviewContent } from '../../../types/canvas.types';

interface MediumConfigLayoutProps {
  children: React.ReactNode;
  onAdvance: () => void;
  deliverableId?: string;
}

/**
 * Unified layout for Step 3 (Medium) — used by all non-web-page categories.
 *
 * Structure:
 *   [Config Section A]  [Config Section B]    ← side by side, collapsible
 *   [       Full-width content preview       ] ← live preview below
 *   [           Confirm & Continue           ]
 *
 * Web-page has its own WebPageLayout with article-specific rendering
 * (hero styles, layout modes, CTA types). All other categories use this
 * layout which renders the platform-specific PreviewComponent below
 * the config blocks.
 */
export function MediumConfigLayout({ children, onAdvance, deliverableId }: MediumConfigLayoutProps) {
  const contextStack = useCanvasStore((s) => s.contextStack);
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  const selections = useCanvasStore((s) => s.selections);
  const imageVariants = useCanvasStore((s) => s.imageVariants);
  const heroImage = useCanvasStore((s) => s.heroImage);
  const setInsertImageModalOpen = useCanvasStore((s) => s.setInsertImageModalOpen);
  const mediumConfigValues = useCanvasStore((s) => s.mediumConfigValues);
  const globalStatus = useCanvasStore((s) => s.globalStatus);
  const fidelityThresholdMet = useCanvasStore((s) => s.fidelityScore.thresholdMet);
  const fidelityStage = useCanvasStore((s) => s.fidelityScore.stage);
  const fidelityCompositeScore = useCanvasStore((s) => s.fidelityScore.compositeScore);
  const fidelityThreshold = useCanvasStore((s) => s.fidelityScore.compositeThreshold);
  const belowThreshold =
    fidelityStage === 'complete' && fidelityThresholdMet === false;

  // Step 3 A/B variant toggle — lets the user see how the not-selected
  // variant would render in the medium without navigating back to Step 2.
  // Defaults to the Step 2 selection but overrides per-group selections
  // when the user picks the other variant.
  const [previewVariantOverride, setPreviewVariantOverride] = useState<number | null>(null);

  const { generate } = useCanvasOrchestration(deliverableId ?? null);

  const platform = contextStack?.medium?.platform ?? null;
  const format = contextStack?.medium?.format ?? null;

  const previewEntry = useMemo(
    () => resolvePreviewComponent(platform, format),
    [platform, format],
  );

  const previewContent = useMemo<PreviewContent>(() => {
    const content: PreviewContent = {};
    for (const [group, variants] of variantGroups) {
      // When the A/B toggle is active, ignore per-group selections and
      // force the chosen variant index across all groups so the entire
      // post renders coherently as Variant A or B.
      const selectedIdx =
        previewVariantOverride !== null
          ? Math.min(previewVariantOverride, variants.length - 1)
          : selections.get(group) ?? 0;
      const selected = variants[selectedIdx];
      if (selected) {
        content[group] = { content: selected.content, type: 'text' };
      }
    }
    return content;
  }, [variantGroups, selections, previewVariantOverride]);

  // Variant count across groups — drives whether the A/B toggle shows.
  // Single-variant runs (count=1) hide the toggle since there's nothing
  // to compare.
  const variantCount = useMemo(() => {
    let max = 0;
    for (const [, variants] of variantGroups) {
      if (variants.length > max) max = variants.length;
    }
    return max;
  }, [variantGroups]);

  const currentVariantIndex = useMemo(() => {
    if (previewVariantOverride !== null) return previewVariantOverride;
    // No override: read the first group's selection as the "current" one.
    // All variant-groups for a single post share the same variantIndex
    // when generated together, so the first group's selection is canonical.
    for (const [, variants] of variantGroups) {
      if (variants.length > 0) {
        for (const [group] of variantGroups) {
          return selections.get(group) ?? 0;
        }
      }
    }
    return 0;
  }, [previewVariantOverride, selections, variantGroups]);

  const textEntries = Object.entries(previewContent).filter(
    ([, v]) => v.type === 'text' && v.content,
  );

  const hasExistingContent = variantGroups.size > 0;

  const handleConfirm = useCallback(async () => {
    const store = useCanvasStore.getState();
    store.setMediumApproved(true);

    if (deliverableId) {
      try {
        await fetch(`/api/studio/${deliverableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: { mediumConfig: store.mediumConfigValues },
          }),
        });
      } catch {
        // Non-blocking
      }
    }

    // Regenerate content with the new medium config applied
    if (hasExistingContent) {
      generate({ instruction: 'Regenerate content applying the updated medium configuration settings.' });
    }

    store.setStepSummary(store.activeStep, { label: `${previewEntry.label} configured` });
    onAdvance();
  }, [onAdvance, previewEntry.label, deliverableId, hasExistingContent, generate]);

  const PreviewComponent = previewEntry.component;

  const composedVideoUrl = useCanvasStore((s) => s.composedVideoUrl);

  const configBadges = useMemo(() => {
    return Object.entries(mediumConfigValues)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .slice(0, 6)
      .map(([key, val]) => ({
        key,
        display: typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val),
      }));
  }, [mediumConfigValues]);

  // After the 9.0c content-styling migration, several categories
  // (long-form, sales, pr-hr, social-post) have no Step 3 config fields
  // — content-styling moved to Step 1 Content Brief. Show a brief notice
  // so the user knows it's intentional, not a missing-data bug.
  const hasConfigChildren = React.Children.count(children) > 0;

  return (
    <div className="space-y-6">
      {/* Config sections — side by side, collapsible */}
      {hasConfigChildren ? (
        <div className="grid grid-cols-2 gap-4 items-start">
          {children}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          No platform-specific configuration for this content type — review
          the preview below and click <span className="font-medium">Confirm &amp; Continue</span>.
        </div>
      )}

      {/* Full-width content preview — show generated video if available, else platform mock.
          The preview is now the primary view; editing happens in the collapsible
          panel below. Long-term goal (TODO 9.0b): make each preview component
          inline-editable per section so the panel disappears entirely. */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-600">
            {composedVideoUrl ? 'Generated Video' : `${previewEntry.label} Preview`}
          </span>
          <div className="flex items-center gap-3">
            {/* Variant indicator — READ-ONLY badge showing which variant is
                currently rendered. User toggles in Step 2 only (per
                feedback 2026-05-19); preserving the choice here means
                Step 3 reflects the canonical selection without offering a
                second toggle that can drift from Step 2's state. */}
            {variantCount > 1 && !composedVideoUrl && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={{
                  backgroundColor: '#eff6ff',
                  color: '#1e40af',
                  boxShadow: '0 0 0 1px #bfdbfe',
                }}
                title={`Tonen Variant ${String.fromCharCode(65 + currentVariantIndex)} — wijzig in stap 2`}
              >
                Variant {String.fromCharCode(65 + currentVariantIndex)}
              </span>
            )}
            {composedVideoUrl ? (
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <Video className="h-3 w-3" /> Video ready
              </span>
            ) : textEntries.length > 0 ? (
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Reflects Step 2 selection
              </span>
            ) : null}
          </div>
        </div>

        <div className="p-4">
          {composedVideoUrl ? (
            <div className="rounded-lg overflow-hidden bg-black">
              <video src={composedVideoUrl} controls playsInline className="w-full" style={{ maxHeight: 400 }} />
            </div>
          ) : (
            <PreviewComponent
              previewContent={previewContent}
              imageVariants={imageVariants}
              isGenerating={false}
              heroImage={heroImage}
              onAddImage={() => setInsertImageModalOpen(true)}
              mediumConfig={mediumConfigValues}
              brandName={contextStack?.brand?.brandName ?? undefined}
              platform={platform ?? undefined}
            />
          )}
        </div>
      </div>

      {/* Inline-edit lives directly inside each preview component (hover →
          click "Edit" → inline textarea). The old "Edit content sections"
          collapsible panel was removed when 9.0b shipped — see
          src/features/campaigns/components/canvas/previews/InlineEditableSection.tsx */}

      {/* Config summary badges */}
      {configBadges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {configBadges.map(({ key, display }) => (
            <span
              key={key}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
            >
              {display}
            </span>
          ))}
        </div>
      )}

      {/* Fidelity warning — actionable context when content scored below
          the brand threshold. Connects the "Generation complete" header
          signal to a real review prompt. */}
      {belowThreshold && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-medium">
              Brand fidelity {fidelityCompositeScore ?? '?'}/100 — below your threshold ({fidelityThreshold ?? 75})
            </p>
            <p className="mt-0.5 text-amber-800">
              You can still continue, but consider regenerating from Step 2 with feedback to lift the score before publishing.
            </p>
          </div>
        </div>
      )}

      {/* Sticky Confirm button — stays in view while user scrolls through
          longer post-previews, so the decisive CTA is always one click
          away. Colour-coded by readiness: solid green for ready, amber-
          bordered "Continue anyway" when fidelity is below threshold. */}
      <div className="sticky bottom-0 -mx-1 pt-3 pb-1 px-1 bg-gradient-to-t from-white via-white to-white/0">
        <button
          type="button"
          onClick={handleConfirm}
          className={
            belowThreshold
              ? 'w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium border-2 border-amber-500 text-amber-700 bg-amber-50 hover:bg-amber-100 shadow-sm'
              : `w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium shadow-sm ${STUDIO.generateButton}`
          }
        >
          {belowThreshold ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {belowThreshold ? 'Continue anyway' : 'Confirm & Continue'}
        </button>
      </div>
    </div>
  );
}

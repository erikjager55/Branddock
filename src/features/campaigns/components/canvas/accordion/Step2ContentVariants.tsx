'use client';

import React, { useMemo, useCallback } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { useCanvasOrchestration } from '../../../hooks/useCanvasOrchestration';
import { resolvePreviewComponent } from '../previews/preview-map';
import { FeedbackBar } from '../FeedbackBar';
import { Badge } from '@/components/shared';
import { STUDIO } from '@/lib/constants/design-tokens';
import type { PreviewContent } from '../../../types/canvas.types';
import { Loader2, Sparkles, ArrowRight, Check, Film, MessageSquare, MousePointerClick } from 'lucide-react';
import { SeoProgressPanel } from '../SeoProgressPanel';
import { getEstimatedDuration } from '../../../lib/content-type-inputs';
import type { SceneId } from '../../../stores/useCanvasStore';

interface Step2ContentVariantsProps {
  deliverableId: string;
  onAdvance: () => void;
}

/**
 * Step 2 — Content Variants. Shows full composed previews in the actual
 * medium format (LinkedIn card, email template, blog article, etc.)
 * instead of fragmented variant-group cards. The user picks the complete
 * variant (A or B) rather than mixing individual components.
 */
export function Step2ContentVariants({ deliverableId, onAdvance }: Step2ContentVariantsProps) {
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  const selections = useCanvasStore((s) => s.selections);
  const globalStatus = useCanvasStore((s) => s.globalStatus);
  const imageVariants = useCanvasStore((s) => s.imageVariants);
  const contextStack = useCanvasStore((s) => s.contextStack);
  const contentType = useCanvasStore((s) => s.contentType);
  const heroImage = useCanvasStore((s) => s.heroImage);
  const { regenerate, abort } = useCanvasOrchestration(deliverableId);

  const hasVariants = variantGroups.size > 0;
  const isGenerating = globalStatus === 'generating';
  const hasSceneGroups = variantGroups.has('hook') || variantGroups.has('body') || variantGroups.has('cta');

  const platform = contextStack?.medium?.platform ?? null;
  const format = contextStack?.medium?.format ?? null;
  const previewEntry = useMemo(
    () => resolvePreviewComponent(platform, format),
    [platform, format],
  );

  // Determine the max variant count across all groups (typically 2)
  const variantCount = useMemo(() => {
    let max = 0;
    for (const [, variants] of variantGroups) {
      if (variants.length > max) max = variants.length;
    }
    return max;
  }, [variantGroups]);

  // Build a full PreviewContent for each variant index (A=0, B=1, etc.)
  const composedVariants = useMemo(() => {
    const result: PreviewContent[] = [];
    for (let i = 0; i < variantCount; i++) {
      const content: PreviewContent = {};
      for (const [group, variants] of variantGroups) {
        const variant = variants[i] ?? variants[0];
        if (variant) {
          content[group] = { content: variant.content, type: 'text' };
        }
      }
      result.push(content);
    }
    return result;
  }, [variantGroups, variantCount]);

  // Currently selected variant = all groups at the same index
  const selectedVariantIndex = useMemo(() => {
    const firstGroup = variantGroups.keys().next().value;
    if (!firstGroup) return 0;
    return selections.get(firstGroup) ?? 0;
  }, [variantGroups, selections]);

  const selectVariant = useCallback((idx: number) => {
    const store = useCanvasStore.getState();
    for (const group of store.variantGroups.keys()) {
      store.setSelection(group, idx);
    }
  }, []);

  const handleAdvance = useCallback(() => {
    const store = useCanvasStore.getState();
    const label = `Variant ${String.fromCharCode(65 + selectedVariantIndex)} selected`;
    store.setStepSummary(store.activeStep, { label });
    onAdvance();
  }, [onAdvance, selectedVariantIndex]);

  const PreviewComponent = previewEntry.component;
  const VARIANT_LABELS = ['A', 'B', 'C', 'D'];

  // ─── SEO pipeline active ────────────────────────────────────
  const seoSteps = useCanvasStore((s) => s.seoSteps);
  const hasSeoSteps = seoSteps.length > 0;

  // ─── Generating state ──────────────────────────────────────
  if (isGenerating && !hasVariants) {
    // Show SEO progress panel when the 8-step pipeline is running
    if (hasSeoSteps) {
      return (
        <div className="py-6">
          <SeoProgressPanel />
        </div>
      );
    }

    return <GeneratingIndicator contentType={contentType} />;
  }

  // ─── Empty state ───────────────────────────────────────────
  if (!hasVariants && !isGenerating) {
    return (
      <div className="text-center py-8">
        <Sparkles className="h-8 w-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">
          Content will appear here after generation starts in step 1.
        </p>
      </div>
    );
  }

  // ─── Variants ready ────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Still streaming indicator */}
      {isGenerating && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating more variants...
        </div>
      )}

      {/* Variant selector tabs */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Select variant:</span>
        {composedVariants.map((_, idx) => {
          const isSelected = idx === selectedVariantIndex;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => selectVariant(idx)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isSelected && <Check className="h-3 w-3" />}
              Variant {VARIANT_LABELS[idx] ?? idx + 1}
            </button>
          );
        })}
      </div>

      {/* Full composed previews — each variant in the actual medium format */}
      <div className={`grid gap-4 ${composedVariants.length === 2 ? 'grid-cols-2' : composedVariants.length >= 3 ? 'grid-cols-3' : ''}`}>
        {composedVariants.map((content, idx) => {
          const isSelected = idx === selectedVariantIndex;
          return (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              onClick={() => selectVariant(idx)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectVariant(idx); } }}
              className={`text-left rounded-xl border-2 overflow-hidden transition-all cursor-pointer ${
                isSelected
                  ? 'border-teal-500 ring-2 ring-teal-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Variant label header */}
              <div className={`flex items-center justify-between px-3 py-2 text-xs font-semibold ${
                isSelected ? 'bg-teal-50 text-teal-700' : 'bg-gray-50 text-gray-600'
              }`}>
                <span>Variant {VARIANT_LABELS[idx] ?? idx + 1}</span>
                {isSelected && (
                  <Badge variant="success" size="sm">Selected</Badge>
                )}
              </div>

              {/* Medium-formatted preview */}
              <div className="p-3">
                <PreviewComponent
                  previewContent={content}
                  imageVariants={imageVariants}
                  isGenerating={false}
                  heroImage={heroImage}
                  brandName={contextStack?.brand?.brandName ?? undefined}
                  platform={platform ?? undefined}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Scene breakdown — shown when variant groups include hook/body/cta */}
      {hasSceneGroups && hasVariants && !isGenerating && (
        <SceneBreakdown variantGroups={variantGroups} selectedVariantIndex={selectedVariantIndex} />
      )}

      {/* Feedback bar */}
      <div className="border-t border-gray-200 pt-4">
        <FeedbackBar onRegenerate={regenerate} onAbort={abort} />
      </div>

      {/* Advance button */}
      {hasVariants && !isGenerating && (
        <div className="pt-2">
          <button
            type="button"
            onClick={handleAdvance}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton}`}
          >
            <ArrowRight className="h-4 w-4" />
            {hasSceneGroups ? 'Confirm Script & Configure Video' : 'Confirm & Continue'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Scene Breakdown (video types only) ───────────────────────

const SCENE_CONFIG: { id: SceneId; label: string; icon: typeof Film; borderColor: string; bgColor: string; textColor: string }[] = [
  { id: 'hook', label: 'Hook', icon: Film, borderColor: '#f59e0b', bgColor: '#fffbeb', textColor: '#92400e' },
  { id: 'body', label: 'Body', icon: MessageSquare, borderColor: '#3b82f6', bgColor: '#eff6ff', textColor: '#1e40af' },
  { id: 'cta', label: 'CTA', icon: MousePointerClick, borderColor: '#10b981', bgColor: '#ecfdf5', textColor: '#065f46' },
];

function SceneBreakdown({
  variantGroups,
  selectedVariantIndex,
}: {
  variantGroups: Map<string, { content: string }[]>;
  selectedVariantIndex: number;
}) {
  const hasSceneGroups = variantGroups.has('hook') || variantGroups.has('body') || variantGroups.has('cta');
  if (!hasSceneGroups) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wider">Scene Breakdown</h4>
      <div className="space-y-2">
        {SCENE_CONFIG.map(({ id, label, icon: Icon, borderColor, bgColor, textColor }) => {
          const variants = variantGroups.get(id);
          if (!variants) return null;
          const text = variants[selectedVariantIndex]?.content ?? variants[0]?.content ?? '';
          if (!text) return null;

          return (
            <div
              key={id}
              className="flex gap-3 rounded-lg p-3"
              style={{ backgroundColor: bgColor, borderLeft: `3px solid ${borderColor}` }}
            >
              <div className="flex-shrink-0 mt-0.5">
                <Icon className="h-4 w-4" style={{ color: borderColor }} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold" style={{ color: textColor }}>{label}</span>
                <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Generating Indicator with elapsed timer ────────────────

function GeneratingIndicator({ contentType }: { contentType: string | null }) {
  const { label: estimatedLabel } = getEstimatedDuration(contentType ?? '');
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsed = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-5">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-gray-800">Generating content variants</p>
        <p className="text-sm text-gray-500 mt-1">
          Creating 2 unique variants based on your strategy and briefing...
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Estimated: {estimatedLabel} · Elapsed: {formatElapsed(elapsed)}
        </p>
      </div>
    </div>
  );
}

export default Step2ContentVariants;

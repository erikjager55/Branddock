'use client';

import React, { useMemo, useCallback, useState } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { useCanvasOrchestration } from '../../../hooks/useCanvasOrchestration';
import { resolvePreviewComponent } from '../previews/preview-map';
import { VariantIndexOverrideProvider } from '../previews/InlineEditableSection';
import { FeedbackBar } from '../FeedbackBar';
import { Badge } from '@/components/shared';
import { STUDIO } from '@/lib/constants/design-tokens';
import type { PreviewContent } from '../../../types/canvas.types';
import { Loader2, Sparkles, ArrowRight, Check, Film, MessageSquare, MousePointerClick, Image as ImageIcon, RefreshCw, X } from 'lucide-react';
import { SeoProgressPanel } from '../SeoProgressPanel';
import { getEstimatedDuration } from '../../../lib/content-type-inputs';
import { VIDEO_ADJACENT_TYPES } from '../../../lib/deliverable-types';
import type { SceneId } from '../../../stores/useCanvasStore';
import { generateCanvasVisual, setHeroImage as persistHeroImage } from '../../../api/canvas.api';
import { LibraryAssetPicker } from '../LibraryAssetPicker';
import { ComposePicker } from '../ComposePicker';
import { TrainedStylePicker } from '../TrainedStylePicker';
import { FidelityScoreBar } from '../FidelityScoreBar';
import type { CanvasImageVariant } from '../../../types/canvas.types';

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
  const generationStatus = useCanvasStore((s) => s.generationStatus);
  const imageVariants = useCanvasStore((s) => s.imageVariants);
  const contextStack = useCanvasStore((s) => s.contextStack);
  const contentType = useCanvasStore((s) => s.contentType);
  const heroImage = useCanvasStore((s) => s.heroImage);
  const setImageVariants = useCanvasStore((s) => s.setImageVariants);
  const setHeroImage = useCanvasStore((s) => s.setHeroImage);
  const visualBrief = useCanvasStore((s) => s.visualBrief);
  const { regenerate, abort } = useCanvasOrchestration(deliverableId);

  // Visual generation lifted from VisualVariantsBlock so the unified
  // FeedbackBar at the bottom can also trigger it. The empty-state
  // "Generate visual" button still lives in VisualVariantsBlock and
  // calls back into this handler.
  const [visualStatus, setVisualStatus] = useState<'idle' | 'generating' | 'error'>('idle');
  const [visualError, setVisualError] = useState<string | null>(null);

  const promoteToHero = useCallback(
    (variant: { url: string; prompt: string }) => {
      setHeroImage({ url: variant.url, mediaAssetId: null, alt: variant.prompt });
      persistHeroImage(deliverableId, {
        imageUrl: variant.url,
        imageSource: 'ai-generated',
        mediaAssetId: null,
        alt: variant.prompt ?? null,
      }).catch((err) => {
        console.error('[Visual] hero image persist failed', err);
      });
    },
    [deliverableId, setHeroImage],
  );

  const handleGenerateVisual = useCallback(
    async (instruction?: string) => {
      setVisualStatus('generating');
      setVisualError(null);
      try {
        const result = await generateCanvasVisual(deliverableId, {
          count: 2,
          instruction: instruction?.trim() || undefined,
        });
        const mapped: CanvasImageVariant[] = result.variants.map((v, i) => ({
          index: i,
          url: v.url,
          prompt: v.prompt,
          isSelected: i === 0,
        }));
        setImageVariants(mapped);
        if (mapped[0]) promoteToHero(mapped[0]);
        setVisualStatus('idle');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate visual';
        setVisualError(message);
        setVisualStatus('error');
      }
    },
    [deliverableId, setImageVariants, promoteToHero],
  );

  const hasVariants = variantGroups.size > 0;
  const isGenerating = globalStatus === 'generating';

  // Which groups are currently regenerating — drives per-card overlay
  const regeneratingGroups = useMemo(() => {
    const set = new Set<string>();
    for (const [group, status] of generationStatus) {
      if (status === 'generating') set.add(group);
    }
    return set;
  }, [generationStatus]);
  const isAnyRegenerating = regeneratingGroups.size > 0;
  const isVideoScript = contentType ? VIDEO_ADJACENT_TYPES.has(contentType) : false;
  const hasSceneGroups = isVideoScript && (variantGroups.has('hook') || variantGroups.has('body') || variantGroups.has('cta'));

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

  // Resolve angle label per variant index. Alle component groups van
  // dezelfde variantIndex delen dezelfde angle (parallelle Claude calls per
  // angle), dus we pakken het label uit de eerste niet-lege group. Wanneer
  // angles ontbreken (legacy 1-call mode) blijft array leeg en valt UI terug
  // op "Variant A/B" labels.
  const variantAngleLabels = useMemo(() => {
    const labels: Array<string | null> = [];
    for (let i = 0; i < variantCount; i++) {
      let label: string | null = null;
      for (const variants of variantGroups.values()) {
        const v = variants[i];
        if (v?.angleLabel) {
          label = v.angleLabel;
          break;
        }
      }
      labels.push(label);
    }
    return labels;
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
      {/* Regeneration banner — prominent so user doesn't miss it */}
      {isGenerating && hasVariants && (
        <div className="flex items-center gap-3 rounded-lg border-2 border-teal-200 bg-teal-50 px-4 py-3">
          <Loader2 className="h-5 w-5 animate-spin text-teal-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-teal-900">
              {regeneratingGroups.size > 0
                ? `Regenerating ${Array.from(regeneratingGroups).map((g) => g.replace(/_/g, ' ')).join(', ')}...`
                : 'Generating content...'}
            </p>
            <p className="text-xs text-teal-700">
              Applying your feedback — this can take 10–30 seconds.
            </p>
          </div>
          <button
            type="button"
            onClick={abort}
            className="flex-shrink-0 text-xs font-medium text-teal-700 hover:text-teal-900 underline"
          >
            Stop
          </button>
        </div>
      )}

      {/* Still streaming (initial generation, no variants yet shown) */}
      {isGenerating && !hasVariants && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating variants...
        </div>
      )}

      {/* F-VAL fidelity score — verschijnt zodra detector heeft gerund (~5ms na text_complete) */}
      {hasVariants && <FidelityScoreBar deliverableId={deliverableId} />}

      {/* Variant selector — pill toggle met angle label per variant
       *  ([A] Schaal & trots / [B] Daglicht & lucht) i.p.v. kale "Variant A/B" */}
      <VariantSelector
        count={composedVariants.length}
        selectedIndex={selectedVariantIndex}
        onSelect={selectVariant}
        angleLabels={variantAngleLabels}
      />

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
              className={`text-left rounded-xl border-2 overflow-hidden transition-all cursor-pointer relative ${
                isSelected
                  ? 'border-teal-500 ring-2 ring-teal-200'
                  : 'border-gray-200 hover:border-gray-300'
              } ${isAnyRegenerating ? 'opacity-60' : ''}`}
            >
              {/* Regeneration overlay — visible when any group is regenerating */}
              {isAnyRegenerating && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm pointer-events-none">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-teal-600 text-white shadow-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-semibold">Regenerating...</span>
                  </div>
                </div>
              )}

              {/* Variant label header */}
              <div className={`flex items-center justify-between px-3 py-2 text-xs font-semibold ${
                isSelected ? 'bg-teal-50 text-teal-700' : 'bg-gray-50 text-gray-600'
              }`}>
                <span>Variant {VARIANT_LABELS[idx] ?? idx + 1}</span>
                {isSelected && (
                  <Badge variant="success" size="sm">Selected</Badge>
                )}
              </div>

              {/* Medium-formatted preview — wrap in VariantIndexOverrideProvider
               *  zodat de InlineEditableSection hooks variants[idx] tonen i.p.v.
               *  de selected variant uit de store. Zonder dit zien beide
               *  side-by-side kolommen dezelfde tekst (de geselecteerde). */}
              <div className="p-3">
                <VariantIndexOverrideProvider index={idx}>
                  <PreviewComponent
                    previewContent={content}
                    imageVariants={imageVariants}
                    isGenerating={false}
                    heroImage={heroImage}
                    brandName={contextStack?.brand?.brandName ?? undefined}
                    platform={platform ?? undefined}
                  />
                </VariantIndexOverrideProvider>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scene breakdown — shown when variant groups include hook/body/cta */}
      {hasSceneGroups && hasVariants && !isGenerating && (
        <SceneBreakdown variantGroups={variantGroups} selectedVariantIndex={selectedVariantIndex} />
      )}

      {/* Visual generation — routes by Visual Brief source:
          • generate      → AI generation (Imagen / GPT Image 2 / FLUX etc.)
          • library       → MediaAsset picker
          • compose / trained-style → "soon" placeholder
          Refining a generate-source result happens via the FeedbackBar's
          Visual dropdown below. */}
      {hasVariants && !isGenerating && (
        <VisualVariantsBlock
          deliverableId={deliverableId}
          onGenerate={() => handleGenerateVisual()}
          status={visualStatus}
          errorMessage={visualError}
        />
      )}

      {/* Unified feedback bar — text variants + visual via dropdown.
          Visual feedback (Refine) only applies to generate source —
          library is curated, no AI to refine. */}
      <div className="border-t border-gray-200 pt-4">
        <FeedbackBar
          onRegenerate={regenerate}
          onAbort={abort}
          onRegenerateVisual={
            imageVariants.length > 0 && visualBrief.source === 'generate'
              ? (feedback) => handleGenerateVisual(feedback)
              : undefined
          }
          isVisualGenerating={visualStatus === 'generating'}
        />
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

/**
 * Variant selector — pill toggle. Per variant ofwel de creative angle
 * (bv "Schaal & trots") of fallback "Variant A". Letter-circle voor visuele
 * landmark, blue-tinted highlight bij selected (matches design screenshot).
 *
 * Tailwind 4 purge-safe: actieve blauwe kleuren via inline style omdat
 * specifieke shades anders gepurged kunnen worden.
 */
function VariantSelector({
  count,
  selectedIndex,
  onSelect,
  angleLabels,
}: {
  count: number;
  selectedIndex: number;
  onSelect: (idx: number) => void;
  angleLabels: Array<string | null>;
}) {
  const VARIANT_LETTERS = ['A', 'B', 'C', 'D'];
  if (count <= 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {Array.from({ length: count }).map((_, idx) => {
        const isSelected = idx === selectedIndex;
        const letter = VARIANT_LETTERS[idx] ?? String(idx + 1);
        const label = angleLabels[idx] ?? `Variant ${letter}`;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(idx)}
            className={`group inline-flex items-center gap-2 py-1.5 pl-1.5 pr-4 rounded-full text-sm transition-all ${
              isSelected
                ? 'border-2 font-semibold'
                : 'border-2 border-transparent font-medium text-gray-700 hover:bg-gray-50'
            }`}
            style={
              isSelected
                ? { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }
                : undefined
            }
            aria-pressed={isSelected}
          >
            <span
              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0 ${
                isSelected ? 'text-white' : 'bg-gray-100 text-gray-600'
              }`}
              style={isSelected ? { backgroundColor: '#1d4ed8' } : undefined}
            >
              {letter}
            </span>
            <span className="truncate max-w-[240px]">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

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

// ─── Visual Variants Block ────────────────────────────────────
// Sits between the text-variants grid and the FeedbackBar. Behavior:
//   - source === 'none'      → renders nothing (user opted out)
//   - source === 'generate'  → primary "Generate visual" button (or grid
//                              of existing variants + Regenerate)
//   - other sources          → "coming soon" banner pointing to Visual
//                              Brief subsection in Step 1
// Image gen is decoupled from text-gen server-side so it only fires when
// the user clicks the button — text-gen stays fast.

interface VisualVariantsBlockProps {
  deliverableId: string;
  onGenerate: () => void;
  status: 'idle' | 'generating' | 'error';
  errorMessage: string | null;
}

/**
 * Routes per Visual Brief source:
 *   - 'generate'      → Generate visual button + variant grid (AI flow)
 *   - 'library'       → MediaAsset picker + variant grid (curated assets)
 *   - 'compose'       → "soon" placeholder (Phase 4)
 *   - 'trained-style' → "soon" placeholder (Phase 5)
 *   - 'none'          → renders nothing
 *
 * Refinement (feedback) on generate-source images runs through the
 * unified FeedbackBar's Visual dropdown option below this block.
 */
function VisualVariantsBlock({ deliverableId, onGenerate, status, errorMessage }: VisualVariantsBlockProps) {
  const visualBrief = useCanvasStore((s) => s.visualBrief);
  const imageVariants = useCanvasStore((s) => s.imageVariants);
  const setImageVariants = useCanvasStore((s) => s.setImageVariants);
  const setHeroImage = useCanvasStore((s) => s.setHeroImage);

  const source = visualBrief.source;
  const hasImages = imageVariants.length > 0;
  const isGenerating = status === 'generating';
  const [showLibraryPicker, setShowLibraryPicker] = React.useState(false);
  const [showComposePicker, setShowComposePicker] = React.useState(false);
  const [showTrainedPicker, setShowTrainedPicker] = React.useState(false);

  if (source === 'none') return null;

  const handleSelect = (idx: number) => {
    const updated = imageVariants.map((v, i) => ({ ...v, isSelected: i === idx }));
    setImageVariants(updated);
    const picked = updated[idx];
    if (picked) {
      setHeroImage({ url: picked.url, mediaAssetId: null, alt: picked.prompt });
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4" style={{ color: '#7c3aed' }} />
          <span className="text-sm font-medium text-gray-700">Visual</span>
          {visualBrief.styleDirection && (
            <Badge variant="default" size="sm">
              {visualBrief.styleDirection.replace(/-/g, ' ')}
            </Badge>
          )}
        </div>
      </div>

      {/* GENERATE source — empty state with "Generate visual" button */}
      {source === 'generate' && !hasImages && !isGenerating && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">
            {visualBrief.styleDirection
              ? `Generate 2 image variants in ${visualBrief.styleDirection.replace(/-/g, ' ')} style using the brand visual identity.`
              : 'Generate 2 image variants using the brand visual identity. Pick a style chip in Step 1 for sharper composition rules.'}
          </p>
          <button
            type="button"
            onClick={onGenerate}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium ${STUDIO.generateButton}`}
          >
            <Sparkles className="h-4 w-4" />
            Generate visual
          </button>
        </div>
      )}

      {/* LIBRARY source — picker visible by default in empty state, or
          opened via the "Pick different" button when images already exist. */}
      {source === 'library' && (!hasImages || showLibraryPicker) && (
        <LibraryAssetPicker
          deliverableId={deliverableId}
          onCancel={hasImages ? () => setShowLibraryPicker(false) : undefined}
          onPicked={() => setShowLibraryPicker(false)}
        />
      )}

      {/* COMPOSE source — same show/hide pattern as library. */}
      {source === 'compose' && (!hasImages || showComposePicker) && (
        <ComposePicker
          deliverableId={deliverableId}
          onCancel={hasImages ? () => setShowComposePicker(false) : undefined}
          onGenerated={() => setShowComposePicker(false)}
        />
      )}

      {/* TRAINED-STYLE source — same show/hide pattern. */}
      {source === 'trained-style' && (!hasImages || showTrainedPicker) && (
        <TrainedStylePicker
          deliverableId={deliverableId}
          onCancel={hasImages ? () => setShowTrainedPicker(false) : undefined}
          onGenerated={() => setShowTrainedPicker(false)}
        />
      )}

      {/* Loading state — generate flow only */}
      {source === 'generate' && isGenerating && (
        <div className="flex items-center justify-center py-8 gap-3 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generating 2 image variants — this takes 15-30 seconds...</span>
        </div>
      )}

      {/* Error state — generate flow only */}
      {source === 'generate' && status === 'error' && errorMessage && !isGenerating && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-800">
          <X className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Image generation failed</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Variants grid — selection. For non-generate sources, also surface
          a "Pick different / re-compose / regenerate" button to reopen the
          picker. Refinement (feedback-driven regenerate) on generate source
          runs through the FeedbackBar below. */}
      {hasImages && !isGenerating && !showLibraryPicker && !showComposePicker && !showTrainedPicker && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {imageVariants.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(idx)}
                className="relative rounded-lg overflow-hidden border-2 transition-all"
                style={{
                  borderColor: img.isSelected ? '#7c3aed' : '#e5e7eb',
                }}
              >
                <img src={img.url} alt={img.prompt} className="w-full aspect-square object-cover" />
                {img.isSelected && (
                  <div className="absolute top-2 right-2 rounded-full bg-white/90 p-1 shadow">
                    <Check className="h-3.5 w-3.5" style={{ color: '#7c3aed' }} />
                  </div>
                )}
                <div className="px-2 py-1.5 bg-white">
                  <p className="text-[11px] text-gray-500 line-clamp-2 text-left">{img.prompt}</p>
                </div>
              </button>
            ))}
          </div>
          {source === 'library' && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowLibraryPicker(true)}
                className="text-xs text-teal-700 hover:text-teal-800 font-medium"
              >
                Pick different assets →
              </button>
            </div>
          )}
          {source === 'compose' && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowComposePicker(true)}
                className="text-xs text-teal-700 hover:text-teal-800 font-medium"
              >
                Re-compose →
              </button>
            </div>
          )}
          {source === 'trained-style' && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTrainedPicker(true)}
                className="text-xs text-teal-700 hover:text-teal-800 font-medium"
              >
                Regenerate with trained style →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

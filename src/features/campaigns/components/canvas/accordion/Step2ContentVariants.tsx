'use client';

import React, { useMemo, useCallback } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { useCanvasOrchestration } from '../../../hooks/useCanvasOrchestration';
import { resolvePreviewComponent } from '../previews/preview-map';
import { VariantIndexOverrideProvider } from '../previews/InlineEditableSection';
import { FeedbackBar } from '../FeedbackBar';
import { VisualFidelityBadge } from '../VisualFidelityBadge';
import { RefineImageButton } from '../RefineImageButton';
import { ReuseDetectionBanner } from '../ReuseDetectionBanner';
import { VisualFidelityDetail } from '../VisualFidelityDetail';
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
import { IMAGE_SOURCE_TABS } from '../ImageSourcePanel';
import { ImageEditModal } from '../ImageEditModal';
import type { CanvasImageVariant } from '../../../types/canvas.types';
import type { VisualBriefSource } from '@/lib/ai/canvas-context';

// Map the aspect-ratio label returned by the generate-visual endpoint to a
// CSS `aspect-ratio` value so the variant card renders with the actual
// generated ratio instead of being clamped to a square crop.
function aspectRatioCss(label?: string): string {
  switch (label) {
    case '16:9':
      return '16 / 9';
    case '9:16':
      return '9 / 16';
    case '4:3':
      return '4 / 3';
    case '3:4':
      return '3 / 4';
    case '1:1':
    default:
      return '1 / 1';
  }
}

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
  const visualStatus = useCanvasStore((s) => s.visualGenerationStatus);
  const visualError = useCanvasStore((s) => s.visualGenerationError);
  const setVisualGenerationStatus = useCanvasStore((s) => s.setVisualGenerationStatus);
  const { regenerate, abort } = useCanvasOrchestration(deliverableId);

  // Visual generation lifted from VisualVariantsBlock so the unified
  // FeedbackBar at the bottom can also trigger it. The empty-state
  // "Generate visual" button still lives in VisualVariantsBlock and
  // calls back into this handler. Status is on the canvas store so
  // Step 1 (Pad B) can drive the same lifecycle on advance.

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
      setVisualGenerationStatus('generating');
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
          aspectRatio: result.aspectRatio,
        }));
        setImageVariants(mapped);
        if (mapped[0]) promoteToHero(mapped[0]);
        setVisualGenerationStatus('idle');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate visual';
        setVisualGenerationStatus('error', message);
      }
    },
    [deliverableId, setImageVariants, promoteToHero, setVisualGenerationStatus],
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
 * landmark, blauw-getinte highlight bij selected.
 *
 * Styling 2026-05-19 herzien:
 * - box-shadow ring (geen border-2 → geen layout-shift active↔inactive)
 * - subtle shadow-sm voor elevation
 * - smooth hover-state op inactive met avatar-darkening via group-hover
 * - sterker contrast inactive avatar (gray-200) voor leesbaarheid
 * - actieve text-kleur naar blue-800 (was 700) voor extra confidence
 *
 * Tailwind 4 purge-safe: blauwe shades via inline style omdat
 * specifieke utility-classes uit src/index.css gepurged kunnen zijn.
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
            className={`group inline-flex items-center gap-2.5 py-1.5 pl-1.5 pr-4 rounded-full text-sm transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              isSelected
                ? 'font-semibold'
                : 'font-medium text-gray-600 bg-white hover:text-gray-900 hover:bg-gray-50'
            }`}
            style={
              isSelected
                ? {
                    backgroundColor: '#eff6ff',
                    color: '#1e40af',
                    boxShadow:
                      '0 0 0 1px #93c5fd, 0 1px 2px 0 rgba(15, 23, 42, 0.06)',
                  }
                : {
                    // 2026-05-19: inactive state krijgt zichtbare pill-outline
                    // (was unstyled tekst). Anders oogt het als label ipv toggle.
                    boxShadow: '0 0 0 1px #e2e8f0',
                  }
            }
            aria-pressed={isSelected}
          >
            <span
              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold flex-shrink-0 transition-colors duration-150 ${
                isSelected
                  ? 'text-white'
                  : 'bg-gray-200 text-gray-600 group-hover:bg-gray-300 group-hover:text-gray-800'
              }`}
              style={isSelected ? { backgroundColor: '#2563eb' } : undefined}
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
  const [openVisualFidelityDetail, setOpenVisualFidelityDetail] =
    React.useState<{ componentId: string; imageUrl: string } | null>(null);

  // F35: 'none' source rendert nu een tab-strip + uitleg (i.p.v. niets).
  // User kan terug naar generate/library/etc switchen zonder Step 1 te
  // openen. Daarom NIET meer vroege return op 'none'.

  const handleSelect = (idx: number) => {
    const updated = imageVariants.map((v, i) => ({ ...v, isSelected: i === idx }));
    setImageVariants(updated);
    const picked = updated[idx];
    if (picked) {
      setHeroImage({ url: picked.url, mediaAssetId: null, alt: picked.prompt });
    }
  };

  // F39 (audit 2026-05-13): Nano Banana edit-modal state.
  const [editingImage, setEditingImage] = React.useState<{
    url: string;
    variantIndex: number;
  } | null>(null);
  const handleEditApplied = React.useCallback(
    (editedUrl: string) => {
      if (!editingImage) return;
      const updated = imageVariants.map((v, i) =>
        i === editingImage.variantIndex
          ? { ...v, url: editedUrl, prompt: `${v.prompt} [edited]` }
          : v,
      );
      setImageVariants(updated);
      // Sync hero-image als de edited variant geselecteerd was
      const wasSelected = imageVariants[editingImage.variantIndex]?.isSelected;
      if (wasSelected) {
        setHeroImage({ url: editedUrl, mediaAssetId: null, alt: updated[editingImage.variantIndex].prompt });
      }
    },
    [editingImage, imageVariants, setImageVariants, setHeroImage],
  );

  // F35 (audit 2026-05-13): inline source-tab-strip — user kan tussen 8
  // sources switchen zonder terug naar Step 1. Wijziging persist via
  // setVisualBriefSource → Step 1 reflectt automatisch.
  const setSource = useCanvasStore((s) => s.setVisualBriefSource);
  const handleSourceTabClick = (next: VisualBriefSource) => {
    if (next === source) return;
    setSource(next);
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

      {/* F35: source-tab-strip — switch tussen 8 image-sources inline */}
      <div className="flex flex-wrap gap-1.5 border-b border-gray-200 pb-3 mb-3">
        {IMAGE_SOURCE_TABS.map((t) => {
          const Icon = t.icon;
          const active = source === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => handleSourceTabClick(t.value)}
              className={
                active
                  ? 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary text-white text-[11px] font-medium'
                  : 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 text-gray-600 text-[11px] font-medium hover:bg-gray-100'
              }
            >
              <Icon className="h-3 w-3" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* GENERATE source — empty state with "Generate visual" button */}
      {source === 'generate' && !hasImages && !isGenerating && (
        <div className="space-y-2">
          {/* Pattern G2 image-quality-chain — reuse-detection banner.
              Toont alleen wanneer briefingText ≥ 8 chars en semantic-search
              ≥ 1 match boven 0.75 similarity oplevert. Dismissable. */}
          <ReuseDetectionBanner
            onPick={(selection) => {
              const url = typeof selection.url === 'string' ? selection.url : '';
              if (!url) return;
              setImageVariants([
                {
                  index: 0,
                  url,
                  prompt: selection.alt ?? 'Reused from library',
                  isSelected: true,
                  aspectRatio: undefined,
                },
              ]);
              setHeroImage({
                url,
                mediaAssetId: selection.mediaAssetId ?? null,
                alt: selection.alt ?? undefined,
              });
            }}
          />
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

      {/* F35 — Upload / URL / Stock inline. Modal-tabs werken hier ook;
          onSelected schrijft heroImage + persist. Stock-tab krijgt
          briefingText als seed-query (smart-default Stap 4). */}
      {(source === 'upload' || source === 'url' || source === 'stock') && (
        <InlineUrlUploadStockTab
          deliverableId={deliverableId}
          source={source}
          setHeroImage={setHeroImage}
          seedQuery={visualBrief.briefingText ?? ''}
        />
      )}

      {/* NONE source — geen visual; subtiele uitleg. */}
      {source === 'none' && (
        <div className="text-xs text-gray-500 px-2 py-3 italic">
          No visual for this content item.
        </div>
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
                <img
                  src={img.url}
                  alt={img.prompt}
                  className="w-full object-cover"
                  style={{ aspectRatio: aspectRatioCss(img.aspectRatio) }}
                />
                {/* G8 — visual fidelity badge in top-left when scored.
                    Click opens the detail panel; outer button's click handler
                    (variant select) is suppressed via stopPropagation in the
                    badge itself. */}
                <div className="absolute top-2 left-2">
                  <VisualFidelityBadge
                    componentId={img.componentId}
                    variant="compact"
                    onOpenDetail={
                      img.componentId
                        ? () =>
                            setOpenVisualFidelityDetail({
                              componentId: img.componentId!,
                              imageUrl: img.url,
                            })
                        : undefined
                    }
                  />
                </div>
                {img.isSelected && (
                  <div className="absolute top-2 right-2 rounded-full bg-white/90 p-1 shadow">
                    <Check className="h-3.5 w-3.5" style={{ color: '#7c3aed' }} />
                  </div>
                )}
                {/* F39 — Edit via tekst button. Verschijnt rechtsonder; stopPropagation
                    om select-handler op de outer button niet te triggeren. */}
                <div className="absolute bottom-9 right-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingImage({ url: img.url, variantIndex: idx });
                    }}
                    title="Bewerk met tekstinstructie (Nano Banana)"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-600/90 hover:bg-purple-700 text-white text-[10px] font-medium shadow-sm transition-colors"
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    Edit
                  </button>
                </div>
                {/* Pattern D image-quality-chain: Improve-button voor refine
                    bij composite-score &lt; 65. Toont alleen wanneer score
                    geladen + onder threshold; server enforced ook max-2
                    iterationCount guard. */}
                {img.componentId && (
                  <RefineImageButton
                    deliverableId={deliverableId}
                    componentId={img.componentId}
                    // Geen explicit refetch — de bestaande canvas-orchestration
                    // polling pickt nieuwe imageUrl + score automatisch op.
                  />
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

      {/* G8 — full-screen detail panel for the clicked image's score */}
      {openVisualFidelityDetail && (
        <VisualFidelityDetail
          componentId={openVisualFidelityDetail.componentId}
          imageUrl={openVisualFidelityDetail.imageUrl}
          onClose={() => setOpenVisualFidelityDetail(null)}
        />
      )}

      {/* F39 — Nano Banana edit modal */}
      <ImageEditModal
        isOpen={editingImage !== null}
        onClose={() => setEditingImage(null)}
        deliverableId={deliverableId}
        imageUrl={editingImage?.url ?? null}
        onEdited={handleEditApplied}
      />
    </div>
  );
}

// F35 (audit 2026-05-13): Inline wrapper voor Upload/URL/Stock tabs binnen
// Step 2. Lazy-importeert modal-tabs zodat code splitting blijft werken;
// onSelected schrijft heroImage + persist (zelfde flow als InsertImageModal).
function InlineUrlUploadStockTab({
  deliverableId,
  source,
  setHeroImage,
  seedQuery,
}: {
  deliverableId: string;
  source: 'upload' | 'url' | 'stock';
  setHeroImage: (h: { url: string; mediaAssetId: string | null; alt?: string }) => void;
  seedQuery?: string;
}) {
  const [TabComponent, setTabComponent] = React.useState<React.ComponentType<{
    onSelected: (sel: { url: string; mediaAssetId: string | null; alt?: string }) => void;
    initialQuery?: string;
  }> | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (source === 'upload') {
        const mod = await import('../insert-image/UploadTab');
        if (!cancelled) setTabComponent(() => mod.UploadTab);
      } else if (source === 'url') {
        const mod = await import('../insert-image/UrlImportTab');
        if (!cancelled) setTabComponent(() => mod.UrlImportTab);
      } else {
        const mod = await import('../insert-image/StockPhotosTab');
        if (!cancelled) setTabComponent(() => mod.StockPhotosTab);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [source]);

  const handleSelected = async (sel: { url: string; mediaAssetId: string | null; alt?: string }) => {
    setHeroImage({ url: sel.url, mediaAssetId: sel.mediaAssetId, alt: sel.alt });
    try {
      await persistHeroImage(deliverableId, {
        imageUrl: sel.url,
        imageSource:
          source === 'upload'
            ? 'library'
            : source === 'url'
              ? 'url-import'
              : 'stock',
        mediaAssetId: sel.mediaAssetId,
        alt: sel.alt ?? null,
      });
    } catch (err) {
      console.error('[Step2 InlineTab] persistHeroImage failed:', err);
    }
  };

  if (!TabComponent) {
    return (
      <div className="flex items-center justify-center py-6 text-xs text-gray-500">
        Loading {source} tab…
      </div>
    );
  }
  return <TabComponent onSelected={handleSelected} initialQuery={source === 'stock' ? seedQuery : undefined} />;
}

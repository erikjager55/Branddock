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
import { VariantAdQualityIndicator } from '../ad-quality/VariantAdQualityIndicator';
import { Badge } from '@/components/shared';
import { STUDIO } from '@/lib/constants/design-tokens';
import type { PreviewContent } from '../../../types/canvas.types';
import { Loader2, Sparkles, ArrowRight, Check, Film, MessageSquare, MousePointerClick, Image as ImageIcon, RefreshCw, X } from 'lucide-react';
import { SeoProgressPanel } from '../SeoProgressPanel';
import { LandingPageGenerateBlock } from './LandingPageGenerateBlock';
// Web-page builder PUCK types — centrale bron (web-page-builder spec §4b paradigma B).
import { PUCK_WEBPAGE_TYPES } from '@/lib/landing-pages/webpage-types';
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

/**
 * Scene/script variantGroups for video-script content types. These are
 * surfaced in the Scene Breakdown below the Content Preview, so we
 * exclude them from the Preview itself to avoid showing the same script
 * twice. Preview keeps only what publishes to the feed
 * (e.g. `intro-caption` for linkedin-video-ad).
 */
const VIDEO_SCENE_GROUPS_IN_BREAKDOWN = new Set([
  'hook',
  'body',
  'cta',
  'thumbnail',
  'captions',
]);

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
  const isInitialGenerating = useCanvasStore((s) => s.isInitialGenerating);
  const generationStatus = useCanvasStore((s) => s.generationStatus);
  const imageVariants = useCanvasStore((s) => s.imageVariants);
  const contextStack = useCanvasStore((s) => s.contextStack);
  const contentType = useCanvasStore((s) => s.contentType);
  const heroImage = useCanvasStore((s) => s.heroImage);
  const setImageVariants = useCanvasStore((s) => s.setImageVariants);
  const setHeroImage = useCanvasStore((s) => s.setHeroImage);
  const setSceneImageVariants = useCanvasStore((s) => s.setSceneImageVariants);
  const setSceneHeroImage = useCanvasStore((s) => s.setSceneHeroImage);
  const visualBrief = useCanvasStore((s) => s.visualBrief);
  const visualStatus = useCanvasStore((s) => s.visualGenerationStatus);
  const visualError = useCanvasStore((s) => s.visualGenerationError);
  const setVisualGenerationStatus = useCanvasStore((s) => s.setVisualGenerationStatus);
  const { regenerate, abort } = useCanvasOrchestration(deliverableId);

  // 2026-05-19 — track which scope is currently generating so only that
  // scene's (or workspace's) VisualVariantsBlock shows the spinner.
  // Without this, the workspace-global `visualGenerationStatus` flipped
  // every block to 'generating' simultaneously when the user clicked
  // Generate on one scene. The scope stays set after generation so the
  // matching block also surfaces the error if any.
  const [generatingScope, setGeneratingScope] = React.useState<SceneId | 'workspace' | null>(null);

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
    async (instruction?: string, sceneId?: SceneId) => {
      setGeneratingScope(sceneId ?? 'workspace');
      setVisualGenerationStatus('generating');
      // For scene-scoped gen: resolve the scene-specific visual direction
      // so the image matches the scene's [VISUAL: …] cue instead of the
      // workspace-level brief. User inline-edits in sceneOverrides win
      // over the parsed cue from the script content.
      let sceneVisualPrompt: string | undefined;
      if (sceneId) {
        const store = useCanvasStore.getState();
        const override = store.sceneOverrides[sceneId]?.visualText?.trim();
        if (override) {
          sceneVisualPrompt = override;
        } else {
          const idx = store.selections.get(sceneId) ?? 0;
          const sceneContent =
            store.variantGroups.get(sceneId)?.[idx]?.content
            ?? store.variantGroups.get(sceneId)?.[0]?.content
            ?? '';
          const match = sceneContent.match(/\[\s*[Vv][Ii][Ss][Uu][Aa][Ll]\s*:\s*([^\]]+)\]/);
          sceneVisualPrompt = match?.[1]?.trim();
        }
      }
      try {
        const result = await generateCanvasVisual(deliverableId, {
          count: 2,
          instruction: instruction?.trim() || undefined,
          sceneId,
          sceneVisualPrompt,
        });
        const mapped: CanvasImageVariant[] = result.variants.map((v, i) => ({
          index: i,
          url: v.url,
          prompt: v.prompt,
          isSelected: i === 0,
          aspectRatio: result.aspectRatio,
        }));
        // Scene-scoped generation persists under variantGroup `visual:<sceneId>`
        // server-side (Fase 1) — client routes the response to the scene state
        // so each scene's visual remains independent across re-renders.
        if (sceneId) {
          setSceneImageVariants(sceneId, mapped);
          if (mapped[0]) {
            setSceneHeroImage(sceneId, {
              url: mapped[0].url,
              mediaAssetId: null,
              alt: mapped[0].prompt,
            });
          }
        } else {
          setImageVariants(mapped);
          if (mapped[0]) promoteToHero(mapped[0]);
        }
        setVisualGenerationStatus('idle');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate visual';
        setVisualGenerationStatus('error', message);
      }
    },
    [
      deliverableId,
      setImageVariants,
      setSceneImageVariants,
      setSceneHeroImage,
      promoteToHero,
      setVisualGenerationStatus,
    ],
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
    () => resolvePreviewComponent(platform, format, contentType),
    [platform, format, contentType],
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
  // For video-script types: strip [VISUAL: …], [CAPTION] …, and
  // "Tekstoverlay: …" / "Caption: …" lines from the preview text. The
  // Scene Breakdown below renders these as label-pills per scene — having
  // them inline in the preview prose is duplicate and visually noisy.
  // 2026-05-19 follow-up: for video-types, also EXCLUDE the scene/script
  // groups themselves (hook / body / cta / thumbnail / captions) from
  // the Preview. Scene Breakdown is the single source for those — Preview
  // shows only what publishes to the feed (the intro-caption sponsored-
  // post text). Reduces Preview from ~30 lines to ~5.
  // Stored content is untouched; we only filter what feeds the Preview.
  const composedVariants = useMemo(() => {
    const result: PreviewContent[] = [];
    for (let i = 0; i < variantCount; i++) {
      const content: PreviewContent = {};
      for (const [group, variants] of variantGroups) {
        if (isVideoScript && VIDEO_SCENE_GROUPS_IN_BREAKDOWN.has(group)) continue;
        const variant = variants[i] ?? variants[0];
        if (variant) {
          const text = isVideoScript ? stripSceneMarkers(variant.content) : variant.content;
          content[group] = { content: text, type: 'text' };
        }
      }
      result.push(content);
    }
    return result;
  }, [variantGroups, variantCount, isVideoScript]);

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

  // ─── PUCK web-page types (Fase 6c) ────────────────────────
  // Voor landing-page / product-page / faq-page / comparison-page / microsite
  // vervangt LandingPageGenerateBlock de multi-variant grid (spec §4b paradigma B).
  // Geen ABCD-vergelijking — 1 structured variant + auto-iterate refinement.
  if (contentType !== null && PUCK_WEBPAGE_TYPES.has(contentType)) {
    return (
      <LandingPageGenerateBlock
        deliverableId={deliverableId}
        onAdvance={onAdvance}
      />
    );
  }

  // ─── Generating state ──────────────────────────────────────
  // Tijdens de INITIËLE generatie blijft de voortgangs-indicator staan tot
  // alle groups gestreamd zijn — ook nadat de eerste group binnen is (anders
  // toont het grid een half-gevulde variant, bv. een display-ad met alleen
  // headlines en nog lege descriptions, wat als een bug oogt). Bij regeneratie
  // (isInitialGenerating === false) valt het door naar de bestaande varianten
  // met de "Regenerating…"-overlay.
  if (isGenerating && (isInitialGenerating || !hasVariants)) {
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
                <div className="flex items-center gap-2">
                  <span>Variant {VARIANT_LABELS[idx] ?? idx + 1}</span>
                  {/* Ad Quality badge — only for ad content-types with
                      validators registered (currently search-ad). Auto-
                      triggers fire-and-forget POST on first render. */}
                  {contentType && (
                    <VariantAdQualityIndicator
                      deliverableId={deliverableId}
                      variantIndex={idx}
                      contentType={contentType}
                      hasContent={!!content && Object.keys(content).length > 0}
                    />
                  )}
                </div>
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

      {/* Scene breakdown — shown when variant groups include hook/body/cta.
          For video-script types each scene-card embeds its own
          VisualVariantsBlock so the user can generate/select/pick a visual
          per scene. Workspace-level visual block below is hidden in that
          case (hasSceneGroups). */}
      {hasSceneGroups && hasVariants && !isGenerating && (
        <SceneBreakdown
          variantGroups={variantGroups}
          selectedVariantIndex={selectedVariantIndex}
          deliverableId={deliverableId}
          onGenerateScene={(sceneId) => handleGenerateVisual(undefined, sceneId)}
          visualStatus={visualStatus}
          visualError={visualError}
          generatingScope={generatingScope}
        />
      )}

      {/* Visual generation — routes by Visual Brief source:
          • generate      → AI generation (Imagen / GPT Image 2 / FLUX etc.)
          • library       → MediaAsset picker
          • compose / trained-style → "soon" placeholder
          Refining a generate-source result happens via the FeedbackBar's
          Visual dropdown below. */}
      {hasVariants && !isGenerating && !hasSceneGroups && contentType !== 'linkedin-poll' && contentType !== 'search-ad' && (
        <VisualVariantsBlock
          deliverableId={deliverableId}
          onGenerate={() => handleGenerateVisual()}
          status={generatingScope === 'workspace' ? visualStatus : 'idle'}
          errorMessage={generatingScope === 'workspace' ? visualError : null}
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

/**
 * Parse scene-script tekst naar gestructureerde segments.
 *
 * Input formaten die het script-prompt produceert:
 *   - `**spoken phrase**` → bold spoken text
 *   - `## Heading` → markdown heading prefix (vaak een titel-cue)
 *   - `[VISUAL: directie + setting]` → camera/scene directie
 *   - `[CAPTION] caption-tekst` (caption loopt door tot volgende [ of einde) → on-screen caption
 *   - rest → normale gesproken tekst
 *
 * 2026-05-19: parser vervangt eerdere raw-text rendering die literal
 * asterisks/hash-prefix en [VISUAL]/[CAPTION] markers inline toonde.
 * Gerapporteerd: "Pas de styling van de scene breakdown tekst aan".
 */
type SceneSegment =
  | { kind: 'text'; content: string }
  | { kind: 'bold'; content: string }
  | { kind: 'visual'; content: string }
  | { kind: 'broll'; content: string }
  | { kind: 'caption'; content: string };

/**
 * Strip scene-marker syntax from the variant preview for video-script
 * types. The Scene Breakdown renders these markers as label-pills per
 * scene; leaving them inline in the Content Preview duplicates the
 * info and reads as noise next to the spoken-script prose.
 *
 * Removes:
 *   - `[VISUAL: …]` / `[Visual: …]` / `[visual: …]` blocks anywhere
 *   - `[CAPTION] …` blocks (inline)
 *   - Whole lines starting with `Tekstoverlay:` / `Caption:` (label-prefixed)
 *   - Scene-timing prefixes like `[HOOK — 0s]`, `[PROOF - 3s]` (model
 *     adds these on top of the group-name; we already render the group
 *     header)
 *   - Empty consecutive blank lines collapsed
 */
function stripSceneMarkers(raw: string): string {
  if (!raw) return raw;
  let out = raw;
  // [VISUAL: …] — may contain ] in nested edge cases, but the model never
  // produces those in practice. Use non-greedy match.
  out = out.replace(/\[\s*[Vv][Ii][Ss][Uu][Aa][Ll]:[^\]]*\]/g, '');
  // [B-ROLL: …] — secondary motion direction, also handled in Scene Breakdown.
  out = out.replace(/\[\s*b[-\s]?roll\s*:[^\]]*\]/gi, '');
  // [CAPTION] followed by inline caption — strip the marker, keep nothing
  // (Scene Breakdown shows captions). Match until next "[" or end-of-line.
  out = out.replace(/\[\s*[Cc][Aa][Pp][Tt][Ii][Oo][Nn]\s*\][^\[\n]*/g, '');
  // Scene-timing prefixes `[HOOK — 0s]`, `[PROOF - 3s]`, `[OFFER - 10s]`,
  // `[THUMBNAIL]` — these duplicate the group header.
  out = out.replace(/\[\s*(HOOK|PROOF|OFFER|BODY|CTA|THUMBNAIL|INTRO|CONCLUSION)[^\]]*\]/gi, '');
  // Whole-line label prefixes like "Tekstoverlay: ..." / "Caption: ..." /
  // "Voiceover: ..." — keep only spoken-script prose.
  out = out.replace(/^[ \t]*(Tekstoverlay|Caption|Voiceover|On-screen text)\s*:\s*.*$/gim, '');
  // Collapse 3+ consecutive blank lines into 2.
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

function parseSceneSegments(raw: string): SceneSegment[] {
  // Strip leading markdown headings (## title); behoud rest van tekst.
  let text = raw.replace(/^#{1,6}\s+/gm, '');
  // Trim opening/closing whitespace.
  text = text.trim();

  const segments: SceneSegment[] = [];
  let i = 0;
  let buf = '';
  const flushText = () => {
    if (buf.trim()) segments.push({ kind: 'text', content: buf.trim() });
    buf = '';
  };

  while (i < text.length) {
    // **bold**
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2);
      if (end > -1) {
        flushText();
        segments.push({ kind: 'bold', content: text.substring(i + 2, end).trim() });
        i = end + 2;
        continue;
      }
    }
    // [VISUAL: content]
    if (text.startsWith('[VISUAL:', i) || text.startsWith('[Visual:', i) || text.startsWith('[visual:', i)) {
      const end = text.indexOf(']', i);
      if (end > -1) {
        flushText();
        const inner = text.substring(i + '[VISUAL:'.length, end).trim();
        segments.push({ kind: 'visual', content: inner });
        i = end + 1;
        continue;
      }
    }
    // [B-ROLL: content] — secondary motion direction for video-gen.
    // Accept variants: [B-ROLL:], [B-Roll:], [b-roll:], [BROLL:], [B ROLL:].
    {
      const brollPrefix = text.slice(i, i + 10).match(/^\[\s*b[-\s]?roll\s*:/i);
      if (brollPrefix) {
        const headerLen = brollPrefix[0].length;
        const end = text.indexOf(']', i);
        if (end > -1) {
          flushText();
          const inner = text.substring(i + headerLen, end).trim();
          segments.push({ kind: 'broll', content: inner });
          i = end + 1;
          continue;
        }
      }
    }
    // [CAPTION] content (until next [ or end)
    if (text.startsWith('[CAPTION]', i) || text.startsWith('[Caption]', i) || text.startsWith('[caption]', i)) {
      const headerLen = '[CAPTION]'.length;
      const nextBracket = text.indexOf('[', i + headerLen);
      const end = nextBracket === -1 ? text.length : nextBracket;
      flushText();
      const inner = text.substring(i + headerLen, end).trim();
      if (inner) segments.push({ kind: 'caption', content: inner });
      i = end;
      continue;
    }
    buf += text[i];
    i++;
  }
  flushText();
  return segments;
}

function SceneBreakdown({
  variantGroups,
  selectedVariantIndex,
  deliverableId,
  onGenerateScene,
  visualStatus,
  visualError,
  generatingScope,
}: {
  variantGroups: Map<string, { content: string }[]>;
  selectedVariantIndex: number;
  deliverableId: string;
  /** Trigger image generation for a specific scene — parent wires this to
   *  `handleGenerateVisual(undefined, sceneId)` so generation lands in
   *  scene-scoped state instead of the workspace-level visual. */
  onGenerateScene: (sceneId: SceneId) => void;
  visualStatus: 'idle' | 'generating' | 'error';
  visualError: string | null;
  /** Which scope is currently generating — used to gate the spinner/
   *  error display to only the scene that triggered the call. */
  generatingScope: SceneId | 'workspace' | null;
}) {
  const hasSceneGroups = variantGroups.has('hook') || variantGroups.has('body') || variantGroups.has('cta');
  if (!hasSceneGroups) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wider">Scene Breakdown</h4>
      <div className="space-y-2">
        {SCENE_CONFIG.map((config) => {
          const variants = variantGroups.get(config.id);
          if (!variants) return null;
          const text = variants[selectedVariantIndex]?.content ?? variants[0]?.content ?? '';
          if (!text) return null;
          // Only the scene that triggered generation shows the spinner /
          // error state — other scenes stay idle even though the global
          // visualGenerationStatus is 'generating'.
          const scopedStatus = generatingScope === config.id ? visualStatus : 'idle';
          const scopedError = generatingScope === config.id ? visualError : null;
          return (
            <SceneBreakdownCard
              key={config.id}
              config={config}
              scriptText={text}
              deliverableId={deliverableId}
              onGenerateScene={onGenerateScene}
              visualStatus={scopedStatus}
              visualError={scopedError}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * One scene-card in the breakdown. Owns inline-edit state for the
 * scene's Visual + Caption so the user can rewrite the direction or
 * the burned-in caption text without regenerating the whole variant.
 * Edits persist client-side in `sceneOverrides[sceneId]` — when set,
 * the override replaces the parsed marker content; subsequent parsed
 * visual/caption markers stay read-only.
 */
function SceneBreakdownCard({
  config,
  scriptText,
  deliverableId,
  onGenerateScene,
  visualStatus,
  visualError,
}: {
  config: { id: SceneId; label: string; icon: typeof Film; borderColor: string; bgColor: string; textColor: string };
  scriptText: string;
  deliverableId: string;
  onGenerateScene: (sceneId: SceneId) => void;
  visualStatus: 'idle' | 'generating' | 'error';
  visualError: string | null;
}) {
  const { id, label, icon: Icon, borderColor, bgColor, textColor } = config;
  const segments = React.useMemo(() => parseSceneSegments(scriptText), [scriptText]);

  const override = useCanvasStore((s) => s.sceneOverrides[id]);
  const setOverride = useCanvasStore((s) => s.setSceneVisualOverride);

  // Track which Visual / B-Roll / Caption segment is the "first" one —
  // only that one is editable so override-state stays unambiguous.
  // Subsequent markers (rare, but the prompt allows multiple) render
  // read-only.
  let firstVisualIdx = -1;
  let firstBRollIdx = -1;
  let firstCaptionIdx = -1;
  for (let i = 0; i < segments.length; i++) {
    if (firstVisualIdx === -1 && segments[i].kind === 'visual') firstVisualIdx = i;
    if (firstBRollIdx === -1 && segments[i].kind === 'broll') firstBRollIdx = i;
    if (firstCaptionIdx === -1 && segments[i].kind === 'caption') firstCaptionIdx = i;
  }

  return (
    <div
      className="flex gap-3 rounded-lg p-3"
      style={{ backgroundColor: bgColor, borderLeft: `3px solid ${borderColor}` }}
    >
      <div className="flex-shrink-0 mt-0.5">
        <Icon className="h-4 w-4" style={{ color: borderColor }} />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: textColor }}>
          {label}
        </span>
        {/* 2026-05-19 herzien: segments inline geïntegreerd binnen
            de scene-card (was eerder genest in aparte mini-panels
            met eigen borders — visueel rommelig). Visual/Caption
            krijgen nu een kleine inline-label-pill in de flow ipv
            een aparte box. Spoken-text vormt de hoofdtekst.
            2026-05-19 follow-up: Visual + Caption inline editable per
            scene zodat user de directie / caption-tekst zelf kan
            bijschaven zonder regeneratie. */}
        <div className="space-y-2">
          {segments.map((seg, idx) => {
            if (seg.kind === 'text') {
              return (
                <p key={idx} className="text-sm text-gray-800 leading-relaxed">
                  {seg.content}
                </p>
              );
            }
            if (seg.kind === 'bold') {
              return (
                <p key={idx} className="text-sm font-semibold text-gray-900 leading-relaxed">
                  {seg.content}
                </p>
              );
            }
            if (seg.kind === 'visual') {
              const isEditable = idx === firstVisualIdx;
              const effective = isEditable ? (override?.visualText ?? seg.content) : seg.content;
              return (
                <div key={idx} className="text-xs text-gray-600 leading-snug flex items-start gap-1.5">
                  <span
                    className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider flex-shrink-0 mt-[3px]"
                    style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: textColor }}
                  >
                    Visual
                  </span>
                  {isEditable ? (
                    <EditableInlineText
                      value={effective}
                      onSave={(next) => setOverride(id, { visualText: next })}
                      italic
                      placeholder="Describe the on-screen action / camera"
                    />
                  ) : (
                    <span className="italic">{effective}</span>
                  )}
                </div>
              );
            }
            if (seg.kind === 'broll') {
              const isEditable = idx === firstBRollIdx;
              const effective = isEditable ? (override?.bRollText ?? seg.content) : seg.content;
              return (
                <div key={idx} className="text-xs text-gray-500 leading-snug flex items-start gap-1.5">
                  <span
                    className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider flex-shrink-0 mt-[3px]"
                    style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: textColor }}
                  >
                    B-roll
                  </span>
                  {isEditable ? (
                    <EditableInlineText
                      value={effective}
                      onSave={(next) => setOverride(id, { bRollText: next })}
                      italic
                      placeholder="Motion direction for video gen — camera pan, intercut, dolly, etc."
                    />
                  ) : (
                    <span className="italic">{effective}</span>
                  )}
                </div>
              );
            }
            if (seg.kind === 'caption') {
              const isEditable = idx === firstCaptionIdx;
              const effective = isEditable ? (override?.captionText ?? seg.content) : seg.content;
              return (
                <div key={idx} className="text-xs text-gray-600 leading-snug flex items-start gap-1.5">
                  <span
                    className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider flex-shrink-0 mt-[3px]"
                    style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: textColor }}
                  >
                    Caption
                  </span>
                  {isEditable ? (
                    <EditableInlineText
                      value={effective}
                      onSave={(next) => setOverride(id, { captionText: next })}
                      placeholder="Burned-in caption — max ~32 characters per line"
                    />
                  ) : (
                    <span>{effective}</span>
                  )}
                </div>
              );
            }
            return null;
          })}
        </div>
        {/* 2026-05-19 Fase 2 scene-visual-split: per-scene visual block.
            Same routing logic as the workspace VisualVariantsBlock —
            generate / library / compose / trained / upload / url /
            stock — but state lives in `sceneImageVariants[id]` and
            `sceneHeroImage[id]`. Server persists with
            `variantGroup: 'visual:<id>'`. */}
        <div className="mt-3">
          <VisualVariantsBlock
            deliverableId={deliverableId}
            onGenerate={() => onGenerateScene(id)}
            status={visualStatus}
            errorMessage={visualError}
            sceneId={id}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Click-to-edit inline text. Click → textarea + autofocus. Blur or Cmd/Ctrl-Enter
 * saves; Escape cancels. Used for per-scene Visual + Caption overrides.
 */
function EditableInlineText({
  value,
  onSave,
  italic,
  placeholder,
}: {
  value: string;
  onSave: (next: string) => void;
  italic?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);

  const enterEdit = () => {
    setDraft(value);
    setEditing(true);
  };

  if (editing) {
    return (
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft.trim() !== value.trim()) onSave(draft.trim());
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            (e.currentTarget as HTMLTextAreaElement).blur();
          } else if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        autoFocus
        rows={Math.max(1, Math.min(4, Math.ceil(draft.length / 60)))}
        className={`flex-1 min-w-0 bg-white border border-gray-300 rounded px-1.5 py-0.5 text-xs ${italic ? 'italic' : ''} focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none`}
        placeholder={placeholder}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={enterEdit}
      className={`flex-1 min-w-0 text-left ${italic ? 'italic' : ''} cursor-text hover:bg-white/60 rounded px-0.5 -mx-0.5 transition-colors`}
      title="Click to edit (Cmd/Ctrl+Enter to save, Esc to cancel)"
    >
      {value || <span className="text-gray-400">{placeholder ?? 'Click to fill in'}</span>}
    </button>
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
  /** Scene scope for video-script types (Fase 2 of the scene-visual-split).
   *  When set the block reads from `sceneImageVariants[sceneId]` /
   *  `sceneHeroImage[sceneId]` instead of the workspace-level state, so each
   *  scene's visual remains independent. Selection/edits also write back to
   *  the scene-scoped state. */
  sceneId?: SceneId;
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
function VisualVariantsBlock({ deliverableId, onGenerate, status, errorMessage, sceneId }: VisualVariantsBlockProps) {
  const visualBrief = useCanvasStore((s) => s.visualBrief);
  const workspaceImageVariants = useCanvasStore((s) => s.imageVariants);
  const sceneImageVariantsAll = useCanvasStore((s) => s.sceneImageVariants);
  const setWorkspaceImageVariants = useCanvasStore((s) => s.setImageVariants);
  const setWorkspaceHeroImage = useCanvasStore((s) => s.setHeroImage);
  const setSceneImageVariantsAction = useCanvasStore((s) => s.setSceneImageVariants);
  const setSceneHeroImageAction = useCanvasStore((s) => s.setSceneHeroImage);

  // Route reads/writes to scene-scoped state when sceneId is set, otherwise
  // workspace-level. Keeps the rest of the component logic identical so the
  // generate / library / compose / upload / url / stock branches all work
  // unchanged per scene.
  const imageVariants = sceneId ? sceneImageVariantsAll[sceneId] : workspaceImageVariants;
  const setImageVariants = React.useCallback(
    (variants: CanvasImageVariant[]) => {
      if (sceneId) setSceneImageVariantsAction(sceneId, variants);
      else setWorkspaceImageVariants(variants);
    },
    [sceneId, setSceneImageVariantsAction, setWorkspaceImageVariants],
  );
  const setHeroImage = React.useCallback(
    (image: { url: string; mediaAssetId: string | null; alt?: string } | null) => {
      if (sceneId) setSceneHeroImageAction(sceneId, image);
      else setWorkspaceHeroImage(image);
    },
    [sceneId, setSceneHeroImageAction, setWorkspaceHeroImage],
  );

  // Scene-scoped source overrides the workspace-level visualBrief.source
  // so each scene's tab-strip is independent. Without this, clicking
  // "Library" on one scene flipped all three (workspace state shared).
  // Falls back to workspace source when the scene hasn't picked one yet.
  const sceneVisualSourceMap = useCanvasStore((s) => s.sceneVisualSource);
  const setSceneVisualSourceAction = useCanvasStore((s) => s.setSceneVisualSource);
  const source: VisualBriefSource = sceneId
    ? sceneVisualSourceMap[sceneId] ?? visualBrief.source
    : visualBrief.source;
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
  // sources switchen zonder terug naar Step 1. Workspace-flow persist via
  // setVisualBriefSource → Step 1 reflectt automatisch. Scene-scoped flow
  // (sceneId set) schrijft naar `sceneVisualSource[sceneId]` zodat de
  // andere scenes niet meeverspringen.
  const setWorkspaceSource = useCanvasStore((s) => s.setVisualBriefSource);
  const handleSourceTabClick = (next: VisualBriefSource) => {
    if (next === source) return;
    if (sceneId) setSceneVisualSourceAction(sceneId, next);
    else setWorkspaceSource(next);
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
                    title="Edit with text instruction (Nano Banana)"
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

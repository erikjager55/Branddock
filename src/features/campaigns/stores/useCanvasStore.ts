// =============================================================
// Canvas Store — Zustand (context + variants + selections + generation + accordion)
// =============================================================

import { create } from 'zustand';
import type { CanvasVariant, CanvasImageVariant, ApprovalStatus } from '../types/canvas.types';
import type { StepSummaryData } from '../types/accordion.types';
import type {
  CanvasContextStack,
  VisualBrief,
  VisualBriefSource,
  VisualStyleDirection,
} from '@/lib/ai/canvas-context';
import type { MediumCategory, MediumVariant } from '../types/medium-config.types';
type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error';

// F9 (audit 2026-05-13): per-variant fidelity score-shape, mirror van
// canvas-store.fidelityScore inline-type voor type-safe map-storage.
export interface FidelityScoreState {
  stage: 'idle' | 'detector-only' | 'computing' | 'complete' | 'skipped';
  skippedReason: string | null;
  compositeScore: number | null;
  thresholdMet: boolean | null;
  compositeThreshold: number | null;
  detectorVerdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI' | null;
  humanBaselinePosition: number | null;
  pillars: { style: number | null; judge: number | null; rules: number | null } | null;
  elapsedMs: number | null;
}

export type SceneId = 'hook' | 'body' | 'cta';
export type SceneSourceMode = 'text-to-video' | 'image-to-video' | 'existing' | 'none';

export interface SceneVideoConfig {
  sceneId: SceneId;
  sourceMode: SceneSourceMode;
  sourceUrl: string | null;
  provider: string;
  videoUrl: string | null;
  status: 'idle' | 'generating' | 'complete' | 'error';
  error: string | null;
  prompt: string | null;
  textOverlay: string | null;
  logoPlacement: 'none' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  voiceoverText: string | null;
  voiceoverUrl: string | null;
}

function createDefaultScene(sceneId: SceneId): SceneVideoConfig {
  return {
    sceneId,
    sourceMode: 'text-to-video',
    sourceUrl: null,
    provider: 'kling-v3-pro',
    videoUrl: null,
    status: 'idle',
    error: null,
    prompt: null,
    textOverlay: null,
    logoPlacement: 'none',
    voiceoverText: null,
    voiceoverUrl: null,
  };
}

const DEFAULT_SCENES: SceneVideoConfig[] = [
  createDefaultScene('hook'),
  createDefaultScene('body'),
  createDefaultScene('cta'),
];

export interface SelectedContextItem {
  sourceType: string;
  sourceId: string;
  title: string;
}

interface CanvasStoreState {
  // ─── Context (loaded from server) ─────────────────────────
  contextStack: CanvasContextStack | null;
  deliverableId: string | null;
  campaignId: string | null;
  contentType: string | null;

  // ─── Variants — Map<group, VariantData[]> ─────────────────
  variantGroups: Map<string, CanvasVariant[]>;

  // ─── Selection — Map<group, selectedIndex> ────────────────
  selections: Map<string, number>;

  // ─── Generation status — Map<group, status> ───────────────
  generationStatus: Map<string, GenerationStatus>;
  globalStatus: GenerationStatus;
  globalErrorMessage: string | null;

  // ─── Image variants ───────────────────────────────────────
  imageVariants: CanvasImageVariant[];

  // ─── Scene-scoped image variants (video-script types) ─────
  // 2026-05-19 Fase 1: per-scene visual sectie split. Voor video-script
  // types (linkedin-video-ad, tiktok-script, etc.) krijgt elke scene
  // (hook/body/cta) eigen imageVariants set. Workspace-level
  // imageVariants blijft voor non-scene flows.
  sceneImageVariants: Record<SceneId, CanvasImageVariant[]>;
  sceneHeroImage: Record<SceneId, { url: string; mediaAssetId: string | null; alt?: string } | null>;

  // 2026-05-19 Fase 2 fix — per-scene visual source (generate / library /
  // compose / trained / upload / url / stock / none). Without this each
  // scene's source-tab click wrote to the workspace `visualBrief.source`
  // and all three scene-blocks visually jumped together.
  sceneVisualSource: Partial<Record<SceneId, VisualBriefSource>>;

  // 2026-05-19 Fase 2 fix — per-scene manual overrides for the [VISUAL],
  // [B-ROLL] and [CAPTION] markers parsed out of the script content.
  // When set, the Scene Breakdown renders these instead of the parsed
  // marker text, and downstream video-gen uses them as the source-of-
  // truth for visual direction / motion-prompt / burned-in caption.
  // Stored only client-side for now; the variant.content text is left
  // untouched. B-ROLL was added 2026-05-19 follow-up — feeds image-to-
  // video motion-prompt so montage-feel survives single-keyframe gen.
  sceneOverrides: Partial<
    Record<SceneId, { visualText?: string; bRollText?: string; captionText?: string }>
  >;

  // ─── Visual generation lifecycle ──────────────────────────
  // Lifted from Step2ContentVariants local state so Step 1 can also
  // drive visual generation (Pad B, audit 2026-05-15) and Step 2
  // reflects the in-progress state regardless of who started it.
  visualGenerationStatus: 'idle' | 'generating' | 'error';
  visualGenerationError: string | null;

  // ─── Publish suggestion ───────────────────────────────────
  publishSuggestion: { suggestedDate: string; reasoning: string } | null;

  // ─── F-VAL fidelity score ─────────────────────────────────
  // Populated streaming via tell_check_complete (fast detector signal,
  // ~5ms after generation) en fidelity_score_complete (full pijler 1+2+3
  // composite, ~20s na generation door cross-family judge call).
  fidelityScore: {
    /** Streaming status — 'idle' until generation, 'computing' tijdens runner,
     *  'complete' na composite, 'skipped' bij silent failure (clears spinner) */
    stage: 'idle' | 'detector-only' | 'computing' | 'complete' | 'skipped';
    /** Reden waarom scoring werd overgeslagen (alleen bij stage === 'skipped') */
    skippedReason: string | null;
    /** Composite 0-100 — null tijdens detector-only fase */
    compositeScore: number | null;
    /** True wanneer composite >= compositeThreshold (default 75) */
    thresholdMet: boolean | null;
    compositeThreshold: number | null;
    /** Detector verdict — beschikbaar zodra tell_check_complete fired */
    detectorVerdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI' | null;
    /** 0-100 positie op mens↔AI schaal — drives position-bar pin */
    humanBaselinePosition: number | null;
    /** Per-pijler scores; null wanneer pijler geskipt (geen BrandPersonality of skipJudge) */
    pillars: { style: number | null; judge: number | null; rules: number | null } | null;
    /** Compute time in ms voor "computed in 22s" UI hint */
    elapsedMs: number | null;
  };
  // F9 fix (audit 2026-05-13): per-variant fidelity scores. Map van
  // variantIndex (0=Variant A, 1=Variant B) naar score-shape identiek aan
  // bovenstaande fidelityScore. UI leest score op basis van currently-selected
  // variant; fidelityScore boven blijft alias voor variant 0 (legacy compat).
  fidelityScoresByVariantIndex: Map<number, FidelityScoreState>;

  // ─── STRICT mode rewrite ──────────────────────────────────
  // Wordt gevuld wanneer FidelityConfig.humanVoiceMode === STRICT en het
  // origineel een AI_LEANING/PURE_AI verdict had. UI toont een "Auto-improved"
  // banner met before→after detector signaal. De finale fidelityScore wordt
  // automatisch overschreven bovenliggende state via setFidelityComplete
  // zodat de position-bar de improved waarde toont.
  strictRewrite: {
    stage: 'idle' | 'rewriting' | 'complete' | 'skipped';
    /** True wanneer rewrite actually een betere uitkomst opleverde */
    improved: boolean;
    /** Detector signaal vóór rewrite */
    before: { verdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI'; humanBaselinePosition: number } | null;
    /** Detector signaal na rewrite */
    after: { verdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI'; humanBaselinePosition: number } | null;
    decisionReason: string | null;
    /** Eerste ~1500 chars van rewrite — volledig staat op DB.settings.strictRewrite.text */
    rewritePreview: string | null;
  };

  // ── Auto-iterate state (content-test #6.B) ───────────────
  // Wordt gevuld via SSE auto_iterate_* events. Parallel aan strictRewrite
  // maar gedreven door BrandReviewFinding-feedback ipv anti-AI-tell.
  // Snapshot landt op Deliverable.settings.autoIterate (finalText etc).
  autoIterate: {
    stage: 'idle' | 'iterating' | 'complete' | 'skipped';
    /** True wanneer iteratie threshold haalde. */
    thresholdMet: boolean;
    /** 0 (skipped/disabled) tot maxIterations (2 default). */
    attemptsExecuted: number;
    /** Reden van afsluiten: success, exhaust, fail, disabled, already_passing. */
    stopReason: string | null;
    /** Score voor 1e iteratie. */
    initialScore: number | null;
    /** Best-of score na alle iteraties. */
    finalScore: number | null;
    /** Per-type threshold gehanteerd. */
    threshold: number | null;
    /** Welke hint-templates zijn toegepast (voor attribution display). */
    appliedTemplates: string[];
  };

  // ─── Brand-voice status (content-test improvement #1) ──
  // Wordt gevuld via SSE brand_voice_status event. Toont welk niveau brand
  // voice is toegepast op deze generatie — voiceguide / tone-only / language-
  // only / none. UI rendert fallback-banner wanneer isFallback = true.
  brandVoiceStatus: {
    level: 'voiceguide' | 'tone-only' | 'language-only' | 'none' | null;
    userMessage: string | null;
    isFallback: boolean;
  };

  // ─── Iteration-nudges (content-test improvement #8) ──
  // Wordt gevuld via complete event payload. UI rendert ze als chips na
  // generation om user een directe vervolgactie aan te bieden.
  iterationNudges: Array<{
    id: string;
    label: string;
    intent: string;
    targetContentTypeId?: string;
  }>;

  // ─── Pending auto-generate (post-derive flow) ──────────────
  // Set door GenerationFeedbackBanners derive-handler met de nieuwe
  // deliverableId. CanvasPage useEffect checkt op mount: wanneer
  // pendingAutoGenerate === deliverableId, kicked het automatisch
  // generation af. Flag wordt direct cleared om dubbele runs te
  // voorkomen. Audit 2026-05-13 fix voor "derive opent maar genereert niet".
  pendingAutoGenerate: string | null;

  // ─── Vanille baseline (demo: "Vergelijk met vanille AI") ──
  // Wordt gevuld via de POST /api/studio/[id]/vanilla-baseline SSE flow.
  // null tot user op "Vergelijk met ChatGPT" klikt; daarna stage-aware
  // states zoals fidelityScore. Bewaard apart zodat UI beide naast elkaar
  // kan tonen zonder dat een vanilla run de Branddock score overschrijft.
  vanillaBaseline: {
    stage: 'idle' | 'generating' | 'scoring' | 'complete' | 'error';
    /** Eerste 800 chars van vanille output — voor side-by-side preview */
    preview: string | null;
    /** Word count voor UI */
    wordCount: number | null;
    /** Composite 0-100 — null tot scoring complete */
    compositeScore: number | null;
    detectorVerdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI' | null;
    humanBaselinePosition: number | null;
    pillars: { style: number | null; judge: number | null; rules: number | null } | null;
    /** Vanille model used (gpt-4o) */
    model: string | null;
    /** Foutmelding bij stage === 'error' */
    errorMessage: string | null;
  };

  // ─── G8 Visual fidelity scores per image component ────────
  // Per-componentId score state. Populated streaming via
  // visual_fidelity_running (componentIds known) and
  // visual_fidelity_complete (results). Cleared on regenerate.
  // Detail fields (colorAlignment, aiJudgeDimensions) only populated
  // via the GET /components hydrate path; the SSE flow only carries
  // the summary (composite/threshold/skipped/error).
  visualFidelityScores: Map<
    string,
    {
      stage: 'idle' | 'computing' | 'complete' | 'skipped';
      compositeScore: number | null;
      thresholdMet: boolean;
      judgeSkipped: boolean;
      errorMessage: string | null;
      colorAlignment: import('../api/canvas.api').VisualColorAlignmentDetail | null;
      aiJudgeDimensions:
        | import('../api/canvas.api').VisualJudgeDetail
        | { skipped: true }
        | null;
    }
  >;

  // ─── Additional knowledge context ────────────────────────
  additionalContextItems: Map<string, SelectedContextItem>;
  contextSelectorOpen: boolean;

  // ─── Feedback ─────────────────────────────────────────────
  feedbackDraft: string;
  feedbackGroup: string | null;

  // ─── Approval ───────────────────────────────────────────
  approvalStatus: ApprovalStatus;
  approvalNote: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  /** Channel platform the publish was distributed through (e.g. "linkedin").
   * null = manual / local-only publish. */
  publishedVia: string | null;

  // ─── Accordion navigation ─────────────────────────────────
  activeStep: string;
  completedSteps: Set<string>;
  stepSummaries: Map<string, StepSummaryData>;

  // ─── Inheritance banner ────────────────────────────────────
  // Non-null when the current deliverable had its settings auto-inherited
  // from a previous completed deliverable of the same type in the same
  // campaign. Shown as a dismissible banner on top of the Canvas.
  inheritedFrom: { id: string; title: string } | null;

  // ─── Step 3: medium generation ────────────────────────────
  mediumGenerationStatus: 'idle' | 'generating' | 'complete' | 'error';
  generatedMediumUrl: string | null;
  mediumApproved: boolean;

  // ─── Step 3: hero image (selected via InsertImageModal) ───
  heroImage: { url: string; mediaAssetId: string | null; alt?: string } | null;
  insertImageModalOpen: boolean;

  // ─── Step 3: medium configuration ──────────────────────────
  mediumCategory: MediumCategory | null;
  mediumConfigValues: Record<string, unknown>;
  mediumVariants: MediumVariant[];
  selectedMediumVariantId: 'A' | 'B' | 'C';
  variantsGenerated: boolean;

  // ─── Content-type-specific inputs ─────────────────────────
  contentTypeInputs: Record<string, string | string[] | number | boolean>;
  contentTypeInputsModified: boolean;

  // ─── Briefing (settings.brief) ────────────────────────────
  // Surfaces in Step 1 as the "Briefing" section. Hydrated from the
  // contextStack on mount and from `create_deliverable` (Claw) when a
  // briefing was passed at creation time. Edits debounce-save via PATCH.
  brief: {
    objective: string;
    keyMessage: string;
    toneDirection: string;
    callToAction: string;
  };
  briefModified: boolean;

  // ─── Visual Brief (settings.visualBrief) ──────────────────
  // Strategic visual direction picked in Step 1. Source decides which
  // pipeline runs at generate-time (generate / library / compose /
  // trained-style); styleDirection feeds into both text and image prompts
  // via the rich mapping in canvas-orchestrator. Phase 1 wires the
  // `generate` source end-to-end; library/compose/trained come later.
  visualBrief: VisualBrief;
  visualBriefModified: boolean;

  // ─── SEO Pipeline ────────────────────────────────────────
  seoInput: { primaryKeyword: string; funnelStage: 'awareness' | 'consideration' | 'decision'; competitorUrls: string[] };
  seoSteps: Array<{ step: number; name: string; label: string; status: 'pending' | 'running' | 'complete' | 'error'; preview: string | null }>;
  seoCurrentStep: number | null;

  // ─── Scene-based Video Builder ───────────────────────────
  sceneVideos: SceneVideoConfig[];
  composedVideoUrl: string | null;
  composedVideoStatus: 'idle' | 'composing' | 'complete' | 'error';
  composedVideoError: string | null;
  videoProviderConfig: { provider: string; duration: number; aspectRatio: string };

  // ─── Step 4: scheduling ───────────────────────────────────
  scheduledDate: string | null;
  scheduledTime: string | null;
  isTimeBound: boolean;

  // ─── Actions ──────────────────────────────────────────────
  setContextStack: (stack: CanvasContextStack) => void;
  setDeliverable: (id: string, type: string, campaignId?: string) => void;
  addVariantGroup: (group: string, variants: CanvasVariant[]) => void;
  setSelection: (group: string, index: number) => void;
  setGenerationStatus: (group: string, status: GenerationStatus) => void;
  setGlobalStatus: (status: GenerationStatus, errorMessage?: string) => void;
  setImageVariants: (variants: CanvasImageVariant[]) => void;

  // ─── Scene-scoped image setters (video-script types) ──────
  setSceneImageVariants: (sceneId: SceneId, variants: CanvasImageVariant[]) => void;
  setSceneHeroImage: (sceneId: SceneId, image: { url: string; mediaAssetId: string | null; alt?: string } | null) => void;
  setSceneVisualSource: (sceneId: SceneId, source: VisualBriefSource) => void;
  setSceneVisualOverride: (
    sceneId: SceneId,
    patch: { visualText?: string; bRollText?: string; captionText?: string },
  ) => void;
  setVisualGenerationStatus: (
    status: 'idle' | 'generating' | 'error',
    errorMessage?: string | null,
  ) => void;
  setPublishSuggestion: (suggestion: { suggestedDate: string; reasoning: string } | null) => void;
  setFidelityDetector: (data: { verdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI'; humanBaselinePosition: number }) => void;
  setFidelityComputing: () => void;
  setFidelityComplete: (data: {
    compositeScore: number;
    thresholdMet: boolean;
    compositeThreshold: number;
    detectorVerdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI';
    humanBaselinePosition: number;
    pillars: { style: number | null; judge: number | null; rules: number | null };
    elapsedMs: number;
  }) => void;
  resetFidelityScore: () => void;
  setFidelityScoreSkipped: (reason: string) => void;
  // F9: per-variant setters. variantIndex 0 wordt ook gespiegeld naar de
  // legacy fidelityScore-state zodat bestaande UI niets hoeft te weten van
  // de map (backwards-compat).
  setFidelityRunningForVariant: (variantIndex: number) => void;
  setFidelityCompleteForVariant: (variantIndex: number, data: {
    compositeScore: number;
    thresholdMet: boolean;
    compositeThreshold: number;
    detectorVerdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI';
    humanBaselinePosition: number;
    pillars: { style: number | null; judge: number | null; rules: number | null };
    elapsedMs: number;
  }) => void;
  setFidelityScoreSkippedForVariant: (variantIndex: number, reason: string) => void;
  setDetectorOnlyForVariant: (variantIndex: number, data: {
    verdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI';
    humanBaselinePosition: number;
  }) => void;
  setStrictRewriteRunning: () => void;
  setStrictRewriteComplete: (data: {
    improved: boolean;
    decisionReason: string;
    before: { verdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI'; humanBaselinePosition: number };
    after: { verdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI'; humanBaselinePosition: number };
    rewritePreview: string | null;
  }) => void;
  resetStrictRewrite: () => void;
  setAutoIterateStarted: (data: {
    initialScore: number;
    threshold: number;
    appliedTemplates?: string[];
  }) => void;
  setAutoIterateIterationComplete: (data: {
    attempt: number;
    newScore: number;
    appliedTemplates?: string[];
  }) => void;
  setAutoIterateComplete: (data: {
    attemptsExecuted: number;
    finalScore: number;
    thresholdMet: boolean;
    stopReason: string;
  }) => void;
  resetAutoIterate: () => void;
  setBrandVoiceStatus: (data: {
    level: 'voiceguide' | 'tone-only' | 'language-only' | 'none';
    userMessage: string;
    isFallback: boolean;
  }) => void;
  resetBrandVoiceStatus: () => void;
  setPendingAutoGenerate: (deliverableId: string | null) => void;
  setIterationNudges: (
    nudges: Array<{
      id: string;
      label: string;
      intent: string;
      targetContentTypeId?: string;
    }>,
  ) => void;
  resetIterationNudges: () => void;
  setVanillaStage: (stage: 'idle' | 'generating' | 'scoring' | 'complete' | 'error', errorMessage?: string) => void;
  setVanillaTextComplete: (data: { preview: string; wordCount: number; model: string }) => void;
  setVanillaScoreComplete: (data: {
    compositeScore: number;
    detectorVerdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI';
    humanBaselinePosition: number;
    pillars: { style: number | null; judge: number | null; rules: number | null };
  }) => void;
  resetVanillaBaseline: () => void;
  // G8 visual fidelity setters
  setVisualFidelityRunning: (componentIds: string[]) => void;
  setVisualFidelityComplete: (
    results: Array<{
      componentId: string;
      compositeScore: number | null;
      thresholdMet: boolean;
      judgeSkipped: boolean;
      error?: string;
      colorAlignment?: import('../api/canvas.api').VisualColorAlignmentDetail | null;
      aiJudgeDimensions?:
        | import('../api/canvas.api').VisualJudgeDetail
        | { skipped: true }
        | null;
    }>,
  ) => void;
  resetVisualFidelity: () => void;
  setFeedbackDraft: (text: string) => void;
  setFeedbackGroup: (group: string | null) => void;
  toggleContextSelector: () => void;
  setAdditionalContextItems: (items: Map<string, SelectedContextItem>) => void;
  removeContextItem: (key: string) => void;
  setApprovalState: (data: {
    approvalStatus: ApprovalStatus;
    approvalNote?: string | null;
    approvedBy?: string | null;
    approvedAt?: string | null;
    publishedAt?: string | null;
    publishedVia?: string | null;
  }) => void;

  // ─── Accordion actions ────────────────────────────────────
  advanceToStep: (stepId: string) => void;
  goToStep: (stepId: string) => void;
  /** Set activeStep directly, bypassing the completion-guard in goToStep. Used for restoring from server-side state. */
  setActiveStep: (stepId: string) => void;
  /** Replace the completedSteps set. Used for restoring from server-side state. */
  setCompletedSteps: (stepIds: string[]) => void;
  /** Set inheritance info — usually called once when inheritance was applied. */
  setInheritedFrom: (info: { id: string; title: string } | null) => void;
  setStepSummary: (stepId: string, summary: StepSummaryData) => void;
  setMediumGenerationStatus: (status: 'idle' | 'generating' | 'complete' | 'error') => void;
  setGeneratedMediumUrl: (url: string | null) => void;
  setMediumApproved: (approved: boolean) => void;
  setHeroImage: (image: { url: string; mediaAssetId: string | null; alt?: string } | null) => void;
  setInsertImageModalOpen: (open: boolean) => void;
  setMediumCategory: (category: MediumCategory | null) => void;
  setMediumConfigValue: (key: string, value: unknown) => void;
  setMediumConfigValues: (values: Record<string, unknown>) => void;
  setMediumVariants: (variants: MediumVariant[]) => void;
  setSelectedMediumVariant: (id: 'A' | 'B' | 'C') => void;
  setVariantsGenerated: (generated: boolean) => void;
  setScheduledDate: (date: string | null) => void;
  setScheduledTime: (time: string | null) => void;
  setIsTimeBound: (timeBound: boolean) => void;
  setContentTypeInput: (key: string, value: string | string[] | number | boolean) => void;
  setContentTypeInputsBulk: (inputs: Record<string, string | string[] | number | boolean>) => void;

  /** Single-field briefing edit (autosaves via CanvasPage debounced PATCH). */
  setBriefField: (
    key: 'objective' | 'keyMessage' | 'toneDirection' | 'callToAction',
    value: string,
  ) => void;
  /** Bulk hydrate briefing — used by setContextStack on first mount; sets `briefModified: false`. */
  setBriefBulk: (
    brief: Partial<{
      objective: string;
      keyMessage: string;
      toneDirection: string;
      callToAction: string;
    }>,
  ) => void;

  /**
   * Clear all *Modified flags so the next setContextStack call re-hydrates
   * brief / contentTypeInputs / visualBrief from the server. Used after a
   * Claw mutation refresh — the server is now the source of truth.
   */
  resetModifiedFlags: () => void;

  /** Visual Brief actions — flips `visualBriefModified` so the autosave fires. */
  setVisualBriefSource: (source: VisualBriefSource) => void;
  setVisualBriefStyleDirection: (
    chip: VisualStyleDirection | null,
    freeText?: string | null,
  ) => void;
  setVisualBriefBriefingText: (text: string | null) => void;
  setVisualBriefField: <K extends 'generate' | 'library' | 'compose' | 'trained'>(
    key: K,
    value: VisualBrief[K],
  ) => void;

  // ─── SEO actions ─────────────────────────────────────────
  setSeoInput: (input: Partial<{ primaryKeyword: string; funnelStage: 'awareness' | 'consideration' | 'decision'; competitorUrls: string[] }>) => void;
  initSeoSteps: () => void;
  updateSeoStep: (step: number, update: { status: 'pending' | 'running' | 'complete' | 'error'; preview?: string | null }) => void;

  // ─── Scene Video actions ─────────────────────────────────
  updateScene: (sceneId: SceneId, update: Partial<SceneVideoConfig>) => void;
  setSceneVideoResult: (sceneId: SceneId, videoUrl: string, prompt: string) => void;
  setSceneError: (sceneId: SceneId, error: string) => void;
  setVideoProviderConfig: (config: Partial<{ provider: string; duration: number; aspectRatio: string }>) => void;
  setComposedVideo: (url: string) => void;
  setComposedVideoStatus: (status: 'idle' | 'composing' | 'complete' | 'error', error?: string) => void;
  resetSceneVideos: () => void;

  reset: () => void;
}

const INITIAL_STATE = {
  contextStack: null,
  deliverableId: null,
  campaignId: null,
  contentType: null,
  variantGroups: new Map<string, CanvasVariant[]>(),
  selections: new Map<string, number>(),
  generationStatus: new Map<string, GenerationStatus>(),
  globalStatus: 'idle' as GenerationStatus,
  globalErrorMessage: null as string | null,
  imageVariants: [],
  sceneImageVariants: { hook: [], body: [], cta: [] },
  sceneHeroImage: { hook: null, body: null, cta: null },
  sceneVisualSource: {},
  sceneOverrides: {},
  visualGenerationStatus: 'idle' as 'idle' | 'generating' | 'error',
  visualGenerationError: null as string | null,
  publishSuggestion: null,
  fidelityScore: {
    stage: 'idle' as const,
    skippedReason: null,
    compositeScore: null,
    thresholdMet: null,
    compositeThreshold: null,
    detectorVerdict: null,
    humanBaselinePosition: null,
    pillars: null,
    elapsedMs: null,
  },
  fidelityScoresByVariantIndex: new Map<number, FidelityScoreState>(),
  strictRewrite: {
    stage: 'idle' as const,
    improved: false,
    before: null,
    after: null,
    decisionReason: null,
    rewritePreview: null,
  },
  autoIterate: {
    stage: 'idle' as const,
    thresholdMet: false,
    attemptsExecuted: 0,
    stopReason: null,
    initialScore: null,
    finalScore: null,
    threshold: null,
    appliedTemplates: [] as string[],
  },
  brandVoiceStatus: {
    level: null,
    userMessage: null,
    isFallback: false,
  },
  iterationNudges: [] as Array<{
    id: string;
    label: string;
    intent: string;
    targetContentTypeId?: string;
  }>,
  pendingAutoGenerate: null as string | null,
  vanillaBaseline: {
    stage: 'idle' as const,
    preview: null,
    wordCount: null,
    compositeScore: null,
    detectorVerdict: null,
    humanBaselinePosition: null,
    pillars: null,
    model: null,
    errorMessage: null,
  },
  visualFidelityScores: new Map() as CanvasStoreState['visualFidelityScores'],
  additionalContextItems: new Map<string, SelectedContextItem>(),
  contextSelectorOpen: false,
  feedbackDraft: '',
  feedbackGroup: null,
  approvalStatus: 'DRAFT' as ApprovalStatus,
  approvalNote: null,
  approvedBy: null,
  approvedAt: null,
  publishedAt: null,
  publishedVia: null,

  // Accordion
  activeStep: 'context',
  completedSteps: new Set<string>(),
  stepSummaries: new Map<string, StepSummaryData>(),
  inheritedFrom: null,

  // Step 3
  mediumGenerationStatus: 'idle' as const,
  generatedMediumUrl: null,
  mediumApproved: false,
  mediumCategory: null,
  mediumConfigValues: {},
  mediumVariants: [],
  selectedMediumVariantId: 'B' as const,
  variantsGenerated: false,
  heroImage: null as { url: string; mediaAssetId: string | null; alt?: string } | null,
  insertImageModalOpen: false,

  // Step 4
  scheduledDate: null,
  scheduledTime: null,
  isTimeBound: false,

  // Content-type-specific inputs
  contentTypeInputs: {} as Record<string, string | string[] | number | boolean>,
  contentTypeInputsModified: false,

  brief: { objective: '', keyMessage: '', toneDirection: '', callToAction: '' },
  briefModified: false,

  // Visual Brief — defaults to "generate" source, no style chip picked.
  // The orchestrator runs unchanged when nothing is set (existing behavior).
  visualBrief: {
    source: 'generate' as VisualBriefSource,
    styleDirection: null,
    styleDirectionFreeText: null,
  } as VisualBrief,
  visualBriefModified: false,

  // SEO Pipeline
  seoInput: { primaryKeyword: '', funnelStage: 'awareness' as const, competitorUrls: [] as string[] },
  seoSteps: [] as Array<{ step: number; name: string; label: string; status: 'pending' | 'running' | 'complete' | 'error'; preview: string | null }>,
  seoCurrentStep: null as number | null,

  // Scene-based Video Builder
  sceneVideos: [...DEFAULT_SCENES] as SceneVideoConfig[],
  composedVideoUrl: null as string | null,
  composedVideoStatus: 'idle' as const,
  composedVideoError: null as string | null,
  videoProviderConfig: { provider: 'kling-v3-pro', duration: 6, aspectRatio: '9:16' },
};

export const useCanvasStore = create<CanvasStoreState>((set) => ({
  ...INITIAL_STATE,

  setContextStack: (stack) =>
    set((state) => {
      // Hydrate contentTypeInputs from the context stack on first load.
      // The wizard stored these in deliverable.settings and the /context
      // endpoint surfaces them on the stack — but the form reads them
      // from the top-level store field, not from contextStack. Sync them
      // here so users don't re-enter SEO keyword, meta description, etc.
      //
      // Only hydrate if the user hasn't already modified them locally
      // (modified flag guards against clobbering live edits).
      const hydratedInputs = stack.contentTypeInputs;
      const shouldHydrateInputs =
        !state.contentTypeInputsModified &&
        hydratedInputs &&
        Object.keys(hydratedInputs).length > 0;

      // Same pattern for the briefing — settings.brief flows through
      // assembleCanvasContext as `stack.brief`. When Claw creates a
      // deliverable with a brief (Path 2), this is what the user sees
      // pre-filled in the Briefing section of Step 1.
      const hydratedBrief = stack.brief;
      const shouldHydrateBrief =
        !state.briefModified &&
        hydratedBrief &&
        (hydratedBrief.objective ||
          hydratedBrief.keyMessage ||
          hydratedBrief.toneDirection ||
          hydratedBrief.callToAction);

      // Visual Brief hydration — assembleCanvasContext already migrates
      // legacy contentTypeInputs.visualStyle / visualDirection / contentStyle
      // into stack.visualBrief, so we just copy across when unmodified.
      const hydratedVisual = stack.visualBrief;
      const shouldHydrateVisual =
        !state.visualBriefModified && hydratedVisual != null;

      return {
        contextStack: stack,
        ...(shouldHydrateInputs ? { contentTypeInputs: hydratedInputs } : {}),
        ...(shouldHydrateBrief
          ? {
              brief: {
                objective: hydratedBrief?.objective ?? '',
                keyMessage: hydratedBrief?.keyMessage ?? '',
                toneDirection: hydratedBrief?.toneDirection ?? '',
                callToAction: hydratedBrief?.callToAction ?? '',
              },
            }
          : {}),
        ...(shouldHydrateVisual ? { visualBrief: hydratedVisual } : {}),
      };
    }),

  setDeliverable: (id, type, campaignId) =>
    set({ deliverableId: id, contentType: type, campaignId: campaignId ?? null }),

  addVariantGroup: (group, variants) =>
    set((state) => {
      const next = new Map(state.variantGroups);
      next.set(group, variants);
      // Auto-select first variant if no selection exists
      const nextSelections = new Map(state.selections);
      if (!nextSelections.has(group)) {
        nextSelections.set(group, 0);
      }
      return { variantGroups: next, selections: nextSelections };
    }),

  setSelection: (group, index) =>
    set((state) => {
      const next = new Map(state.selections);
      next.set(group, index);
      return { selections: next };
    }),

  setGenerationStatus: (group, status) =>
    set((state) => {
      const next = new Map(state.generationStatus);
      next.set(group, status);
      return { generationStatus: next };
    }),

  setGlobalStatus: (status, errorMessage) => set({ globalStatus: status, globalErrorMessage: errorMessage ?? (status === 'error' ? 'An unknown error occurred' : null) }),

  setImageVariants: (variants) => set({ imageVariants: variants }),

  setSceneImageVariants: (sceneId, variants) =>
    set((state) => ({
      sceneImageVariants: { ...state.sceneImageVariants, [sceneId]: variants },
    })),
  setSceneHeroImage: (sceneId, image) =>
    set((state) => ({
      sceneHeroImage: { ...state.sceneHeroImage, [sceneId]: image },
    })),
  setSceneVisualSource: (sceneId, source) =>
    set((state) => ({
      sceneVisualSource: { ...state.sceneVisualSource, [sceneId]: source },
    })),
  setSceneVisualOverride: (sceneId, patch) =>
    set((state) => ({
      sceneOverrides: {
        ...state.sceneOverrides,
        [sceneId]: { ...(state.sceneOverrides[sceneId] ?? {}), ...patch },
      },
    })),

  setVisualGenerationStatus: (status, errorMessage) =>
    set({
      visualGenerationStatus: status,
      visualGenerationError: errorMessage ?? null,
    }),

  setPublishSuggestion: (suggestion) => set({ publishSuggestion: suggestion }),

  setFidelityDetector: ({ verdict, humanBaselinePosition }) =>
    set((state) => ({
      fidelityScore: {
        ...state.fidelityScore,
        stage: state.fidelityScore.stage === 'complete' ? 'complete' : 'detector-only',
        detectorVerdict: verdict,
        humanBaselinePosition,
      },
    })),

  setFidelityComputing: () =>
    set((state) => ({
      fidelityScore: { ...state.fidelityScore, stage: 'computing' },
    })),

  setFidelityComplete: (data) =>
    set({
      fidelityScore: {
        stage: 'complete',
        skippedReason: null,
        compositeScore: data.compositeScore,
        thresholdMet: data.thresholdMet,
        compositeThreshold: data.compositeThreshold,
        detectorVerdict: data.detectorVerdict,
        humanBaselinePosition: data.humanBaselinePosition,
        pillars: data.pillars,
        elapsedMs: data.elapsedMs,
      },
    }),

  resetFidelityScore: () =>
    set({
      fidelityScore: {
        stage: 'idle',
        skippedReason: null,
        compositeScore: null,
        thresholdMet: null,
        compositeThreshold: null,
        detectorVerdict: null,
        humanBaselinePosition: null,
        pillars: null,
        elapsedMs: null,
      },
      fidelityScoresByVariantIndex: new Map<number, FidelityScoreState>(),
    }),

  setFidelityRunningForVariant: (variantIndex) =>
    set((state) => {
      const map = new Map(state.fidelityScoresByVariantIndex);
      const existing = map.get(variantIndex) ?? {
        stage: 'idle' as const,
        skippedReason: null,
        compositeScore: null,
        thresholdMet: null,
        compositeThreshold: null,
        detectorVerdict: null,
        humanBaselinePosition: null,
        pillars: null,
        elapsedMs: null,
      };
      map.set(variantIndex, { ...existing, stage: 'computing' });
      const next: Partial<CanvasStoreState> = {
        fidelityScoresByVariantIndex: map,
      };
      // Spiegel variant 0 naar legacy fidelityScore voor backwards-compat
      if (variantIndex === 0) {
        next.fidelityScore = { ...state.fidelityScore, stage: 'computing' };
      }
      return next as CanvasStoreState;
    }),

  setFidelityCompleteForVariant: (variantIndex, data) =>
    set((state) => {
      const map = new Map(state.fidelityScoresByVariantIndex);
      map.set(variantIndex, {
        stage: 'complete',
        skippedReason: null,
        compositeScore: data.compositeScore,
        thresholdMet: data.thresholdMet,
        compositeThreshold: data.compositeThreshold,
        detectorVerdict: data.detectorVerdict,
        humanBaselinePosition: data.humanBaselinePosition,
        pillars: data.pillars,
        elapsedMs: data.elapsedMs,
      });
      const next: Partial<CanvasStoreState> = {
        fidelityScoresByVariantIndex: map,
      };
      if (variantIndex === 0) {
        next.fidelityScore = {
          stage: 'complete',
          skippedReason: null,
          compositeScore: data.compositeScore,
          thresholdMet: data.thresholdMet,
          compositeThreshold: data.compositeThreshold,
          detectorVerdict: data.detectorVerdict,
          humanBaselinePosition: data.humanBaselinePosition,
          pillars: data.pillars,
          elapsedMs: data.elapsedMs,
        };
      }
      return next as CanvasStoreState;
    }),

  setFidelityScoreSkippedForVariant: (variantIndex, reason) =>
    set((state) => {
      const map = new Map(state.fidelityScoresByVariantIndex);
      const existing = map.get(variantIndex) ?? {
        stage: 'idle' as const,
        skippedReason: null,
        compositeScore: null,
        thresholdMet: null,
        compositeThreshold: null,
        detectorVerdict: null,
        humanBaselinePosition: null,
        pillars: null,
        elapsedMs: null,
      };
      map.set(variantIndex, { ...existing, stage: 'skipped', skippedReason: reason });
      const next: Partial<CanvasStoreState> = {
        fidelityScoresByVariantIndex: map,
      };
      if (variantIndex === 0) {
        next.fidelityScore = { ...state.fidelityScore, stage: 'skipped', skippedReason: reason };
      }
      return next as CanvasStoreState;
    }),

  setDetectorOnlyForVariant: (variantIndex, data) =>
    set((state) => {
      const map = new Map(state.fidelityScoresByVariantIndex);
      const existing = map.get(variantIndex) ?? {
        stage: 'idle' as const,
        skippedReason: null,
        compositeScore: null,
        thresholdMet: null,
        compositeThreshold: null,
        detectorVerdict: null,
        humanBaselinePosition: null,
        pillars: null,
        elapsedMs: null,
      };
      map.set(variantIndex, {
        ...existing,
        stage: 'detector-only',
        detectorVerdict: data.verdict,
        humanBaselinePosition: data.humanBaselinePosition,
      });
      const next: Partial<CanvasStoreState> = {
        fidelityScoresByVariantIndex: map,
      };
      if (variantIndex === 0) {
        next.fidelityScore = {
          ...state.fidelityScore,
          stage: 'detector-only',
          detectorVerdict: data.verdict,
          humanBaselinePosition: data.humanBaselinePosition,
        };
      }
      return next as CanvasStoreState;
    }),

  setFidelityScoreSkipped: (reason) =>
    set((state) => ({
      fidelityScore: {
        ...state.fidelityScore,
        // Detector signaal blijven tonen (verdict + position) als die er al was;
        // alleen composite stage flippen naar 'skipped' zodat spinner stopt.
        stage: 'skipped',
        skippedReason: reason,
      },
    })),

  setStrictRewriteRunning: () =>
    set((state) => ({
      strictRewrite: { ...state.strictRewrite, stage: 'rewriting' },
    })),

  setStrictRewriteComplete: ({ improved, decisionReason, before, after, rewritePreview }) =>
    set({
      strictRewrite: {
        stage: improved ? 'complete' : 'skipped',
        improved,
        before,
        after,
        decisionReason,
        rewritePreview,
      },
    }),

  resetStrictRewrite: () =>
    set({
      strictRewrite: {
        stage: 'idle',
        improved: false,
        before: null,
        after: null,
        decisionReason: null,
        rewritePreview: null,
      },
    }),

  setAutoIterateStarted: ({ initialScore, threshold, appliedTemplates }) =>
    set((state) => ({
      autoIterate: {
        ...state.autoIterate,
        stage: 'iterating',
        initialScore,
        threshold,
        appliedTemplates: appliedTemplates ?? state.autoIterate.appliedTemplates,
      },
    })),

  setAutoIterateIterationComplete: ({ attempt, newScore, appliedTemplates }) =>
    set((state) => {
      // F17 fix (audit 2026-05-13): track BEST score gedurende iteratie, niet
      // LATEST. Bij stagnerende iters kan newScore lager zijn dan eerdere; user
      // zou anders "verbeterd van 52 naar 50" zien tijdens iter 2 ondanks dat
      // iter 1 wel verbeterde naar 58. finalScore reflecteert nu de hoogste
      // bereikte waarde.
      const prevBest = state.autoIterate.finalScore ?? state.autoIterate.initialScore ?? 0;
      const newBest = Math.max(prevBest, newScore);
      return {
        autoIterate: {
          ...state.autoIterate,
          attemptsExecuted: attempt,
          finalScore: newBest,
          appliedTemplates: appliedTemplates
            ? Array.from(new Set([...state.autoIterate.appliedTemplates, ...appliedTemplates]))
            : state.autoIterate.appliedTemplates,
        },
      };
    }),

  setAutoIterateComplete: ({ attemptsExecuted, finalScore, thresholdMet, stopReason }) =>
    set((state) => ({
      autoIterate: {
        ...state.autoIterate,
        stage: stopReason === 'disabled' || stopReason === 'already_passing' ? 'skipped' : 'complete',
        attemptsExecuted,
        finalScore,
        thresholdMet,
        stopReason,
      },
    })),

  resetAutoIterate: () =>
    set({
      autoIterate: {
        stage: 'idle',
        thresholdMet: false,
        attemptsExecuted: 0,
        stopReason: null,
        initialScore: null,
        finalScore: null,
        threshold: null,
        appliedTemplates: [],
      },
    }),

  setBrandVoiceStatus: (data) =>
    set({
      brandVoiceStatus: {
        level: data.level,
        userMessage: data.userMessage,
        isFallback: data.isFallback,
      },
    }),

  resetBrandVoiceStatus: () =>
    set({
      brandVoiceStatus: { level: null, userMessage: null, isFallback: false },
    }),

  setPendingAutoGenerate: (deliverableId) =>
    set({ pendingAutoGenerate: deliverableId }),

  setIterationNudges: (nudges) => set({ iterationNudges: nudges }),

  resetIterationNudges: () => set({ iterationNudges: [] }),

  setVanillaStage: (stage, errorMessage) =>
    set((state) => ({
      vanillaBaseline: {
        ...state.vanillaBaseline,
        stage,
        errorMessage: stage === 'error' ? (errorMessage ?? 'Vanilla baseline failed') : null,
      },
    })),

  setVanillaTextComplete: ({ preview, wordCount, model }) =>
    set((state) => ({
      vanillaBaseline: {
        ...state.vanillaBaseline,
        stage: 'scoring',
        preview,
        wordCount,
        model,
      },
    })),

  setVanillaScoreComplete: (data) =>
    set((state) => ({
      vanillaBaseline: {
        ...state.vanillaBaseline,
        stage: 'complete',
        compositeScore: data.compositeScore,
        detectorVerdict: data.detectorVerdict,
        humanBaselinePosition: data.humanBaselinePosition,
        pillars: data.pillars,
      },
    })),

  resetVanillaBaseline: () =>
    set({
      vanillaBaseline: {
        stage: 'idle',
        preview: null,
        wordCount: null,
        compositeScore: null,
        detectorVerdict: null,
        humanBaselinePosition: null,
        pillars: null,
        model: null,
        errorMessage: null,
      },
    }),

  setVisualFidelityRunning: (componentIds) =>
    set((state) => {
      const next = new Map(state.visualFidelityScores);
      for (const id of componentIds) {
        next.set(id, {
          stage: 'computing',
          compositeScore: null,
          thresholdMet: false,
          judgeSkipped: false,
          errorMessage: null,
          colorAlignment: null,
          aiJudgeDimensions: null,
        });
      }
      return { visualFidelityScores: next };
    }),

  setVisualFidelityComplete: (results) =>
    set((state) => {
      const next = new Map(state.visualFidelityScores);
      for (const r of results) {
        const failed = r.compositeScore === null;
        next.set(r.componentId, {
          stage: failed ? 'skipped' : 'complete',
          compositeScore: r.compositeScore,
          thresholdMet: r.thresholdMet,
          judgeSkipped: r.judgeSkipped,
          errorMessage: r.error ?? null,
          colorAlignment: r.colorAlignment ?? null,
          aiJudgeDimensions: r.aiJudgeDimensions ?? null,
        });
      }
      return { visualFidelityScores: next };
    }),

  resetVisualFidelity: () =>
    set({ visualFidelityScores: new Map() as CanvasStoreState['visualFidelityScores'] }),

  setFeedbackDraft: (text) => set({ feedbackDraft: text }),

  setFeedbackGroup: (group) => set({ feedbackGroup: group }),

  toggleContextSelector: () =>
    set((state) => ({ contextSelectorOpen: !state.contextSelectorOpen })),

  setAdditionalContextItems: (items) => set({ additionalContextItems: items }),

  removeContextItem: (key) =>
    set((state) => {
      const next = new Map(state.additionalContextItems);
      next.delete(key);
      return { additionalContextItems: next };
    }),

  setApprovalState: (data) =>
    set({
      approvalStatus: data.approvalStatus,
      approvalNote: data.approvalNote ?? null,
      approvedBy: data.approvedBy ?? null,
      approvedAt: data.approvedAt ?? null,
      publishedAt: data.publishedAt ?? null,
      publishedVia: data.publishedVia ?? null,
    }),

  // ─── Accordion actions ────────────────────────────────────

  advanceToStep: (stepId) =>
    set((state) => {
      const nextCompleted = new Set(state.completedSteps);
      // Mark current step as completed before advancing
      nextCompleted.add(state.activeStep);
      return { activeStep: stepId, completedSteps: nextCompleted };
    }),

  goToStep: (stepId) =>
    set((state) => {
      // Only allow navigating to completed steps or current active
      if (state.completedSteps.has(stepId) || stepId === state.activeStep) {
        const nextCompleted = new Set(state.completedSteps);
        if (stepId !== state.activeStep) {
          nextCompleted.add(state.activeStep);
        }
        return { activeStep: stepId, completedSteps: nextCompleted };
      }
      return {};
    }),

  setActiveStep: (stepId) => set({ activeStep: stepId }),

  setCompletedSteps: (stepIds) => set({ completedSteps: new Set(stepIds) }),
  setInheritedFrom: (info) => set({ inheritedFrom: info }),

  setStepSummary: (stepId, summary) =>
    set((state) => {
      const next = new Map(state.stepSummaries);
      next.set(stepId, summary);
      return { stepSummaries: next };
    }),

  setMediumGenerationStatus: (status) => set({ mediumGenerationStatus: status }),
  setGeneratedMediumUrl: (url) => set({ generatedMediumUrl: url }),
  setMediumApproved: (approved) => set({ mediumApproved: approved }),
  setHeroImage: (heroImage) => set({ heroImage }),
  setInsertImageModalOpen: (insertImageModalOpen) => set({ insertImageModalOpen }),
  setMediumCategory: (category) => set({ mediumCategory: category }),
  setMediumConfigValue: (key, value) =>
    set((state) => ({
      mediumConfigValues: { ...state.mediumConfigValues, [key]: value },
    })),
  setMediumConfigValues: (values) => set({ mediumConfigValues: values }),
  setMediumVariants: (variants) => set({ mediumVariants: variants }),
  setSelectedMediumVariant: (id) => set({ selectedMediumVariantId: id }),
  setVariantsGenerated: (generated) => set({ variantsGenerated: generated }),
  setScheduledDate: (date) => set({ scheduledDate: date }),
  setScheduledTime: (time) => set({ scheduledTime: time }),
  setIsTimeBound: (timeBound) => set({ isTimeBound: timeBound }),

  setContentTypeInput: (key, value) =>
    set((state) => ({
      contentTypeInputs: { ...state.contentTypeInputs, [key]: value },
      contentTypeInputsModified: true,
    })),

  setContentTypeInputsBulk: (inputs) =>
    set({ contentTypeInputs: inputs, contentTypeInputsModified: false }),

  setBriefField: (key, value) =>
    set((state) => ({
      brief: { ...state.brief, [key]: value },
      briefModified: true,
    })),

  setBriefBulk: (brief) =>
    set((state) => ({
      brief: {
        objective: brief.objective ?? state.brief.objective,
        keyMessage: brief.keyMessage ?? state.brief.keyMessage,
        toneDirection: brief.toneDirection ?? state.brief.toneDirection,
        callToAction: brief.callToAction ?? state.brief.callToAction,
      },
      briefModified: false,
    })),

  resetModifiedFlags: () =>
    set({
      briefModified: false,
      contentTypeInputsModified: false,
      visualBriefModified: false,
    }),

  setVisualBriefSource: (source) =>
    set((state) => ({
      visualBrief: { ...state.visualBrief, source },
      visualBriefModified: true,
    })),

  setVisualBriefStyleDirection: (chip, freeText) =>
    set((state) => ({
      visualBrief: {
        ...state.visualBrief,
        styleDirection: chip,
        // Keep free text in sync — clearing the chip clears free text only
        // when the caller passed an explicit override.
        styleDirectionFreeText:
          freeText !== undefined ? freeText : state.visualBrief.styleDirectionFreeText,
      },
      visualBriefModified: true,
    })),

  setVisualBriefBriefingText: (text) =>
    set((state) => ({
      visualBrief: { ...state.visualBrief, briefingText: text },
      visualBriefModified: true,
    })),

  setVisualBriefField: (key, value) =>
    set((state) => ({
      visualBrief: { ...state.visualBrief, [key]: value },
      visualBriefModified: true,
    })),

  setSeoInput: (input) =>
    set((state) => ({ seoInput: { ...state.seoInput, ...input } })),

  initSeoSteps: () => {
    set({
      seoSteps: [
        { step: 1, name: 'project_briefing', label: 'Project Briefing', status: 'pending' as const, preview: null },
        { step: 2, name: 'keyword_research', label: 'Keyword Research', status: 'pending' as const, preview: null },
        { step: 3, name: 'competitor_analysis', label: 'Competitor Analysis', status: 'pending' as const, preview: null },
        { step: 4, name: 'serp_gaps_eeat', label: 'SERP Gaps & E-E-A-T', status: 'pending' as const, preview: null },
        { step: 5, name: 'outline_structure', label: 'Outline & Internal Links', status: 'pending' as const, preview: null },
        { step: 6, name: 'first_draft', label: 'First Draft', status: 'pending' as const, preview: null },
        { step: 7, name: 'editorial_review', label: 'Editorial Review', status: 'pending' as const, preview: null },
        { step: 8, name: 'publication_prep', label: 'Publication Prep', status: 'pending' as const, preview: null },
      ],
      seoCurrentStep: null,
    });
  },

  updateSeoStep: (step, update) =>
    set((state) => ({
      seoSteps: state.seoSteps.map((s) =>
        s.step === step ? { ...s, ...update, preview: update.preview ?? s.preview } : s,
      ),
      seoCurrentStep: update.status === 'running' ? step : state.seoCurrentStep,
    })),

  // ─── Scene Video actions ─────────────────────────────────
  updateScene: (sceneId, update) =>
    set((state) => ({
      sceneVideos: state.sceneVideos.map((s) =>
        s.sceneId === sceneId ? { ...s, ...update } : s,
      ),
    })),
  setSceneVideoResult: (sceneId, videoUrl, prompt) =>
    set((state) => ({
      sceneVideos: state.sceneVideos.map((s) =>
        s.sceneId === sceneId ? { ...s, status: 'complete' as const, videoUrl, prompt, error: null } : s,
      ),
    })),
  setSceneError: (sceneId, error) =>
    set((state) => ({
      sceneVideos: state.sceneVideos.map((s) =>
        s.sceneId === sceneId ? { ...s, status: 'error' as const, error } : s,
      ),
    })),
  setVideoProviderConfig: (config) =>
    set((state) => ({ videoProviderConfig: { ...state.videoProviderConfig, ...config } })),
  setComposedVideo: (url) =>
    set({ composedVideoUrl: url, composedVideoStatus: 'complete' as const, composedVideoError: null }),
  setComposedVideoStatus: (status, error) =>
    set({ composedVideoStatus: status, composedVideoError: error ?? null }),
  resetSceneVideos: () =>
    set({ sceneVideos: [...DEFAULT_SCENES], composedVideoUrl: null, composedVideoStatus: 'idle' as const, composedVideoError: null }),

  reset: () => set({
    ...INITIAL_STATE,
    // Create fresh instances on reset
    variantGroups: new Map(),
    selections: new Map(),
    generationStatus: new Map(),
    additionalContextItems: new Map(),
    completedSteps: new Set(),
    stepSummaries: new Map(),
    // Reset SEO state
    seoInput: { primaryKeyword: '', funnelStage: 'awareness' as const, competitorUrls: [] },
    seoSteps: [],
    seoCurrentStep: null,
  }),
}));

import type {
  CanvasComponentResponse,
  ApprovalResponse,
  ApprovalStatus,
  PublishResponse,
  DeriveResponse,
} from '../types/canvas.types';

/** Persisted fidelity score snapshot shape (uit Deliverable.settings.fidelityScore). */
export interface PersistedFidelityScore {
  compositeScore: number;
  thresholdMet: boolean;
  compositeThreshold: number;
  detectorVerdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI';
  humanBaselinePosition: number;
  pillars: Record<string, unknown>;
  wordCount?: number;
  scorerVersion?: string;
  scoredAt?: string;
}

/** Persisted STRICT rewrite snapshot (uit Deliverable.settings.strictRewrite). */
export interface PersistedStrictRewrite {
  text: string;
  decisionReason?: string;
  rewriteAttempted?: boolean;
  before?: { verdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI'; humanBaselinePosition: number };
  after?: { verdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI'; humanBaselinePosition: number };
  rewrittenAt?: string;
}

/** One color match between a generated swatch and the brand palette,
 *  produced by visual-color-alignment.ts. */
export interface VisualColorMatchDetail {
  generatedHex: string;
  generatedPopulation: number;
  brandHex: string | null;
  brandCategory: string | null;
  deltaE: number;
  matchQuality: 'exact' | 'close' | 'acceptable' | 'noticeable' | 'different';
}

export interface VisualColorAlignmentDetail {
  score: number;
  matches: VisualColorMatchDetail[];
  matchedBrandHexes: string[];
  unmatchedColors: { hex: string; population: number }[];
}

/** Per-dimension AI judge score from visual-ai-judge.ts. */
export interface VisualJudgeDimensionDetail {
  score: number;
  rationale: string;
}

export interface VisualOcrDetail {
  text: string;
  blockCount: number;
  confidence: number | null;
  source: "google-vision";
  /** 0-100 deduction applied to text-in-image dimension. */
  penalty: number;
}

export interface VisualJudgeDetail {
  composite: number;
  flagged: string[];
  dimensions: Record<string, VisualJudgeDimensionDetail>;
  /** Pattern E image-quality-chain: optional OCR enrichment. */
  ocr?: VisualOcrDetail | null;
}

export interface PersistedVisualFidelityScore {
  componentId: string;
  compositeScore: number;
  thresholdMet: boolean;
  judgeSkipped: boolean;
  /** Full color-alignment detail for the expanded view. */
  colorAlignment: VisualColorAlignmentDetail | null;
  /** Full AI-judge detail. `null` or `{ skipped: true }` when judge was skipped. */
  aiJudgeDimensions: VisualJudgeDetail | { skipped: true } | null;
}

export interface FetchCanvasComponentsResult {
  components: CanvasComponentResponse[];
  /** Creative angle labels — geïndexeerd op variantIndex.
   *  Leeg array bij legacy 1-call generations. */
  variantAngles: string[];
  /** Persisted fidelity score uit settings — hydrate bar bij page refresh */
  fidelityScore: PersistedFidelityScore | null;
  /** Persisted STRICT rewrite snapshot — hydrate STRICT badge bij refresh */
  strictRewrite: PersistedStrictRewrite | null;
  /** G8 — most recent visual fidelity score per image component for badge hydration. */
  visualFidelityScores: PersistedVisualFidelityScore[];
}

/** Fetch all DeliverableComponent records for a deliverable + creative angle labels + persisted fidelity */
export async function fetchCanvasComponents(deliverableId: string): Promise<FetchCanvasComponentsResult> {
  const res = await fetch(`/api/studio/${deliverableId}/components`);
  if (!res.ok) throw new Error('Failed to fetch canvas components');
  const data = await res.json();
  return {
    components: data.components ?? [],
    variantAngles: Array.isArray(data.variantAngles) ? data.variantAngles : [],
    fidelityScore: data.fidelityScore ?? null,
    strictRewrite: data.strictRewrite ?? null,
    visualFidelityScores: Array.isArray(data.visualFidelityScores) ? data.visualFidelityScores : [],
  };
}

/** Select a variant — sets isSelected=true and deselects siblings */
export async function selectVariant(deliverableId: string, componentId: string): Promise<void> {
  const res = await fetch(`/api/studio/${deliverableId}/components/${componentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isSelected: true }),
  });
  if (!res.ok) throw new Error('Failed to select variant');
}

/** Update a component's generated content (inline editing) */
export async function updateComponentContent(
  deliverableId: string,
  componentId: string,
  content: string,
): Promise<void> {
  const res = await fetch(`/api/studio/${deliverableId}/components/${componentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ generatedContent: content }),
  });
  if (!res.ok) throw new Error('Failed to update component content');
}

/**
 * Set or replace the hero image of a deliverable. Upserts a single
 * DeliverableComponent row with variantGroup='hero-image'.
 */
export async function setHeroImage(
  deliverableId: string,
  body: {
    imageUrl: string;
    imageSource?: 'library' | 'url-import' | 'stock' | 'ai-generated' | 'upload';
    mediaAssetId?: string | null;
    alt?: string | null;
  },
): Promise<void> {
  const res = await fetch(`/api/studio/${deliverableId}/hero-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // Surface de echte API-response (status + body details) i.p.v. een
    // generieke 'Failed to save hero image' — anders kan de user nooit
    // achterhalen of het auth, validation, of een server-fout was.
    let detail = '';
    try {
      const payload = await res.json();
      if (payload?.error) detail = String(payload.error);
      if (payload?.details) {
        detail += ` — ${JSON.stringify(payload.details).slice(0, 300)}`;
      }
    } catch {
      // body niet leesbaar als json — gebruik raw text als fallback
      try {
        detail = (await res.text()).slice(0, 300);
      } catch {
        // ignore
      }
    }
    throw new Error(
      `Failed to save hero image (HTTP ${res.status}${detail ? ': ' + detail : ''})`,
    );
  }
}

/** Remove the hero image of a deliverable. */
export async function clearHeroImage(deliverableId: string): Promise<void> {
  const res = await fetch(`/api/studio/${deliverableId}/hero-image`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to clear hero image');
}

/** Update approval status for a deliverable */
export async function updateApprovalStatus(
  deliverableId: string,
  status: ApprovalStatus,
  note?: string,
): Promise<ApprovalResponse> {
  const res = await fetch(`/api/studio/${deliverableId}/approval`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, note }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update approval status' }));
    throw new Error(err.error ?? 'Failed to update approval status');
  }
  return res.json();
}

/** Publish an approved deliverable */
export async function publishDeliverable(
  deliverableId: string,
  scheduledPublishDate?: string,
): Promise<PublishResponse> {
  const res = await fetch(`/api/studio/${deliverableId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scheduledPublishDate }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to publish' }));
    throw new Error(err.error ?? 'Failed to publish');
  }
  return res.json();
}

/** Transform selected text using an AI action */
export async function inlineTransform(
  deliverableId: string,
  selectedText: string,
  action: 'shorter' | 'urgent' | 'brand_voice' | 'simplify',
  fullContent?: string,
): Promise<{ transformedText: string }> {
  const res = await fetch(`/api/studio/${deliverableId}/inline-transform`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedText, action, fullContent }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to transform text' }));
    throw new Error(err.error ?? 'Failed to transform text');
  }
  return res.json();
}

export interface GenerateVisualResponse {
  variants: Array<{ id: string; url: string; prompt: string }>;
  provider: string;
  model: string;
  generationDuration: number;
  aspectRatio: string;
  /** Echoed back when the request scoped to a scene — lets the client
   *  route freshly generated variants to scene state (Fase 1 of the
   *  scene-visual-split). */
  sceneId?: 'hook' | 'body' | 'cta';
}

/**
 * Trigger image generation from the Visual Brief — fires the chip's
 * composition rule + brand visual identity at Imagen 4 (default provider
 * for Phase 1). Returns 1-3 fresh image variants and replaces any existing
 * visual-group components on the deliverable.
 */
export async function generateCanvasVisual(
  deliverableId: string,
  options?: {
    instruction?: string;
    aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
    count?: number;
    /** Scope visual to a scene (hook/body/cta) for video-script types.
     *  Server persists DeliverableComponent.variantGroup as
     *  `visual:<sceneId>` — hydration on the client reads scene-scoped
     *  image variants instead of the workspace-level visual. */
    sceneId?: 'hook' | 'body' | 'cta';
    /** Scene-specific visual direction. Sent when `sceneId` is set so the
     *  server uses this as the image-prompt subject-seed instead of the
     *  workspace-level brief. Resolution: client prefers user edits in
     *  `sceneOverrides[sceneId].visualText`, falls back to the parsed
     *  `[VISUAL: …]` segment from the scene's script content. */
    sceneVisualPrompt?: string;
    /** 'hero': de route bust de eerste URL atomisch server-side in de LP-puckData
     *  (BrandHero) + structuredVariant → betrouwbare header-image zonder client-race. */
    target?: 'hero';
  },
): Promise<GenerateVisualResponse> {
  const res = await fetch(`/api/studio/${deliverableId}/generate-visual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options ?? {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to generate visual' }));
    throw new Error(err.error ?? 'Failed to generate visual');
  }
  return res.json();
}

/**
 * P2 — genereer AI-feature-beelden (max 4) voor de feature-cards van een
 * landing-page. Eén beeld per prompt; returnt stabiele storage-URLs in dezelfde
 * volgorde (null bij falen per index). Raakt de hero-picker NIET aan.
 */
export async function generateFeatureVisuals(
  deliverableId: string,
  prompts: string[],
): Promise<Array<string | null>> {
  const res = await fetch(`/api/studio/${deliverableId}/generate-feature-visuals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompts }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to generate feature visuals' }));
    throw new Error(err.error ?? 'Failed to generate feature visuals');
  }
  const data = (await res.json()) as { urls: Array<string | null> };
  return data.urls ?? [];
}

export interface SelectLibraryVisualResponse {
  variants: Array<{ id: string; url: string; prompt: string }>;
  source: 'library';
}

/**
 * Pick 1-3 existing MediaAssets from the workspace library as the
 * deliverable's image variants. Used when Visual Brief source = 'library'.
 * Replaces any existing visual-group components.
 */
export async function selectCanvasVisualFromLibrary(
  deliverableId: string,
  assetIds: string[],
): Promise<SelectLibraryVisualResponse> {
  const res = await fetch(`/api/studio/${deliverableId}/select-library-visual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to select library visuals' }));
    throw new Error(err.error ?? 'Failed to select library visuals');
  }
  return res.json();
}

export interface GenerateTrainedVisualResponse {
  variants: Array<{ id: string; url: string; prompt: string }>;
  provider: 'fal';
  model: string;
  source: 'trained-style';
  modelId: string;
  modelName: string;
  aspectRatio: string;
  generationDuration: number;
}

/**
 * Trigger image generation using one of the workspace's trained
 * ConsistentModels (LoRA fine-tunes). The model + strength come from
 * settings.visualBrief.trained — the endpoint reads them server-side.
 * Replaces any existing visual-group components.
 */
export async function generateCanvasVisualTrained(
  deliverableId: string,
  options?: { instruction?: string; aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'; count?: number; target?: 'hero' },
): Promise<GenerateTrainedVisualResponse> {
  const res = await fetch(`/api/studio/${deliverableId}/generate-visual-trained`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options ?? {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to generate trained visual' }));
    throw new Error(err.error ?? 'Failed to generate trained visual');
  }
  return res.json();
}

export interface GenerateComposeVisualResponse {
  variants: Array<{ id: string; url: string; prompt: string }>;
  provider: 'fal';
  model: string;
  source: 'compose';
  referenceCount: number;
  aspectRatio: string;
  generationDuration: number;
}

/**
 * Trigger image generation by composing 2-9 reference MediaAssets with
 * a natural-language instruction. References + instruction come from
 * settings.visualBrief.compose — the endpoint reads them server-side.
 * Calls fal.ai FLUX Pro Kontext multi-reference. Replaces any existing
 * visual-group components.
 */
export async function generateCanvasVisualCompose(
  deliverableId: string,
  options?: { aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'; count?: number; target?: 'hero' },
): Promise<GenerateComposeVisualResponse> {
  const res = await fetch(`/api/studio/${deliverableId}/generate-visual-compose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options ?? {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to generate compose visual' }));
    throw new Error(err.error ?? 'Failed to generate compose visual');
  }
  return res.json();
}

/** Create a derivative deliverable for another platform */
export async function deriveDeliverable(
  deliverableId: string,
  targetPlatform: string,
  targetFormat: string,
  title?: string,
): Promise<DeriveResponse> {
  const res = await fetch(`/api/studio/${deliverableId}/derive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetPlatform, targetFormat, title }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to derive deliverable' }));
    throw new Error(err.error ?? 'Failed to derive deliverable');
  }
  return res.json();
}

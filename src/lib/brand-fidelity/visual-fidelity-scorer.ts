// =============================================================
// G8 — visual fidelity scorer
//
// Combines deterministic color alignment (40%) with AI-judge
// composite (60%) to produce one 0-100 score per generated image.
// Persists ContentVisualFidelityScore record + emits LearningEvent
// `fidelity.scored` (entity=ContentVisualFidelityScore).
//
// Triggered on-demand by /api/learning-loop/visual-fidelity/rescore/[componentId]
// and manually via the smoke test. Future: wire into canvas-orchestrator
// after image generation completes (parallel to text fidelity).
// =============================================================

import { prisma } from "@/lib/prisma";
import { extractColorsFromImage } from "@/lib/consistent-models/color-extractor";
import { fetchWithSizeLimit, AI_IMAGE_SIZE_CAP } from "@/lib/security/fetch-with-limit";
import { getBrandContext } from "@/lib/ai/brand-context";

import {
  alignColorsToPalette,
  type ColorAlignmentResult,
  type BrandColor,
  type GeneratedSwatch,
} from "./visual-color-alignment";
import {
  runVisualAiJudge,
  VISUAL_DIMENSION_KEYS,
  type VisualBrandContext,
  type VisualJudgeResult,
} from "./visual-ai-judge";
import {
  AICallPayload,
} from "@/types/learning-loop";
import { tryTrackStart, tryTrackComplete } from "@/lib/learning-loop/track-helpers";
import { getPromptVersion } from "@/lib/ai/prompt-version-registry";
import { emitLearningEvent } from "@/lib/learning-loop/event-emitter";
import { extractTextFromImage, computeTextPollutionPenalty, type OcrCheckResult } from "@/lib/ai/image-quality/ocr-check";
import { runCopyImageCoherenceJudge, type CoherenceJudgeResult } from "./copy-image-coherence-judge";

const SCORER_VERSION = "visual-fidelity-v1.0";
const COLOR_WEIGHT = 0.4;
const JUDGE_WEIGHT = 0.6;
const DEFAULT_THRESHOLD = 70;

export interface ScoreVisualFidelityInput {
  componentId: string;
  workspaceId: string;
  /** Custom judge label voor multi-judge analyses. Default 'claude-judge-visual-fidelity'. */
  judgeIdentifier?: string;
}

export interface ScoreVisualFidelityResult {
  scoreId: string;
  componentId: string;
  imageUrl: string;
  compositeScore: number;
  thresholdMet: boolean;
  /** Skipped when judge couldn't run (no API key) — score reflects color alignment alone. */
  judgeSkipped: boolean;
}

/**
 * Score one generated image against brand visual identity.
 *
 * Composition: 40% deterministic color alignment + 60% AI-judge composite.
 * If AI-judge fails (no API key, network error), falls back to color-only
 * with composite = colorAlignment.score (judgeSkipped=true).
 *
 * Throws when component is missing, has no imageUrl, or doesn't belong
 * to the workspace.
 */
export async function scoreImageFidelity(
  input: ScoreVisualFidelityInput,
): Promise<ScoreVisualFidelityResult> {
  const {
    componentId,
    workspaceId,
    judgeIdentifier = "claude-judge-visual-fidelity",
  } = input;

  // 1. Load component + verify ownership
  const component = await prisma.deliverableComponent.findFirst({
    where: {
      id: componentId,
      deliverable: { campaign: { workspaceId } },
    },
    select: {
      id: true,
      deliverableId: true,
      variantIndex: true,
      imageUrl: true,
      componentType: true,
      groupType: true,
    },
  });

  if (!component) {
    throw new Error(
      `DeliverableComponent ${componentId} not found in workspace ${workspaceId}`,
    );
  }
  if (!component.imageUrl) {
    throw new Error(
      `DeliverableComponent ${componentId} has no imageUrl — nothing to score`,
    );
  }

  // 2. Fetch image bytes (size-capped for safety)
  const imageBuffer = await fetchImageBuffer(component.imageUrl);

  // 3. Deterministic color alignment
  const palette = await extractColorsFromImage(imageBuffer);
  const generatedSwatches: GeneratedSwatch[] = palette.palette.map((p) => ({
    hex: p.hex,
    population: p.population,
  }));

  const brandColors = await fetchBrandColors(workspaceId);
  const colorAlignment = alignColorsToPalette(generatedSwatches, brandColors);

  // 4. AI-judge (optional — falls back gracefully)
  const visualContext = await buildVisualBrandContext(workspaceId, brandColors);

  // Construct tracking payload
  const judgePayload: AICallPayload = {
    model: "claude-sonnet-4-5",
    messages: [
      { role: "system", content: "[visual-fidelity-judge]" },
      { role: "user", content: `image=${component.imageUrl} ctx=${JSON.stringify(visualContext).slice(0, 500)}` },
    ],
    params: { temperature: 0.3, max_tokens: 1500 },
  };
  const traceId = await tryTrackStart(
    {
      workspaceId,
      parentEntityType: "DeliverableComponent",
      parentEntityId: componentId,
      sourceIdentifier: "src/lib/brand-fidelity/visual-fidelity-scorer.ts:scoreImageFidelity",
      callOrder: 0,
      promptVersion: getPromptVersion("fidelity-judge"),
    },
    judgePayload,
  );

  const startedAt = Date.now();
  let judgeResult: VisualJudgeResult | null = null;
  // Pattern E image-quality-chain — OCR runs parallel met AI-judge. Graceful
  // skip wanneer GOOGLE_VISION_API_KEY ontbreekt of de Vision API niet
  // toegankelijk is voor de image-url (alleen https accepted).
  let ocrResult: OcrCheckResult | null = null;
  // Pattern G4 image-quality-chain — copy-image coherence judge. Runs alleen
  // wanneer er tekst-zustercomponenten gevonden worden in dezelfde variant.
  let coherenceResult: CoherenceJudgeResult | null = null;
  try {
    // Anthropic vision accepts only HTTPS URLs. For local /uploads/ paths
    // (dev) and any non-HTTPS source, send as base64 using the buffer we
    // already fetched for color extraction.
    const imageInput: { type: "url"; url: string } | { type: "base64"; mediaType: string; data: string } =
      component.imageUrl.startsWith("https://")
        ? { type: "url", url: component.imageUrl }
        : {
            type: "base64",
            mediaType: detectMediaType(component.imageUrl),
            data: imageBuffer.toString("base64"),
          };

    // Parallelize AI-judge + OCR + coherence-judge voor minimum latency-impact.
    // Coherence pulls text-content van zustercomponenten (zelfde variantIndex);
    // skip wanneer geen tekst beschikbaar of API-key ontbreekt.
    const siblingTextPromise = fetchSiblingTextContent(
      component.deliverableId,
      component.variantIndex,
    );
    const [judgeOut, ocrOut, siblingText] = await Promise.all([
      runVisualAiJudge(imageInput, visualContext),
      component.imageUrl.startsWith("https://")
        ? extractTextFromImage(component.imageUrl)
        : Promise.resolve(null),
      siblingTextPromise,
    ]);
    judgeResult = judgeOut;
    ocrResult = ocrOut;

    // Coherence judge sequentieel na siblingText resolve — voorkomt onnodige
    // Haiku-call wanneer geen text-content beschikbaar is in de variant.
    if (siblingText.trim().length > 0) {
      coherenceResult = await runCopyImageCoherenceJudge(imageInput, siblingText);
    }

    await tryTrackComplete(traceId, {
      inputTokens: 0,
      outputTokens: 0,
      stopReason: judgeResult ? "end_turn" : "error",
      latencyMs: Date.now() - startedAt,
      wasFromCache: false,
      errorCode: judgeResult ? undefined : "JUDGE_RETURNED_NULL",
      errorMessage: judgeResult ? undefined : "AI judge returned null (no API key or parse fail)",
    });
  } catch (err) {
    await tryTrackComplete(traceId, {
      inputTokens: 0,
      outputTokens: 0,
      stopReason: "error",
      latencyMs: Date.now() - startedAt,
      wasFromCache: false,
      errorCode: "VISUAL_JUDGE_FAILED",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    judgeResult = null;
  }

  // 5. Composite — apply OCR penalty op text-in-image dimensie indien gepresent.
  // Penalty trekt rechtstreeks van de judge text-in-image score af; composite
  // recalculatie volgt automatisch via VisualJudgeResult.composite. Voor v1
  // herrekenen we composite NIET — de OCR penalty leeft als enricher-data
  // beschikbaar voor UI/refine-loop, maar muteert niet retroactief judge.composite.
  const judgeSkipped = judgeResult === null;
  let ocrPenalty = 0;
  if (judgeResult && ocrResult && ocrResult.text.length > 0) {
    ocrPenalty = computeTextPollutionPenalty(ocrResult);
    const textDim = judgeResult.scores["text-in-image"];
    if (textDim) {
      const adjusted = Math.max(0, textDim.score - Math.round(ocrPenalty * 0.5));
      const ocrSummary = ocrResult.text.length > 60
        ? ocrResult.text.slice(0, 60) + "…"
        : ocrResult.text;
      judgeResult.scores["text-in-image"] = {
        score: adjusted,
        rationale: `${textDim.rationale} [OCR detected: "${ocrSummary}" (${ocrResult.text.length} chars, ${ocrResult.blockCount} blocks) — penalty -${Math.round(ocrPenalty * 0.5)}]`,
      };
      // Flag automatically wanneer aangepaste score onder threshold zakt
      if (adjusted < 50 && !judgeResult.flagged.includes("text-in-image")) {
        judgeResult.flagged.push("text-in-image");
      }
    }
  }

  const compositeScore = judgeSkipped
    ? colorAlignment.score
    : Math.round(
        colorAlignment.score * COLOR_WEIGHT + judgeResult!.composite * JUDGE_WEIGHT,
      );

  const thresholdMet = compositeScore >= DEFAULT_THRESHOLD;

  // 6. Persist
  const score = await prisma.contentVisualFidelityScore.create({
    data: {
      workspaceId,
      componentId,
      imageUrl: component.imageUrl,
      judgeIdentifier,
      judgeCallTraceId: traceId,
      compositeScore,
      colorAlignment: serializeColorAlignment(colorAlignment),
      aiJudgeDimensions: judgeResult
        ? serializeJudgeResult(judgeResult, ocrResult, ocrPenalty, coherenceResult)
        : { skipped: true },
      thresholdMet,
      scorerVersion: SCORER_VERSION,
    },
    select: { id: true },
  });

  // 7. Emit fidelity.scored LearningEvent
  void emitLearningEvent({
    workspaceId,
    payload: {
      type: "fidelity.scored",
      data: {
        contentVersionId: componentId, // FK abuse: event-log polymorphic, key field generic
        scoreId: score.id,
        compositeScore,
        thresholdMet,
        judgeIdentifier,
      },
    },
  });

  return {
    scoreId: score.id,
    componentId,
    imageUrl: component.imageUrl,
    compositeScore,
    thresholdMet,
    judgeSkipped,
  };
}

// ─── Helpers ────────────────────────────────────────────

async function fetchImageBuffer(url: string): Promise<Buffer> {
  // Local /uploads path → read from disk
  if (url.startsWith("/uploads/")) {
    const { readFile } = await import("fs/promises");
    const { resolve } = await import("path");
    const localPath = resolve(process.cwd(), "public" + url);
    return readFile(localPath);
  }

  // fetchWithSizeLimit returns Buffer directly (not Response).
  return fetchWithSizeLimit(url, AI_IMAGE_SIZE_CAP);
}

async function fetchBrandColors(workspaceId: string): Promise<BrandColor[]> {
  const styleguide = await prisma.brandStyleguide.findUnique({
    where: { workspaceId },
    select: {
      colors: {
        select: { hex: true, category: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!styleguide?.colors) return [];
  return styleguide.colors
    .map((c) => ({ hex: c.hex, category: String(c.category) }))
    .filter((c) => c.hex && c.hex.length > 0);
}

async function buildVisualBrandContext(
  workspaceId: string,
  brandColors: BrandColor[],
): Promise<VisualBrandContext> {
  const ctx: VisualBrandContext = {
    brandColorHexes: brandColors.map((c) => c.hex).slice(0, 12),
  };

  try {
    const brand = await getBrandContext(workspaceId);
    ctx.brandName = brand.brandName;
    ctx.brandMood = brand.brandPersonality?.slice(0, 600) ?? null;
  } catch {
    // brand context optional
  }

  // Pull visual-language + photography-style + illustration-guidelines +
  // logo guidelines directly from the styleguide model — getBrandContext
  // already wraps but we want the structured originals for visual judging.
  const styleguide = await prisma.brandStyleguide.findUnique({
    where: { workspaceId },
    select: {
      photographyStyle: true,
      photographyGuidelines: true,
      illustrationGuidelines: true,
      logoGuidelines: true,
      logos: { select: { description: true }, take: 1 },
      visualLanguage: true,
    },
  });

  if (styleguide) {
    if (styleguide.photographyStyle || styleguide.photographyGuidelines.length > 0) {
      const parts: string[] = [];
      if (styleguide.photographyStyle) {
        parts.push(
          typeof styleguide.photographyStyle === "string"
            ? styleguide.photographyStyle
            : JSON.stringify(styleguide.photographyStyle).slice(0, 600),
        );
      }
      if (styleguide.photographyGuidelines.length > 0) {
        parts.push(styleguide.photographyGuidelines.join("; ").slice(0, 400));
      }
      ctx.photographyStyle = parts.join("\n").slice(0, 800);
    }
    if (styleguide.illustrationGuidelines.length > 0) {
      ctx.illustrationStyle = styleguide.illustrationGuidelines.join("; ").slice(0, 800);
    }

    const logoParts: string[] = [];
    if (styleguide.logos[0]?.description) logoParts.push(styleguide.logos[0].description);
    if (styleguide.logoGuidelines.length > 0) {
      logoParts.push(styleguide.logoGuidelines.join("; "));
    }
    if (logoParts.length > 0) {
      ctx.logoDescription = logoParts.join("\n").slice(0, 400);
    }

    if (styleguide.visualLanguage) {
      ctx.visualLanguage =
        typeof styleguide.visualLanguage === "string"
          ? styleguide.visualLanguage
          : JSON.stringify(styleguide.visualLanguage).slice(0, 800);
    }
  }

  return ctx;
}

function detectMediaType(url: string): string {
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  // Default — most generated images are PNG
  return "image/png";
}

function serializeColorAlignment(result: ColorAlignmentResult): object {
  return {
    score: result.score,
    matches: result.matches,
    unmatchedColors: result.unmatchedColors,
    matchedBrandHexes: result.matchedBrandHexes,
  };
}

function serializeJudgeResult(
  result: VisualJudgeResult,
  ocrResult: OcrCheckResult | null,
  ocrPenalty: number,
  coherenceResult: CoherenceJudgeResult | null,
): object {
  const out: Record<string, { score: number; rationale: string }> = {};
  for (const key of VISUAL_DIMENSION_KEYS) {
    out[key] = result.scores[key];
  }
  // Pattern G4: coherence is een 7e dimensie geproduceerd door een aparte
  // judge (text+image), niet onderdeel van VISUAL_DIMENSIONS (image-only).
  // Sluit aan op zelfde score-0-100 conventie zodat UI het naast de
  // visual-dimensies kan renderen via dezelfde dimension-rij.
  if (coherenceResult) {
    out["copy-image-coherence"] = {
      score: coherenceResult.score,
      rationale: coherenceResult.rationale,
    };
  }
  return {
    composite: result.composite,
    flagged: result.flagged,
    dimensions: out,
    ocr: ocrResult
      ? {
          text: ocrResult.text,
          blockCount: ocrResult.blockCount,
          confidence: ocrResult.confidence,
          source: ocrResult.source,
          penalty: ocrPenalty,
        }
      : null,
  };
}

/**
 * Pattern G4 helper: fetch concat'd text-content van zustercomponenten in
 * dezelfde variant (zelfde deliverableId + variantIndex).
 *
 * Er bestaat geen componentType 'text' — de kolom bevat per-veld type-namen
 * (headline, body, …). Tekst-zusters worden daarom geselecteerd door de
 * media-types uit te sluiten, het bewezen patroon uit
 * ad-validation/runner.ts:loadVariantGroups (prompt-audit T8: de letterlijke
 * 'text'-match matchte nul rijen en liet de coherence-judge dood op het
 * hero-pad).
 *
 * Returns lege string wanneer geen tekst-componenten gevonden — caller
 * skipt de coherence-judge call.
 */
async function fetchSiblingTextContent(
  deliverableId: string,
  variantIndex: number,
): Promise<string> {
  const siblings = await prisma.deliverableComponent.findMany({
    where: {
      deliverableId,
      variantIndex,
      componentType: { notIn: ["image", "video", "voiceover"] },
      generatedContent: { not: null },
    },
    select: { variantGroup: true, componentType: true, generatedContent: true },
    orderBy: { order: "asc" },
  });

  if (siblings.length === 0) return "";

  const parts: string[] = [];
  for (const s of siblings) {
    const groupLabel = s.variantGroup ?? s.componentType;
    const content = (s.generatedContent ?? "").trim();
    if (content.length > 0) {
      parts.push(`[${groupLabel}]\n${content}`);
    }
  }
  return parts.join("\n\n");
}

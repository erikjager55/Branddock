// =============================================================
// G8 — AI-judge for generated images via Claude Sonnet vision
//
// Sends a generated image alongside brand visual context and gets
// per-dimension scores back (0-100) with rationale.
//
// 5 dimensions:
//   - style-coherence:  matches brand visual style (photography vs
//                       illustration vs hybrid + composition treatment)
//   - mood-fit:         emotional tone matches brand personality
//   - composition:      hierarchy, focal point, balance, breathing room
//   - text-in-image:    penalty for AI-hallucinated text/typography
//                       (high score = no problematic text)
//   - logo-fidelity:    if a logo is depicted, is it accurate?
//                       (high score = correct logo OR no logo expected)
//
// All dimensions weighted equally in the AI-judge composite (0.2 each).
// =============================================================

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Judge-refresh 2026-07-21: sonnet-5. Visueel pad is advisory (badge,
// geen publish-gate) — swap zonder beeld-kalibratie, monitoren.
const MODEL_ID = "claude-sonnet-5";
const MAX_TOKENS = 1500;
const TIMEOUT_MS = 60_000;

const VISUAL_DIMENSIONS = [
  "style-coherence",
  "mood-fit",
  "composition",
  "text-in-image",
  "logo-fidelity",
  "subject-identity",
] as const;

export type VisualDimensionKey = (typeof VISUAL_DIMENSIONS)[number];

const judgeResponseSchema = z.object({
  scores: z.array(
    z.object({
      key: z.string(),
      score: z.number().min(0).max(100),
      rationale: z.string(),
    }),
  ),
});

export interface VisualBrandContext {
  brandName?: string | null;
  /** Visual language description (corners, shadows, lines, shape language). */
  visualLanguage?: string | null;
  /** Photography style description from BrandStyleguide. */
  photographyStyle?: string | null;
  /** Illustration style profile description. */
  illustrationStyle?: string | null;
  /** Logo description for logo-fidelity check. */
  logoDescription?: string | null;
  /** Brand color hex list for context (not the deterministic alignment — that's separate). */
  brandColorHexes?: string[];
  /** Personality / tone descriptor that influences mood-fit. */
  brandMood?: string | null;
}

export interface VisualJudgeResult {
  scores: Record<
    VisualDimensionKey,
    { score: number; rationale: string }
  >;
  composite: number;
  /** Lower-tier dimensions (score < 50) for at-a-glance flagging. */
  flagged: VisualDimensionKey[];
}

let cached: Anthropic | null = null;
function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!cached) cached = new Anthropic({ apiKey });
  return cached;
}

function buildPrompt(ctx: VisualBrandContext): { system: string; user: string } {
  const lines: string[] = [];
  if (ctx.brandName) lines.push(`# Brand: ${ctx.brandName}`);
  if (ctx.visualLanguage)
    lines.push(`## Visual language\n${ctx.visualLanguage}`);
  if (ctx.photographyStyle)
    lines.push(`## Photography style\n${ctx.photographyStyle}`);
  if (ctx.illustrationStyle)
    lines.push(`## Illustration style\n${ctx.illustrationStyle}`);
  if (ctx.logoDescription)
    lines.push(`## Logo\n${ctx.logoDescription}`);
  if (ctx.brandMood) lines.push(`## Brand mood\n${ctx.brandMood}`);
  if (ctx.brandColorHexes && ctx.brandColorHexes.length > 0) {
    lines.push(`## Brand colors\n${ctx.brandColorHexes.join(", ")}`);
  }
  if (lines.length === 0) {
    lines.push(
      "(No structured brand context available — score on universal visual quality.)",
    );
  }

  const system = `You are a senior brand designer evaluating whether a generated image is on-brand. Score across 6 dimensions, each 0-100.

## SCORING RUBRIC
- 0-30: severe failure on this dimension
- 31-50: clear weaknesses
- 51-70: acceptable but unremarkable
- 71-85: strong execution
- 86-100: exceptional

## DIMENSIONS

1. **style-coherence** — Does the visual style (photography / illustration / hybrid, treatment, level of realism) match the brand's declared visual direction? If brand has no declared direction, score against universal coherence (consistent style choices throughout).

2. **mood-fit** — Does the emotional tone match the brand's personality? Consider color temperature, lighting, subject expression, atmosphere.

3. **composition** — Hierarchy, focal point, balance, rule of thirds where relevant, breathing room. Universal craft.

4. **text-in-image** — AI image generators often hallucinate garbled text. **Higher score = LESS problematic text.** 100 = no text or correct text only. 50 = minor garbled text. 0 = prominent gibberish typography.

5. **logo-fidelity** — If a logo is depicted, is it accurate to the brand's logo? **Higher score = MORE accurate.** 100 = no logo expected/present, or logo is exact. 50 = logo present but distorted. 0 = wrong logo prominently shown. If brand has no declared logo, default to 100.

6. **subject-identity** — Especially relevant voor compose-flow (image-to-image) en consistent-model output: blijft het subject (persoon, product, scene) herkenbaar uit de source-images? **Higher score = MORE faithful to source-subject.** 100 = subject visueel identiek en herkenbaar. 50 = subject herkenbaar maar met merkbare drift (andere belichting, andere pose, etc.). 0 = subject is volledig vervangen of niet meer herkenbaar. For pure text-to-image generations zonder source-subject: default 100 (geen drift mogelijk).

## OUTPUT
Return JSON exactly matching: { "scores": [{ "key": string, "score": number, "rationale": string }] }
Include ALL 6 dimension keys. Each rationale 1-2 sentences citing concrete evidence from the image.`;

  const user = `${lines.join("\n\n")}\n\nScore the attached image across all 6 dimensions. Return JSON only.`;

  return { system, user };
}

/**
 * Run the AI visual judge against an image (passed by URL or base64).
 * Returns null on missing API key or call failure — caller falls back to
 * deterministic-only scoring.
 *
 * Image source flexibility:
 *  - URL pointing to publicly fetchable image (Anthropic fetches it)
 *  - or { type: 'base64', media_type, data } if you've already loaded
 */
export async function runVisualAiJudge(
  imageInput: { type: "url"; url: string } | { type: "base64"; mediaType: string; data: string },
  ctx: VisualBrandContext,
): Promise<VisualJudgeResult | null> {
  const client = getClient();
  if (!client) return null;

  const { system, user } = buildPrompt(ctx);

  const imageBlock =
    imageInput.type === "url"
      ? {
          type: "image" as const,
          source: { type: "url" as const, url: imageInput.url },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: imageInput.mediaType as
              | "image/jpeg"
              | "image/png"
              | "image/gif"
              | "image/webp",
            data: imageInput.data,
          },
        };

  try {
    const response = await client.messages.create(
      {
        model: MODEL_ID,
        max_tokens: MAX_TOKENS,
        system,
        messages: [
          {
            role: "user",
            content: [imageBlock, { type: "text", text: user }],
          },
        ],
      },
      { timeout: TIMEOUT_MS },
    );

    const text = response.content
      .filter((c) => c.type === "text")
      .map((c) => (c as { text: string }).text)
      .join("\n");

    // Extract first { ... } block — Claude may wrap in markdown code fence
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = judgeResponseSchema.safeParse(JSON.parse(jsonMatch[0]));
    if (!parsed.success) return null;

    const scoresMap: Partial<Record<VisualDimensionKey, { score: number; rationale: string }>> = {};
    for (const item of parsed.data.scores) {
      if ((VISUAL_DIMENSIONS as readonly string[]).includes(item.key)) {
        scoresMap[item.key as VisualDimensionKey] = {
          score: clampScore(item.score),
          rationale: item.rationale,
        };
      }
    }

    // Fill missing dimensions with neutral 50 + flag in rationale
    const finalScores: Record<VisualDimensionKey, { score: number; rationale: string }> = {} as Record<
      VisualDimensionKey,
      { score: number; rationale: string }
    >;
    for (const key of VISUAL_DIMENSIONS) {
      finalScores[key] =
        scoresMap[key] ?? {
          score: 50,
          rationale: "Score unavailable — model omitted this dimension.",
        };
    }

    const composite = Math.round(
      VISUAL_DIMENSIONS.reduce((sum, k) => sum + finalScores[k].score, 0) /
        VISUAL_DIMENSIONS.length,
    );
    const flagged = VISUAL_DIMENSIONS.filter((k) => finalScores[k].score < 50);

    return { scores: finalScores, composite, flagged };
  } catch (err) {
    console.warn(
      "[visual-ai-judge] failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

function clampScore(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 50;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export const VISUAL_DIMENSION_KEYS = VISUAL_DIMENSIONS;

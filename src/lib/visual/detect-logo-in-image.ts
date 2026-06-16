// =============================================================
// W5 logo L-Fase 3 — image-only logo-detector (Haiku).
//
// Beoordeelt of een beeld een zichtbaar logo/wordmark bevat én hoe
// prominent. Image-only (geen copy nodig), i.t.t. de copy-image-
// coherence-judge waar W5 L-Fase 2 z'n visibleLogo-boolean aanhangt.
//
// Gebruikt voor anchor-curatie (plan §5 T2): brand-style-anchors die
// een logo prominent tonen lekken dat logo via multi-ref-fusion terug
// in elke generatie — immuun voor prompt-fixes. We waarschuwen de user
// zodat hij die anchors kan vervangen.
//
// Graceful skip wanneer ANTHROPIC_API_KEY ontbreekt → null.
// =============================================================

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const MODEL_ID = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 400;
const TIMEOUT_MS = 30_000;

export type LogoProminence = "none" | "incidental" | "dominant";

export interface LogoDetectionResult {
  visibleLogo: boolean;
  /** none = geen logo; incidental = klein/onopvallend; dominant = beeldvullend
   *  of duidelijk het onderwerp — dít is de T2-risicocategorie voor anchors. */
  prominence: LogoProminence;
  rationale: string;
}

const responseSchema = z.object({
  visibleLogo: z.boolean(),
  prominence: z.enum(["none", "incidental", "dominant"]),
  rationale: z.string(),
});

let cached: Anthropic | null = null;
function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!cached) cached = new Anthropic({ apiKey });
  return cached;
}

/**
 * Detecteer een zichtbaar logo/wordmark in een beeld + prominentie. Returnt
 * null bij missende API-key of parse-fout (caller behandelt als "onbekend").
 */
export async function detectLogoInImage(
  imageInput:
    | { type: "url"; url: string }
    | { type: "base64"; mediaType: string; data: string },
): Promise<LogoDetectionResult | null> {
  const client = getClient();
  if (!client) return null;

  const system = `You judge whether an image contains a visible brand logo, wordmark, brand symbol or readable brand lettering — including fictional or garbled AI-invented marks.

## PROMINENCE
- "none": no logo or brand mark at all
- "incidental": a small/peripheral mark (e.g. a tiny tag), not the focus
- "dominant": a logo that fills much of the frame or is clearly the subject — a reference image like this teaches an image model to reproduce that exact mark

## OUTPUT
Return JSON exactly matching: { "visibleLogo": boolean, "prominence": "none" | "incidental" | "dominant", "rationale": string }
Rationale: 1 sentence. If unsure whether a shape is a deliberate logo, lean toward visibleLogo=false / "none" (incidental texture is not a logo).`;

  const imageBlock =
    imageInput.type === "url"
      ? { type: "image" as const, source: { type: "url" as const, url: imageInput.url } }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: imageInput.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
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
            content: [
              imageBlock,
              { type: "text", text: "Does this image contain a visible logo or brand mark? Return JSON only." },
            ],
          },
        ],
      },
      { timeout: TIMEOUT_MS },
    );

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;
    const raw = block.text
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();
    const parsed = responseSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch (err) {
    console.warn("[detect-logo-in-image] error:", err instanceof Error ? err.message : err);
    return null;
  }
}

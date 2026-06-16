// =============================================================
// Pattern G4 image-quality-chain — Copy-image coherence judge.
//
// Beoordeelt of een gegenereerd beeld inhoudelijk aansluit bij de tekst-
// content van diezelfde variant (headline + body). Vangt mis-matches die
// de bestaande 6 visual-dimensies niet detecteren:
//   - Beeld toont concept X terwijl copy spreekt over Y
//   - Beeld is on-brand maar contextueel irrelevant
//   - Persona-mismatch: senior copy ↔ studentenbeeld
//
// Apart van visual-ai-judge omdat input ánders is (image + text vs alleen
// image). Output sluit aan op dezelfde score-0-100 conventie zodat de UI
// het naast de 6 dimensies kan renderen.
//
// Cost: Claude Haiku, ~$0.001 per image (factor 40 goedkoper dan Sonnet
// judge). Graceful skip wanneer ANTHROPIC_API_KEY ontbreekt — dimensie
// blijft simpelweg ongerenderd in UI.
// =============================================================

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const MODEL_ID = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 600;
const TIMEOUT_MS = 30_000;

export interface CoherenceJudgeResult {
  score: number;
  rationale: string;
  /** W5 logo L-Fase 2 (plan §5): true wanneer het beeld een zichtbaar logo,
   *  wordmark of leesbare merk-lettering bevat (incl. verzonnen pseudo-logo's).
   *  FLUX negeert negative prompts en nano-banana kent alleen semantic
   *  negatives — detectie + gerichte retry is de enige sluitende laag. */
  visibleLogo: boolean;
}

const responseSchema = z.object({
  score: z.number().min(0).max(100),
  rationale: z.string(),
  // Fail-soft: een (oudere/afwijkende) judge-respons zonder het veld mag het
  // coherence-oordeel niet laten vallen — default false = geen regen-signaal.
  visibleLogo: z.boolean().optional().default(false),
});

let cached: Anthropic | null = null;
function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!cached) cached = new Anthropic({ apiKey });
  return cached;
}

/**
 * Run de copy-image coherence judge. Returns null bij missende API-key,
 * lege content (geen text om tegen te scoren), of parse failure.
 *
 * @param imageInput URL of base64-payload van de gegenereerde image
 * @param contentText Tekst van zustercomponenten in dezelfde variant
 *   (concat van headline, body, cta). Lege string → skip want geen text
 *   om coherence te meten.
 */
export async function runCopyImageCoherenceJudge(
  imageInput:
    | { type: "url"; url: string }
    | { type: "base64"; mediaType: string; data: string },
  contentText: string,
): Promise<CoherenceJudgeResult | null> {
  const client = getClient();
  if (!client) return null;

  const trimmedText = contentText.trim();
  if (trimmedText.length === 0) return null;

  const system = `You are a senior brand strategist judging whether a generated image visually supports the text content of the same piece of marketing material.

## SCORING RUBRIC (0-100)
- 0-30: image contradicts the copy or is contextually irrelevant — would confuse the audience
- 31-50: image is on-brand but doesn't visualize the message — weak connection
- 51-70: acceptable thematic match — image relates to copy but adds little narrative value
- 71-85: strong fit — image reinforces and visualizes the message
- 86-100: exceptional — image elevates the copy with concrete subject, action, or metaphor that matches the message exactly

## EVALUATION CRITERIA
1. **Subject match**: does the image depict the actual subject the copy talks about?
2. **Audience match**: does the visual demographic / setting / tone match who the copy addresses?
3. **Message reinforcement**: does the image carry forward the key message, or does it feel generic?
4. **No contradictions**: image must not contradict claims, persona, or scenario described in the copy

## LOGO CHECK (separate boolean, does NOT affect the score)
Set "visibleLogo" to true if the image contains ANY visible logo, wordmark, brand symbol or readable brand lettering — on products, packaging, clothing, vehicles, storefronts or signage — including fictional, garbled or AI-invented pseudo-logos. Incidental unreadable texture or abstract shapes are NOT logos. When unsure whether a mark is a deliberate logo, set true.

## OUTPUT
Return JSON exactly matching: { "score": number, "rationale": string, "visibleLogo": boolean }
Rationale 1-2 sentences citing concrete observations from both the image and the copy.`;

  const truncatedText = trimmedText.length > 1500
    ? trimmedText.slice(0, 1500) + "…"
    : trimmedText;

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
            content: [
              imageBlock,
              {
                type: "text",
                text: `## Copy that accompanies the image\n${truncatedText}\n\n## Task\nScore the image-copy coherence. Return JSON only.`,
              },
            ],
          },
        ],
      },
      { timeout: TIMEOUT_MS },
    );

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;

    // Strip code fences indien Claude die toevoegt
    const raw = block.text
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(raw);
    const validated = responseSchema.safeParse(parsed);
    if (!validated.success) return null;
    return validated.data;
  } catch (err) {
    console.warn(
      "[coherence-judge] error:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

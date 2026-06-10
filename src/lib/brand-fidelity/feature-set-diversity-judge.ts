// =============================================================
// Feature-set diversity judge (Fase 4, audit 2026-06-10-lp-feature-
// image-diversity).
//
// Eén multi-image Haiku-call die de N feature-beelden van één pagina
// als SET beoordeelt op near-duplicates (zelfde onderwerp + zelfde
// compositie). Bewust géén pgvector: de G2 reuse-detectie embedt
// aiDescription-TEKST, geen pixels — verse fal-outputs zijn geen
// MediaAsset en hebben geen beschrijving (jury-correctie ontwerpfase).
//
// Zelfde merk-look over de set is GOED (brand-consistentie); hetzelfde
// onderwerp/dezelfde compositie is het Napking-faalbeeld (4x chef met
// gekruiste armen). Cost: ~$0.005 per pagina (1 Haiku-call, 4 beelden).
// Graceful null bij missende ANTHROPIC_API_KEY of judge-fout.
// =============================================================

import { z } from "zod";
import { createClaudeStructuredCompletion } from "@/lib/ai/exploration/ai-caller";

const HAIKU_MODEL = "claude-haiku-4-5-20251001";

export interface DiversityJudgeImage {
  /** Feature-index — komt terug in duplicatePairs. */
  index: number;
  buffer: Buffer;
  mediaType: "image/png" | "image/jpeg" | "image/webp";
}

export interface DiversityJudgeResult {
  /** Paren feature-indices die als near-duplicate beoordeeld zijn. */
  duplicatePairs: Array<[number, number]>;
  rationale: string;
}

const responseSchema = z.object({
  duplicatePairs: z.array(z.tuple([z.number().int(), z.number().int()])),
  rationale: z.string(),
});

/**
 * Beoordeel een set feature-beelden op onderlinge near-duplicates. De beelden
 * worden in index-volgorde als genummerde attachments meegestuurd; het model
 * rapporteert paren op basis van die nummering (wij mappen terug naar de
 * werkelijke feature-indices). Returnt null bij <2 beelden, missende API-key
 * of judge/parse-fout — de caller behandelt null als "geen dupes gevonden".
 */
export async function runFeatureSetDiversityJudge(
  images: DiversityJudgeImage[],
): Promise<DiversityJudgeResult | null> {
  if (images.length < 2) return null;
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const system = `You judge a SET of feature-section images that will appear together on one landing page.

## TASK
Identify pairs of images that are NEAR-DUPLICATES: they show essentially the same subject in essentially the same composition (e.g. twice "a person in work attire, arms crossed, facing the camera in a kitchen"). Sharing the same brand style, lighting or color mood is GOOD and is NOT a duplicate — only flag pairs where a visitor scanning the page would think "this is the same photo again".

## OUTPUT
Return JSON exactly matching: { "duplicatePairs": [[a, b], ...], "rationale": string }
- a/b are the 1-based positions of the images in the order they were attached.
- Empty array when all images are clearly distinct.
- Rationale: 1-2 sentences naming the shared subject/composition per flagged pair.`;

  const user = `These ${images.length} images are the feature-section photos of one landing page, attached in order (image 1 = first attachment, image ${images.length} = last). Which pairs are near-duplicates?`;

  try {
    const raw = await createClaudeStructuredCompletion<z.infer<typeof responseSchema>>(
      system,
      user,
      {
        model: HAIKU_MODEL,
        maxTokens: 600,
        timeoutMs: 30_000,
        images: images.map((img) => ({ buffer: img.buffer, mediaType: img.mediaType })),
      },
    );
    const parsed = responseSchema.safeParse(raw);
    if (!parsed.success) return null;
    // 1-based attachment-posities → werkelijke feature-indices; ongeldige
    // posities (model-hallucinatie) worden gedropt.
    const pairs: Array<[number, number]> = [];
    for (const [a, b] of parsed.data.duplicatePairs) {
      const ia = images[a - 1]?.index;
      const ib = images[b - 1]?.index;
      if (ia !== undefined && ib !== undefined && ia !== ib) pairs.push([ia, ib]);
    }
    return { duplicatePairs: pairs, rationale: parsed.data.rationale };
  } catch (err) {
    console.warn(
      "[feature-set-diversity-judge] judge faalde (non-blocking):",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

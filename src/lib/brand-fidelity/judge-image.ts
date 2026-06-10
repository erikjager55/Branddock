// =============================================================
// Judge-image voorbereiding (follow-up audit §9, 2026-06-10).
//
// Vision-judges (G4 coherence, set-diversity) kregen ongeschaalde
// fal-output-buffers; de Anthropic-limiet is ~5MB per beeld, dus een
// toekomstig model met grote PNG's zou de judge stil inert maken
// (fail-soft null). Hier: boven de drempel word-safe downscalen naar
// jpeg ≤1024px — voor een relevantie/duplicaat-oordeel is dat ruim
// voldoende detail. Server-only (sharp).
// =============================================================

import sharp from "sharp";

const MAX_JUDGE_BYTES = 4_000_000;
const MAX_JUDGE_DIM = 1024;

export interface JudgeImagePayload {
  buffer: Buffer;
  mediaType: "image/png" | "image/jpeg";
}

/**
 * Bereid een gegenereerd beeld voor op een vision-judge-call: kleine buffers
 * gaan ongewijzigd door (png), grote worden gedownscaled naar jpeg ≤1024px.
 * Fail-soft: faalt sharp, dan gaat de originele buffer door (de judge zelf
 * is al fail-soft op een API-weigering).
 */
export async function prepareJudgeImage(bytes: Buffer): Promise<JudgeImagePayload> {
  if (bytes.length <= MAX_JUDGE_BYTES) {
    return { buffer: bytes, mediaType: "image/png" };
  }
  try {
    const scaled = await sharp(bytes)
      .resize({ width: MAX_JUDGE_DIM, height: MAX_JUDGE_DIM, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    return { buffer: scaled, mediaType: "image/jpeg" };
  } catch (err) {
    console.warn(
      "[judge-image] downscale faalde — origineel door (judge is fail-soft):",
      err instanceof Error ? err.message : err,
    );
    return { buffer: bytes, mediaType: "image/png" };
  }
}

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
  mediaType: "image/png" | "image/jpeg" | "image/webp";
}

/**
 * Bereid een gegenereerd beeld voor op een vision-judge-call: kleine buffers
 * gaan ongewijzigd door (png), grote worden gedownscaled naar jpeg ≤1024px.
 * Fail-soft: faalt sharp, dan gaat de originele buffer door (de judge zelf
 * is al fail-soft op een API-weigering).
 */
/** Magic-byte sniff — verkeerde media_type = Anthropic-reject = judge stil
 *  null, en in een multi-image call faalt dan de hele set (review
 *  library-first 2026-06-11). null = onbekend/niet-ondersteund format. */
function sniffMediaType(bytes: Buffer): "image/png" | "image/jpeg" | "image/webp" | null {
  if (bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes.length > 7 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length > 11 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export async function prepareJudgeImage(bytes: Buffer): Promise<JudgeImagePayload> {
  const sniffed = sniffMediaType(bytes);
  if (bytes.length <= MAX_JUDGE_BYTES && sniffed !== null) {
    return { buffer: bytes, mediaType: sniffed };
  }
  // Te groot ÓF onbekend format (gif/svg/avif uit de media library — judges
  // accepteren alleen png/jpeg/webp): normaliseer via sharp naar jpeg.
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
    return { buffer: bytes, mediaType: sniffMediaType(bytes) ?? "image/png" };
  }
}

// =============================================================
// Color Usage Verifier
//
// Closes the last gap in the brandstyle palette pipeline: detecting
// colours that live in the site's CSS but never actually render on
// the visible page. Typical source is WordPress plugin chrome (form
// validators, admin-bar overrides, shadow-box modals) that ship
// success/error/accent colours the public site never paints.
//
// Without this pass the authoritative palette passes these unused
// hexes to Claude, and the `.error`-style naming usually convinces
// it to label them SEMANTIC — producing a "semantic palette" that
// no user has ever seen.
//
// Two strategies, run in sequence:
//
//   1. Pixel pass (cheap, always runs)
//      - Downsample each screenshot to 400×400 via sharp
//      - For every opaque pixel, find the nearest palette hex within
//        RGB-Euclidean distance ≤ DISTANCE_TOLERANCE
//      - Aggregate match counts across screenshots
//      - Coverage = matches / total opaque pixels
//      - Threshold: strong ≥ 1%, weak ≥ 0.05%, none otherwise
//
//   2. Vision pass (optional, for borderline cases)
//      - Run when at least one palette colour has `weak` or `none`
//        evidence AND is medium/high confidence (low-conf colours
//        are destined for NEUTRAL anyway, so no need to spend tokens)
//      - Single Claude Vision call with up to MAX_VISION_HEXES colours
//      - Claude answers per hex: primary|cta|accent|surface|decorative|none
//      - PRIMARY/CTA/ACCENT/SURFACE promote to 'strong', rest keep pixel verdict
//
// Vercel's `--geist-success: #0070F3` is the motivating edge case: the
// CSS variable name says "success" (semantic) but the colour IS the
// actual primary CTA blue. The pixel pass finds it at ≥1% coverage,
// Vision confirms it's the primary, and the palette survives with
// evidence: 'strong' + visionRole: 'primary' — which our prompt rules
// (see analysis-prompts.ts) weigh against the variable-name heuristic.
// =============================================================

import sharp from 'sharp';
import { createClaudeStructuredCompletion } from '@/lib/ai/exploration/ai-caller';
import type { PageScreenshot } from './page-screenshotter';
import type { AuthoritativeColor } from './analysis-prompts';

// ─── Types ────────────────────────────────────────────

export type UsageEvidence = 'strong' | 'weak' | 'none';

export type VisionRole =
  | 'primary'
  | 'cta'
  | 'accent'
  | 'surface'
  | 'decorative'
  | 'none';

export interface ColorUsageRecord {
  hex: string;
  /** Share of opaque screenshot pixels matching this hex within tolerance. */
  pixelCoverage: number;
  /** Verdict from the pixel pass alone. */
  pixelVerdict: UsageEvidence;
  /** Role assigned by Claude Vision — undefined when vision pass didn't run. */
  visionRole?: VisionRole;
  /** Free-form explanation from Vision; useful for debugging snapshots. */
  visionReasoning?: string;
  /** Combined verdict used by the prompt (pixel + vision). */
  finalEvidence: UsageEvidence;
}

export interface VerifyOptions {
  /** Turn the Claude Vision pass on/off. Default: true if ANTHROPIC_API_KEY present. */
  enableVision?: boolean;
  /** Hard cap on hexes sent to Vision per call (keeps token cost bounded). */
  maxVisionHexes?: number;
  /** Optional logger for debugging. */
  log?: (msg: string) => void;
}

// ─── Constants ────────────────────────────────────────

/** Resolution each screenshot is downsampled to before pixel iteration. */
const SCREENSHOT_SAMPLE_SIZE = 400;
/** Pixels below this alpha are treated as transparent/background. */
const ALPHA_THRESHOLD = 64;
/**
 * Max RGB-Euclidean distance for a pixel to count as "this palette colour".
 * 40 roughly approximates ΔE 15 — covers standard anti-aliasing of a brand
 * colour without collapsing distinct hues (e.g. teal vs cyan).
 */
const DISTANCE_TOLERANCE = 40;
/** Pixel-coverage threshold for `strong` evidence. */
const STRONG_THRESHOLD = 0.01; // 1%
/** Pixel-coverage threshold for `weak` evidence (below strong). */
const WEAK_THRESHOLD = 0.0005; // 0.05%
/** Default cap on hexes sent to Vision in a single call. */
const DEFAULT_MAX_VISION_HEXES = 6;

// ─── Public API ───────────────────────────────────────

/**
 * Verify which authoritative palette colours are actually visible on the
 * captured screenshots. Returns one record per input hex.
 *
 * Failure modes degrade gracefully:
 *   - No screenshots → every record gets pixelCoverage 0, pixelVerdict 'none',
 *     finalEvidence 'none' (can't prove usage). Caller should treat this as
 *     "evidence unavailable" rather than "definitely unused".
 *   - Sharp decode error on one screenshot → that screenshot is skipped,
 *     remaining ones still contribute.
 *   - Vision call fails → pixel verdict is used as-is; no exception thrown.
 */
export async function verifyColorUsage(
  palette: AuthoritativeColor[],
  screenshots: PageScreenshot[],
  options: VerifyOptions = {},
): Promise<Map<string, ColorUsageRecord>> {
  const log = options.log ?? (() => {});
  const records = new Map<string, ColorUsageRecord>();

  // Seed all records with zeroed pixel data.
  for (const c of palette) {
    records.set(c.hex, {
      hex: c.hex,
      pixelCoverage: 0,
      pixelVerdict: 'none',
      finalEvidence: 'none',
    });
  }

  if (palette.length === 0 || screenshots.length === 0) {
    log('[color-usage-verifier] No palette or screenshots; returning empty verdicts');
    return records;
  }

  // ── Pixel pass ─────────────────────────────────────
  const paletteRgb = palette.map((c) => ({ hex: c.hex, rgb: hexToRgb(c.hex) }));
  let totalOpaque = 0;
  const matches = new Map<string, number>();

  for (const shot of screenshots) {
    try {
      const { data } = await sharp(shot.buffer)
        .resize(SCREENSHOT_SAMPLE_SIZE, SCREENSHOT_SAMPLE_SIZE, {
          fit: 'inside',
          withoutEnlargement: false,
        })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const { opaque, matchesByHex } = countPalettePixels(data, paletteRgb);
      totalOpaque += opaque;
      for (const [hex, count] of matchesByHex) {
        matches.set(hex, (matches.get(hex) ?? 0) + count);
      }
    } catch (err) {
      log(
        `[color-usage-verifier] Skipping screenshot ${shot.label}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  if (totalOpaque === 0) {
    log('[color-usage-verifier] No opaque pixels processed; returning empty verdicts');
    return records;
  }

  for (const c of palette) {
    const coverage = (matches.get(c.hex) ?? 0) / totalOpaque;
    let verdict = classifyCoverage(coverage);
    // Detector tokens (framework detectors, logo-extraction) encode a
    // high-confidence brand claim. The pixel pass can miss them whenever
    // the tolerated hex differs from what's actually rendered — logo
    // extraction returns quantised bucket centres, so a brand colour like
    // #20C509 on-page vs the extracted #20A020 can land just outside the
    // 40-unit tolerance. Apply a 'weak' floor for detector tokens so the
    // downstream prompt doesn't force them to NEUTRAL; only the Vision
    // pass is allowed to confidently reject them.
    if (c.source === 'detector' && verdict === 'none') {
      verdict = 'weak';
    }
    records.set(c.hex, {
      hex: c.hex,
      pixelCoverage: coverage,
      pixelVerdict: verdict,
      finalEvidence: verdict,
    });
  }

  // ── Vision pass (for borderline cases) ─────────────
  const visionEnabled = options.enableVision ?? Boolean(process.env.ANTHROPIC_API_KEY);
  if (!visionEnabled) {
    log('[color-usage-verifier] Vision pass disabled');
    return records;
  }

  // Candidates: medium-or-high-confidence hexes that the pixel pass didn't
  // resolve to 'strong'. Low-confidence hexes are already bound for NEUTRAL
  // by the prompt rules, no need to burn Vision tokens on them.
  const candidates = palette.filter((c) => {
    if (c.confidence === 'low') return false;
    const rec = records.get(c.hex);
    return rec && rec.pixelVerdict !== 'strong';
  });

  if (candidates.length === 0) {
    log('[color-usage-verifier] No borderline candidates; skipping Vision pass');
    return records;
  }

  const maxHexes = options.maxVisionHexes ?? DEFAULT_MAX_VISION_HEXES;
  const visionTargets = candidates.slice(0, maxHexes);
  log(
    `[color-usage-verifier] Running Vision pass on ${visionTargets.length} borderline hexes`,
  );

  let visionVerdicts: VisionResponse | null = null;
  try {
    visionVerdicts = await runVisionPass(
      visionTargets.map((c) => c.hex),
      screenshots,
    );
  } catch (err) {
    log(
      `[color-usage-verifier] Vision pass failed (non-critical): ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (visionVerdicts) {
    for (const entry of visionVerdicts.verdicts ?? []) {
      const hex = normaliseHex(entry.hex);
      if (!hex) continue;
      const rec = records.get(hex);
      if (!rec) continue;
      rec.visionRole = entry.role;
      rec.visionReasoning = entry.reasoning;
      rec.finalEvidence = combineEvidence(rec.pixelVerdict, entry.role);
    }
  }

  return records;
}

// ─── Pixel-pass helpers ───────────────────────────────

interface PaletteRgb {
  hex: string;
  rgb: [number, number, number];
}

function countPalettePixels(
  pixels: Buffer,
  palette: PaletteRgb[],
): { opaque: number; matchesByHex: Map<string, number> } {
  const matchesByHex = new Map<string, number>();
  let opaque = 0;
  const toleranceSq = DISTANCE_TOLERANCE * DISTANCE_TOLERANCE;

  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < ALPHA_THRESHOLD) continue;
    opaque++;
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    let bestHex: string | null = null;
    let bestDistSq = toleranceSq;
    for (const entry of palette) {
      const dr = entry.rgb[0] - r;
      const dg = entry.rgb[1] - g;
      const db = entry.rgb[2] - b;
      const distSq = dr * dr + dg * dg + db * db;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestHex = entry.hex;
      }
    }
    if (bestHex !== null) {
      matchesByHex.set(bestHex, (matchesByHex.get(bestHex) ?? 0) + 1);
    }
  }

  return { opaque, matchesByHex };
}

function classifyCoverage(coverage: number): UsageEvidence {
  if (coverage >= STRONG_THRESHOLD) return 'strong';
  if (coverage >= WEAK_THRESHOLD) return 'weak';
  return 'none';
}

function combineEvidence(pixel: UsageEvidence, role: VisionRole): UsageEvidence {
  // Visible on screen according to Vision → promote to strong. Even if the
  // pixel pass missed it (e.g. colour appears only inside a hero image and
  // our histogram collapsed it into a nearby palette entry), if Claude
  // confirms it's a brand element we trust that.
  if (role === 'primary' || role === 'cta' || role === 'accent' || role === 'surface') {
    return 'strong';
  }
  // Vision says "decorative" or "none" → keep the pixel verdict as the
  // source of truth. Decorative ≈ weak; none ≈ none.
  if (role === 'decorative' && pixel === 'none') return 'weak';
  return pixel;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

function normaliseHex(raw: string | undefined): string | null {
  if (!raw) return null;
  const clean = raw.trim().replace(/^#/, '').toUpperCase();
  if (/^[0-9A-F]{6}$/.test(clean)) return `#${clean}`;
  return null;
}

// ─── Vision-pass prompt ───────────────────────────────

interface VisionVerdictEntry {
  hex: string;
  role: VisionRole;
  reasoning: string;
}

interface VisionResponse {
  verdicts: VisionVerdictEntry[];
}

const VISION_SYSTEM_PROMPT = `You are evaluating brand color usage on a live webpage. You are given screenshots of the site and a list of hex colour values that the CSS scanner found. For every hex, inspect the screenshots and judge whether — and how — that colour appears on visible branded elements.

Valid roles:
- "primary"     : dominant brand colour (large CTA buttons, logo wordmark, headline accents, filled primary areas above the fold)
- "cta"         : secondary action colour (alternative buttons, hover states clearly shown)
- "accent"      : small decorative accent (icon fills, tags, chips, stats callouts)
- "surface"     : large background or card surface (tinted sections, promo bands)
- "decorative"  : barely visible (thin borders, shadows, subtle separators)
- "none"        : NOT visible on any provided screenshot. The colour is almost certainly unused framework or plugin chrome.

Be honest: pick "none" whenever you cannot locate the colour on the visible page. Do not guess based on the hex alone. A colour named like an error/success token but not visible anywhere must still get "none".`;

function buildVisionUserPrompt(hexes: string[]): string {
  return `Evaluate usage for these ${hexes.length} hex values:
${hexes.map((h) => `- ${h}`).join('\n')}

Return JSON with this exact shape:
{
  "verdicts": [
    { "hex": "#RRGGBB", "role": "primary|cta|accent|surface|decorative|none", "reasoning": "short visual evidence — where you saw it, or why you didn't" }
  ]
}

Rules:
- One entry per hex, same hexes I gave you, character-for-character.
- "reasoning" should cite a visible element ("top-right CTA button", "hero background tint", "not visible on any screenshot").
- Do not invent colours that aren't in my list.`;
}

async function runVisionPass(
  hexes: string[],
  screenshots: PageScreenshot[],
): Promise<VisionResponse> {
  // createClaudeStructuredCompletion accepts images as buffers. Reuse the
  // same image plumbing the Visual Identity call uses.
  const images = screenshots.map((s) => ({ buffer: s.buffer, mediaType: s.mediaType }));
  return await createClaudeStructuredCompletion<VisionResponse>(
    VISION_SYSTEM_PROMPT,
    buildVisionUserPrompt(hexes),
    { temperature: 0.1, maxTokens: 2048, images, timeoutMs: 90_000 },
  );
}

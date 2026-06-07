// =============================================================
// Negative prompts — Pattern A van image-quality-chain (ADR pending).
//
// Default-template + per-workspace extension via Brandstyleguide.imageryDonts.
// Wordt naar image-providers gestuurd als native parameter (FAL: `negative_prompt`,
// Gemini Image: prompt-text fallback want geen native param).
//
// Vóór deze module werd `imageryDonts` via `ctx.brandImageryStyle` als
// "Avoid: x; y; z" segment in de positive-prompt geinjecteerd. Met deze module
// gaat het signaal via een dedicated kanaal — sterker effect + minder cognitive
// load op de positive-prompt parser.
// =============================================================

/**
 * Default negative-prompt segments. Worden op elke image-generation gehecht
 * tenzij expliciet uitgeschakeld via `includeDefaults: false`.
 *
 * Reflecteert industry-standard exclusions (Midjourney / SDXL / FLUX community
 * consensus voor commerciële brand-content):
 * - `competitor logos`: voorkomt cross-brand pollutie wanneer Compose source-
 *   imagery brand-elementen bevat van derden
 * - `blurry, low quality, low resolution`: vraagt model om sharp output ipv
 *   stock-blur-look
 * - `watermark, signature, text artifacts`: voorkomt AI-hallucinated overlays
 *   die op stock-source-watermarks lijken
 * - `distorted faces, malformed hands, extra limbs`: pre-DALLE-3/FLUX-2 issues
 *   die nog steeds incidenteel terugkomen
 * - `oversaturated, harsh lighting`: voorkomt over-stylized lifestyle look
 */
const DEFAULT_NEGATIVE_SEGMENTS: readonly string[] = [
  "competitor logos",
  "blurry",
  "low quality",
  "low resolution",
  "watermark",
  "signature",
  "text artifacts",
  "distorted faces",
  "malformed hands",
  "extra limbs",
  "oversaturated",
  "harsh lighting",
  // Eén samenhangend beeld afdwingen — modellen (nano-banana-pro) maken anders
  // soms een collage/triptiek. User-eis: altijd 1 volledige afbeelding per visual.
  "collage",
  "triptych",
  "diptych",
  "split screen",
  "multi-panel",
  "grid layout",
  "image divided into panels",
  "side-by-side frames",
  "internal borders or seams",
];

export interface BuildNegativePromptOptions {
  /**
   * Per-workspace exclusions uit `Brandstyleguide.imageryDonts`. Worden ge-append
   * na de defaults. Lege array of undefined → alleen defaults.
   */
  brandImageryDonts?: string[];
  /**
   * Default-template uitschakelen. Voor edge-cases waar de gebruiker volledige
   * controle wil (bv. illustration-flow waar "competitor logos" niet relevant
   * is). Default false — defaults staan altijd aan.
   */
  includeDefaults?: boolean;
  /**
   * User-typed exclusions detected in briefingText / styleDirectionFreeText
   * via patterns like "no X", "no X in background", "without X", "avoid X",
   * "geen X". Routed to negative so the positive prompt stays a clean
   * subject description.
   */
  userNegations?: string[];
}

// Patterns that capture user-typed negation in briefing/free-text. Lower-case
// match; the captured group (1) is the thing to avoid. Order matters —
// longer phrases first so "no X in background" beats "no X".
const NEGATION_PATTERNS: Array<{ re: RegExp; group: number }> = [
  { re: /\bno\s+([a-z][a-z0-9 \-']{1,40}?)\s+in\s+(?:the\s+)?background\b/gi, group: 1 },
  { re: /\bgeen\s+([a-z][a-z0-9 \-']{1,40}?)\s+op\s+(?:de\s+)?achtergrond\b/gi, group: 1 },
  { re: /\bwithout\s+(?:any\s+)?([a-z][a-z0-9 \-']{1,40})\b/gi, group: 1 },
  { re: /\bzonder\s+([a-z][a-z0-9 \-']{1,40})\b/gi, group: 1 },
  { re: /\bavoid\s+(?:any\s+)?([a-z][a-z0-9 \-']{1,40})\b/gi, group: 1 },
  { re: /\bvermijd\s+([a-z][a-z0-9 \-']{1,40})\b/gi, group: 1 },
  { re: /\bno\s+([a-z][a-z0-9 \-']{1,40})\b/gi, group: 1 },
  { re: /\bgeen\s+([a-z][a-z0-9 \-']{1,40})\b/gi, group: 1 },
];

/**
 * Extract negation phrases from free-form briefing text. Strips "no X" /
 * "without X" / "avoid X" / Dutch equivalents and returns the captured
 * objects so the caller can route them to the negative-prompt slot.
 *
 * Conservative: keeps phrases short (max 40 chars per capture) and skips
 * obvious sentence-end punctuation. Returns an empty array when no patterns
 * match — caller can pass through to the default-only negative.
 */
export function extractUserNegations(...texts: Array<string | null | undefined>): string[] {
  const collected: string[] = [];
  const seen = new Set<string>();
  for (const raw of texts) {
    if (!raw) continue;
    for (const { re, group } of NEGATION_PATTERNS) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(raw)) !== null) {
        const captured = m[group]?.trim().replace(/[.,;:!?]+$/, '');
        if (!captured || captured.length < 2) continue;
        const key = captured.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push(captured);
      }
    }
  }
  return collected;
}

/**
 * Build het complete negative-prompt voor een image-generation call.
 *
 * Output is een comma-separated string die direct als `negative_prompt` parameter
 * naar FAL kan, of als directive ("avoid: ...") in de prompt-text voor Gemini.
 */
export function buildNegativePrompt(options: BuildNegativePromptOptions = {}): string {
  const { brandImageryDonts = [], includeDefaults = true, userNegations = [] } = options;

  const segments: string[] = [];
  if (includeDefaults) {
    segments.push(...DEFAULT_NEGATIVE_SEGMENTS);
  }

  for (const dont of brandImageryDonts) {
    const trimmed = dont.trim();
    if (trimmed.length > 0) segments.push(trimmed);
  }

  // User-typed negations parsed from briefingText / styleDirectionFreeText
  // come last — most specific wins position-wise on providers that respect
  // ordering.
  for (const neg of userNegations) {
    const trimmed = neg.trim();
    if (trimmed.length > 0) segments.push(trimmed);
  }

  return segments.join(", ");
}

/**
 * Voor providers zonder native negative-prompt parameter (Gemini Image): geef
 * een prompt-text directive terug die geconcatenateerd kan worden met de
 * positive prompt.
 */
export function formatNegativeAsPromptDirective(negativePrompt: string): string {
  if (!negativePrompt.trim()) return "";
  return ` Avoid: ${negativePrompt}.`;
}

/**
 * Public re-export voor tests + UI-preview ("dit gaat het model krijgen").
 */
export const NEGATIVE_PROMPT_DEFAULTS = DEFAULT_NEGATIVE_SEGMENTS;

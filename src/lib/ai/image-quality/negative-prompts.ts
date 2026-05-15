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
}

/**
 * Build het complete negative-prompt voor een image-generation call.
 *
 * Output is een comma-separated string die direct als `negative_prompt` parameter
 * naar FAL kan, of als directive ("avoid: ...") in de prompt-text voor Gemini.
 */
export function buildNegativePrompt(options: BuildNegativePromptOptions = {}): string {
  const { brandImageryDonts = [], includeDefaults = true } = options;

  const segments: string[] = [];
  if (includeDefaults) {
    segments.push(...DEFAULT_NEGATIVE_SEGMENTS);
  }

  for (const dont of brandImageryDonts) {
    const trimmed = dont.trim();
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

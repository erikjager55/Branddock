// =============================================================
// Prompt Context Builder
//
// Appends brand context tags, Do's, and Don'ts to a user prompt
// for AI image generation. Used by the AI Studio generate route
// so every provider (Imagen, DALL-E, fal.ai, trained LoRAs)
// receives the same brand-aware prompt.
// =============================================================

export interface PromptContextParts {
  /** Raw user prompt */
  prompt: string;
  /** Selected brand context tags (e.g. "teal", "minimal", "confident") */
  brandTags?: string[];
  /** Optional resolved workspace brand summary (visual style only) */
  brandSummary?: string;
  /** "Do's" guideline — what MUST appear in the image */
  dos?: string;
  /** "Don'ts" guideline — what to AVOID */
  donts?: string;
  /** Brand name — used only when the prompt explicitly mentions logo/brand name */
  brandName?: string;
  /** Logo description + guidelines — injected when the prompt asks for logo/brand */
  logoContext?: string;
}

/** Keywords that signal the user wants the brand name or logo visible in the image */
const BRAND_REQUEST_KEYWORDS = /\b(logo|brand\s*name|merknaam|merk\s*naam|branded|with\s+(?:the\s+)?(?:brand|logo|name)|met\s+(?:het\s+)?(?:merk|logo|naam))\b/i;

/**
 * Detect whether the user prompt explicitly asks for logo or brand name.
 */
function promptRequestsBranding(prompt: string): boolean {
  return BRAND_REQUEST_KEYWORDS.test(prompt);
}

/**
 * Build a final prompt by concatenating the user's prompt with
 * brand context and style guidelines. Returns the raw prompt
 * unchanged when no context is provided.
 *
 * IMPORTANT: Image generation models interpret ALL text as visual
 * instructions. Brand names, product names, and textual identifiers
 * are excluded by default — they would be rendered as text-on-clothing,
 * signage, or logos in the generated image.
 *
 * EXCEPTION: When the user explicitly asks for logo or brand name
 * (detected via keywords), the brand name and logo guidelines from
 * the brandstyle are injected instead.
 */
export function buildPromptWithContext(parts: PromptContextParts): string {
  const segments: string[] = [parts.prompt.trim()];

  const wantsBranding = promptRequestsBranding(parts.prompt);

  const tags = parts.brandTags?.map((t) => t.trim()).filter(Boolean) ?? [];
  if (tags.length > 0) {
    segments.push(`Visual mood: ${tags.join(', ')}.`);
  }

  if (parts.brandSummary?.trim()) {
    segments.push(parts.brandSummary.trim());
  }

  const dos = parts.dos?.trim();
  if (dos) {
    segments.push(`MUST include: ${dos}.`);
  }

  const donts = parts.donts?.trim();
  if (donts) {
    segments.push(`AVOID: ${donts}.`);
  }

  if (wantsBranding) {
    // User explicitly asked for brand/logo — inject brand name + logo guidelines
    if (parts.logoContext?.trim()) {
      segments.push(parts.logoContext.trim());
    } else if (parts.brandName?.trim()) {
      segments.push(`Brand name to display: "${parts.brandName.trim()}".`);
    }
  } else {
    // Default: prevent accidental text rendering
    segments.push('Do not include any visible text, logos, brand names, or watermarks in the image.');
  }

  return segments.join(' ');
}

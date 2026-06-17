// =============================================================
// Image Briefing Defaults — per content-type
//
// Maps content-type → recommended visual brief starting point
// (source + style chip + suggested model + 1-line rationale).
//
// Source: docs/audits/2026-05-08-canvas-image-briefing-plan.md Laag 4
// (23 content-types). Defaults are SUGGESTIONS — never auto-applied.
// User keeps full control via "Use defaults" / "Customize" buttons.
// =============================================================

import type { VisualBriefSource, VisualStyleDirection } from '@/lib/ai/canvas-context';

export interface ImageBriefingDefaults {
  source: VisualBriefSource;
  /** May be null for sources that don't take a chip (e.g. trained-style) */
  styleDirection: VisualStyleDirection | null;
  /** Display-only model hint — actual routing happens server-side via selectModelForStyle */
  modelHint: string;
  /** 1-sentence reason — shown in suggestion strip + tooltip */
  rationale: string;
}

const DEFAULTS: Record<string, ImageBriefingDefaults> = {
  // ── Social Media ─────────────────────────────────────────
  'linkedin-post': {
    source: 'generate',
    styleDirection: 'lifestyle',
    modelHint: 'FLUX 2 Pro',
    rationale: 'LinkedIn feed converts better with human context than with product shots',
  },
  'linkedin-article': {
    source: 'generate',
    styleDirection: 'lifestyle',
    modelHint: 'FLUX 2 Pro',
    rationale: 'Long-form thought leadership leans on narrative imagery, not product',
  },
  'linkedin-ad': {
    source: 'generate',
    styleDirection: 'product-shot',
    modelHint: 'GPT Image 2',
    rationale: 'Ads convert better with a clear product focus + a brand-text-accurate model',
  },
  'instagram-post': {
    source: 'generate',
    styleDirection: 'lifestyle',
    modelHint: 'FLUX 2 Pro',
    rationale: 'IG feed = lifestyle/aesthetic; a persona shot lands stronger than product',
  },
  'social-carousel': {
    source: 'generate',
    styleDirection: 'infographic',
    modelHint: 'GPT Image 2',
    rationale: 'Carousel = step-by-step → infographic style with crisp text rendering',
  },
  // tiktok-script default fallback van trained-style → lifestyle.
  // Reden (decision 2026-05-08): Better Brands pilot heeft (vermoedelijk)
  // nog geen Replicate LoRA-getrainde modellen geseed. Trained-style
  // faalt dan met workspace-zonder-models error. Pilot-veiligheid eerst;
  // bij wel-getrainde-models in workspace kunnen we de default later
  // flippen via runtime check.
  'tiktok-script': {
    source: 'generate',
    styleDirection: 'lifestyle',
    modelHint: 'FLUX 2 Pro',
    rationale: 'UGC style fits, but trained-style requires a trained LoRA — falling back to lifestyle is pilot-safe',
  },
  'facebook-post': {
    source: 'library',
    styleDirection: 'lifestyle',
    modelHint: 'Library asset',
    rationale: 'FB leaves less room for production — a library pick is a realistic first pass',
  },

  // ── Email ────────────────────────────────────────────────
  newsletter: {
    source: 'generate',
    styleDirection: 'lifestyle',
    modelHint: 'FLUX 2 Pro',
    rationale: 'A lifestyle header image works better than a product shot in the inbox',
  },
  'welcome-sequence': {
    source: 'generate',
    styleDirection: 'illustration',
    modelHint: 'Recraft V3',
    rationale: 'Onboarding emails need friendly/illustrated imagery — not heavily produced',
  },
  'promotional-email': {
    source: 'generate',
    styleDirection: 'product-shot',
    modelHint: 'GPT Image 2',
    rationale: 'Promo = product front and center; text rendering needed for packaging/labels',
  },

  // ── Long-Form / Blog ─────────────────────────────────────
  'blog-post': {
    source: 'generate',
    styleDirection: 'illustration',
    modelHint: 'Recraft V3',
    rationale: 'An editorial blog hero is illustration > photo; sets you apart from generic stock-photo websites',
  },
  whitepaper: {
    source: 'generate',
    styleDirection: 'infographic',
    modelHint: 'GPT Image 2',
    rationale: 'Tech content = data viz, headline numbers, structured layout',
  },

  // ── Web Pages ────────────────────────────────────────────
  // landing-page default = compose. Bij lege library: geen silent fallback —
  // UI moet expliciet melding tonen "Bibliotheek leeg, fallback naar plain
  // generate. Upload assets om compose te gebruiken." Zie decision
  // 2026-05-08. Compose-zonder-assets-handling leeft in ComposePicker, niet
  // hier; deze defaults-mapping suggereert alleen het uitgangspunt.
  'landing-page': {
    source: 'compose',
    styleDirection: 'lifestyle',
    modelHint: 'FLUX Pro Kontext (compose)',
    rationale: 'A landing hero deserves compose: persona + product + setting fused together',
  },
  'product-page': {
    source: 'generate',
    styleDirection: 'product-shot',
    modelHint: 'GPT Image 2',
    rationale: 'Product shot with text-accurate packaging — the standard here',
  },

  // ── Sales / Decks ────────────────────────────────────────
  'case-study': {
    source: 'library',
    styleDirection: 'behind-the-scenes',
    modelHint: 'Library asset',
    rationale: 'A case study leans on real customer photos > AI generation',
  },
  'one-pager': {
    source: 'generate',
    styleDirection: 'data-driven',
    modelHint: 'GPT Image 2',
    rationale: 'A sales one-pager = chart-led editorial with numbers prominent',
  },
  'sales-deck': {
    source: 'generate',
    styleDirection: 'infographic',
    modelHint: 'GPT Image 2',
    rationale: 'Per-slide infographic > photo; supports the explanatory function',
  },
  'proposal-template': {
    source: 'generate',
    styleDirection: 'quote-text',
    modelHint: 'GPT Image 2',
    rationale: 'Cover = quote/headline-led, not illustrative',
  },

  // ── PR / Comms ───────────────────────────────────────────
  'press-release': {
    source: 'library',
    styleDirection: 'lifestyle',
    modelHint: 'Library asset',
    rationale: 'PR calls for verifiable imagery; a library asset > generated',
  },
  'media-pitch': {
    source: 'library',
    styleDirection: 'behind-the-scenes',
    modelHint: 'Library asset',
    rationale: 'Authenticity > production — same as PR',
  },
  'career-page': {
    source: 'library',
    styleDirection: 'behind-the-scenes',
    modelHint: 'Library asset',
    rationale: 'Real team photos beat AI generation for employer branding',
  },
  'job-ad-copy': {
    source: 'library',
    styleDirection: 'behind-the-scenes',
    modelHint: 'Library asset',
    rationale: 'Real team photos beat AI generation for employer branding',
  },
  'employee-story': {
    source: 'library',
    styleDirection: 'behind-the-scenes',
    modelHint: 'Library asset',
    rationale: 'Real team photos beat AI generation for employer branding',
  },
  'internal-comms': {
    source: 'generate',
    styleDirection: 'illustration',
    modelHint: 'Recraft V3',
    rationale: 'Internal can be illustrated; a photo feels forced',
  },
  'impact-report': {
    source: 'generate',
    styleDirection: 'data-driven',
    modelHint: 'GPT Image 2',
    rationale: 'Chart-led editorial, headline numbers',
  },
};

/**
 * Return the recommended visual-brief defaults for a content-type, or
 * `null` if the content-type has no curated defaults yet (graceful
 * fallback — UI then shows no suggestion strip).
 */
export function getContentTypeImageDefaults(
  contentType: string | null | undefined,
): ImageBriefingDefaults | null {
  if (!contentType) return null;
  return DEFAULTS[contentType] ?? null;
}

/**
 * Aspect-ratio is derived from the medium-config (LinkedIn → 16:9, IG →
 * 1:1, TikTok → 9:16) at render time. Suggested aspect-ratio per content-type
 * surfaces a sensible UI hint for the strip — not enforced.
 */
const ASPECT_HINTS: Record<string, string> = {
  'linkedin-post': '1:1 or 1.91:1',
  'linkedin-article': '1.91:1',
  'linkedin-ad': '1.91:1',
  'instagram-post': '1:1',
  'social-carousel': '1:1',
  'tiktok-script': '9:16',
  'facebook-post': '1.91:1',
  newsletter: '2:1 (header)',
  'welcome-sequence': '2:1 (header)',
  'promotional-email': '2:1 (header)',
  'blog-post': '16:9 (hero)',
  whitepaper: '16:9 (hero)',
  'landing-page': '16:9 (hero)',
  'product-page': '4:3 (product)',
  'case-study': '16:9 (hero)',
  'one-pager': '4:5 (vertical)',
  'sales-deck': '16:9 (slide)',
  'proposal-template': '4:5 (cover)',
  'press-release': '4:3 (newsroom)',
  'media-pitch': '4:3 (newsroom)',
  'career-page': '16:9 (hero)',
  'job-ad-copy': '1:1 (social)',
  'employee-story': '4:3',
  'internal-comms': '4:3',
  'impact-report': '16:9 (hero)',
};

export function getContentTypeAspectHint(contentType: string | null | undefined): string | null {
  if (!contentType) return null;
  return ASPECT_HINTS[contentType] ?? null;
}

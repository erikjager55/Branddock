/**
 * Gedeelde image-prompt-builders voor de landing-page hero-visual.
 *
 * Geëxtraheerd uit LandingPageGenerateBlock zodat zowel de variant-confirm-flow
 * (Step 2) als de self-heal in PuckPageBuilder (Step 3) exact dezelfde hero-
 * prompt produceren. Pure functie — geen React, geen DOM.
 */
import { computeBrandRenderHints } from '@/lib/landing-pages/brand-render-rules';
import type { BrandTokens } from '@/lib/landing-pages/brand-tokens';
import type { ImageBrief } from '@/lib/landing-pages/variant-schema';

/** Minimale variant-shape die de hero-prompt nodig heeft. */
export interface HeroPromptVariant {
  hero: { headline: string; subhead: string; imageBrief?: ImageBrief | null };
}

/** Minimale context-shape die de hero-prompt nodig heeft. */
export interface HeroPromptContext {
  brand?: {
    brandImageryStyle?: string | null;
    brandImageryDonts?: string[] | null;
    brandName?: string | null;
  } | null;
  brandTokens?: BrandTokens;
}

/**
 * Bouwt de hero-visual image-prompt: één samenhangende full-frame foto, geënt op
 * de scraped brand-fotografie (tier 1) of de archetype-default (tier 2), met de
 * brand-imagery-donts als negatieve laag. Dwingt expliciet één beeld af (geen
 * collage/triptiek) conform user-eis.
 */
export function buildHeroVisualInstruction(
  variant: HeroPromptVariant,
  contextStack: HeroPromptContext | null,
): string {
  const brand = contextStack?.brand;
  const tokens = contextStack?.brandTokens;
  const hints = tokens
    ? computeBrandRenderHints(tokens.archetype, tokens.designSystem)
    : null;
  const parts: string[] = [];
  parts.push(`Hero-visual for landing-page about: ${variant.hero.headline}`);
  parts.push(`Subject context: ${variant.hero.subhead}`);
  // Fase 5 (audit 2026-06-10): wanneer de copy-LLM een hero-imageBrief leverde
  // draagt die het concrete onderwerp + de compositie — specifieker dan
  // headline/subhead alleen.
  const heroBrief = variant.hero.imageBrief;
  if (heroBrief) {
    parts.push(`The photograph depicts: ${heroBrief.subject}`);
    if (heroBrief.composition?.trim()) parts.push(heroBrief.composition.trim());
  }
  // User-eis: ALTIJD één volledige afbeelding — geen collage/triptiek.
  parts.push('A SINGLE cohesive full-frame photograph — one continuous scene. NOT a collage, triptych, diptych, split-screen, grid, or multi-panel layout; no internal borders, seams, or dividers between sections');
  const photographyFragment = tokens?.photography?.promptFragment?.trim();
  if (photographyFragment) {
    parts.push(photographyFragment);
  } else if (hints) {
    parts.push(`Photography style: ${hints.heroImagePromptFragment}`);
  }
  // Hero is een single-image context: de scraped compositie kwam van een echte
  // hero-foto en is hier legitiem (feature-prompts krijgen 'm bewust NIET —
  // R1-split). Bewust BUITEN de fragment-branch: een scrape mét compositie maar
  // zónder mood (leeg fragment → archetype-fallback) behoudt zo de compositie
  // (review-3 2026-06-10). Bij een hero-brief wint de brief-compositie.
  const compositionFragment = tokens?.photography?.compositionFragment?.trim();
  if (compositionFragment && !heroBrief) parts.push(compositionFragment);
  if (brand?.brandImageryStyle) parts.push(`Brand imagery: ${brand.brandImageryStyle}`);
  // GEEN `Brand: ${brandName}`-segment meer (W0 logo-fix, plan §5 T1): een kale
  // merknaam-token primet het model om een pseudo-wordmark op objecten te
  // renderen — de merk-look reist al via brandTokens.photography + anchors.
  // Onconditionele unbranded-guard: het hero-pad had als enige géén
  // text/logo-guard; modellen hallucineren branding op bussen/gevels/schorten.
  parts.push('No text, no logos, no brand marks or lettering on objects, clothing, vehicles or signage — plain, unbranded surfaces');
  // Donts staan bewust NIET meer in de positive prompt: ze reizen via het
  // dedicated negative-kanaal van de route, dat sinds de R6-fix óók op
  // nano-banana werkt (prompt-directive-fallback in fal-client). In-prompt
  // herhalen zou ze dupliceren vlak bij de model-cap (review 2026-06-10).
  // brief.avoid blijft in-prompt (specifiek, klein) en de generieke fallback
  // alleen wanneer er géén donts via het negative-kanaal meereizen.
  const hasDonts = (brand?.brandImageryDonts?.length ?? 0) > 0;
  if (heroBrief?.avoid?.trim()) {
    parts.push(`Avoid: ${heroBrief.avoid.trim()}`);
  } else if (!hasDonts) {
    parts.push('Avoid: stock photo people, generic SaaS illustrations, text overlays, lens flares');
  }
  // generate-visual capt instruction op 1000 (zod) — word-safe clampen zodat
  // een lange brief/headline-combinatie nooit een 400 geeft (review 2026-06-10).
  const instruction = parts.join('. ') + '.';
  if (instruction.length <= 1000) return instruction;
  // Fallback-tak knipt op 999 vóór de punt-append: een spatieloze staart gaf
  // anders exact 1001 chars en alsnog een 400 (review-4 2026-06-10).
  const sliced = instruction.slice(0, 999);
  const lastSpace = sliced.lastIndexOf(' ');
  const cut = (lastSpace > 800 ? sliced.slice(0, lastSpace) : sliced).trim().replace(/[,;:]$/, '');
  return `${cut}.`.slice(0, 1000);
}

/**
 * @deprecated Fase 3 (audit 2026-06-10-lp-feature-image-diversity): beide
 * callsites (confirm-flow + gap-fill) sturen nu feature-copy naar de route,
 * die server-side bouwt via src/lib/landing-pages/feature-visual-prompts.ts
 * (scene-templates + sibling-differentiatie + seeds). Verwijderen zodra de
 * legacy prompts-payload van de route uitgefaseerd is.
 */
export function buildFeatureVisualInstruction(
  feature: { heading?: string; body?: string },
  pageHeadline: string,
  contextStack: HeroPromptContext | null,
): string {
  const brand = contextStack?.brand;
  const tokens = contextStack?.brandTokens;
  const hints = tokens ? computeBrandRenderHints(tokens.archetype, tokens.designSystem) : null;
  const parts: string[] = [];
  parts.push(`Editorial feature image illustrating "${feature.heading ?? ''}" for a landing-page about: ${pageHeadline}`);
  if (feature.body) parts.push(`Depicting: ${feature.body}`);
  parts.push('Close-up material or in-context shot (real texture, real setting) — no text, no UI, no infographic, no logo');
  parts.push('A SINGLE cohesive full-frame photograph — one continuous scene, NOT a collage/triptych/split-panel/grid; no internal borders or seams');
  const photographyFragment = tokens?.photography?.promptFragment?.trim();
  if (photographyFragment) parts.push(photographyFragment);
  else if (hints) parts.push(`Photography style: ${hints.heroImagePromptFragment}`);
  if (brand?.brandImageryStyle) parts.push(`Brand imagery: ${brand.brandImageryStyle}`);
  // W0 logo-fix: geen merknaam-token in image-prompts (pseudo-wordmark-trigger).
  const donts = brand?.brandImageryDonts;
  parts.push(donts && donts.length > 0 ? `Avoid: ${donts.join(', ')}` : 'Avoid: stock photo people, generic SaaS illustrations, text overlays, lens flares');
  return parts.join('. ') + '.';
}

/**
 * Gedeelde image-prompt-builders voor de landing-page hero-visual.
 *
 * Geëxtraheerd uit LandingPageGenerateBlock zodat zowel de variant-confirm-flow
 * (Step 2) als de self-heal in PuckPageBuilder (Step 3) exact dezelfde hero-
 * prompt produceren. Pure functie — geen React, geen DOM.
 */
import { computeBrandRenderHints } from '@/lib/landing-pages/brand-render-rules';
import type { BrandTokens } from '@/lib/landing-pages/brand-tokens';

/** Minimale variant-shape die de hero-prompt nodig heeft. */
export interface HeroPromptVariant {
  hero: { headline: string; subhead: string };
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
  // User-eis: ALTIJD één volledige afbeelding — geen collage/triptiek.
  parts.push('A SINGLE cohesive full-frame photograph — one continuous scene. NOT a collage, triptych, diptych, split-screen, grid, or multi-panel layout; no internal borders, seams, or dividers between sections');
  const photographyFragment = tokens?.photography?.promptFragment?.trim();
  if (photographyFragment) {
    parts.push(photographyFragment);
    // Hero is een single-image context: de scraped compositie kwam van een
    // echte hero-foto en is hier legitiem. Feature-prompts krijgen 'm bewust
    // NIET (R1-split, audit 2026-06-10).
    const compositionFragment = tokens?.photography?.compositionFragment?.trim();
    if (compositionFragment) parts.push(compositionFragment);
  } else if (hints) {
    parts.push(`Photography style: ${hints.heroImagePromptFragment}`);
  }
  if (brand?.brandImageryStyle) parts.push(`Brand imagery: ${brand.brandImageryStyle}`);
  if (brand?.brandName) parts.push(`Brand: ${brand.brandName}`);
  const donts = brand?.brandImageryDonts;
  if (donts && donts.length > 0) {
    parts.push(`Avoid: ${donts.join(', ')}`);
  } else {
    parts.push('Avoid: stock photo people, generic SaaS illustrations, text overlays, lens flares');
  }
  return parts.join('. ') + '.';
}

/**
 * Bouwt de per-feature image-prompt: een editorial materiaal-/in-context-shot die
 * de feature illustreert, geënt op de brand-fotografie (zelfde tiers als de hero).
 * `pageHeadline` geeft het onderwerp van de pagina als context. Geëxtraheerd zodat
 * zowel de confirm-flow (Step 2) als de gap-fill in Step 3 dezelfde prompt geven.
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
  if (brand?.brandName) parts.push(`Brand: ${brand.brandName}`);
  const donts = brand?.brandImageryDonts;
  parts.push(donts && donts.length > 0 ? `Avoid: ${donts.join(', ')}` : 'Avoid: stock photo people, generic SaaS illustrations, text overlays, lens flares');
  return parts.join('. ') + '.';
}

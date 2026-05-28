/**
 * Brand-render-rules — pure decision-functies voor brand-emergent rendering
 * (Pad C Sub-Sprint B Phase 2).
 *
 * Combineert BrandArchetype + LayoutStyle + DesignSystem + BrandContextBlock
 * tot visuele render-hints die Puck-component renderers consumeren.
 * Centraliseert design-decisions zodat 8 componenten consistent zijn per brand.
 *
 * Geen side-effects, pure functies. Single source-of-truth voor:
 *   - Hero-background type
 *   - Tekst-positie + alignment
 *   - Typography-emphasis (size-scale uit designSystem)
 *   - Button-shape (radius-keuze uit designSystem.radius)
 *   - Card-elevation (shadow/border-stijl)
 *   - Image-prompt fragments per archetype
 *   - Section-vertical-padding intensity
 */

import type { BrandArchetype } from "./brand-archetype-classifier";
import type { DesignSystem, LayoutStyle } from "./design-system";

// ─── Render-hint types ────────────────────────────────────

export type HeroBackground =
  | "full-bleed-image"      // foto met overlay-gradient (Zwarthout-style, premium/luxe)
  | "solid-brand"            // brand-color als hero-bg (klassiek SaaS)
  | "solid-surface"          // wit/light hero met serif (Apple-style editorial)
  | "gradient-brand";        // brand-color gradient (modern playful)

export type TextAlignment = "left" | "center" | "right";
export type TextVerticalPosition = "top" | "center" | "bottom";

export interface HeroLayout {
  background: HeroBackground;
  textAlignment: TextAlignment;
  textVerticalPosition: TextVerticalPosition;
  /** Hero gebruikt 100vh of natural-height? */
  fullViewportHeight: boolean;
  /** Overlay-gradient opacity (0-1) — alleen voor full-bleed-image. */
  overlayOpacity: number;
}

export type ButtonShape = "sharp" | "rounded" | "pill";

export interface ButtonStyle {
  shape: ButtonShape;
  radiusPx: number;
  paddingX: number;
  paddingY: number;
  fontWeight: number;
  textTransform: "uppercase" | "none";
  letterSpacing: string;
  /** Toon underline-on-hover ipv background-shift? */
  underlineHover: boolean;
}

export type TypographyEmphasis = "sparse" | "standard" | "dense" | "dramatic";

export interface DisplayTypography {
  /** px size uit designSystem.typography.display.sizes. */
  size: number;
  weight: number;
  lineHeight: number;
  letterSpacing: string;
}

export type CardElevation = "flat" | "border-only" | "subtle-shadow" | "strong-shadow";

export interface CardStyle {
  elevation: CardElevation;
  radiusPx: number;
  borderWidth: number;
  paddingX: number;
  paddingY: number;
}

// ─── Decision-functies ────────────────────────────────────

/**
 * Hero-layout: hoe ziet de hero-sectie eruit.
 *
 * Beslissingsmatrix:
 *  - RULER / MAGICIAN: full-bleed met overlay (premium drama)
 *  - EXPLORER / HERO / LOVER: full-bleed (immersieve photography)
 *  - SAGE / CARETAKER: solid-surface (helder, expert)
 *  - INNOCENT / JESTER: gradient-brand (vriendelijk, kleurrijk)
 *  - REGULAR_GUY / CREATOR: solid-brand (toegankelijk)
 *  - OUTLAW: full-bleed met sterke overlay (rebellie)
 * Plus LayoutStyle-overlay: COMMERCIAL → meer solid; MINIMAL/EDITORIAL → meer full-bleed.
 */
/** Fase C — hero-pattern uit vision-AI heeft hoogste prioriteit; archetype +
 *  layoutStyle blijven als fallback. */
export type HeroPatternKey =
  | "CENTERED_EDITORIAL"
  | "IMAGE_RIGHT_SPLIT"
  | "IMAGE_LEFT_SPLIT"
  | "FULL_BLEED_IMAGE"
  | "VIDEO_BG"
  | "TEXT_LEFT_FORM_RIGHT";

export function pickHeroLayout(
  archetype: BrandArchetype | null,
  layoutStyle: LayoutStyle,
  heroPattern?: HeroPatternKey | null,
  /** Optional flag: heeft de bron donkere bg-sections? Wanneer FALSE en
   *  archetype zou normaal full-bleed-image kiezen: val terug op
   *  solid-surface — een light-only website moet niet ineens een dark
   *  scrim hero krijgen alleen omdat zijn archetype MAGICIAN is. */
  hasDarkSections?: boolean,
  /** Optional flag: is de brand-color vibrant-saturated (accent-territory)?
   *  Wanneer TRUE EN hasDarkSections=false: brand is light-design oriented
   *  (Better Brands), full-bleed scrim klopt niet. Wanneer FALSE: brand
   *  is gedempt (LINFI Luxe Gold), full-bleed werkt natuurlijk. */
  brandIsVibrant?: boolean,
): HeroLayout {
  // Fase C — bron-pattern wint over archetype-default. Mapt direct naar
  // HeroLayout-config zonder door archetype-fallbacks heen te lopen.
  if (heroPattern) {
    switch (heroPattern) {
      case "CENTERED_EDITORIAL":
        return { background: "solid-surface", textAlignment: "center", textVerticalPosition: "center", fullViewportHeight: false, overlayOpacity: 0 };
      case "IMAGE_RIGHT_SPLIT":
      case "IMAGE_LEFT_SPLIT":
        // Renderer ondersteunt 2-column hero nog niet structureel; voor nu
        // val terug op solid-surface met left-aligned tekst (closest match).
        // Fase E voegt 2-column template toe.
        return { background: "solid-surface", textAlignment: "left", textVerticalPosition: "center", fullViewportHeight: false, overlayOpacity: 0 };
      case "FULL_BLEED_IMAGE":
        return { background: "full-bleed-image", textAlignment: "left", textVerticalPosition: "bottom", fullViewportHeight: true, overlayOpacity: 0.65 };
      case "VIDEO_BG":
        return { background: "full-bleed-image", textAlignment: "center", textVerticalPosition: "center", fullViewportHeight: true, overlayOpacity: 0.55 };
      case "TEXT_LEFT_FORM_RIGHT":
        return { background: "solid-surface", textAlignment: "left", textVerticalPosition: "center", fullViewportHeight: false, overlayOpacity: 0 };
    }
  }

  const fullBleedArchetypes: BrandArchetype[] = [
    "RULER", "MAGICIAN", "EXPLORER", "HERO", "LOVER", "OUTLAW",
  ];
  const surfaceArchetypes: BrandArchetype[] = ["SAGE", "CARETAKER"];
  const gradientArchetypes: BrandArchetype[] = ["INNOCENT", "JESTER"];

  // LayoutStyle override: COMMERCIAL forceert solid-brand voor conversie-focus
  if (layoutStyle === "COMMERCIAL") {
    return {
      background: "solid-brand",
      textAlignment: "center",
      textVerticalPosition: "center",
      fullViewportHeight: false,
      overlayOpacity: 0,
    };
  }
  if (layoutStyle === "PLAYFUL") {
    return {
      background: archetype && gradientArchetypes.includes(archetype) ? "gradient-brand" : "solid-brand",
      textAlignment: "center",
      textVerticalPosition: "center",
      fullViewportHeight: false,
      overlayOpacity: 0,
    };
  }

  // Archetype-driven voor MINIMAL/EDITORIAL/EXPERIENTIAL. MAAR: full-bleed
  // wordt automatisch een dark-scrim hero. Voor VIBRANT-brand sites ZONDER
  // dark-section evidence (= light-only design met accent-kleur, zoals
  // Better Brands) is dat een directe mismatch — val terug op solid-surface.
  // GEDEMPTE-brand sites (LINFI Luxe Gold) blijven full-bleed-eligible
  // omdat hun design natuurlijk dark-photography met overlay kan dragen.
  if (archetype && fullBleedArchetypes.includes(archetype)) {
    const isLightOnlyVibrantBrand = brandIsVibrant === true && hasDarkSections === false;
    if (isLightOnlyVibrantBrand) {
      // Vibrant + light-only design → centered editorial style
      return {
        background: "solid-surface",
        textAlignment: layoutStyle === "EXPERIENTIAL" ? "center" : "left",
        textVerticalPosition: "center",
        fullViewportHeight: false,
        overlayOpacity: 0,
      };
    }
    return {
      background: "full-bleed-image",
      textAlignment: layoutStyle === "EXPERIENTIAL" ? "center" : "left",
      textVerticalPosition: "bottom",
      fullViewportHeight: layoutStyle === "MINIMAL" || layoutStyle === "EXPERIENTIAL",
      overlayOpacity: archetype === "OUTLAW" ? 0.85 : 0.65,
    };
  }
  if (archetype && surfaceArchetypes.includes(archetype)) {
    return {
      background: "solid-surface",
      textAlignment: "left",
      textVerticalPosition: "center",
      fullViewportHeight: false,
      overlayOpacity: 0,
    };
  }
  if (archetype && gradientArchetypes.includes(archetype)) {
    return {
      background: "gradient-brand",
      textAlignment: "center",
      textVerticalPosition: "center",
      fullViewportHeight: false,
      overlayOpacity: 0,
    };
  }

  // Default fallback: solid-brand classic
  return {
    background: "solid-brand",
    textAlignment: "center",
    textVerticalPosition: "center",
    fullViewportHeight: false,
    overlayOpacity: 0,
  };
}

/**
 * Button-style: radius/shape/typography uit designSystem geconsulteerd.
 *
 * MINIMAL/EDITORIAL → sharp (radius 0)
 * COMMERCIAL → rounded
 * PLAYFUL → pill (radius 999)
 * EXPERIENTIAL → rounded subtle
 *
 * Plus archetype-modulatie:
 *  - RULER / SAGE / MAGICIAN: uppercase letterSpacing 0.08-0.12em (premium feel)
 *  - JESTER / INNOCENT / REGULAR_GUY: lowercase normal letterSpacing
 *  - HERO / EXPLORER: uppercase weight 700+ (bold action)
 */
export function pickButtonStyle(
  archetype: BrandArchetype | null,
  designSystem: DesignSystem,
): ButtonStyle {
  const { radius, spacing } = designSystem;
  const isPremiumOrAuthority = archetype !== null && ["RULER", "SAGE", "MAGICIAN"].includes(archetype);
  const isPlayfulOrFriendly = archetype !== null && ["JESTER", "INNOCENT", "REGULAR_GUY", "LOVER"].includes(archetype);
  const isBold = archetype !== null && ["HERO", "EXPLORER", "OUTLAW"].includes(archetype);

  const shape: ButtonShape = radius.button === 0 ? "sharp" : radius.button >= 999 ? "pill" : "rounded";
  const fontWeight = isBold ? 700 : isPremiumOrAuthority ? 500 : 600;
  const textTransform: "uppercase" | "none" = isPlayfulOrFriendly ? "none" : "uppercase";
  const letterSpacing = isPremiumOrAuthority ? "0.1em" : isBold ? "0.06em" : isPlayfulOrFriendly ? "normal" : "0.05em";

  return {
    shape,
    radiusPx: radius.button,
    paddingX: spacing[Math.min(spacing.length - 1, 6)] ?? 24,
    paddingY: spacing[Math.min(spacing.length - 1, 3)] ?? 12,
    fontWeight,
    textTransform,
    letterSpacing,
    underlineHover: isPremiumOrAuthority && shape === "sharp",
  };
}

/**
 * Display-typography: kies size uit scale op basis van emphasis-niveau.
 *
 * Emphasis-mapping:
 *  - sparse (MINIMAL + RULER/MAGICIAN/SAGE): grootste size, lichtste weight
 *  - dramatic (EXPERIENTIAL + HERO/EXPLORER): grootste size, zwaarste weight
 *  - standard: middelste size, default weight
 *  - dense (COMMERCIAL + REGULAR_GUY/CREATOR): kleinere size, sterke weight
 */
export function pickDisplayTypography(
  archetype: BrandArchetype | null,
  designSystem: DesignSystem,
): DisplayTypography {
  const { typography, layoutStyle } = designSystem;
  const display = typography.display;
  const sizes = display.sizes;
  const weights = display.weights;

  const emphasis: TypographyEmphasis =
    layoutStyle === "EXPERIENTIAL" && archetype && ["HERO", "EXPLORER", "OUTLAW"].includes(archetype)
      ? "dramatic"
      : (layoutStyle === "MINIMAL" || layoutStyle === "EDITORIAL")
      && archetype && ["RULER", "MAGICIAN", "SAGE", "LOVER"].includes(archetype)
      ? "sparse"
      : layoutStyle === "COMMERCIAL" || layoutStyle === "PLAYFUL"
      ? "dense"
      : "standard";

  let size: number;
  let weight: number;
  if (emphasis === "dramatic") {
    size = sizes[sizes.length - 1];  // grootste
    weight = weights[weights.length - 1];  // zwaarste
  } else if (emphasis === "sparse") {
    size = sizes[Math.min(sizes.length - 1, 2)];  // op 1 na grootste
    weight = weights[0];  // lichtste
  } else if (emphasis === "dense") {
    size = sizes[Math.min(sizes.length - 1, 1)];  // tweede van onder
    weight = weights[Math.min(weights.length - 1, 1)];  // tweede sterkste
  } else {
    size = sizes[Math.floor(sizes.length / 2)];  // midden
    weight = weights[Math.floor(weights.length / 2)];
  }

  return {
    size,
    weight,
    lineHeight: display.lineHeight,
    letterSpacing: display.letterSpacing,
  };
}

/**
 * Card-style: elevation + radius voor cards (features, testimonials, pricing).
 *
 * RULER / MAGICIAN: border-only (sharp boundaries)
 * SAGE / CARETAKER: subtle-shadow (soft authority)
 * HERO / EXPLORER: flat (no decoration distraction)
 * JESTER / PLAYFUL: strong-shadow (3D playfulness)
 */
export function pickCardStyle(
  archetype: BrandArchetype | null,
  designSystem: DesignSystem,
): CardStyle {
  const { radius, spacing } = designSystem;
  const isPremium = archetype !== null && ["RULER", "MAGICIAN", "LOVER"].includes(archetype);
  const isSoftAuthority = archetype !== null && ["SAGE", "CARETAKER", "INNOCENT"].includes(archetype);
  const isPlayful = archetype !== null && ["JESTER", "CREATOR"].includes(archetype);

  const elevation: CardElevation = isPremium
    ? "border-only"
    : isSoftAuthority
    ? "subtle-shadow"
    : isPlayful
    ? "strong-shadow"
    : "flat";

  return {
    elevation,
    radiusPx: radius.card,
    borderWidth: elevation === "border-only" ? 1 : 0,
    paddingX: spacing[Math.min(spacing.length - 1, 5)] ?? 24,
    paddingY: spacing[Math.min(spacing.length - 1, 4)] ?? 16,
  };
}

/**
 * Section vertical-padding intensity. MINIMAL = veel ruimte; COMMERCIAL = tight.
 */
export function pickSectionVerticalPadding(designSystem: DesignSystem): number {
  const { spacing, layoutStyle } = designSystem;
  if (layoutStyle === "MINIMAL" || layoutStyle === "EXPERIENTIAL") {
    return spacing[Math.max(0, spacing.length - 2)]; // op 1 na grootste
  }
  if (layoutStyle === "EDITORIAL") {
    return spacing[Math.max(0, spacing.length - 3)];
  }
  return spacing[Math.max(0, spacing.length - 4)]; // COMMERCIAL/PLAYFUL: middelmatig
}

/**
 * Hero-image prompt-fragment per archetype + layoutStyle. Combine met brand-
 * imagery-style en variant-content voor full Anthropic-image-prompt.
 *
 * Returned waarde wordt geconcateneerd in image-prompt-builder (Phase B3).
 */
export function pickHeroImagePromptFragment(
  archetype: BrandArchetype | null,
  designSystem: DesignSystem,
): string {
  // designSystem.imageStrategy.heroPhotographyStyle is layoutStyle-based start
  const base = designSystem.imageStrategy.heroPhotographyStyle;

  // Archetype-overlay fragment
  const ARCHETYPE_VISUAL_HINTS: Record<BrandArchetype, string> = {
    INNOCENT: "bright, optimistic, natural light, soft tones",
    EXPLORER: "outdoor landscape, expansive horizon, sense of journey",
    SAGE: "clean composition, considered framing, thoughtful detail focus",
    HERO: "dynamic action, strong perspective, achievement-evoking",
    OUTLAW: "raw, gritty, unfiltered, contrast-heavy",
    MAGICIAN: "atmospheric, mysterious lighting, transformative quality",
    REGULAR_GUY: "candid, authentic, real-people moments, warm",
    LOVER: "intimate, sensual, soft focus, beautiful textures",
    JESTER: "playful, vibrant, joyful expressions, kinetic energy",
    CARETAKER: "warm, protective, gentle, human connection",
    CREATOR: "studio-craft, makers-hands, materials-focus, intentional",
    RULER: "premium, sophisticated, refined detail, luxurious",
  };

  if (!archetype) return base;
  return `${base}. Visual mood: ${ARCHETYPE_VISUAL_HINTS[archetype]}.`;
}

// ─── Composite render-hints ───────────────────────────────

export interface BrandRenderHints {
  heroLayout: HeroLayout;
  buttonStyle: ButtonStyle;
  displayTypography: DisplayTypography;
  cardStyle: CardStyle;
  sectionPadding: number;
  heroImagePromptFragment: string;
}

/**
 * Compute alle render-hints in één call. Renderers krijgen één bundel
 * ipv elke decision-functie apart aanroepen.
 */
export function computeBrandRenderHints(
  archetype: BrandArchetype | null,
  designSystem: DesignSystem,
  heroPattern?: HeroPatternKey | null,
  hasDarkSections?: boolean,
  brandIsVibrant?: boolean,
): BrandRenderHints {
  return {
    heroLayout: pickHeroLayout(archetype, designSystem.layoutStyle, heroPattern, hasDarkSections, brandIsVibrant),
    buttonStyle: pickButtonStyle(archetype, designSystem),
    displayTypography: pickDisplayTypography(archetype, designSystem),
    cardStyle: pickCardStyle(archetype, designSystem),
    sectionPadding: pickSectionVerticalPadding(designSystem),
    heroImagePromptFragment: pickHeroImagePromptFragment(archetype, designSystem),
  };
}

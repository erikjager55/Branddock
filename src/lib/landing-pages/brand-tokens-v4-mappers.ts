/**
 * BrandTokens v4 mappers (verbeterplan Fase C).
 *
 * Mapt de gepersisteerde rendering-profiles (Fase B Json velden) naar de
 * concrete BrandTokens v4 sub-shapes. Per mapper Tier-1/2/3 fallback:
 *   1. Scraped data (waar aanwezig)
 *   2. Archetype + layoutStyle defaults (computeBrandRenderHints +
 *      designSystem-preset)
 *   3. Hard defaults uit DEFAULT_BRAND_TOKENS
 *
 * Pure functions — geen DB, geen DOM. Caller (extractBrandTokensFromStyleguide)
 * combineert ze met de v3 role-tokens.
 */
import type {
  ButtonTokens,
  ElevationTokens,
  IconographyTokens,
  SectionRhythmTokens,
  MotionTokens,
  PhotographyTokens,
  TextTokens,
} from "./brand-tokens";
import type { LayoutStyle, DesignSystem } from "./design-system";
import type { BrandArchetype } from "./brand-archetype-classifier";

// ─── Unit parsing ─────────────────────────────────────────

/** Convert "16px" / "1rem" / "0.5em" → numeriek px (rem/em assume 16px base). */
function pxFromCssValue(raw: string | null | undefined, fallback: number): number {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)(px|rem|em)?$/i);
  if (!match) return fallback;
  const num = parseFloat(match[1]);
  const unit = (match[2] ?? "px").toLowerCase();
  if (unit === "px") return Math.round(num);
  if (unit === "rem" || unit === "em") return Math.round(num * 16);
  return fallback;
}

function numberFromCssValue(raw: string | null | undefined, fallback: number): number {
  if (!raw) return fallback;
  const num = parseFloat(raw.trim());
  return Number.isFinite(num) ? num : fallback;
}

// ─── Button tokens ────────────────────────────────────────

interface ScrapedButtonStyleLike {
  selector?: string;
  role?: "primary" | "secondary" | "ghost" | "unknown";
  paddingY?: string | null;
  paddingX?: string | null;
  fontWeight?: string | null;
  fontSize?: string | null;
  textTransform?: string | null;
  letterSpacing?: string | null;
  borderRadius?: string | null;
  hoverBackground?: string | null;
  hoverTransform?: string | null;
  background?: string | null;
}

function pickPrimaryButton(buttonProfile: unknown): ScrapedButtonStyleLike | null {
  if (!Array.isArray(buttonProfile)) return null;
  const buttons = buttonProfile as ScrapedButtonStyleLike[];
  // Prefer primary > secondary > unknown > ghost; binnen rol-groep mergen
  // we alle samples zodat ontbrekende velden door later-matchende samples
  // worden ingevuld (eerste-rule heeft vaak niet alle properties).
  const order: ScrapedButtonStyleLike["role"][] = ["primary", "secondary", "unknown", "ghost"];
  for (const target of order) {
    const matches = buttons.filter((b) => b.role === target);
    if (matches.length === 0) continue;
    return mergeButtonSamples(matches);
  }
  return null;
}

function mergeButtonSamples(samples: ScrapedButtonStyleLike[]): ScrapedButtonStyleLike {
  const merged: ScrapedButtonStyleLike = { ...samples[0] };
  for (const sample of samples) {
    if (!merged.paddingY && sample.paddingY) merged.paddingY = sample.paddingY;
    if (!merged.paddingX && sample.paddingX) merged.paddingX = sample.paddingX;
    if (!merged.fontWeight && sample.fontWeight) merged.fontWeight = sample.fontWeight;
    if (!merged.fontSize && sample.fontSize) merged.fontSize = sample.fontSize;
    if (!merged.textTransform && sample.textTransform) merged.textTransform = sample.textTransform;
    if (!merged.letterSpacing && sample.letterSpacing) merged.letterSpacing = sample.letterSpacing;
    if (!merged.borderRadius && sample.borderRadius) merged.borderRadius = sample.borderRadius;
    if (!merged.background && sample.background) merged.background = sample.background;
    if (!merged.hoverBackground && sample.hoverBackground) merged.hoverBackground = sample.hoverBackground;
    if (!merged.hoverTransform && sample.hoverTransform) merged.hoverTransform = sample.hoverTransform;
  }
  return merged;
}

function inferHoverStyle(
  btn: ScrapedButtonStyleLike | null,
  archetype: BrandArchetype | null,
): ButtonTokens["hoverStyle"] {
  if (btn?.hoverTransform && /scale|translateY/.test(btn.hoverTransform)) {
    return "scale";
  }
  if (btn?.hoverBackground && btn?.background) {
    // Heuristic: lichter hover = lighten; donkerder = darken
    return inferLuminanceDelta(btn.background, btn.hoverBackground);
  }
  // Archetype default
  if (archetype === "RULER" || archetype === "SAGE" || archetype === "MAGICIAN") return "darken";
  if (archetype === "JESTER" || archetype === "INNOCENT") return "scale";
  return "darken";
}

function inferLuminanceDelta(from: string, to: string): "darken" | "lighten" {
  // Crude check via hex-luminance
  const fromLum = quickLum(from);
  const toLum = quickLum(to);
  if (toLum > fromLum) return "lighten";
  return "darken";
}

function quickLum(color: string): number {
  const hex = color.replace(/^#/, "").match(/^([0-9a-f]{6})$/i)?.[1];
  if (!hex) return 0.5;
  const n = parseInt(hex, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function mapButtonTokens(
  buttonProfile: unknown,
  archetype: BrandArchetype | null,
  fallback: ButtonTokens,
): ButtonTokens {
  const btn = pickPrimaryButton(buttonProfile);
  if (!btn) return fallback;

  return {
    paddingY: pxFromCssValue(btn.paddingY, fallback.paddingY),
    paddingX: pxFromCssValue(btn.paddingX, fallback.paddingX),
    radiusPx: pxFromCssValue(btn.borderRadius, fallback.radiusPx),
    fontWeight: numberFromCssValue(btn.fontWeight, fallback.fontWeight),
    fontSize: pxFromCssValue(btn.fontSize, fallback.fontSize),
    textTransform: normalizeTextTransform(btn.textTransform, fallback.textTransform),
    letterSpacing: btn.letterSpacing ?? fallback.letterSpacing,
    hoverStyle: inferHoverStyle(btn, archetype),
  };
}

function normalizeTextTransform(
  raw: string | null | undefined,
  fallback: ButtonTokens["textTransform"],
): ButtonTokens["textTransform"] {
  if (!raw) return fallback;
  const lower = raw.toLowerCase().trim();
  if (lower === "uppercase" || lower === "lowercase" || lower === "capitalize" || lower === "none") {
    return lower as ButtonTokens["textTransform"];
  }
  return fallback;
}

// ─── Elevation tokens ─────────────────────────────────────

interface ElevationProfileLike {
  samples?: Array<{ raw: string; category: string }>;
  dominantCategory?: "none" | "subtle-shadow" | "medium-shadow" | "strong-shadow";
}

interface RadiusProfileLike {
  cardTypical?: string | null;
}

export function mapElevationTokens(
  elevationProfile: unknown,
  radiusProfile: unknown,
  fallback: ElevationTokens,
): ElevationTokens {
  const elev = (elevationProfile as ElevationProfileLike | null) ?? null;
  const radius = (radiusProfile as RadiusProfileLike | null) ?? null;

  const dom = elev?.dominantCategory;
  let cardElevationCategory = fallback.cardElevationCategory;
  let cardShadow = fallback.cardShadow;

  if (dom === "none") {
    // Wanneer geen shadow → check of er border-only sample is
    cardElevationCategory = "flat";
    cardShadow = "none";
  } else if (dom === "subtle-shadow") {
    cardElevationCategory = "subtle-shadow";
    cardShadow = elev?.samples?.[0]?.raw ?? "0 2px 8px rgba(0,0,0,0.06)";
  } else if (dom === "medium-shadow" || dom === "strong-shadow") {
    cardElevationCategory = "strong-shadow";
    cardShadow = elev?.samples?.[0]?.raw ?? "0 8px 24px rgba(0,0,0,0.12)";
  }

  // Border-only heuristiek: als shadow=none EN radiusProfile.cardTypical bestaat
  // dan is het waarschijnlijk "border-only" (LINFI: shadow 0 0 0 1px = border-fake)
  const firstShadow = elev?.samples?.[0]?.raw ?? "";
  if (/^0\s+0\s+0\s+\d/.test(firstShadow)) {
    cardElevationCategory = "border-only";
    cardShadow = firstShadow;
  }

  return {
    cardShadow,
    cardBorderRadius: pxFromCssValue(radius?.cardTypical, fallback.cardBorderRadius),
    cardBorderWidth: cardElevationCategory === "border-only" ? 1 : 0,
    cardElevationCategory,
  };
}

// ─── Iconography tokens ───────────────────────────────────

export function mapIconographyTokens(
  archetype: BrandArchetype | null,
  layoutStyle: LayoutStyle,
  fallback: IconographyTokens,
): IconographyTokens {
  // Geen scraper-source vandaag voor iconography (Fase A4 was motion, niet
  // iconography). Pure archetype + layoutStyle mapping.
  let strokeWeight = fallback.strokeWeight;
  let sizeDefault = fallback.sizeDefault;

  // RULER/SAGE = dunne premium lijnen
  if (archetype === "RULER" || archetype === "SAGE" || archetype === "MAGICIAN") {
    strokeWeight = 1.25;
  }
  // JESTER/INNOCENT = bolder
  if (archetype === "JESTER" || archetype === "INNOCENT") {
    strokeWeight = 2;
  }

  // MINIMAL layouts = grotere iconen die ruimte vullen
  if (layoutStyle === "MINIMAL" || layoutStyle === "EDITORIAL") {
    sizeDefault = 32;
  }
  // COMMERCIAL = compact
  if (layoutStyle === "COMMERCIAL") {
    sizeDefault = 22;
  }

  return {
    strokeWeight,
    sizeDefault,
    style: "outline",
  };
}

// ─── SectionRhythm tokens ─────────────────────────────────

interface SpacingProfileLike {
  section?: { typical?: { paddingY?: string | null; paddingX?: string | null } | null };
  card?: { typical?: { paddingY?: string | null; paddingX?: string | null } | null };
}

export function mapSectionRhythmTokens(
  spacingProfile: unknown,
  designSystem: DesignSystem,
  fallback: SectionRhythmTokens,
): SectionRhythmTokens {
  const spacing = (spacingProfile as SpacingProfileLike | null) ?? null;
  const sectionTypical = spacing?.section?.typical ?? null;
  const cardTypical = spacing?.card?.typical ?? null;

  // Tier-2 fallback uit designSystem.spacing scale (index 5 = typical large)
  const dsLargeIdx = Math.min(designSystem.spacing.length - 1, 5);
  const dsMidIdx = Math.min(designSystem.spacing.length - 1, 3);
  const dsHorizontalIdx = Math.min(designSystem.spacing.length - 1, 4);
  const dsSection = designSystem.spacing[dsLargeIdx] ?? fallback.sectionPaddingY;
  const dsSectionX = designSystem.spacing[dsHorizontalIdx] ?? fallback.sectionPaddingX;
  const dsCard = designSystem.spacing[dsMidIdx] ?? fallback.cardPaddingY;

  return {
    sectionPaddingY: pxFromCssValue(sectionTypical?.paddingY, dsSection),
    sectionPaddingX: pxFromCssValue(sectionTypical?.paddingX, dsSectionX),
    cardPaddingY: pxFromCssValue(cardTypical?.paddingY, dsCard),
    cardPaddingX: pxFromCssValue(cardTypical?.paddingX, dsCard),
    alternateBg: designSystem.sectionAlternation.pattern.length > 1,
  };
}

// ─── Motion tokens ────────────────────────────────────────

interface MotionProfileLike {
  averageDurationMs?: number | null;
  dominantEasing?: string | null;
}

export function mapMotionTokens(
  motionProfile: unknown,
  fallback: MotionTokens,
): MotionTokens {
  const motion = (motionProfile as MotionProfileLike | null) ?? null;
  const avg = motion?.averageDurationMs ?? null;
  return {
    transitionDuration: avg !== null ? `${Math.round(avg)}ms` : fallback.transitionDuration,
    easing: motion?.dominantEasing ?? fallback.easing,
  };
}

// ─── Photography tokens ───────────────────────────────────

interface PhotographyStyleLike {
  mood?: string | null;
  subjects?: string | null;
  composition?: string | null;
}

export function mapPhotographyTokens(
  photographyStyle: unknown,
  fallback: PhotographyTokens,
): PhotographyTokens {
  const ps = (photographyStyle as PhotographyStyleLike | null) ?? null;
  if (!ps) return fallback;

  const mood = (ps.mood ?? "").trim() || null;
  const composition = (ps.composition ?? "").trim() || null;
  const subjects = (ps.subjects ?? "").trim() || null;

  // Build prompt-fragment voor image-gen: combineer beknopt voor max 200 chars
  const promptParts: string[] = [];
  if (mood) promptParts.push(`Photography mood: ${stripObservedPrefix(mood)}.`);
  if (composition) promptParts.push(`Composition: ${stripObservedPrefix(composition)}.`);
  if (subjects) promptParts.push(`Subjects: ${stripObservedPrefix(subjects)}.`);
  const promptFragment = promptParts.join(" ").slice(0, 500);

  return {
    mood,
    compositionStyle: composition,
    subjectMatter: subjects,
    promptFragment,
  };
}

function stripObservedPrefix(text: string): string {
  // Brandstyle-analyzer prefixt vaak "OBSERVED: ..." / "RECOMMENDED: ..."
  return text.replace(/^(observed|recommended|note):\s*/i, "").trim();
}

// ─── Text tokens (DTS C4) ─────────────────────────────────

interface TypographyRoleStyleLike {
  fontFamily?: string | null;
  fontSize?: string | null;
  fontWeight?: string | null;
  lineHeight?: string | null;
  letterSpacing?: string | null;
  textTransform?: string | null;
}

interface TypographyProfileLike {
  display?: TypographyRoleStyleLike;
  heading?: TypographyRoleStyleLike;
  subheading?: TypographyRoleStyleLike;
  body?: TypographyRoleStyleLike;
  label?: TypographyRoleStyleLike;
  button?: TypographyRoleStyleLike;
}

export function mapTextTokens(
  typographyProfile: unknown,
  onSurface: string,
  surfaceMuted: string,
  fallback: TextTokens,
): TextTokens {
  const typo = (typographyProfile as TypographyProfileLike | null) ?? null;

  // Heading: prefer scraped weight, default 700; color = onSurface (heading hierarchy)
  const headingWeight = numberFromCssValue(
    typo?.heading?.fontWeight ?? typo?.display?.fontWeight,
    fallback.heading.weight,
  );
  const bodyWeight = numberFromCssValue(typo?.body?.fontWeight, fallback.body.weight);
  const labelWeight = numberFromCssValue(typo?.label?.fontWeight, fallback.caption.weight);

  // Banner styling: prefer scraped label rules (uppercase + tracking),
  // anders archetype-default uit fallback.
  const bannerLetterSpacing =
    typo?.label?.letterSpacing ?? fallback.banner.letterSpacing;
  const bannerTextTransform =
    typo?.label?.textTransform === "uppercase"
      ? "uppercase"
      : (typo?.label?.textTransform === "none" ? "none" : fallback.banner.textTransform);
  const bannerFontSize =
    typo?.label?.fontSize
      ? pxFromCssValue(typo.label.fontSize, fallback.banner.fontSize)
      : fallback.banner.fontSize;

  return {
    heading: { color: onSurface, weight: headingWeight },
    body: { color: onSurface, weight: bodyWeight },
    // secondary + caption gebruiken surfaceMuted voor zwakker contrast
    secondary: { color: surfaceMuted, weight: bodyWeight },
    caption: { color: surfaceMuted, weight: labelWeight },
    banner: {
      fontSize: bannerFontSize,
      weight: numberFromCssValue(typo?.label?.fontWeight, fallback.banner.weight),
      letterSpacing: bannerLetterSpacing,
      textTransform: bannerTextTransform as "uppercase" | "none",
    },
  };
}

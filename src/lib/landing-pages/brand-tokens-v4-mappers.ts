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
  TypographyByRoleTokens,
  TypographyByRoleEntry,
} from "./brand-tokens";
import { relativeLuminance } from "./brand-tokens";
import type { LayoutStyle, DesignSystem } from "./design-system";

/**
 * Nullt een near-white button-background. Een wit/near-wit button-bg (bv. een
 * gescrapete link-style button) is onzichtbaar op de witte LP-pagina en geeft
 * een platte-tekst-CTA. Door null te returnen valt de renderer terug op
 * tokens.brand (blauw bij lichte hero) of wit (bij donkere hero) — beide geven
 * een zichtbare button-affordance (CTA-verbeterplan #6 affordance-floor).
 */
function nullIfNearWhite(color: string | null): string | null {
  if (!color) return null;
  const t = color.trim().toLowerCase();
  if (/^#?f{3}$/.test(t) || /^#?f{6}$/.test(t)) return null;
  if (/^rgba?\(\s*25[0-5]\s*,\s*25[0-5]\s*,\s*25[0-5]/.test(t)) return null;
  const lum = relativeLuminance(color);
  return Number.isFinite(lum) && lum > 0.9 ? null : color;
}
import type { BrandArchetype } from "./brand-archetype-classifier";
import { isNoOpBorder } from "./scraped-css-helpers";
import { stripFontWeightSuffix } from "@/lib/brandstyle/google-fonts-catalog";

// ─── Unit parsing ─────────────────────────────────────────

/** Convert "16px" / "1rem" / "0.5em" → numeriek px (rem/em assume 16px base). */
export function pxFromCssValue(raw: string | null | undefined, fallback: number): number {
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
  color?: string | null;
  fontFamily?: string | null;
  hoverBackground?: string | null;
  hoverColor?: string | null;
  hoverTransform?: string | null;
  background?: string | null;
  border?: string | null;
  transition?: string | null;
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
    if (!merged.color && sample.color) merged.color = sample.color;
    if (!merged.fontFamily && sample.fontFamily) merged.fontFamily = sample.fontFamily;
    if (!merged.hoverBackground && sample.hoverBackground) merged.hoverBackground = sample.hoverBackground;
    if (!merged.hoverColor && sample.hoverColor) merged.hoverColor = sample.hoverColor;
    if (!merged.hoverTransform && sample.hoverTransform) merged.hoverTransform = sample.hoverTransform;
    if (!merged.border && sample.border) merged.border = sample.border;
    if (!merged.transition && sample.transition) merged.transition = sample.transition;
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

  // Scraped color/bg/fontFamily — null als geen signal, anders rauwe waarde.
  // Skip 'transparent' / 'inherit' / CSS-vars (resolven we niet hier).
  const sanitizeColor = (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    const t = raw.trim().toLowerCase();
    if (!t || t === 'transparent' || t === 'inherit' || t === 'currentcolor' || t.startsWith('var(')) return null;
    // Alpha-0 hex (#rgba "#fff0" of #rrggbbaa "#ffffff00") en rgba(...,0) zijn
    // transparant — scrapers leveren dit voor kale <button>-resets. Behandel
    // als geen-signal zodat de renderer terugvalt op een zichtbare brand-fill.
    if (/^#[0-9a-f]{3}0$/.test(t) || /^#[0-9a-f]{6}00$/.test(t)) return null;
    if (/^rgba\([^)]*,\s*0(\.0+)?\s*\)$/.test(t)) return null;
    return raw;
  };
  const sanitizeFontFamily = (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    const t = raw.trim();
    if (!t || t.startsWith('var(') || /^(inherit|initial|unset)$/i.test(t)) return null;
    return raw;
  };
  const sanitizeBorder = (raw: string | null | undefined): string | null =>
    isNoOpBorder(raw) ? null : raw ?? null;
  const sanitizeTransition = (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    const t = raw.trim().toLowerCase();
    if (!t || t === 'none' || t.startsWith('var(')) return null;
    return raw;
  };

  // B1 (confidence-gating): negeer een gescrapete "button" die geen echte CTA
  // is en val terug op sane archetype-defaults i.p.v. tokens af te leiden van
  // rommel. Twee gevallen:
  //  1. Non-affordance reset: geen fill + geen border + geen padding (Napking
  //     #fff0 / padding 0 — een kale <button>-reset).
  //  2. Framework-default selector (.wp-block-button / .elementor-button /
  //     .wp-element-button) — een CMS-default-knop, geen merk-CTA.
  const hasFill = sanitizeColor(btn.background) !== null;
  const hasBorder = sanitizeBorder(btn.border) !== null;
  const padX = pxFromCssValue(btn.paddingX, 0);
  const padY = pxFromCssValue(btn.paddingY, 0);
  const isNonAffordance = !hasFill && !hasBorder && padX <= 0 && padY <= 0;
  const selector = typeof (btn as { selector?: unknown }).selector === 'string'
    ? ((btn as { selector: string }).selector).toLowerCase() : '';
  const isFrameworkDefault = /wp-block-button|elementor-button|wp-element-button/.test(selector);
  if (isNonAffordance || isFrameworkDefault) return fallback;

  return {
    paddingY: pxFromCssValue(btn.paddingY, fallback.paddingY),
    paddingX: pxFromCssValue(btn.paddingX, fallback.paddingX),
    radiusPx: pxFromCssValue(btn.borderRadius, fallback.radiusPx),
    fontWeight: numberFromCssValue(btn.fontWeight, fallback.fontWeight),
    fontSize: pxFromCssValue(btn.fontSize, fallback.fontSize),
    textTransform: normalizeTextTransform(btn.textTransform, fallback.textTransform),
    letterSpacing: btn.letterSpacing ?? fallback.letterSpacing,
    hoverStyle: inferHoverStyle(btn, archetype),
    // Conservatieve affordance-fix (behouden uit Fase 0): een near-white
    // scraped button-bg is onzichtbaar op de witte LP-pagina → null zodat de
    // renderer terugvalt op tokens.brand (light hero) of wit (dark hero).
    background: nullIfNearWhite(sanitizeColor(btn.background)),
    color: sanitizeColor(btn.color),
    fontFamily: sanitizeFontFamily(btn.fontFamily),
    border: sanitizeBorder(btn.border),
    transition: sanitizeTransition(btn.transition),
    hoverBackground: sanitizeColor(btn.hoverBackground),
    hoverColor: sanitizeColor(btn.hoverColor),
  };
}

/** Geometrie-velden uit een StyleguideComponent BUTTON-card (computed-style). */
export interface ComponentButtonLike {
  color: string | null;
  background: string | null;
  border: string | null;
  padding: string | null;
  borderRadius: string | null;
  fontSize: string | null;
  fontWeight: string | null;
  textTransform: string | null;
  letterSpacing: string | null;
  fontFamily: string | null;
}

/** Parse een CSS `padding`-shorthand naar {y, x} in px. */
function parsePaddingShorthand(raw: string | null): { y: number; x: number } | null {
  if (!raw) return null;
  const parts = raw.trim().split(/\s+/);
  if (parts.length === 0) return null;
  const y = pxFromCssValue(parts[0], NaN);
  // 1 waarde → alle zijden; ≥2 → top=parts[0], right=parts[1].
  const x = pxFromCssValue(parts[1] ?? parts[0], NaN);
  if (Number.isNaN(y) || Number.isNaN(x)) return null;
  return { y, x };
}

/**
 * Reconcilieert de buttonProfile-afgeleide ButtonTokens met de accurate
 * StyleguideComponent BUTTON-card (computed-style — exact wat de Components-tab
 * toont). De card wint per veld waar hij iets levert, zodat de LP-CTA 1-op-1
 * de échte merk-button (radius/border/gewicht/padding/grootte/kleur) volgt
 * i.p.v. archetype-presets. Geen card → ongewijzigde buttonProfile-tokens.
 */
export function reconcileButtonWithComponent(
  button: ButtonTokens,
  comp: ComponentButtonLike | null,
): ButtonTokens {
  if (!comp) return button;
  const pad = parsePaddingShorthand(comp.padding);
  const sanitize = (raw: string | null): string | null => {
    if (!raw) return null;
    const t = raw.trim().toLowerCase();
    if (!t || t === 'inherit' || t === 'currentcolor' || t.startsWith('var(')) return null;
    return raw;
  };
  return {
    ...button,
    radiusPx: comp.borderRadius != null ? pxFromCssValue(comp.borderRadius, button.radiusPx) : button.radiusPx,
    fontWeight: comp.fontWeight != null ? numberFromCssValue(comp.fontWeight, button.fontWeight) : button.fontWeight,
    fontSize: comp.fontSize != null ? pxFromCssValue(comp.fontSize, button.fontSize) : button.fontSize,
    paddingY: pad ? pad.y : button.paddingY,
    paddingX: pad ? pad.x : button.paddingX,
    textTransform: normalizeTextTransform(comp.textTransform, button.textTransform),
    letterSpacing: sanitize(comp.letterSpacing) ?? button.letterSpacing,
    // De card is de accurate kleur/affordance-bron: background/color/border winnen.
    background: sanitize(comp.background) ?? button.background,
    color: sanitize(comp.color) ?? button.color,
    border: isNoOpBorder(comp.border) ? button.border : (comp.border ?? button.border),
    fontFamily: sanitize(comp.fontFamily) ?? button.fontFamily,
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
  // Track 4 (rhythm): clamp ALLÉÉN de preset-fallback naar een strakke band
  // [40,56]. MINIMAL/EXPERIENTIAL leveren spacing[5]=64 → 128px lege band per
  // sectie (zwarthout's schaarse-ritmiek-symptoom); COMMERCIAL's 24 is te dun.
  // Een ECHT gescrapte section.paddingY (Tier-1 hieronder) passeert ongeclampt
  // → merk-fidelity behouden waar de scrape iets opleverde.
  const dsSection = Math.min(56, Math.max(40, designSystem.spacing[dsLargeIdx] ?? fallback.sectionPaddingY));
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

// Per-segment word-safe budgets (R2, audit 2026-06-10): één cap over de join
// liet segment-volgorde bepalen welke data overleefde — voor Napking viel
// exact het diverse Subjects-deel weg.
const PHOTOGRAPHY_MOOD_BUDGET = 200;
const PHOTOGRAPHY_COMPOSITION_BUDGET = 200;
const PHOTOGRAPHY_SUBJECT_BUDGET = 80; // per subjectPool-item

export function mapPhotographyTokens(
  photographyStyle: unknown,
  fallback: PhotographyTokens,
): PhotographyTokens {
  const ps = (photographyStyle as PhotographyStyleLike | null) ?? null;
  if (!ps) return fallback;

  const mood = stripAnalyzerMarkers(ps.mood) || null;
  const composition = stripAnalyzerMarkers(ps.composition) || null;
  const subjects = stripAnalyzerMarkers(ps.subjects) || null;

  // R1-split: het gedeelde fragment is stijl-only (mood). Compositie gaat
  // apart (alleen single-image contexten); subjects worden een per-slot
  // inspiratiepool — nooit meer een gedeelde prescriptieve staart.
  const promptFragment = mood
    ? truncateAtWordBoundary(`Photography mood: ${mood}.`, PHOTOGRAPHY_MOOD_BUDGET)
    : "";
  const compositionFragment = composition
    ? truncateAtWordBoundary(`Composition: ${composition}.`, PHOTOGRAPHY_COMPOSITION_BUDGET)
    : null;

  return {
    mood,
    compositionStyle: composition,
    subjectMatter: subjects,
    promptFragment,
    compositionFragment,
    subjectPool: parseSubjectPool(subjects),
  };
}

/**
 * Verwijder ALLE analyzer-markers (OBSERVED:/RECOMMENDED:/NOTE:) — de oude
 * variant stripte alleen het leading prefix waardoor mid-string markers de
 * image-prompts in lekten.
 */
function stripAnalyzerMarkers(text: string | null | undefined): string {
  return (text ?? "")
    .replace(/\b(observed|recommended|note):\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Word-safe truncatie: knip op laatste spatie binnen budget, nooit mid-woord. */
function truncateAtWordBoundary(text: string, budget: number): string {
  if (text.length <= budget) return text;
  const sliced = text.slice(0, budget);
  const lastSpace = sliced.lastIndexOf(" ");
  const cut = (lastSpace > budget * 0.6 ? sliced.slice(0, lastSpace) : sliced).trim().replace(/[,;:]$/, "");
  return cut.endsWith(".") ? cut : `${cut}.`;
}

/**
 * Parse scraped subjects-proza naar een lijst losse onderwerpen. Splitst op
 * komma/punt-komma/" and ", dropt te korte of te lange fragmenten.
 */
function parseSubjectPool(subjects: string | null): string[] {
  if (!subjects) return [];
  return subjects
    .split(/[,;]|\band\b|\ben\b/i)
    .map((s) => s.trim().replace(/^[-–•]\s*/, "").replace(/[.]+$/, ""))
    .filter((s) => s.length >= 4 && s.length <= PHOTOGRAPHY_SUBJECT_BUDGET)
    .slice(0, 12);
}

// ─── Typography per rol (DTS audit-fix) ──────────────────

interface TypographyRoleStyleSrc {
  fontFamily?: string | null;
  fontSize?: string | null;
  fontWeight?: string | null;
  lineHeight?: string | null;
  letterSpacing?: string | null;
  textTransform?: string | null;
  color?: string | null;
}

interface TypographyProfileSrc {
  display?: TypographyRoleStyleSrc;
  heading?: TypographyRoleStyleSrc;
  subheading?: TypographyRoleStyleSrc;
  body?: TypographyRoleStyleSrc;
  label?: TypographyRoleStyleSrc;
  button?: TypographyRoleStyleSrc;
}

/** E-1: saniteer een per-rol scraped font-family naar een bruikbare merk-naam,
 *  of null. Eerste naam uit de stack → quotes weg → weight-suffix strip ("Sen
 *  Bold"→"Sen") → drop generics/system/var(). Casing blijft (UI normaliseert). */
function sanitizeRoleFontFamily(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const first = raw.split(',')[0]?.trim().replace(/^["']|["']$/g, '').trim();
  if (!first) return null;
  const stripped = stripFontWeightSuffix(first).trim();
  if (!stripped) return null;
  const lower = stripped.toLowerCase();
  if (lower.includes('var(')) return null;
  const GENERIC = new Set([
    'system-ui', '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'roboto',
    'helvetica neue', 'arial', 'sans-serif', 'serif', 'monospace',
    'ui-sans-serif', 'ui-serif', 'ui-monospace', 'inherit', 'initial', 'unset',
  ]);
  if (GENERIC.has(lower)) return null;
  return stripped;
}

function toRoleEntry(src: TypographyRoleStyleSrc | undefined): TypographyByRoleEntry {
  if (!src) {
    return { fontSize: null, fontWeight: null, lineHeight: null, letterSpacing: null, textTransform: null, color: null, fontFamily: null };
  }
  const fontSize = src.fontSize ? pxFromCssValue(src.fontSize, 0) : 0;
  const fontWeight = src.fontWeight ? numberFromCssValue(src.fontWeight, 0) : 0;
  const tt = src.textTransform?.toLowerCase().trim();
  const validTt: TypographyByRoleEntry["textTransform"] =
    tt === "uppercase" || tt === "lowercase" || tt === "capitalize" || tt === "none"
      ? tt
      : null;
  // Color sanitize: skip CSS-vars (niet resolved in scrape-context) en
  // 'inherit' / 'currentColor' (waardeloos voor LP-render).
  const rawColor = src.color?.trim().toLowerCase();
  const validColor =
    rawColor &&
    !rawColor.startsWith('var(') &&
    rawColor !== 'inherit' &&
    rawColor !== 'currentcolor' &&
    rawColor !== 'transparent'
      ? src.color ?? null
      : null;
  // Var-guard op lineHeight/letterSpacing, symmetrisch met color/fontSize:
  // een (stale-DB) "var(--bs-body-line-height)" / inherit / unset is waardeloos
  // voor de LP-render en mag niet verbatim doorlekken (Fase 1 brand-fidelity).
  const guardTypoValue = (v: string | null | undefined): string | null => {
    if (!v) return null;
    const t = v.trim().toLowerCase();
    if (!t || t.includes('var(') || t === 'inherit' || t === 'unset' || t === 'initial') return null;
    return v;
  };
  return {
    fontSize: fontSize > 0 ? fontSize : null,
    fontWeight: fontWeight > 0 ? fontWeight : null,
    lineHeight: guardTypoValue(src.lineHeight),
    letterSpacing: guardTypoValue(src.letterSpacing),
    textTransform: validTt,
    color: validColor,
    fontFamily: sanitizeRoleFontFamily(src.fontFamily),
  };
}

export function mapTypographyByRoleTokens(
  typographyProfile: unknown,
  fallback: TypographyByRoleTokens,
): TypographyByRoleTokens {
  const src = (typographyProfile as TypographyProfileSrc | null) ?? null;
  if (!src) return fallback;
  return {
    display: toRoleEntry(src.display),
    heading: toRoleEntry(src.heading),
    subheading: toRoleEntry(src.subheading),
    body: toRoleEntry(src.body),
    label: toRoleEntry(src.label),
    button: toRoleEntry(src.button),
  };
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

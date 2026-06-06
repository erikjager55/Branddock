/**
 * Token-provenance — V1 van het governed-token-layer verbeterplan
 * (`docs/audits/2026-06-06-governed-token-layer-verbeterplan.md`).
 *
 * Een **sidecar** naast `BrandTokens`: per token-pad leggen we vast WAAR de
 * waarde vandaan komt (scrape / logo / user-override / archetype / preset /
 * fallback) en met welk vertrouwen. De resolve-functies in `brand-tokens.ts`
 * wéten hun tier al tijdens het resolven — deze module bewaart dat signaal
 * i.p.v. het weg te gooien.
 *
 * Provenance is **niet** in `BrandTokens` zelf opgenomen (houdt de platte
 * token-shape backward-compatible) en wordt **in-memory** teruggegeven door
 * `extractBrandTokensWithProvenance` — deterministisch uit de styleguide, dus
 * geen DB-persistentie nodig.
 *
 * Bouwt voort op:
 *  - V2 (preset-degradatie): `source === 'fallback'` is de poort waardoor een
 *    preset een token mag vullen.
 *  - V3 (provenance-footer): `source` + `confidence` + `evidence` voeden de
 *    dev-overlay en de data-quality-badge.
 *  - V4 (curatie-surface): de wizard toont `fallback`/`low` tokens eerst.
 */

/** Herkomst van een gerésolveerde token-waarde. */
export type TokenSource =
  /** Directe meting van de bron-website (scraped color/font/profile). */
  | 'scraped'
  /** Uit logo-kleurextractie — hoge merk-fidelity. */
  | 'logo'
  /** User-curated edit — heilig, presets mogen dit nooit overschrijven. */
  | 'override'
  /** Afgeleid uit archetype-heuristiek (bv. hover-strategie). */
  | 'archetype'
  /** designSystem/layoutStyle preset — geen merk-specifiek bewijs. */
  | 'preset'
  /** Auto-berekend uit een ander token (bv. onBrand via WCAG, brandSubtle). */
  | 'derived'
  /** `DEFAULT_BRAND_TOKENS` — scrape vond niets bruikbaars. */
  | 'fallback';

export type Confidence = 'high' | 'medium' | 'low';

export interface TokenOrigin {
  source: TokenSource;
  confidence: Confidence;
  /** Detector/mechanisme — 'logo', 'css-variable', 'frequency', 'usage-tag',
   *  'wcag-derived', 'archetype', … Voor diagnostiek + footer-copy. */
  detector?: string;
  /** Mens-leesbaar bewijs voor de footer/wizard — "brand-tag, high confidence"
   *  / "var(--bs-primary)" / "usage:hero-bg". */
  evidence?: string;
}

/** Keyed op token-pad: 'brand', 'surface', 'button', 'typographyByRole', … */
export type TokenProvenance = Record<string, TokenOrigin>;

/** Bron-velden die we nodig hebben om een color-origin af te leiden. Subset
 *  van `StyleguideColorLike` — losgekoppeld om circular imports te vermijden. */
export interface ColorOriginInput {
  confidence?: string | null;
  tags?: string[] | null;
  category?: string;
}

const CONFIDENCE_VALUES: ReadonlySet<string> = new Set(['high', 'medium', 'low']);

function normalizeConfidence(
  raw: string | null | undefined,
  fallback: Confidence,
): Confidence {
  const v = raw?.toLowerCase();
  return v && CONFIDENCE_VALUES.has(v) ? (v as Confidence) : fallback;
}

function hasTag(input: ColorOriginInput, needle: string): boolean {
  return (input.tags ?? []).some((t) => t.toLowerCase() === needle);
}

/** Schrijf een origin onder `path` (laatste schrijver wint — bewust, zodat een
 *  latere override-stap een eerdere scrape-origin kan overschrijven). */
export function recordOrigin(
  prov: TokenProvenance,
  path: string,
  origin: TokenOrigin,
): void {
  prov[path] = origin;
}

/**
 * Leid een origin af uit een gekozen StyleguideColor (of null = niets gevonden).
 * - color === null  → `fallback` (de renderer pakt een DEFAULT-waarde).
 * - logo-getagde kleur → `logo` (hoogste merk-fidelity).
 * - anders → `scraped`, met de color-confidence (default 'medium' als de
 *   scraper geen confidence-tag zette — een directe meting is geen low-signal).
 */
export function originFromColor(
  color: ColorOriginInput | null | undefined,
  opts?: { detector?: string; evidence?: string },
): TokenOrigin {
  if (!color) {
    return {
      source: 'fallback',
      confidence: 'low',
      detector: opts?.detector ?? 'default',
      evidence: opts?.evidence ?? 'geen scrape-signal — DEFAULT_BRAND_TOKENS',
    };
  }
  const isLogo = hasTag(color, 'logo') || hasTag(color, 'logo-extracted');
  const confidence = normalizeConfidence(color.confidence, 'medium');
  return {
    source: isLogo ? 'logo' : 'scraped',
    confidence: isLogo ? 'high' : confidence,
    detector: opts?.detector ?? (isLogo ? 'logo' : 'scraped-color'),
    evidence:
      opts?.evidence
      ?? `${color.category ?? 'color'}, ${confidence} confidence${isLogo ? ', logo-extracted' : ''}`,
  };
}

/**
 * Origin voor een v4-token-groep (button/elevation/sectionRhythm/motion/
 * typographyByRole/text): scraped wanneer de bron-profile aanwezig is, anders
 * preset (designSystem/archetype-default). Granulariteit = groep, niet veld —
 * voldoende voor V2's puck-config-gating en V3's footer; per-veld kan later.
 */
export function originFromProfile(
  profilePresent: boolean,
  opts?: { detector?: string; presetSource?: Extract<TokenSource, 'preset' | 'archetype'> },
): TokenOrigin {
  if (profilePresent) {
    return {
      source: 'scraped',
      confidence: 'medium',
      detector: opts?.detector ?? 'scraped-profile',
      evidence: 'scraped CSS-profile',
    };
  }
  return {
    source: opts?.presetSource ?? 'preset',
    confidence: 'low',
    detector: opts?.detector ?? 'designSystem-preset',
    evidence: 'geen scraped profile — preset/archetype-default',
  };
}

/** Origin voor een waarde die uit een ander token is afgeleid (onBrand via
 *  WCAG, brandSubtle via lighten). Erft confidence van de parent. */
export function derivedOrigin(
  parentPath: string,
  parent: TokenOrigin | undefined,
  detector: string,
): TokenOrigin {
  return {
    source: 'derived',
    confidence: parent?.confidence ?? 'medium',
    detector,
    evidence: `afgeleid uit ${parentPath} (${detector})`,
  };
}

/**
 * V2-poort — mag een preset/archetype-regel dit token-pad overschrijven?
 * Nee wanneer de waarde uit een directe meting of user-edit komt
 * (scraped/logo/override); ja wanneer er niets gescraped is (fallback) of er
 * geen provenance bekend is (context-only render-pad).
 *
 * NB: de `preferScraped`-helper uit het verbeterplan ging uit van een nog-niet-
 * geresolveerde `{value, origin}`-wrapper; in de renderer zijn tokens al plat
 * geresolveerd, dus een boolean-gate op de provenance past beter.
 */
export function isScrapedOrigin(
  provenance: TokenProvenance | undefined,
  path: string,
): boolean {
  const source = provenance?.[path]?.source;
  return source === 'scraped' || source === 'logo' || source === 'override';
}

/** Aggregaat voor de data-quality-badge (V3): tel tokens per zekerheidsklasse. */
export interface ProvenanceSummary {
  total: number;
  scraped: number;
  fallback: number;
  lowConfidence: number;
  /** Token-paden die aandacht nodig hebben (fallback OF low-confidence). */
  needsAttention: string[];
}

export function summarizeProvenance(prov: TokenProvenance): ProvenanceSummary {
  const paths = Object.keys(prov);
  const needsAttention: string[] = [];
  let scraped = 0;
  let fallback = 0;
  let lowConfidence = 0;
  for (const path of paths) {
    const o = prov[path];
    if (o.source === 'scraped' || o.source === 'logo' || o.source === 'override') scraped += 1;
    if (o.source === 'fallback') fallback += 1;
    if (o.confidence === 'low') lowConfidence += 1;
    if (o.source === 'fallback' || o.source === 'preset' || o.confidence === 'low') {
      needsAttention.push(path);
    }
  }
  return { total: paths.length, scraped, fallback, lowConfidence, needsAttention };
}

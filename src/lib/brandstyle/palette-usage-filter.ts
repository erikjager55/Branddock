/**
 * Usage-gedreven palet-filter (verbeterplan, 2026-06-05).
 *
 * Doel (user-eis): een kleur mag ALLEEN uit het palet vallen als hij
 * aantoonbaar NIET gebruikt wordt — niet op basis van een hardgecodeerde
 * hex-blocklist. De beslissing leunt op WERKELIJK RENDEREN, gemeten over
 * meerdere pagina's:
 *
 *   1. Multi-page computed-style aanwezigheid (`bulk-computed-styles`:
 *      `color` + `background-color` frequenties over álle zichtbare elementen
 *      op ~5 pagina's). Deterministisch, vangt ook kleine elementen (links,
 *      muted tekst) die een pixel-coverage-pass mist.
 *   2. Homepage pixel-pass usageEvidence (`color-usage-verifier`) als aanvulling.
 *
 * Regel:
 *   - Logo-kleuren en de structurele kleuren (donkerste tekst + lichtste
 *     surface) blijven ALTIJD.
 *   - Een framework-default-kleur (Bootstrap/WordPress — herkend via de
 *     bekende hex of een `framework`/`bootstrap`-tag) blijft alléén bij STERK
 *     gebruik (zwakke link-rendering van een default-kleur is geen merk-keuze).
 *   - Elke andere kleur blijft zodra hij ÉRGENS écht rendert (weak+).
 *   - Kleuren die op géén enkele geanalyseerde pagina renderen → drop.
 *   - Safety: nooit het hele palet wegfilteren.
 *
 * Pure module — deterministisch testbaar met fixtures.
 */
import { isFrameworkDefaultPrimary } from './framework-defaults';
import { isNonBrandColor } from './non-brand-colors';

export type RenderStrength = 'strong' | 'weak' | 'none';

export interface UsageFilterColor {
  hex: string;
  tags?: string[];
  detectorSource?: string | null;
  /** Palet-categorie (PRIMARY/SECONDARY/ACCENT/NEUTRAL/SEMANTIC) — voor de
   *  neutral-consolidatie. Optioneel; afwezig → niet als neutral behandeld. */
  category?: string;
}

/** Frequency-maps zoals `bulk-computed-styles` ze levert (waarde → count). */
export interface BulkColorStyles {
  color?: Record<string, number>;
  'background-color'?: Record<string, number>;
  'border-color'?: Record<string, number>;
}

/** RGB-Euclidische tolerantie voor "dezelfde kleur" (computed vs palet-hex).
 *  Gelijkgetrokken met color-usage-verifier (40) i.p.v. strenger 24, tegen
 *  logo-/quantisatie-drift (review-fix MINOR-2). */
const MATCH_TOLERANCE = 40;
/** STRENGE tolerantie voor framework-default-kleuren: een framework-default mag
 *  z'n "sterk gebruikt"-status NIET ontlenen aan een naburige (echt-gerenderde)
 *  kleur via de losse MATCH_TOLERANCE. Napking: Gutenberg-default #ABB8C3 ligt
 *  ~33 van de gerenderde Tailwind-grijs #9CA3AF (en slechts 7 van Bootstrap
 *  gray-500 #ADB5BD) en absorbeerde zo diens gebruik → false-strong. Een ECHT
 *  toegepaste framework-kleur rendert op z'n EXACTE computed-waarde (dist 0,
 *  computed color/bg/border zijn exacte RGB zonder anti-aliasing), dus 6 vangt
 *  rounding-drift maar sluit de 7-weg #ADB5BD-buur uit. */
const STRICT_FRAMEWORK_TOLERANCE = 6;
/** Aandeel-drempel waarboven computed-aanwezigheid als STERK telt. */
const STRONG_SHARE = 0.02;
/** Minimum aantal computed-kleur-samples vóór 'strong' überhaupt mogelijk is.
 *  Zonder deze floor wordt op een dunne pagina (weinig elementen) een paar
 *  framework-button-renders al 'strong' (share-noemer te klein) → under-drop
 *  van precies de framework-ruis die we willen weren (review-fix MAJOR-3). */
const MIN_STRONG_SAMPLES = 60;
/** Framework-tags (exact-token) die framework-herkomst markeren. */
const FRAMEWORK_TAGS = ['framework', 'bootstrap', 'wordpress', 'gutenberg', 'synced'];

interface Rgb { r: number; g: number; b: number }

function parseRgb(value: string): Rgb | null {
  const v = value.trim().toLowerCase();
  const rgbMatch = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return { r: +rgbMatch[1], g: +rgbMatch[2], b: +rgbMatch[3] };
  }
  let hex = v.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (/^[0-9a-f]{6}$/.test(hex)) {
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
  }
  return null;
}

function dist(a: Rgb, b: Rgb): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function lightness(rgb: Rgb): number {
  // Perceptueel-gewogen luminantie (0-255).
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}

/**
 * Bouwt een totaal-frequentie + een lijst van (rgb, count) uit de computed
 * `color` + `background-color` maps. Niet-parsebare/transparante waarden worden
 * overgeslagen.
 */
export function buildRenderedColorIndex(bulk: BulkColorStyles | null | undefined): {
  entries: Array<{ rgb: Rgb; count: number }>;
  total: number;
} {
  const entries: Array<{ rgb: Rgb; count: number }> = [];
  let total = 0;
  for (const map of [bulk?.color, bulk?.['background-color'], bulk?.['border-color']]) {
    if (!map) continue;
    for (const [value, count] of Object.entries(map)) {
      if (!count || count <= 0) continue;
      const lower = value.trim().toLowerCase();
      // Skip alléén `transparent` + rgba met ALPHA 0 — NIET rgb(r,g,0) waar het
      // blauw-kanaal toevallig 0 is (bv. oranje rgb(224,96,0) is volledig opaak!).
      if (lower === 'transparent') continue;
      const rgbaAlpha = lower.match(/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)$/);
      if (rgbaAlpha && parseFloat(rgbaAlpha[1]) === 0) continue;
      const rgb = parseRgb(value);
      if (!rgb) continue;
      entries.push({ rgb, count });
      total += count;
    }
  }
  return { entries, total };
}

/**
 * Renderkracht van een palet-hex op basis van de multi-page computed-aanwezigheid:
 * sommeert de counts van alle computed-kleuren binnen RGB-tolerantie en
 * vergelijkt het aandeel met STRONG_SHARE. Geen match → 'none'.
 */
export function renderStrength(
  hex: string,
  index: { entries: Array<{ rgb: Rgb; count: number }>; total: number },
  tolerance: number = MATCH_TOLERANCE,
): RenderStrength {
  const target = parseRgb(hex);
  if (!target || index.total === 0) return 'none';
  let matched = 0;
  for (const e of index.entries) {
    if (dist(e.rgb, target) <= tolerance) matched += e.count;
  }
  if (matched === 0) return 'none';
  // 'strong' vereist een aandeel ÉN voldoende samples — anders is een hoog
  // aandeel op te weinig data (dunne pagina) misleidend.
  if (index.total >= MIN_STRONG_SAMPLES && matched / index.total >= STRONG_SHARE) return 'strong';
  return 'weak';
}

const STRENGTH_RANK: Record<RenderStrength, number> = { none: 0, weak: 1, strong: 2 };
function strongest(a: RenderStrength, b: RenderStrength): RenderStrength {
  return STRENGTH_RANK[a] >= STRENGTH_RANK[b] ? a : b;
}

// Framework-default neutrale grijzen die op een puur-framework-site als default
// tekst/muted/border-grijs renderen zónder bewuste merk-kleur te zijn. Door ze
// als framework-default te herkennen moeten ze de STERKE-gebruik-lat halen; de
// echte tekst/surface overleven sowieso via structurele bescherming + sterk
// gebruik, maar een incidentele muted-grijs valt. Deterministisch, geen brittle
// blocklist: het auto-dropt niet — het verhoogt alleen de bewijslast naar
// "sterk gebruikt". Alléén NEUTRALE grijzen — framework-accent-defaults (WP
// #FF6900 oranje / #CF2E2E rood) overlappen merk-banden en horen hier NIET
// (zie cross-brand-audit: blokkeer nooit een merk-band-kleur).
const FRAMEWORK_NEUTRAL_HEXES = new Set(
  [
    // Bootstrap $gray-100..$gray-900 (Zwarthout: #6C757D = gray-600 = text-muted).
    '#F8F9FA', '#E9ECEF', '#DEE2E6', '#CED4DA', '#ADB5BD', '#6C757D', '#495057', '#343A40', '#212529',
    // WordPress/Gutenberg core default-palet neutraal ("Cyan bluish gray") —
    // Napking: #ABB8C3 lekte als LOW/other merk-neutral; AI tagt 'm niet
    // framework. Het enige neutrale grijs in het WP-core-palet.
    '#ABB8C3',
  ].map((h) => h.toLowerCase()),
);

// WordPress core admin-theme-kleur (`--wp-admin-theme-color`) + de officiële
// `-darker-10`/`-darker-20` varianten. Napking: #007CBA lekte als ACCENT
// "Deep Blue" terwijl het 0× in de gebruikte CSS staat (alléén de WP-block-var-
// declaratie). Usage-gegate net als de neutral-grijzen — een merk dat #007CBA
// bewust sterk gebruikt behoudt 'm. BEWUST framework-origin (usage-gated) en
// NIET de non-brand-hard-exclude: blauw kan met corporate-merk-blauw overlappen
// (cross-brand-les), dus we weren het alleen bij gebrek aan sterk gebruik.
const FRAMEWORK_ADMIN_HEXES = new Set(['#007CBA', '#006BA1', '#005A87'].map((h) => h.toLowerCase()));

function isFrameworkOrigin(c: UsageFilterColor): boolean {
  const tags = (c.tags ?? []).map((t) => t.toLowerCase());
  const hexL = c.hex.toLowerCase();
  return (
    isFrameworkDefaultPrimary(c.hex) ||
    FRAMEWORK_NEUTRAL_HEXES.has(hexL) ||
    FRAMEWORK_ADMIN_HEXES.has(hexL) ||
    tags.some((t) => FRAMEWORK_TAGS.includes(t))
  );
}

// Hex-bevestigde GELEAKTE framework-klassen: CMS-neutral-grijzen (Bootstrap/
// Gutenberg) + WordPress-admin-chrome-blauw. Dit zijn nooit een merk-hero-kleur
// (UI-chrome/grijs), dus mogen óók ZONDER usage-data vallen. Bewust NIET de
// saturated framework-default-PRIMARY-hexes (Bootstrap #0D6EFD / semantic): die
// kunnen een bewuste merk-kleur zijn → benefit-of-the-doubt tot data het
// tegendeel toont (review-fix: anders grayscalen we een Bootstrap-merk-palet).
function isFrameworkLeakHex(hex: string): boolean {
  const h = hex.toLowerCase();
  return FRAMEWORK_NEUTRAL_HEXES.has(h) || FRAMEWORK_ADMIN_HEXES.has(h);
}

function isLogoColor(c: UsageFilterColor): boolean {
  const tags = (c.tags ?? []).map((t) => t.toLowerCase());
  return /logo/.test((c.detectorSource ?? '').toLowerCase()) || tags.some((t) => t.includes('logo'));
}

export interface UsageFilterSignals {
  /** Multi-page computed `color`/`background-color` frequenties (of null als de
   *  component-screenshotter uit staat — dan telt alleen `usageEvidenceByHex`). */
  bulkColorStyles: BulkColorStyles | null;
  /** Homepage pixel-pass verdict per (genormaliseerde, uppercase) hex. */
  usageEvidenceByHex: Map<string, RenderStrength | undefined>;
}

/**
 * Bepaalt per kleur of hij behouden wordt, gegeven de multi-page usage-signalen.
 * Geeft de behouden kleuren terug (volgorde behouden). Nooit leeg: als alles zou
 * vallen, geeft het de originele lijst terug (safety).
 */
export function applyUsageDrivenPaletteFilter<T extends UsageFilterColor>(
  colors: T[],
  signals: UsageFilterSignals,
): T[] {
  if (colors.length === 0) return colors;
  const index = buildRenderedColorIndex(signals.bulkColorStyles);

  // Was er überhaupt usage-DATA? (multi-page scan gedraaid, of homepage pixel-
  // pass verdict aanwezig). Zonder data droppen we niets — afwezigheid van
  // bewijs is geen bewijs van afwezigheid.
  const hasMultiPage = index.total > 0;
  const usageOf = (hex: string): { strength: RenderStrength; known: boolean } => {
    const computed = hasMultiPage ? renderStrength(hex, index) : 'none';
    const pixel = signals.usageEvidenceByHex.get(hex.toUpperCase());
    const known = hasMultiPage || pixel !== undefined;
    return { strength: strongest(computed, pixel ?? 'none'), known };
  };
  const usageCache = new Map<string, { strength: RenderStrength; known: boolean }>();
  for (const c of colors) usageCache.set(c.hex.toUpperCase(), usageOf(c.hex));

  // Structurele bescherming: donkerste (tekst) + lichtste (surface) blijven
  // altijd — dat zijn de basis-leespaar-kleuren. Bepaald over de GERENDERDE
  // subset (review-fix MINOR-1) zodat een ongebruikte framework-extreme
  // (#000/#FFF) niet als "donkerste/lichtste" gered wordt; fallback op het
  // hele palet als niets rendert.
  // Structurele bescherming over de GERENDERDE BRAND-subset: niet-merk-kleuren
  // (widget/social/admin) tellen niet mee als "donkerste/lichtste" (MINOR-2),
  // anders zou een non-brand-extreme de structurele pointer kapen.
  const brandColors = colors.filter((c) => !isNonBrandColor(c));
  const rendered = brandColors.filter((c) => usageCache.get(c.hex.toUpperCase())?.strength !== 'none');
  const structuralPool = rendered.length > 0 ? rendered : (brandColors.length > 0 ? brandColors : colors);
  let darkest = { hex: '', l: Infinity };
  let lightest = { hex: '', l: -Infinity };
  for (const c of structuralPool) {
    const rgb = parseRgb(c.hex);
    if (!rgb) continue;
    const l = lightness(rgb);
    if (l < darkest.l) darkest = { hex: c.hex.toUpperCase(), l };
    if (l > lightest.l) lightest = { hex: c.hex.toUpperCase(), l };
  }

  const keep = (c: T): boolean => {
    // Cross-brand Fase 1: third-party widget / social-share / CMS-admin-kleuren
    // zijn nooit van het merk → weg, ongeacht usage of structurele rol — MAAR
    // een logo-kleur is per definitie merk-eigen, ook al lijkt hij op een
    // social-hex (MAJOR-4). Logo wint dus van de non-brand-exclude.
    if (isLogoColor(c)) return true;
    if (isNonBrandColor(c)) return false;
    const hexU = c.hex.toUpperCase();
    if (hexU === darkest.hex || hexU === lightest.hex) return true;
    const { strength, known } = usageCache.get(hexU) ?? { strength: 'none' as RenderStrength, known: false };
    if (isFrameworkOrigin(c)) {
      if (index.total > 0) {
        // Multi-page aanwezig: meet met een STRENGE tolerantie — anders
        // absorbeert een geleakte default (Gutenberg #ABB8C3) via de losse
        // MATCH_TOLERANCE het gebruik van een naburige echt-gerenderde grijs
        // (#9CA3AF, ~33 weg) en lijkt 'ie sterk. Strict = betrouwbaar, dus de
        // pixel-pass (zelfde absorptie-zwakte) negeren we hier.
        return renderStrength(hexU, index, STRICT_FRAMEWORK_TOLERANCE) === 'strong';
      }
      // Geen multi-page-data: de pixel-pass is het enige (grovere) signaal —
      // honoreer een 'strong' zodat een ECHT-gebruikte framework-default niet
      // over-dropt (review-fix: default-config zónder screenshotter). Bij
      // 'none'/'weak' → drop; zónder enig signaal → leak-hex-regel (geleakte
      // CMS-neutral/admin vallen, saturated default houdt benefit-of-the-doubt).
      if (known) return strength === 'strong';
      return !isFrameworkLeakHex(c.hex);
    }
    if (!known) return true;                              // geen bewijs → behouden (niet-framework)
    if (strength === 'none') return false;                // rendert aantoonbaar nergens → drop
    return true;                                          // niet-framework + rendert (weak+) → behouden
  };

  const kept = colors.filter(keep);
  // Cross-brand Fase 2: consolideer bijna-identieke NEUTRALs (universele grijs-
  // clutter — 5-10 grijzen per merk). Behoud altijd de donkerste + lichtste
  // (tekst/surface), dedup de rest op kleur-afstand en cap op MAX_NEUTRALS, op
  // volgorde van werkelijk gebruik.
  const consolidated = consolidateNeutrals(kept, index);
  if (consolidated.length > 0) return consolidated;
  // Safety: nooit leeg. Val terug op de BRAND-kleuren (zónder non-brand), en
  // pas als óók die leeg zijn op het ongefilterde palet — zodat de "non-brand
  // altijd weren"-garantie niet alsnog lekt (MAJOR-1).
  return brandColors.length > 0 ? brandColors : colors;
}

/** Max aantal NEUTRALs ná consolidatie. Ruim genoeg (6) zodat een legitieme
 *  distincte grijs-schaal niet geamputeerd wordt (review MAJOR-3) — de echte
 *  reductie komt van de near-duplicate-dedup hieronder. */
const MAX_NEUTRALS = 6;
/** Kleur-afstand waaronder twee NEUTRALs als "bijna-identiek" gelden en er één
 *  representant overblijft. Eigen constante (niet de computed-match-tolerantie). */
const NEUTRAL_DEDUP_TOLERANCE = 40;

/** Rendered "gewicht" (gesommeerde computed-count binnen tolerantie) van een
 *  hex — gebruikt om per neutral-cluster de meest-gebruikte representant te
 *  kiezen. */
function renderedWeight(hex: string, index: { entries: Array<{ rgb: Rgb; count: number }>; total: number }): number {
  const target = parseRgb(hex);
  if (!target) return 0;
  let w = 0;
  for (const e of index.entries) if (dist(e.rgb, target) <= MATCH_TOLERANCE) w += e.count;
  return w;
}

function consolidateNeutrals<T extends UsageFilterColor>(
  colors: T[],
  index: { entries: Array<{ rgb: Rgb; count: number }>; total: number },
): T[] {
  // Zonder render-bewijs niet consolideren — anders zou de "meest-gebruikt"-
  // selectie degraderen naar blinde array-volgorde (review MAJOR-2).
  if (index.total === 0) return colors;
  const isNeutral = (c: T) => c.category === 'NEUTRAL';
  const neutrals = colors
    .filter(isNeutral)
    .map((c) => ({ c, rgb: parseRgb(c.hex), w: renderedWeight(c.hex, index) }))
    .filter((x): x is { c: T; rgb: Rgb; w: number } => x.rgb !== null);
  if (neutrals.length <= 1) return colors;

  // Altijd de donkerste + lichtste neutral behouden (tekst/surface).
  const byLight = [...neutrals].sort((a, b) => lightness(a.rgb) - lightness(b.rgb));
  const darkest = byLight[0];
  const lightest = byLight[byLight.length - 1];
  const picked: Array<{ rgb: Rgb }> = [];
  const pickedHex = new Set<string>();
  const tryPick = (x: { c: T; rgb: Rgb } | undefined) => {
    if (!x || picked.length >= MAX_NEUTRALS) return;
    const hx = x.c.hex.toUpperCase();
    if (pickedHex.has(hx)) return;
    // Near-duplicate? → één representant per cluster (de reden van consolidatie).
    if (picked.some((p) => dist(p.rgb, x.rgb) <= NEUTRAL_DEDUP_TOLERANCE)) return;
    picked.push({ rgb: x.rgb });
    pickedHex.add(hx);
  };
  tryPick(darkest);
  tryPick(lightest);
  // Rest op rendered-weight (meest-gebruikt eerst): dedup near-identieke, cap.
  for (const x of [...neutrals].sort((a, b) => b.w - a.w)) tryPick(x);

  // Behoud de oorspronkelijke volgorde: niet-neutrals + alleen de gekozen neutrals.
  return colors.filter((c) => !isNeutral(c) || pickedHex.has(c.hex.toUpperCase()));
}

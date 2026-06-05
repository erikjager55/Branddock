/**
 * Font-fallback beslislogica (verbeterplan Fase 4, audit 2026-06-05).
 *
 * Symptoom: de fonts-tabel bleef leeg ("fonts lopen niet lekker"). Twee
 * oorzaken die hier worden geadresseerd met pure, deterministisch testbare
 * helpers (de daadwerkelijke scrape/headless-render zit in analysis-engine):
 *
 *   1. De headless computed-style-fallback (`scrapeUrlViaHeadless`) triggerde
 *      alléén op een zwak kléúrpalet — een site met goede kleuren maar nul
 *      gedetecteerde merk-fonts haalde 'm nooit. `hasNoBrandFonts` +
 *      `planHeadlessMerge` laten de fallback óók op lege fonts vuren, en
 *      mergen veilig (nooit een goed statisch palet/fontset overschrijven).
 *
 *   2. De StyleguideFont-rijen erfden de AI-fallback (`primaryFontName`),
 *      waardoor een AI-gok als "gedetecteerde" merk-font werd gepresenteerd.
 *      `selectDetectedFontNames` levert uitsluitend de écht gescrapte fonts.
 */

import { GENERIC_FONT_FAMILY_NAMES } from './font-generic-families';

/**
 * Generieke families in de vergelijkingsvorm (whitespace/underscore → hyphen),
 * zodat 'segoe ui' → 'segoe-ui' matcht ná onze canonicalisatie-collapse.
 */
const GENERIC_FAMILY_SET = new Set<string>(
  GENERIC_FONT_FAMILY_NAMES.map((f) => f.replace(/[\s_]+/g, '-')),
);

/**
 * Canonicaliseer één font-family-naam tot de "echte" merk-fontnaam, of `null`
 * wanneer het geen merk-font is.
 *
 * Stappen: strip omringende quotes → trim/collapse whitespace → strip de
 * Adobe-CLS-fallback-suffix (`effra-fallback` → `effra`, `Inter Fallback` →
 * `Inter`) met een strak anchor zodat legitieme namen als `Fallback Display`
 * of `Falling Sky` heel blijven → drop generieke families (`system-ui` → null).
 *
 * Casing wordt BEWUST niet gemuteerd — PascalCasing naar de Google-Fonts-vorm
 * blijft de verantwoordelijkheid van `normaliseFontName` in de UI, zodat
 * `PT Sans` niet tot `Pt Sans` verandert.
 */
export function canonicalizeFontFamily(name: string | null | undefined): string | null {
  if (!name) return null;
  // (a) strip omringende quotes + (b) trim/collapse interne whitespace
  let cleaned = name.replace(/^["']|["']$/g, '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return null;
  // (c) Adobe-CLS-fallback-suffix: alléén een ECHT achtervoegsel (voorafgegaan
  //     door spatie of hyphen, aan het eind). 'effra-fallback' → 'effra'.
  cleaned = cleaned.replace(/[\s-]fallback$/i, '').trim();
  if (!cleaned) return null;
  // (d) generieke-family-drop in de vergelijkingsvorm
  const cmp = cleaned.toLowerCase().replace(/[\s_]+/g, '-');
  if (GENERIC_FAMILY_SET.has(cmp)) return null;
  return cleaned;
}

/**
 * Canonicaliseer + dedupliceer een lijst font-namen. Collapse `X` vs
 * `X-fallback` en case/quote-varianten naar één entry (eerste-voorkomen wint,
 * volgorde behouden), drop generieke families en lege strings.
 */
export function dedupeBrandFonts(names: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const canon = canonicalizeFontFamily(raw);
    if (!canon) continue;
    const key = canon.toLowerCase().replace(/[\s_]+/g, '-');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(canon);
  }
  return out;
}

/** True wanneer er geen enkele niet-lege merk-fontnaam is gedetecteerd. */
export function hasNoBrandFonts(fonts: readonly (string | null | undefined)[]): boolean {
  return fonts.filter((f) => typeof f === 'string' && f.trim().length > 0).length === 0;
}

/**
 * Bepaalt welke headless-bronnen geadopteerd mogen worden, gegeven welke
 * statische bronnen tekortschoten. Kleuren en fonts zijn onafhankelijk:
 * adopteer alléén waar de statische scrape deficiënt was, zodat een goed
 * statisch resultaat nooit door de (duurdere, grovere) headless-render wordt
 * overschreven. Fonts worden alleen overgenomen als de headless-render er
 * daadwerkelijk vond.
 */
export function planHeadlessMerge(opts: {
  weakPalette: boolean;
  fontsEmpty: boolean;
  headlessFontCount: number;
}): { adoptColors: boolean; adoptFonts: boolean } {
  return {
    adoptColors: opts.weakPalette,
    adoptFonts: opts.fontsEmpty && opts.headlessFontCount > 0,
  };
}

/** True wanneer de headless-fallback überhaupt geprobeerd moet worden. */
export function shouldTryHeadless(opts: { weakPalette: boolean; fontsEmpty: boolean }): boolean {
  return opts.weakPalette || opts.fontsEmpty;
}

/**
 * Fontnamen voor de StyleguideFont-rijen: uitsluitend de écht gedetecteerde
 * fonts (max 6), NOOIT de AI-fallback. Leeg → geen rijen → eerlijke
 * "geen merk-font gedetecteerd"-empty-state in de UI i.p.v. een AI-gok die
 * als detectie wordt gepresenteerd.
 *
 * De namen zijn ge-canonicaliseerd + gededupliceerd (via `dedupeBrandFonts`):
 * `X` en `X-fallback` collapsen naar één rij, generieke families worden
 * gedropt — zo verschijnt een Adobe-CLS-fallback nooit als losse merk-font-kaart.
 */
export function selectDetectedFontNames(detectedFonts: readonly (string | null | undefined)[]): string[] {
  return dedupeBrandFonts(detectedFonts).slice(0, 6);
}

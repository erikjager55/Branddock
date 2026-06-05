// =============================================================
// Bulk Computed-Style Extraction (Sprint 4 — Quick Win A.2)
//
// Adopteert een patroon uit hyperbrowserai/scrape-to-api: één
// page.evaluate die ALLE visible elementen scant en een frequency-map
// opbouwt voor design-token properties (border-radius, padding,
// box-shadow, font-size, font-weight, font-family, background-color).
//
// Waarom dit complementair is aan css-visual-heuristics.ts:
//   - css-visual-heuristics mineert STATIC CSS (de rules die op de
//     pagina worden gestuurd). Dat ziet ook utility-classes die nooit
//     daadwerkelijk gebruikt worden (Tailwind bundles, CMS-presets).
//   - Deze module mineert RUNTIME computed styles (wat echt rendert).
//     Dat geeft een veel scherpere frequency-distributie voor
//     cornerRadii / spacingScale / shadowSystem derivation.
//
// Performance: één page.evaluate, ~50-200ms voor pagina's met <2000
// visible elementen. We capen op MAX_ELEMENTS om DoS-edge-cases te
// vermijden.
// =============================================================

import type { Page } from 'playwright';
import type { CssVisualHeuristics } from './visual-language.types';

/** Cap voor het aantal elementen dat we per pagina scannen.
 *  Pagina's met >5K elementen zijn vrijwel altijd commerce-listings of
 *  nieuws-archieven — het extra signaal weegt niet op tegen de cost. */
const MAX_ELEMENTS = 3000;

/** Properties waar we frequencies op meten. Bewust beperkt — we zoeken
 *  design-token signaal, niet een volledige CSS dump. */
const TRACK_PROPS = [
  'border-radius',
  'padding',
  'gap',
  'margin',
  'font-size',
  'font-weight',
  'font-family',
  'box-shadow',
  'background-color',
  'color',
  // border-color meegenomen zodat de usage-gedreven palet-filter ook accenten
  // ziet die alléén als rand renderen (review-fix MAJOR-2).
  'border-color',
] as const;

type TrackedProp = typeof TRACK_PROPS[number];

export type FrequencyMap = Record<string, number>;
export type BulkComputedStyles = Record<TrackedProp, FrequencyMap>;

export interface BulkComputedStylesResult {
  /** Aantal elementen dat is gescand (na visibility-filter, tot MAX_ELEMENTS). */
  scannedCount: number;
  /** Aantal elementen op de pagina vóór filtering. */
  totalCount: number;
  /** Frequency-maps per property: value → occurrence count. */
  styles: BulkComputedStyles;
}

/**
 * Run de bulk extractor op een al-geopende Playwright page.
 *
 * De caller is verantwoordelijk voor het navigeren + wachten op
 * page-load. We voeren één `page.evaluate` uit en retourneren plain
 * JSON — geen browser-side state hangt achter.
 */
export async function extractBulkComputedStyles(
  page: Page,
): Promise<BulkComputedStylesResult> {
  const result = await page.evaluate(
    ({ trackProps, maxElements }) => {
      const all = document.querySelectorAll('*');
      const totalCount = all.length;

      const freq: Record<string, Record<string, number>> = {};
      for (const p of trackProps) freq[p] = {};

      let scanned = 0;
      for (let i = 0; i < all.length && scanned < maxElements; i++) {
        const el = all[i] as HTMLElement;
        // Visibility-filter: skip elementen die niet renderen.
        const rect = el.getBoundingClientRect();
        if (rect.width < 4 || rect.height < 4) continue;
        const cs = window.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        if (parseFloat(cs.opacity || '1') < 0.05) continue;

        for (const prop of trackProps) {
          const val = cs.getPropertyValue(prop).trim();
          if (!val) continue;
          // Skip "useless" defaults die geen signaal dragen.
          if (val === 'none' || val === 'normal' || val === 'auto') continue;
          if (val === '0px' && (prop === 'border-radius' || prop === 'box-shadow')) continue;
          // Skip padding/gap/margin met alleen 0-values — geen design-token signaal.
          if (
            (prop === 'padding' || prop === 'gap' || prop === 'margin') &&
            /^(0px\s*)+$/.test(val)
          ) {
            continue;
          }
          if (val === 'rgba(0, 0, 0, 0)' || val === 'transparent') continue;
          // Dedup: trim whitespace + normalize spacing
          const norm = val.replace(/\s+/g, ' ');
          freq[prop][norm] = (freq[prop][norm] ?? 0) + 1;
        }
        scanned++;
      }

      return { scanned, totalCount, freq };
    },
    { trackProps: TRACK_PROPS as unknown as string[], maxElements: MAX_ELEMENTS },
  );

  return {
    scannedCount: result.scanned,
    totalCount: result.totalCount,
    styles: result.freq as BulkComputedStyles,
  };
}

/**
 * Top-N waarden per property — handig voor token-scale derivation.
 * Sorteert desc op count, retourneert eerste N entries.
 */
export function topValues(map: FrequencyMap, n: number): Array<{ value: string; count: number }> {
  return Object.entries(map)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/**
 * Merge multiple BulkComputedStylesResults van verschillende pagina's.
 * Optelt de frequencies — gebruikt door multi-page analyzer om één
 * gecombineerde token-distributie op te bouwen.
 */
export function mergeBulkComputedStyles(
  results: BulkComputedStylesResult[],
): BulkComputedStylesResult {
  const merged: BulkComputedStylesResult = {
    scannedCount: 0,
    totalCount: 0,
    styles: TRACK_PROPS.reduce((acc, prop) => {
      acc[prop] = {};
      return acc;
    }, {} as BulkComputedStyles),
  };
  for (const r of results) {
    merged.scannedCount += r.scannedCount;
    merged.totalCount += r.totalCount;
    for (const prop of TRACK_PROPS) {
      const sourceMap = r.styles[prop] ?? {};
      for (const [value, count] of Object.entries(sourceMap)) {
        merged.styles[prop][value] = (merged.styles[prop][value] ?? 0) + count;
      }
    }
  }
  return merged;
}

/**
 * Derive een numeric scale-array (ascending, deduplicated, with counts)
 * uit een frequency-map op een px-property zoals border-radius of padding.
 *
 * Filtert noise (1-off observaties, single-pixel waarden) en cap'd op de
 * top frequenties. Gebruikt door buildSpacingTokens / cornerRadii in
 * analysis-engine.ts om de raw heuristics te augmenteren met runtime data.
 */
export function deriveNumericScale(
  map: FrequencyMap,
  options: { minCount?: number; topN?: number } = {},
): Array<{ valuePx: number; count: number; raw: string }> {
  const minCount = options.minCount ?? 2;
  const topN = options.topN ?? 12;
  const out: Array<{ valuePx: number; count: number; raw: string }> = [];
  for (const [raw, count] of Object.entries(map)) {
    if (count < minCount) continue;
    const px = parsePxFirst(raw);
    if (!Number.isFinite(px) || px < 0 || px > 200) continue;
    out.push({ valuePx: px, count, raw });
  }
  out.sort((a, b) => b.count - a.count);
  return out.slice(0, topN).sort((a, b) => a.valuePx - b.valuePx);
}

// Geëxporteerd zodat de brandstyle-smoke de afronding (Fase 5a) kan asserteren.
export function parsePxFirst(raw: string): number {
  // Pak eerste NIET-NUL px-waarde uit shorthand zoals "0px 16px 32px 0px"
  // (24px voor padding-right is meer signaal dan 0px voor padding-top).
  // Valt terug op eerste waarde als alle waarden 0 zijn.
  // Fase 5a: computed-style px-waarden zijn vaak sub-pixel floats (5.42px,
  // 3.75px) door rem-conversie/zoom. Design-tokens horen integer te zijn —
  // rond af op het choke-point zodat zowel spacing als radii heel blijven.
  const round = (n: number): number => (Number.isFinite(n) ? Math.round(n) : NaN);
  const matches = Array.from(raw.matchAll(/(-?\d+(?:\.\d+)?)px/g));
  if (matches.length === 0) {
    return round(Number(raw));
  }
  for (const m of matches) {
    const v = Number(m[1]);
    if (Number.isFinite(v) && v > 0) return round(v);
  }
  return round(Number(matches[0][1]));
}

/**
 * Augmenteer een CssVisualHeuristics object met runtime computed-style data.
 * Idempotent — voegt alleen toe, overschrijft niets. Werkt door observed
 * runtime-waarden N keer te appenden waarbij N de occurrence count is, zodat
 * het bestaande frequency-counting in deriveSpacingScale / deriveCornerRadii
 * deze automatisch meeneemt.
 *
 * Cap per value op MAX_REPETITIONS — voorkomt dat een sites met 200 buttons
 * met dezelfde border-radius alle andere observaties overspoelt.
 */
const MAX_REPETITIONS = 8;
const MAX_VALUES_PER_PROP = 24;

export function augmentHeuristicsWithRuntime(
  heuristics: CssVisualHeuristics,
  bulk: BulkComputedStylesResult,
): CssVisualHeuristics {
  const next: CssVisualHeuristics = {
    ...heuristics,
    borderRadius: { ...heuristics.borderRadius, values: [...heuristics.borderRadius.values] },
    spacing: { ...heuristics.spacing, values: [...heuristics.spacing.values] },
    boxShadow: { ...heuristics.boxShadow, samples: [...heuristics.boxShadow.samples] },
  };

  appendNumericValues(next.borderRadius.values, bulk.styles['border-radius']);
  appendNumericValues(next.spacing.values, bulk.styles['padding']);
  appendNumericValues(next.spacing.values, bulk.styles['gap']);
  appendShadowSamples(next.boxShadow.samples, bulk.styles['box-shadow']);

  // Re-bereken median + mostCommon na augmentation zodat downstream
  // helpers consistente data zien. De pill-sentinel (9999, Fase 5c) blijft in
  // `values` voor deriveCornerRadii maar mag de stats/AI-prompt niet vervuilen.
  const nonPillRadii = next.borderRadius.values.filter((v) => v < 9999);
  next.borderRadius.median = computeMedian(nonPillRadii);
  next.borderRadius.mostCommon = computeMode(nonPillRadii);
  next.borderRadius.hasVariation = new Set(nonPillRadii).size > 1;
  next.spacing.median = computeMedian(next.spacing.values);
  next.spacing.gridBase = detectGridBase(next.spacing.values) ?? next.spacing.gridBase;

  return next;
}

function appendNumericValues(target: number[], freqMap: FrequencyMap | undefined): void {
  if (!freqMap) return;
  const entries = Object.entries(freqMap)
    .map(([raw, count]) => ({ px: parsePxFirst(raw), count }))
    .filter((e) => Number.isFinite(e.px) && e.px >= 0 && e.px <= 200)
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_VALUES_PER_PROP);
  for (const e of entries) {
    const reps = Math.min(e.count, MAX_REPETITIONS);
    for (let i = 0; i < reps; i++) target.push(e.px);
  }
}

function appendShadowSamples(target: string[], freqMap: FrequencyMap | undefined): void {
  if (!freqMap) return;
  const seen = new Set(target);
  const entries = Object.entries(freqMap)
    .filter(([val]) => val.length > 0 && val !== 'none')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  for (const [val] of entries) {
    if (!seen.has(val)) {
      target.push(val);
      seen.add(val);
    }
  }
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function computeMode(values: number[]): number {
  if (values.length === 0) return 0;
  const freq = new Map<number, number>();
  let bestVal = values[0];
  let bestCount = 0;
  for (const v of values) {
    const next = (freq.get(v) ?? 0) + 1;
    freq.set(v, next);
    if (next > bestCount) {
      bestCount = next;
      bestVal = v;
    }
  }
  return bestVal;
}

function detectGridBase(values: number[]): number | null {
  if (values.length < 4) return null;
  // Test of >70% van waarden deelbaar is door 4 of 8.
  const div4 = values.filter((v) => v > 0 && v % 4 === 0).length;
  const div8 = values.filter((v) => v > 0 && v % 8 === 0).length;
  const total = values.filter((v) => v > 0).length;
  if (total === 0) return null;
  if (div8 / total > 0.7) return 8;
  if (div4 / total > 0.7) return 4;
  return null;
}

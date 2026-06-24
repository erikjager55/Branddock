/**
 * GEO/SEO Fase 2-opvolg — pure view-model-helpers voor het GEO-meet-paneel.
 * Zet een gepersisteerde `GeoOptimizationAnalysis` om naar een render-klaar
 * model: zone-classificatie, per-signaal-rijen (met zwak-vlag) en de
 * 90-dagen-staleness. Geen React/DOM — los testbaar (smoke) + herbruikbaar,
 * en houdt de client-component vrij van logica.
 */
import type { GeoOptimizationAnalysis } from './geo-analysis';
import type { GeoSignalScores } from '../brand-fidelity/geo-fidelity-scorer';
import { isContentStale } from './author-profile';

export type GeoZone = 'good' | 'warn' | 'bad';

/** De vijf GEO-signalen, in weergavevolgorde — één bron voor guard + mapping. */
const GEO_SIGNAL_KEYS: ReadonlyArray<keyof GeoSignalScores> = [
  'answerFirst',
  'atomicChunking',
  'citedStats',
  'entityClarity',
  'structuredCues',
];

/**
 * Runtime-guard: de persisted `geoOptimizationAnalysis` komt als ruwe JSON uit
 * `Deliverable.settings` (ongevalideerd door de GET-route). Bij format-drift of
 * corruptie (ontbrekende `signals`, niet-array `findings`/`schemaTypes`) valt het
 * paneel terug op niet-renderen i.p.v. de hele canvas-render onderuit te halen.
 */
export function isRenderableGeoAnalysis(
  a: GeoOptimizationAnalysis | null | undefined,
): a is GeoOptimizationAnalysis {
  if (
    !a ||
    typeof a.geoScore !== 'number' ||
    !a.signals ||
    typeof a.signals !== 'object' ||
    !Array.isArray(a.findings) ||
    !Array.isArray(a.schemaTypes)
  ) {
    return false;
  }
  // Elk van de 5 signalen moet numeriek zijn — anders rendert het paneel
  // NaN/lege balken (format-drift in de persisted JSON i.p.v. een crash).
  const s = a.signals as unknown as Record<string, unknown>;
  return GEO_SIGNAL_KEYS.every((k) => typeof s[k] === 'number');
}

/** Zone-drempels spiegelen de andere F-VAL-pijlers (publishable ≥70). */
export function geoZone(score: number): GeoZone {
  if (score >= 70) return 'good';
  if (score >= 50) return 'warn';
  return 'bad';
}

/** Korte NL-labels per signaal. */
const GEO_SIGNAL_LABELS: Record<keyof GeoSignalScores, string> = {
  answerFirst: 'Answer-first',
  atomicChunking: 'Atomic chunking',
  citedStats: 'Cited stats',
  entityClarity: 'Entity-clarity',
  structuredCues: 'Structurele cues',
};

export interface GeoPanelSignalRow {
  key: keyof GeoSignalScores;
  label: string;
  score: number;
  /** Zwak signaal (<60) — spiegelt de findings-drempel van de scorer. */
  weak: boolean;
}

export function toGeoPanelSignals(signals: GeoSignalScores): GeoPanelSignalRow[] {
  return GEO_SIGNAL_KEYS.map((key) => {
    const score = signals[key];
    return { key, label: GEO_SIGNAL_LABELS[key], score, weak: score < 60 };
  });
}

export interface GeoPanelViewModel {
  score: number;
  zone: GeoZone;
  /** Laatst gemeten >90 dagen geleden — fundament voor latere cron-refresh. */
  stale: boolean;
  signals: GeoPanelSignalRow[];
  findings: string[];
  schemaTypes: string[];
  canonicalUrl: string;
  measuredAt: string;
}

/** Bouwt het volledige render-model. `now` ingegeven → deterministisch testbaar. */
export function buildGeoPanelViewModel(
  analysis: GeoOptimizationAnalysis,
  now: Date,
): GeoPanelViewModel {
  return {
    score: analysis.geoScore,
    zone: geoZone(analysis.geoScore),
    stale: isContentStale(analysis.measuredAt, now),
    signals: toGeoPanelSignals(analysis.signals),
    findings: analysis.findings,
    schemaTypes: analysis.schemaTypes,
    canonicalUrl: analysis.canonicalUrl,
    measuredAt: analysis.measuredAt,
  };
}

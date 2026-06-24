/**
 * Smoke-test — GEO/SEO Fase 2-opvolg: GEO-meet-paneel view-model.
 * Verifieert de pure mapping (zone-classificatie, signaal-rijen + zwak-vlag,
 * staleness-grens via isContentStale) en fail-soft op een realistische
 * geoOptimizationAnalysis. Geen React/DB → draait offline.
 *
 * Run: npx tsx scripts/smoke-tests/geo-panel.ts
 */
import {
  geoZone,
  toGeoPanelSignals,
  buildGeoPanelViewModel,
  isRenderableGeoAnalysis,
} from '../../src/lib/landing-pages/geo-panel-view';
import type { GeoOptimizationAnalysis } from '../../src/lib/landing-pages/geo-analysis';

let pass = 0,
  fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`);
    fail++;
  }
}

// ── geoZone-drempels (publishable ≥70, marginal 50-69, fail <50) ──
assert('geoZone 100 → good', geoZone(100) === 'good');
assert('geoZone 70 → good (grens)', geoZone(70) === 'good');
assert('geoZone 69 → warn', geoZone(69) === 'warn');
assert('geoZone 50 → warn (grens)', geoZone(50) === 'warn');
assert('geoZone 49 → bad', geoZone(49) === 'bad');
assert('geoZone 0 → bad', geoZone(0) === 'bad');

// ── toGeoPanelSignals: 5 rijen in volgorde + zwak-vlag (<60) ──
const signals = {
  answerFirst: 100,
  atomicChunking: 60,
  citedStats: 26,
  entityClarity: 89,
  structuredCues: 59,
};
const rows = toGeoPanelSignals(signals);
assert('signals → 5 rijen', rows.length === 5);
assert('eerste rij = answerFirst', rows[0].key === 'answerFirst');
assert('citedStats 26 → weak', rows[2].weak === true);
assert('atomicChunking 60 → niet weak (grens)', rows[1].weak === false);
assert('structuredCues 59 → weak (grens)', rows[4].weak === true);

// ── buildGeoPanelViewModel + staleness ──
const now = new Date('2026-06-24T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const mk = (measuredAt: string): GeoOptimizationAnalysis => ({
  geoScore: 77,
  signals,
  findings: ['Cited-stats: voorzie cijfers van een expliciete bron.'],
  schemaTypes: ['BlogPosting', 'FAQPage', 'DefinedTermSet'],
  canonicalUrl: 'https://napking.branddock.app/x',
  measuredAt,
});

const fresh = buildGeoPanelViewModel(mk(now.toISOString()), now);
assert('vm.score = 77', fresh.score === 77);
assert('vm.zone = good (77)', fresh.zone === 'good');
assert('vm.signals lengte 5', fresh.signals.length === 5);
assert('vm.findings doorgegeven', fresh.findings.length === 1);
assert('vm.schemaTypes doorgegeven', fresh.schemaTypes.length === 3);
assert('verse meting → niet stale', fresh.stale === false);

const stale = buildGeoPanelViewModel(mk(new Date(now.getTime() - 91 * DAY).toISOString()), now);
assert('91 dagen oud → stale', stale.stale === true);

const edge = buildGeoPanelViewModel(mk(new Date(now.getTime() - 89 * DAY).toISOString()), now);
assert('89 dagen oud → niet stale', edge.stale === false);

// ── isRenderableGeoAnalysis: fail-soft guard op ruwe/gedrifte JSON ──
assert('guard: geldige analyse → true', isRenderableGeoAnalysis(mk(now.toISOString())));
assert('guard: null → false', !isRenderableGeoAnalysis(null));
assert(
  'guard: ontbrekende signals → false',
  !isRenderableGeoAnalysis({
    ...mk(now.toISOString()),
    signals: undefined,
  } as unknown as GeoOptimizationAnalysis),
);
assert(
  'guard: signals mist een key → false',
  !isRenderableGeoAnalysis({
    ...mk(now.toISOString()),
    signals: { answerFirst: 100 },
  } as unknown as GeoOptimizationAnalysis),
);
assert(
  'guard: niet-numeriek signaal → false',
  !isRenderableGeoAnalysis({
    ...mk(now.toISOString()),
    signals: { ...signals, citedStats: '26' },
  } as unknown as GeoOptimizationAnalysis),
);
assert(
  'guard: findings geen array → false',
  !isRenderableGeoAnalysis({
    ...mk(now.toISOString()),
    findings: 'x',
  } as unknown as GeoOptimizationAnalysis),
);

console.log(`\nGEO-panel smoke: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);

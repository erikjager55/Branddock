/**
 * [DET] Phase 60 — CONSUMPTIE-laag wiring: brandProvenance → renderer.
 *
 * Sluit het dekkingsgat uit de audit 2026-06-07 (brandstyle→content-item
 * wiring): phase40–51 + brandstyle-provenance.ts dekken de EXTRACTIE en de
 * gate-INPUT (`isScrapedOrigin(prov,'elevation')`), maar GEEN smoke bewees dat
 * `buildSpikePuckConfig` de provenance daadwerkelijk THREADT naar de renderer
 * en dat de elevation-gate de gerenderde output verandert.
 *
 * phase38-scrim-flat-cards bouwt zijn fixture ZONDER brandProvenance, dus de
 * provenance-override-tak van de gate (puck-config.tsx:1221 —
 * `forceFlatCards && !elevationIsScraped`) werd nooit met scraped=true geraakt.
 * Dat is precies de tak die merk-fidelity boven archetype-aanname zet
 * (Zwarthout/Napking preset-bugklasse).
 *
 * Productie-pad dat hier wordt gelockt:
 *   canvas-context.ts:557  extractBrandTokensWithProvenance() → {tokens, provenance}
 *   canvas-context.ts:565  beide op de CanvasContextStack
 *   puck-config.tsx:313    featureGridComponent(tokens, ctx?.brandProvenance)
 *   puck-config.tsx:1220   isScrapedOrigin(provenance,'elevation') → gate
 *
 * Methode: identieke base-tokens (forceFlatCards-archetype RULER+MINIMAL met een
 * echte card-shadow), alleen de provenance verschilt. Verschilt de gerenderde
 * markup, dan IS de provenance geconsumeerd. Puur fixture → render, geen DB/net.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase60-provenance-consumption.ts
 */
import { renderToStaticMarkup } from 'react-dom/server';
import type * as React from 'react';
import { buildSpikePuckConfig } from '../../src/features/campaigns/components/canvas/medium/puck-config';
import type { CanvasContextStack } from '../../src/lib/ai/canvas-context';
import { getDesignSystemForLayoutStyle } from '../../src/lib/landing-pages/design-system';
import {
  DEFAULT_BRAND_TOKENS,
  extractBrandTokensWithProvenance,
  type BrandTokens,
} from '../../src/lib/landing-pages/brand-tokens';
import { isScrapedOrigin, type TokenProvenance } from '../../src/lib/landing-pages/token-provenance';

type Styleguide = Parameters<typeof extractBrandTokensWithProvenance>[0];

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

// ─── Fixtures: ENIG verschil = wel/geen elevationProfile (→ scraped vs niet) ──

/** Bron-site mét echte card-shadow → provenance.elevation === scraped. */
const ELEV_SCRAPED: Styleguide = {
  colors: [
    { hex: '#E8521F', category: 'PRIMARY', tags: ['brand'], confidence: 'high', sortOrder: 0 },
    { hex: '#FFFFFF', category: 'NEUTRAL', tags: ['surface', 'background', 'light'], confidence: 'high', sortOrder: 1 },
    { hex: '#1A1A1A', category: 'NEUTRAL', tags: ['text', 'body'], confidence: 'high', sortOrder: 2 },
  ],
  fonts: [],
  elevationProfile: { samples: ['0 2px 8px rgba(0,0,0,0.1)'], dominantCategory: 'subtle-shadow' },
};

/** Bron-site zónder elevation-signaal → provenance.elevation === fallback. */
const ELEV_ABSENT: Styleguide = {
  colors: [
    { hex: '#222222', category: 'NEUTRAL', tags: ['text'], confidence: 'high', sortOrder: 0 },
    { hex: '#FFFFFF', category: 'NEUTRAL', tags: ['surface', 'background', 'light'], confidence: 'high', sortOrder: 1 },
  ],
  fonts: [],
  // GEEN elevationProfile
};

// ─── Base-tokens: forceFlatCards-combo + echte shadow (= zou platgeslagen
// worden, TENZIJ provenance bewijst dat elevation scraped is) ────────────────

function makeStack(provenance?: TokenProvenance): CanvasContextStack {
  const tokens: BrandTokens = {
    ...DEFAULT_BRAND_TOKENS,
    brand: '#B59032',
    onBrand: '#000000',
    onSurface: '#000000',
    layoutStyle: 'MINIMAL',
    designSystem: getDesignSystemForLayoutStyle('MINIMAL'),
    archetype: 'RULER', // RULER+MINIMAL => constraints.forceFlatCards === true
    elevation: {
      cardShadow: '0 8px 24px rgba(0,0,0,0.12)',
      cardBorderRadius: 12,
      cardBorderWidth: 0,
      cardElevationCategory: 'strong-shadow',
    },
  };
  return {
    brand: { brandName: 'T' },
    personas: [],
    brief: null,
    concept: null,
    journeyPhase: null,
    medium: null,
    deliverableTypeId: 'landing-page',
    products: [],
    brandTokens: tokens,
    brandProvenance: provenance,
  } as unknown as CanvasContextStack;
}

function renderFeatures(stack: CanvasContextStack): string {
  const cfg = buildSpikePuckConfig(stack);
  const comp = (cfg.components as Record<string, { render: (p: unknown) => unknown }>).FeatureGrid;
  return renderToStaticMarkup(
    comp.render({ columns: '3', features: [{ title: 'A', description: 'a', icon: 'zap' }] }) as React.ReactElement,
  );
}

// ─── 0. Extractie-contract (canvas-context.ts:557 return-shape) ──────────────

group('0 — extractBrandTokensWithProvenance levert tokens ÉN provenance');
const scraped = extractBrandTokensWithProvenance(ELEV_SCRAPED);
const absent = extractBrandTokensWithProvenance(ELEV_ABSENT);
assert('scraped: tokens gedefinieerd', !!scraped.tokens);
assert('scraped: provenance gedefinieerd', !!scraped.provenance);
assert('absent: tokens gedefinieerd', !!absent.tokens);
assert('absent: provenance gedefinieerd', !!absent.provenance);

// ─── 1. Precondition: fixtures geven de bedoelde gate-input ──────────────────

group('1 — gate-input correct (precondition voor de render-differential)');
assert('ELEV_SCRAPED → isScrapedOrigin(elevation) === true',
  isScrapedOrigin(scraped.provenance, 'elevation') === true,
  scraped.provenance.elevation?.source);
assert('ELEV_ABSENT → isScrapedOrigin(elevation) === false',
  isScrapedOrigin(absent.provenance, 'elevation') === false,
  absent.provenance.elevation?.source);

// ─── 2. Consumptie: provenance verandert de gerenderde FeatureGrid ───────────

group('2 — buildSpikePuckConfig CONSUMEERT brandProvenance (de wiring)');
const htmlScraped = renderFeatures(makeStack(scraped.provenance));
const htmlAbsent = renderFeatures(makeStack(absent.provenance));
const htmlNoProv = renderFeatures(makeStack(undefined));

// Scraped elevation → forceFlatCards-override → echte card-shadow blijft staan.
assert('scraped-provenance → box-shadow BLIJFT (merk-fidelity wint)',
  htmlScraped.includes('box-shadow'));
// Geen scraped elevation → forceFlatCards slaat de card plat → geen shadow.
assert('niet-scraped provenance → FLAT (geen box-shadow)',
  !htmlAbsent.includes('box-shadow'));
// Undefined provenance (phase38-pad) → idem flat: archetype-aanname wint.
assert('undefined provenance → FLAT (geen box-shadow)',
  !htmlNoProv.includes('box-shadow'));

// ─── 3. De kern: provenance is bewijsbaar geconsumeerd ───────────────────────

group('3 — render-differential bewijst end-to-end consumptie');
assert('scraped-markup VERSCHILT van niet-scraped-markup (provenance flipt render)',
  htmlScraped !== htmlAbsent);
assert('undefined- en niet-scraped-pad zijn gelijk (beide flat)',
  htmlAbsent === htmlNoProv);

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);

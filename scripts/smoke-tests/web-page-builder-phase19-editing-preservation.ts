/**
 * Smoke-test voor Pad C Sub-Sprint D — Editing-layer preservation.
 *
 * Verifies dat brand-emergent rendering (Phase 3-6) de Puck-edit
 * functionaliteit NIET breekt:
 *   - Alle 8 components hebben hun bestaande fields (drag-drop sidebar werkt)
 *   - defaultProps shapes ongewijzigd (initial state na drag-in)
 *   - Render-functions crashen niet bij edge-cases (empty props, null personas)
 *   - Puck-data-tree shape blijft compatibel met auto-iterate + lock-toggle
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase19-editing-preservation.ts
 */

import { renderToStaticMarkup } from 'react-dom/server';
import {
  buildSpikePuckConfig,
} from '../../src/features/campaigns/components/canvas/medium/puck-config';
import type { CanvasContextStack } from '../../src/lib/ai/canvas-context';
import { getDesignSystemForLayoutStyle } from '../../src/lib/landing-pages/design-system';
import { DEFAULT_BRAND_TOKENS, type BrandTokens } from '../../src/lib/landing-pages/brand-tokens';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`);
    fail++;
  }
}

function group(name: string): void {
  console.log(`\n${name}`);
}

function makeCtx(tokens: BrandTokens, personas: { id: string; name: string }[] = []): CanvasContextStack {
  return {
    brand: { brandName: 'Test', brandTokens: tokens },
    personas,
    brief: null,
    concept: null,
    journeyPhase: null,
    medium: null,
    deliverableTypeId: 'landing-page',
    products: [],
    brandTokens: tokens,
  } as unknown as CanvasContextStack;
}

const TOKENS_MINIMAL: BrandTokens = {
  ...DEFAULT_BRAND_TOKENS,
  layoutStyle: 'MINIMAL',
  designSystem: getDesignSystemForLayoutStyle('MINIMAL'),
  archetype: 'RULER',
};

// ─── Tests ─────────────────────────────────────────────

group('Component-config fields ongewijzigd (drag-drop sidebar)');
{
  const config = buildSpikePuckConfig(makeCtx(TOKENS_MINIMAL));
  const expectedFields: Record<string, string[]> = {
    BrandHero: ['headline', 'sub', 'ctaLabel', 'heroVisualUrl'],
    BrandCTA: ['label', 'href', 'personaId', 'riskReducer'],
    FeatureGrid: ['columns', 'features'],
    Testimonial: ['quote', 'author', 'personaId'],
    PricingTable: ['tiers'],
    FAQ: ['items'],
    Footer: ['companyName', 'tagline', 'links'],
    RichText: ['content'],
  };

  for (const [componentName, expected] of Object.entries(expectedFields)) {
    const comp = (config.components as Record<string, { fields: Record<string, unknown> }>)[componentName];
    assert(`${componentName} component defined`, comp !== undefined);
    if (!comp) continue;
    const actualFields = Object.keys(comp.fields);
    for (const f of expected) {
      assert(`  ${componentName}.${f} field aanwezig`, actualFields.includes(f));
    }
  }
}

group('defaultProps shapes ongewijzigd');
{
  const config = buildSpikePuckConfig(makeCtx(TOKENS_MINIMAL));
  const expectedDefaults: Record<string, Record<string, unknown>> = {
    BrandHero: { headline: 'string', sub: 'string', ctaLabel: 'string', heroVisualUrl: 'string' },
    BrandCTA: { label: 'string', href: 'string', personaId: 'string', riskReducer: 'string' },
    FeatureGrid: { columns: 'string', features: 'object' },
    Testimonial: { quote: 'string', author: 'string', personaId: 'string' },
    PricingTable: { tiers: 'object' },
    FAQ: { items: 'object' },
    Footer: { companyName: 'string', tagline: 'string', links: 'object' },
    RichText: { content: 'string' },
  };

  for (const [componentName, expected] of Object.entries(expectedDefaults)) {
    const comp = (config.components as Record<string, { defaultProps: Record<string, unknown> }>)[componentName];
    if (!comp) continue;
    for (const [prop, expectedType] of Object.entries(expected)) {
      const value = comp.defaultProps[prop];
      const actualType = Array.isArray(value) ? 'object' : typeof value;
      assert(
        `${componentName}.defaultProps.${prop} type ${expectedType}`,
        actualType === expectedType,
        `actual: ${actualType}`,
      );
    }
  }
}

group('Render-functions resilient — edge cases');
{
  const config = buildSpikePuckConfig(makeCtx(TOKENS_MINIMAL));
  // Render elk component met DEFAULT props — moet niet crashen
  const tryRender = (name: string, props: Record<string, unknown>) => {
    try {
      const comp = (config.components as Record<string, { render: (p: unknown) => unknown; defaultProps: Record<string, unknown> }>)[name];
      // @ts-expect-error — Puck's render is callable
      const element = comp.render({ ...comp.defaultProps, ...props });
      const html = renderToStaticMarkup(element as React.ReactElement);
      return html.length > 50;  // some non-empty output
    } catch {
      return false;
    }
  };

  assert('BrandHero render (defaults)', tryRender('BrandHero', {}));
  assert('BrandCTA render (defaults)', tryRender('BrandCTA', {}));
  assert('FeatureGrid render (empty features)', tryRender('FeatureGrid', { features: [] }));
  assert('Testimonial render (defaults)', tryRender('Testimonial', {}));
  assert('PricingTable render (empty tiers)', tryRender('PricingTable', { tiers: [] }));
  assert('FAQ render (empty items)', tryRender('FAQ', { items: [] }));
  assert('Footer render (defaults)', tryRender('Footer', {}));
  assert('RichText render (defaults)', tryRender('RichText', {}));
  // BrandHero met empty headline (kan na user-edit gebeuren)
  assert('BrandHero render (empty headline)', tryRender('BrandHero', { headline: '' }));
}

group('Puck-data-tree shape compatibel met auto-iterate + lock-toggle');
{
  // Auto-iterate verandert puckData (Phase 6 functionality) — leest
  // content[].type + props. Onze nieuwe renderers veranderen alleen
  // RENDER-output, niet de DATA. Verifieer dat component-render een
  // valid React-element produceert (geen errors zou data-iteration breken).
  const config = buildSpikePuckConfig(makeCtx(TOKENS_MINIMAL));
  for (const name of ['BrandHero', 'BrandCTA', 'FeatureGrid', 'Testimonial', 'PricingTable', 'FAQ', 'Footer', 'RichText']) {
    const comp = (config.components as Record<string, { render: (p: unknown) => unknown; defaultProps: Record<string, unknown> }>)[name];
    try {
      // @ts-expect-error — Puck render
      const el = comp.render(comp.defaultProps);
      assert(`${name} produces React-element`, el !== null && el !== undefined && typeof el === 'object');
    } catch {
      assert(`${name} produces React-element`, false);
    }
  }
}

group('Render-output bij verschillende layoutStyles geen errors');
{
  for (const layoutStyle of ['MINIMAL', 'EDITORIAL', 'COMMERCIAL', 'EXPERIENTIAL', 'PLAYFUL'] as const) {
    const tokens: BrandTokens = {
      ...DEFAULT_BRAND_TOKENS,
      layoutStyle,
      designSystem: getDesignSystemForLayoutStyle(layoutStyle),
      archetype: null,
    };
    const config = buildSpikePuckConfig(makeCtx(tokens));
    let allRender = true;
    for (const name of ['BrandHero', 'BrandCTA', 'FeatureGrid', 'Testimonial', 'PricingTable', 'FAQ', 'Footer', 'RichText']) {
      try {
        const comp = (config.components as Record<string, { render: (p: unknown) => unknown; defaultProps: Record<string, unknown> }>)[name];
        // @ts-expect-error — Puck render
        const el = comp.render(comp.defaultProps);
        renderToStaticMarkup(el as React.ReactElement);
      } catch {
        allRender = false;
      }
    }
    assert(`${layoutStyle}: alle 8 components rendren zonder errors`, allRender);
  }
}

// ─── Resultaat ─────────────────────────────────────────

console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
console.log('='.repeat(50));

if (fail > 0) {
  process.exit(1);
}

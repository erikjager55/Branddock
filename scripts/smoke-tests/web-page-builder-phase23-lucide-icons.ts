/**
 * Smoke-test voor FIX — Lucide-iconen renderen in FeatureGrid.
 *
 * Verifies:
 *  - normalizeIconName: CamelCase / SHOUTING-CAPS / underscores / spaces
 *    allemaal naar canonical kebab-case
 *  - resolveLucideIcon: bekende namen → component, onbekend → null
 *  - IconBlock: render-output bevat SVG voor bekende, fallback text voor
 *    onbekende, niets voor lege string
 *  - FeatureGrid renderer: SVG-iconen tonen in output i.p.v. raw strings
 *    (regression voor screenshot LINFI: "RULER" / "ZAP" / "DROPLET" /
 *    "SHIELD-CHECK" labels)
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase23-lucide-icons.ts
 */

import { renderToStaticMarkup } from 'react-dom/server';
import type * as React from 'react';
import {
  normalizeIconName,
  resolveLucideIcon,
  IconBlock,
} from '../../src/features/campaigns/components/canvas/medium/lucide-icon-map';
import { buildSpikePuckConfig } from '../../src/features/campaigns/components/canvas/medium/puck-config';
import type { CanvasContextStack } from '../../src/lib/ai/canvas-context';
import { getDesignSystemForLayoutStyle } from '../../src/lib/landing-pages/design-system';
import {
  DEFAULT_BRAND_TOKENS,
  type BrandTokens,
} from '../../src/lib/landing-pages/brand-tokens';

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

// ─── normalizeIconName ───────────────────────────────────

group('FIX — normalizeIconName variations');
{
  const cases: Array<[string, string]> = [
    ['zap', 'zap'],
    ['Zap', 'zap'],
    ['ZAP', 'zap'],
    ['ShieldCheck', 'shield-check'],
    ['shield-check', 'shield-check'],
    ['SHIELD-CHECK', 'shield-check'],
    ['shield_check', 'shield-check'],
    ['SHIELD_CHECK', 'shield-check'],
    ['shield check', 'shield-check'],
    ['Trending Up', 'trending-up'],
    ['TrendingUp', 'trending-up'],
    ['trending_up', 'trending-up'],
    ['lucide-zap', 'zap'],
    ['Lucide-ShieldCheck', 'shield-check'],
    ['CheckCircle2', 'check-circle-2'],
    ['', ''],
    ['   ', ''],
  ];
  for (const [input, expected] of cases) {
    const got = normalizeIconName(input);
    assert(`"${input}" → "${expected}"`, got === expected, `got "${got}"`);
  }
}

// ─── resolveLucideIcon ────────────────────────────────────

group('FIX — resolveLucideIcon match + miss');
{
  // Bekende icons returnen een component (function/object, not null)
  const knowns = ['zap', 'ZAP', 'shield-check', 'ShieldCheck', 'ruler', 'droplet', 'sparkles', 'rocket'];
  for (const name of knowns) {
    const icon = resolveLucideIcon(name);
    assert(`"${name}" → component`, icon !== null);
  }

  // Onbekende → null
  const unknowns = ['definitely-not-a-real-icon', 'asdfqwerty', 'totally-fake'];
  for (const name of unknowns) {
    const icon = resolveLucideIcon(name);
    assert(`"${name}" → null`, icon === null);
  }

  // Lege string → null
  assert('"" → null', resolveLucideIcon('') === null);
}

// ─── IconBlock rendering ──────────────────────────────────

group('FIX — IconBlock rendering');
{
  // Match: render SVG
  const elKnown = IconBlock({ name: 'zap', color: '#FF0000', size: 24 });
  const htmlKnown = renderToStaticMarkup(elKnown as React.ReactElement);
  assert('match → <svg>', htmlKnown.includes('<svg'));
  assert('match → stroke kleur attribute',
    htmlKnown.includes('#FF0000') ||
      htmlKnown.toLowerCase().includes('stroke') && htmlKnown.toLowerCase().includes('rgb'));
  assert('match → aria-hidden wrapper', htmlKnown.includes('aria-hidden="true"'));

  // Miss: render text fallback
  const elMiss = IconBlock({
    name: 'not-a-real-icon-name',
    color: '#FF0000',
    fallbackTextStyle: { textTransform: 'uppercase' },
  });
  const htmlMiss = renderToStaticMarkup(elMiss as React.ReactElement);
  assert('miss → geen <svg>', !htmlMiss.includes('<svg'));
  assert('miss → text-label rendert', htmlMiss.includes('not-a-real-icon-name'));

  // Empty: null (no render)
  const elEmpty = IconBlock({ name: '', color: '#FF0000' });
  assert('empty → null', elEmpty === null);
  const elWhitespace = IconBlock({ name: '   ', color: '#FF0000' });
  assert('whitespace → null', elWhitespace === null);
}

// ─── FeatureGrid integration ──────────────────────────────

group('FIX — FeatureGrid renderer SVG-iconen i.p.v. text-label (regression LINFI)');
{
  const tokens: BrandTokens = {
    ...DEFAULT_BRAND_TOKENS,
    brand: '#B59032',
    layoutStyle: 'MINIMAL',
    designSystem: getDesignSystemForLayoutStyle('MINIMAL'),
    archetype: 'RULER',
  };

  const ctx = {
    brand: { brandName: 'LINFI' },
    personas: [],
    brief: null,
    concept: null,
    journeyPhase: null,
    medium: null,
    deliverableTypeId: 'landing-page',
    products: [],
    brandTokens: tokens,
  } as unknown as CanvasContextStack;
  const config = buildSpikePuckConfig(ctx);
  const featureGrid = (config.components as Record<string, { render: (p: unknown) => unknown }>)
    .FeatureGrid;

  const html = renderToStaticMarkup(
    featureGrid.render({
      columns: '4',
      features: [
        { title: 'Millimeter-nauwkeurige pasvorm', description: 'Wij meten...', icon: 'ruler' },
        { title: 'Elektrische bediening', description: 'Geen handmatig...', icon: 'zap' },
        { title: 'Waterdicht en beloopbaar', description: 'Volledig waterdichte...', icon: 'droplet' },
        { title: 'Gelaagd veiligheidsglas', description: 'Voor glazen...', icon: 'shield-check' },
      ],
    }) as React.ReactElement,
  );

  // Vier SVG-elementen verwacht (één per feature card)
  const svgCount = (html.match(/<svg/g) ?? []).length;
  assert(`vier <svg> elements gerenderd (got ${svgCount})`, svgCount === 4);

  // Brand color #B59032 zou in stroke moeten zitten
  assert('brand-color #B59032 in SVG-output', html.includes('#B59032'));

  // De raw strings "RULER" / "ZAP" / "DROPLET" / "SHIELD-CHECK" mogen
  // NIET meer als plain-text labels verschijnen (regression check)
  assert('geen "RULER" als label (was bug)', !/>RULER</.test(html));
  assert('geen "ZAP" als label', !/>ZAP</.test(html));
  assert('geen "DROPLET" als label', !/>DROPLET</.test(html));
  assert('geen "SHIELD-CHECK" als label', !/>SHIELD-CHECK</.test(html));

  // Titles + descriptions blijven wel renderen
  assert('title behouden', html.includes('Millimeter-nauwkeurige pasvorm'));
  assert('description behouden', html.includes('Wij meten...'));
}

group('FIX — Camel-case icon-namen werken ook (AI varieert)');
{
  const tokens: BrandTokens = {
    ...DEFAULT_BRAND_TOKENS,
    brand: '#1FD1B2',
    layoutStyle: 'COMMERCIAL',
    designSystem: getDesignSystemForLayoutStyle('COMMERCIAL'),
    archetype: 'SAGE',
  };

  const ctx = {
    brand: { brandName: 'Branddock' },
    personas: [],
    brief: null,
    concept: null,
    journeyPhase: null,
    medium: null,
    deliverableTypeId: 'landing-page',
    products: [],
    brandTokens: tokens,
  } as unknown as CanvasContextStack;
  const config = buildSpikePuckConfig(ctx);
  const featureGrid = (config.components as Record<string, { render: (p: unknown) => unknown }>)
    .FeatureGrid;

  const html = renderToStaticMarkup(
    featureGrid.render({
      columns: '3',
      features: [
        { title: 'A', description: 'a', icon: 'TrendingUp' },
        { title: 'B', description: 'b', icon: 'CheckCircle' },
        { title: 'C', description: 'c', icon: 'unknown_icon_name' },
      ],
    }) as React.ReactElement,
  );

  const svgCount = (html.match(/<svg/g) ?? []).length;
  assert('twee CamelCase namen herkend → 2 <svg>', svgCount === 2);
  assert(
    'onbekend "unknown_icon_name" → text-fallback',
    html.includes('unknown_icon_name'),
  );
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);

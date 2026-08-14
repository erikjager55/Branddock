/**
 * Phase 51 — compile-to-static artifact (P2, ADR 2026-08-12).
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase51-static-compile.ts
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { compilePageArtifact, buildFontLinks } from '../../src/lib/landing-pages/static-compile';
import { PageRender } from '../../src/lib/landing-pages/page-render';
import { buildSpikePuckConfig } from '../../src/features/campaigns/components/canvas/medium/puck-config';
import { resolveTemplateBuilder, type FilledFields } from '../../src/features/campaigns/components/canvas/medium/puck-templates';
import { DEFAULT_BRAND_TOKENS, type BrandTokens } from '../../src/lib/landing-pages/brand-tokens';

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

const FILLED: FilledFields = {
  headline: 'Compile-smoke kop', sub: 'Ondertitel', ctaLabel: 'Ga verder', ctaHref: '/x',
  featureItems: [{ title: 'Snel', description: 'Alles direct live.' }],
  faqItems: [{ question: 'Werkt dit?', answer: 'Ja, bevroren per versie.' }],
  testimonialQuote: 'Bevroren en wel.', testimonialAuthor: 'Tester',
  pricingTiers: [{ name: 'S', price: '€1', features: 'x' }], longText: 'Lange tekst.',
};

async function main(): Promise<void> {
  const config = buildSpikePuckConfig(null);
  const tree = resolveTemplateBuilder('landing-page')(FILLED, null);

  console.log('\n1. artifact-inhoud');
  const artifact = await compilePageArtifact({
    puckData: tree,
    config,
    brandTokens: DEFAULT_BRAND_TOKENS,
    jsonLd: { '@type': 'WebPage', name: 'x</script><b>injectie</b>' },
  });
  assert('bevat sectie-copy', artifact.html.includes('Compile-smoke kop'));
  assert('bevat a11y-styleblock', artifact.html.includes('<style>') && artifact.html.includes('focus-visible'));
  assert('JSON-LD ge-escaped (geen rauwe </script> in payload)', !artifact.html.includes('x</script>'));
  assert('JSON-LD aanwezig', artifact.html.includes('application/ld+json'));
  assert('bytes geteld', artifact.bytes === Buffer.byteLength(artifact.html, 'utf8'));

  console.log('\n2. body identiek aan PageRender-output');
  const body = renderToStaticMarkup(
    createElement(PageRender as never, { config, data: tree, withSectionMarkers: false } as never),
  );
  assert('artifact eindigt op de render-body', artifact.html.endsWith(body));

  console.log('\n3. font-links');
  const brandFonts: BrandTokens = { ...DEFAULT_BRAND_TOKENS, headingFont: "'Cormorant Garamond', serif", bodyFont: "'Poppins', sans-serif" };
  const links = buildFontLinks(brandFonts);
  assert('niet-systeem-fonts krijgen css2-link', links.includes('fonts.googleapis.com/css2') && links.includes('Cormorant+Garamond') && links.includes('Poppins'));
  const systemOnly = buildFontLinks({ ...DEFAULT_BRAND_TOKENS, headingFont: 'system-ui, sans-serif', bodyFont: 'Arial, sans-serif' });
  assert('systeem-fonts → geen link', systemOnly === '');

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

void main();

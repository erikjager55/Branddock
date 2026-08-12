/**
 * Phase 50 — publish-gate (P6): deterministische merk-/integriteits-checks.
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase50-publish-gate.ts
 */
import { runPublishGate } from '../../src/lib/landing-pages/publish-gate';

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

const CLEAN = {
  root: { props: {} },
  content: [
    { type: 'BrandHero', props: { id: 'h1', headline: 'Sneller schakelen met je merk en meer resultaat', sub: 'Alles op één plek voor je hele team vandaag nog', heroVisualUrl: 'https://cdn.example/hero.png', ctaLabel: 'Plan een demo' } },
    { type: 'FeatureGrid', props: { id: 'g1', features: [{ heading: 'Consistent altijd', body: 'Elke uiting in dezelfde merkstem geschreven en bewaakt door regels.' }] } },
    { type: 'Testimonial', props: { id: 't1', quote: 'Eindelijk kloppen onze pagina’s met het merk en de tone of voice.', author: 'Merkmanager' } },
    { type: 'BrandCTA', props: { id: 'c1', label: 'Start vandaag nog met je merk', href: '/contact' } },
  ],
};

console.log('\n1. schone tree');
{
  const g = runPublishGate({ puckData: CLEAN, contentType: 'landing-page' });
  assert('ok zonder blockers', g.ok && g.blockers === 0, JSON.stringify(g.findings));
}

console.log('\n2. blockers');
{
  const withPlaceholder = structuredClone(CLEAN);
  withPlaceholder.content[0].props.headline = 'Headline placeholder';
  const g = runPublishGate({ puckData: withPlaceholder, contentType: 'landing-page' });
  assert('placeholder-copy blokkeert', !g.ok && g.findings.some((f) => f.code === 'placeholder-copy'));

  const noCta = structuredClone(CLEAN);
  noCta.content = noCta.content.filter((c) => c.type !== 'BrandCTA');
  const g2 = runPublishGate({ puckData: noCta, contentType: 'landing-page' });
  assert('ontbrekende verplichte sectie blokkeert', !g2.ok && g2.findings.some((f) => f.code === 'missing-required-section'));

  const g3 = runPublishGate({ puckData: { niet: 'een tree' }, contentType: 'landing-page' });
  assert('ongeldige tree blokkeert', !g3.ok && g3.findings.some((f) => f.code === 'invalid-tree'));
}

console.log('\n3. warnings');
{
  const deadHref = structuredClone(CLEAN);
  deadHref.content[3].props.href = '#';
  const g = runPublishGate({ puckData: deadHref, contentType: 'landing-page' });
  assert("'#'-href is warning, geen blocker", g.ok && g.findings.some((f) => f.code === 'empty-cta-href' && f.severity === 'warning'));

  const noHero = structuredClone(CLEAN);
  delete (noHero.content[0].props as Record<string, unknown>).heroVisualUrl;
  const g2 = runPublishGate({ puckData: noHero, contentType: 'landing-page' });
  assert('hero zonder beeld is warning', g2.ok && g2.findings.some((f) => f.code === 'missing-hero-image'));
}

console.log('\n4. onbekend content-type → geen verplichte-sectie-checks');
{
  const minimal = { root: { props: {} }, content: [{ type: 'RichText', props: { id: 'r1', body: 'Een korte alinea met voldoende woorden om niet als lege pagina te gelden en nog wat extra tekst erbij zodat de teller boven de veertig woorden uitkomt want anders telt de kwaliteitsdrempel dit als bijna lege pagina en dat is hier niet het doel van de test.' } }] };
  const g = runPublishGate({ puckData: minimal, contentType: 'geo-artikel-onbekend' });
  assert('geen required-findings', !g.findings.some((f) => f.code === 'missing-required-section'));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

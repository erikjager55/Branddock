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
  assert('template-vorm placeholder (edge) blokkeert', !g.ok && g.findings.some((f) => f.code === 'placeholder-copy' && f.severity === 'blocker'));

  // Review 2026-08-13 M3: het woord middenin echte klant-copy is een warning
  // met override — anders is zo'n pagina permanent onpubliceerbaar.
  const midSentence = structuredClone(CLEAN);
  midSentence.content[0].props.sub = 'Ons formulier toont een placeholder in elk invoerveld voor context.';
  const gMid = runPublishGate({ puckData: midSentence, contentType: 'landing-page' });
  assert(
    'placeholder middenin copy is warning, geen blocker',
    gMid.ok && gMid.findings.some((f) => f.code === 'placeholder-copy' && f.severity === 'warning'),
    JSON.stringify(gMid.findings),
  );

  // Edge-detectie werkt ook genest in arrays (template-defaults zitten in items).
  const nested = structuredClone(CLEAN);
  (nested.content[1].props as Record<string, unknown>).features = [{ heading: 'Pain point placeholder', body: 'x' }];
  const gNested = runPublishGate({ puckData: nested, contentType: 'landing-page' });
  assert('geneste array-placeholder blokkeert', !gNested.ok && gNested.findings.some((f) => f.code === 'placeholder-copy' && f.severity === 'blocker'));

  const noCta = structuredClone(CLEAN);
  noCta.content = noCta.content.filter((c) => c.type !== 'BrandCTA');
  const g2 = runPublishGate({ puckData: noCta, contentType: 'landing-page' });
  assert('ontbrekende verplichte sectie blokkeert (eerste publish)', !g2.ok && g2.findings.some((f) => f.code === 'missing-required-section' && f.severity === 'blocker'));

  // Republish van een reeds-live pagina: degradeert naar warning (tekstfix
  // op een oude tree moet altijd uit kunnen), placeholder blijft blocker.
  const g2b = runPublishGate({ puckData: noCta, contentType: 'landing-page', hasBeenPublished: true });
  assert(
    'ontbrekende verplichte sectie is warning bij republish',
    g2b.ok && g2b.findings.some((f) => f.code === 'missing-required-section' && f.severity === 'warning'),
    JSON.stringify(g2b.findings),
  );
  const gPlaceholderRepub = runPublishGate({ puckData: withPlaceholder, contentType: 'landing-page', hasBeenPublished: true });
  assert('placeholder blijft blocker, óók bij republish', !gPlaceholderRepub.ok);

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

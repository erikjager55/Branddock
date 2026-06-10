/**
 * [DET] LP-assistant content-edits — `read_landing_page_content` /
 * `update_landing_page_content` helpers. Verifieert dat de tekstveld-walker de
 * juiste paden vindt (en URLs/hrefs/ids/tokens uitsluit), dat een deepSet-edit
 * de tekst wijzigt zonder niet-tekst props te raken, en dat de hero-preserve
 * chokepoint een gewirede header-image behoudt bij een tekst-edit.
 *
 * Run: npx tsx scripts/smoke-tests/lp-assistant-content-edits.ts
 */
import {
  collectEditableTextFields,
  readPath,
  type PuckTreeLike,
} from '../../src/lib/landing-pages/puck-text-fields';
import { deepSet } from '../../src/lib/utils/deep-set';
import { preserveHeroOnSettings } from '../../src/features/campaigns/components/canvas/medium/hero-visual-preserve';
import { isPuckWebpageType } from '../../src/lib/landing-pages/webpage-types';

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

const HERO_URL = '/uploads/media/x/hero-a.png';

function sampleTree(): PuckTreeLike {
  return {
    content: [
      {
        type: 'BrandHero',
        props: {
          eyebrow: 'WELKOM',
          headline: 'Originele kop',
          sub: 'Originele subkop',
          ctaLabel: 'Start nu',
          ctaHref: '/signup',
          heroVisualUrl: HERO_URL,
        },
      },
      {
        type: 'MetricsBand',
        props: {
          bandTone: 'alt',
          columns: '3',
          metrics: [
            { value: '500+', label: 'Klanten', icon: 'badge-check' },
            { value: '99%', label: 'Tevredenheid', icon: 'star' },
          ],
        },
      },
      {
        type: 'StickyCtaBar',
        props: { label: 'Klaar om te starten?', ctaLabel: 'Plan een afspraak', href: '#contact' },
      },
    ],
  };
}

// ─── 1. Tekstveld-walker: vindt copy, sluit niet-tekst uit ───────────────────
group('1 — collectEditableTextFields paden + denylist');
{
  const fields = collectEditableTextFields(sampleTree());
  const paths = new Set(fields.map((f) => f.path));

  assert('vindt hero headline', paths.has('content[0].props.headline'));
  assert('vindt hero eyebrow', paths.has('content[0].props.eyebrow'));
  assert('vindt hero sub', paths.has('content[0].props.sub'));
  assert('vindt hero ctaLabel', paths.has('content[0].props.ctaLabel'));
  assert('vindt metric label (genest)', paths.has('content[1].props.metrics[0].label'));
  assert('vindt metric value (zichtbare copy)', paths.has('content[1].props.metrics[0].value'));
  assert('vindt sticky label', paths.has('content[2].props.label'));
  assert('vindt sticky ctaLabel', paths.has('content[2].props.ctaLabel'));

  assert('sluit heroVisualUrl uit', !paths.has('content[0].props.heroVisualUrl'));
  assert('sluit ctaHref uit', !paths.has('content[0].props.ctaHref'));
  assert('sluit href uit', !paths.has('content[2].props.href'));
  assert('sluit icon uit (Lucide-naam)', !paths.has('content[1].props.metrics[0].icon'));
  assert('sluit bandTone uit (enum-token)', !paths.has('content[1].props.bandTone'));
  assert('sluit columns uit (layout-config)', !paths.has('content[1].props.columns'));

  const headline = fields.find((f) => f.path === 'content[0].props.headline');
  assert('rapporteert component + value', headline?.component === 'BrandHero' && headline?.value === 'Originele kop');
}

// ─── 2. Edit-roundtrip: deepSet wijzigt tekst, laat de rest staan ────────────
group('2 — deepSet-edit wijzigt alleen het doelveld');
{
  const tree = sampleTree();
  deepSet(tree as unknown as Record<string, unknown>, 'content[0].props.headline', 'Kortere kop');
  deepSet(tree as unknown as Record<string, unknown>, 'content[1].props.metrics[0].label', 'Tevreden klanten');

  assert('headline gewijzigd', readPath(tree, 'content[0].props.headline') === 'Kortere kop');
  assert('metric label gewijzigd', readPath(tree, 'content[1].props.metrics[0].label') === 'Tevreden klanten');
  assert('hero-URL ongemoeid', readPath(tree, 'content[0].props.heroVisualUrl') === HERO_URL);
  assert('sub ongemoeid', readPath(tree, 'content[0].props.sub') === 'Originele subkop');
  assert('metric value ongemoeid', readPath(tree, 'content[1].props.metrics[0].value') === '500+');
}

// ─── 3. Hero-preserve chokepoint bij een tekst-edit ──────────────────────────
group('3 — preserveHeroOnSettings behoudt hero bij settings-write');
{
  const existing = { puckData: sampleTree() };
  // Simuleer de tool: clone, edit tekst (hero blijft gevuld), schrijf settings.
  const edited = sampleTree();
  deepSet(edited as unknown as Record<string, unknown>, 'content[0].props.headline', 'Nieuwe kop');
  const incoming = { ...existing, puckData: edited };
  const preserved = preserveHeroOnSettings(existing as Record<string, unknown>, incoming as Record<string, unknown>);
  const merged = { ...existing, ...preserved } as { puckData: PuckTreeLike };
  assert('tekst toegepast', readPath(merged.puckData, 'content[0].props.headline') === 'Nieuwe kop');
  assert('hero behouden', readPath(merged.puckData, 'content[0].props.heroVisualUrl') === HERO_URL);

  // Regressie-guard: zou een (foutieve) lege-hero write 'm clobberen? Nee.
  const cleared = sampleTree();
  deepSet(cleared as unknown as Record<string, unknown>, 'content[0].props.heroVisualUrl', '');
  const clobberAttempt = preserveHeroOnSettings(existing as Record<string, unknown>, { ...existing, puckData: cleared } as Record<string, unknown>);
  const mergedClobber = { ...existing, ...clobberAttempt } as { puckData: PuckTreeLike };
  assert('lege-hero write wordt geblokkeerd', readPath(mergedClobber.puckData, 'content[0].props.heroVisualUrl') === HERO_URL);
}

// ─── 4. Type-guard ───────────────────────────────────────────────────────────
group('4 — isPuckWebpageType');
{
  assert('landing-page = web-page', isPuckWebpageType('landing-page'));
  assert('microsite = web-page', isPuckWebpageType('microsite'));
  assert('blog-post != web-page', !isPuckWebpageType('blog-post'));
  assert('linkedin-post != web-page', !isPuckWebpageType('linkedin-post'));
  assert('null != web-page', !isPuckWebpageType(null));
}

// ─── 5. URL-guard verfijning (copy met #//-prefix blijft, media-pad eruit) ───
group('5 — looksLikeUrl mag copy niet wegfilteren');
{
  const tree: PuckTreeLike = {
    content: [
      {
        type: 'BrandHero',
        props: {
          headline: '#1 in vlekkeloos textiel',   // copy met #-prefix
          sub: '24/7 service, elke dag',            // copy met /-segment
          eyebrow: 'https://napking.nl',            // echte URL → eruit
          heroVisualUrl: '/uploads/media/x/hero.png',
        },
      },
    ],
  };
  const paths = new Set(collectEditableTextFields(tree).map((f) => f.path));
  assert('copy met #-prefix blijft', paths.has('content[0].props.headline'));
  assert('copy met /-segment blijft', paths.has('content[0].props.sub'));
  assert('echte URL in copy-veld eruit', !paths.has('content[0].props.eyebrow'));
  assert('media-pad (heroVisualUrl) eruit', !paths.has('content[0].props.heroVisualUrl'));
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);

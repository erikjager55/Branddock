/**
 * Smoke-test voor Phase 6 — page-level AI utilities.
 *
 * Verifies:
 *  - flattenPuckText extracts human-readable text only (excludes id/href/
 *    personaId/metadata), wordCount + componentTypeCounts work.
 *  - evaluatePageQuality scores correctly per heuristic-band:
 *    - Empty tree → low score (no hero/cta/proof + tiny word-count)
 *    - Hero-only → mid score
 *    - Full landing-page (hero + cta + faq + features) → ≥ threshold
 *    - Over-bloated (> 400 words) → drops word-count bonus
 *  - parseSimpleHeuristic produces sane FilledFields fallbacks for varied
 *    prompts (product-launch / webinar / demo / generic).
 *  - buildClaudePrompt wires brand-name + tone + persona + key-list into
 *    the user-prompt string.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase6.ts
 */

import {
  flattenPuckText,
  wordCount,
  componentTypeCounts,
  type PuckLikeData,
} from '../../src/lib/landing-pages/puck-data-flatten';
import { evaluatePageQuality } from '../../src/lib/landing-pages/page-quality';
import {
  parseSimpleHeuristic,
  buildClaudePrompt,
} from '../../src/lib/landing-pages/generate-page-prompt';

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

// ─── Fixtures ────────────────────────────────────────────────

const TREE_FULL: PuckLikeData = {
  root: { props: {} },
  content: [
    {
      type: 'BrandHero',
      props: {
        id: 'h1',
        headline: 'Lanceer in minuten',
        sub: 'Voor MKB marketing-teams die snel willen schakelen.',
        ctaLabel: 'Start gratis',
      },
    },
    {
      type: 'FeatureGrid',
      props: {
        id: 'fg1',
        columns: '3',
        features: [
          { title: 'Snel', description: 'In 5 minuten online.' },
          { title: 'Brand-aware', description: 'Automatisch on-brand.' },
          { title: 'Schaalbaar', description: 'Groeit met je business.' },
        ],
      },
    },
    {
      type: 'BrandCTA',
      props: { id: 'cta1', label: 'Start nu', href: '/start', personaId: 'p-1' },
    },
    {
      type: 'FAQ',
      props: {
        id: 'faq1',
        items: [
          { question: 'Hoe werkt het?', answer: 'Heel eenvoudig.' },
          { question: 'Wat kost het?', answer: 'Zie pricing.' },
        ],
      },
    },
    {
      type: 'Footer',
      props: { id: 'foot1', companyName: 'TestBrand', tagline: 'Tagline', links: [] },
    },
  ],
};

const TREE_EMPTY: PuckLikeData = { root: { props: {} }, content: [] };

const TREE_HERO_ONLY: PuckLikeData = {
  root: { props: {} },
  content: [
    {
      type: 'BrandHero',
      props: { id: 'h1', headline: 'Hello', sub: 'World', ctaLabel: 'Go' },
    },
  ],
};

const TREE_BLOATED: PuckLikeData = {
  root: { props: {} },
  content: [
    {
      type: 'BrandHero',
      props: { id: 'h1', headline: 'Long', sub: 'Sub', ctaLabel: 'CTA' },
    },
    {
      type: 'RichText',
      props: { id: 'r1', content: 'word '.repeat(500) },
    },
  ],
};

// ─── 1. flattenPuckText + helpers ────────────────────────────

function testFlatten(): void {
  group('1. flattenPuckText / wordCount / componentTypeCounts');

  const text = flattenPuckText(TREE_FULL);
  assert('includes hero headline', text.includes('Lanceer in minuten'));
  assert('includes feature description', text.includes('Automatisch on-brand'));
  assert('includes faq question', text.includes('Hoe werkt het?'));
  assert('excludes ids (no h1 substring)', !text.includes('"id":'));
  assert(
    'excludes personaId values',
    !text.split(/\s+/).includes('p-1'),
    text.slice(0, 100),
  );

  const wc = wordCount(TREE_FULL);
  assert(`wordCount > 20 (got ${wc})`, wc > 20);
  assert(`wordCount < 200 (got ${wc})`, wc < 200);
  assert('empty tree wordCount = 0', wordCount(TREE_EMPTY) === 0);

  const counts = componentTypeCounts(TREE_FULL);
  assert('counts BrandHero = 1', counts.BrandHero === 1);
  assert('counts FAQ = 1', counts.FAQ === 1);
  assert('counts missing type as undefined', counts.PricingTable === undefined);
}

// ─── 2. evaluatePageQuality ──────────────────────────────────

function testPageQuality(): void {
  group('2. evaluatePageQuality');

  const full = evaluatePageQuality(TREE_FULL);
  assert(`full tree thresholdMet (score=${full.score})`, full.thresholdMet);
  assert('full tree signals hasHero', full.signals.hasHero);
  assert('full tree signals hasCta', full.signals.hasCta);
  assert('full tree signals hasProof', full.signals.hasProof);

  const empty = evaluatePageQuality(TREE_EMPTY);
  assert(`empty tree below threshold (score=${empty.score})`, !empty.thresholdMet);
  assert('empty tree signals no hero', !empty.signals.hasHero);

  const heroOnly = evaluatePageQuality(TREE_HERO_ONLY);
  assert(
    `hero-only mid score (got ${heroOnly.score})`,
    heroOnly.score >= 30 && heroOnly.score < 70,
  );

  const bloated = evaluatePageQuality(TREE_BLOATED);
  assert(`bloated tree has words > 400 (got ${bloated.signals.wordCount})`, bloated.signals.wordCount > 400);
  // bloated should NOT get the wordCount bonus → score < hero+cta+richtext baseline
  assert(`bloated tree below threshold (score=${bloated.score})`, bloated.score < 70);
}

// ─── 3. parseSimpleHeuristic ─────────────────────────────────

function testParseHeuristic(): void {
  group('3. parseSimpleHeuristic — prompt → FilledFields fallback');

  const launch = parseSimpleHeuristic({
    prompt: 'product-launch voor MKB marketingteams met focus op snelheid',
    brandName: 'BrandX',
  });
  assert(
    'product-launch prompt → headline mentions brand',
    launch.headline.includes('BrandX'),
    launch.headline,
  );

  const webinar = parseSimpleHeuristic({
    prompt: 'webinar over content marketing trends 2026',
  });
  assert(
    'webinar prompt → headline starts with Webinar',
    webinar.headline.startsWith('Webinar:'),
    webinar.headline,
  );

  const demo = parseSimpleHeuristic({ prompt: 'plan een demo voor enterprise klanten' });
  assert('demo prompt → ctaLabel = Plan demo', demo.ctaLabel === 'Plan demo');

  const trial = parseSimpleHeuristic({ prompt: 'start een proefperiode vandaag' });
  assert('trial prompt → ctaLabel = Start proefperiode', trial.ctaLabel === 'Start proefperiode');

  const download = parseSimpleHeuristic({ prompt: 'download het whitepaper' });
  assert('download prompt → ctaLabel = Download nu', download.ctaLabel === 'Download nu');

  const generic = parseSimpleHeuristic({ prompt: 'iets generieks' });
  assert(
    'generic prompt → ctaLabel = Start nu',
    generic.ctaLabel === 'Start nu',
    generic.ctaLabel,
  );

  assert('all fallbacks return empty arrays for items', launch.featureItems.length === 0);
  assert('all fallbacks return longText = prompt', launch.longText.includes('product-launch'));
}

// ─── 4. buildClaudePrompt ────────────────────────────────────

function testBuildClaudePrompt(): void {
  group('4. buildClaudePrompt — context injection');

  const prompt = buildClaudePrompt({
    prompt: 'snelle landing voor pilot',
    brandName: 'TestCo',
    brandToneOfVoice: 'energetic + professional',
    primaryPersonaName: 'Marit',
  });

  assert('includes brand name', prompt.includes('Brand: TestCo'));
  assert('includes tone of voice', prompt.includes('Tone of voice: energetic'));
  assert('includes persona', prompt.includes('Marit'));
  assert('includes user prompt verbatim', prompt.includes('snelle landing voor pilot'));
  assert('asks for JSON-only output', prompt.includes('ONLY valid JSON'));
  assert('lists expected keys', prompt.includes('headline') && prompt.includes('featureItems'));

  // No-brand variant should not include the brand-line
  const minimal = buildClaudePrompt({ prompt: 'x' });
  assert('omits brand line when absent', !minimal.includes('Brand:'));
}

async function main(): Promise<void> {
  console.log('Phase 6 smoke-test — page-level AI utilities');
  testFlatten();
  testPageQuality();
  testParseHeuristic();
  testBuildClaudePrompt();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('SMOKE crashed', err);
  process.exit(2);
});

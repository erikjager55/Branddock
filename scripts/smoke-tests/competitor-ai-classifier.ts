/**
 * Smoke-test voor `src/lib/competitors/ai-classifier.ts` +
 * `computeDiffWithClassifier` wrapper.
 *
 * 5 scenarios:
 *   (a) Real Anthropic call op CATEGORY pattern-input → 1 event, type=CATEGORY_REPOSITIONING
 *   (b) Pre-filter skip op identical snapshots → 0 events, geen AI-call
 *   (c) Pre-filter skip op cosmetic synonym-shift (low Jaccard) → 0 events, geen AI-call
 *   (d) API-error graceful via wrapper + mock failing classifier → alleen deterministic events
 *   (e) Real Anthropic call op NL-talige CATEGORY pair → ≥1 event (taal-coverage check)
 *
 * (a) en (e) doen echte API-calls (~$0.002 elk via Haiku 4.5). (b), (c), (d)
 * doen geen netwerk-IO — pre-filter werkt synchroon, mock classifier wordt
 * geïnjecteerd in de wrapper.
 *
 * Run: ANTHROPIC_API_KEY=... npx tsx scripts/smoke-tests/competitor-ai-classifier.ts
 */
import { classifyPatternEvents } from '../../src/lib/competitors/ai-classifier';
import { computeDiffWithClassifier } from '../../src/lib/competitors/diff-engine';
import type {
  CanonicalExtracted,
  ClassifierFn,
  DetectedActivity,
  ManualEventContext,
} from '../../src/lib/competitors/types';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

// ─── Fixtures ─────────────────────────────────────────────

function makeCanonical(overrides: Partial<CanonicalExtracted>): CanonicalExtracted {
  return {
    tagline: null,
    valueProposition: null,
    targetAudience: null,
    differentiators: [],
    mainOfferings: [],
    pricingModel: null,
    pricingDetails: null,
    toneOfVoice: null,
    messagingThemes: [],
    visualStyleNotes: null,
    strengths: [],
    weaknesses: [],
    socialLinks: null,
    hasBlog: null,
    hasCareersPage: null,
    ...overrides,
  };
}

// CRM → AI sales platform (cat-01 uit A1-probe)
const CATEGORY_PREV = makeCanonical({
  valueProposition: 'Manage your customer relationships in one place',
  targetAudience: 'SMB sales teams',
  differentiators: ['simple UI', 'affordable', 'fast setup'],
  mainOfferings: ['Contact management', 'Pipeline tracking', 'Email integration'],
});
const CATEGORY_NEXT = makeCanonical({
  valueProposition: 'AI-driven sales intelligence that closes deals 3x faster',
  targetAudience: 'Modern sales teams',
  differentiators: ['predictive scoring', 'auto-prioritization', 'conversational AI'],
  mainOfferings: ['AI deal scoring', 'Meeting intelligence', 'Revenue forecasting'],
});

// Identical pair
const IDENTICAL = makeCanonical({
  valueProposition: 'Project management for teams',
  targetAudience: 'Marketing teams',
  differentiators: ['Kanban', 'simple', 'fast'],
  mainOfferings: ['Tasks', 'Projects'],
});

// Cosmetic synonym-shift — pre-filter MOET skippen
const COSMETIC_PREV = makeCanonical({
  valueProposition: 'Easy invoicing for freelancers',
  targetAudience: 'Freelancers',
  differentiators: ['easy templates', 'fast send', 'easy tracking'],
  mainOfferings: ['Invoices', 'Estimates'],
});
const COSMETIC_NEXT = makeCanonical({
  valueProposition: 'Simple invoicing for freelancers',
  targetAudience: 'Freelancers',
  differentiators: ['simple templates', 'quick send', 'simple tracking'],
  mainOfferings: ['Invoices', 'Estimates'],
});

// NL CATEGORY shift — boekhoudsoftware → AI financiële assistent
const NL_PREV = makeCanonical({
  valueProposition: 'Boekhoudsoftware voor zzp en kleine ondernemers',
  targetAudience: 'Zelfstandige ondernemers',
  differentiators: ['eenvoudige interface', 'goedkoop abonnement', 'snel opgezet'],
  mainOfferings: ['Facturatie', 'Belastingaangifte', 'Urenregistratie'],
});
const NL_NEXT = makeCanonical({
  valueProposition: 'AI-aangedreven financieel assistent die voorspelt waar je geld heen gaat',
  targetAudience: 'Moderne ondernemingen',
  differentiators: ['voorspellende cashflow-analyse', 'autonome bonnen-verwerking', 'realtime AI-advies'],
  mainOfferings: ['AI cashflow-voorspelling', 'Auto-categorisatie', 'Strategisch financieel dashboard'],
});

// Tagline-only deterministic change (voor scenario d) — triggert pre-filter NIET
// maar produceert wel een deterministic TAGLINE_CHANGED event in computeDiff.
const TAGLINE_PREV = makeCanonical({
  tagline: 'Original tagline',
  valueProposition: 'Project management for teams',
  targetAudience: 'Marketing teams',
  differentiators: ['Kanban', 'simple', 'fast'],
  mainOfferings: ['Tasks', 'Projects'],
});
const TAGLINE_NEXT = makeCanonical({
  tagline: 'Rebranded new tagline',
  valueProposition: 'Project management for teams',
  targetAudience: 'Marketing teams',
  differentiators: ['Kanban', 'simple', 'fast'],
  mainOfferings: ['Tasks', 'Projects'],
});

const EMPTY_CTX: ManualEventContext = {
  workflowBefore: { status: 'ANALYZED', tier: 'TIER_2' },
  workflowAfter: { status: 'ANALYZED', tier: 'TIER_2' },
};

// ─── Scenarios ────────────────────────────────────────────

async function scenarioA_RealCategoryDetection(): Promise<void> {
  console.log('\n## (a) Real Anthropic call — CATEGORY_REPOSITIONING\n');
  const events = await classifyPatternEvents(CATEGORY_PREV, CATEGORY_NEXT);
  assert('returns at least 1 event', events.length >= 1, `got ${events.length}`);
  if (events.length === 0) return;
  const cat = events.find((e) => e.type === 'CATEGORY_REPOSITIONING');
  assert('includes CATEGORY_REPOSITIONING', cat !== undefined);
  if (cat) {
    assert('severity = MAJOR', cat.severity === 'MAJOR', `got ${cat.severity}`);
    assert('detectionMethod = ai-classified', cat.detectionMethod === 'ai-classified');
    assert(
      'confidence is positive number',
      typeof cat.confidence === 'number' && cat.confidence > 0,
      `got ${cat.confidence}`,
    );
    assert('diffPayload.kind = pattern-change', cat.diffPayload.kind === 'pattern-change');
  }
}

async function scenarioB_IdenticalSkip(): Promise<void> {
  console.log('\n## (b) Pre-filter skip — identical snapshots\n');
  // shouldRunClassifier returnt false op Jaccard-distance = 0 voor alle velden,
  // dus classifyPatternEvents exit'eert vóór de AI-call. Empty return zonder
  // throw bewijst pre-filter werkt (anders zou Haiku een leeg events-array
  // returnen of zou een API-call zichtbaar zijn in `AiCallTrace`).
  const events = await classifyPatternEvents(IDENTICAL, IDENTICAL);
  assert('returns 0 events on identical pair', events.length === 0, `got ${events.length}`);
}

async function scenarioC_CosmeticSkip(): Promise<void> {
  console.log('\n## (c) Pre-filter skip — cosmetic synonym-shift (low Jaccard)\n');
  const events = await classifyPatternEvents(COSMETIC_PREV, COSMETIC_NEXT);
  assert('returns 0 events on cosmetic pair', events.length === 0, `got ${events.length}`);
}

async function scenarioD_GracefulApiError(): Promise<void> {
  console.log('\n## (d) Wrapper graceful op classifier-throw — deterministic events alsnog\n');
  const failingClassifier: ClassifierFn = async () => {
    throw new Error('mock: Anthropic API timeout');
  };
  const events: DetectedActivity[] = await computeDiffWithClassifier(
    TAGLINE_PREV,
    TAGLINE_NEXT,
    EMPTY_CTX,
    { classifier: failingClassifier },
  );
  // Deterministic event: TAGLINE_CHANGED (uit pushTaglineChange in diff-engine)
  assert('returns deterministic events despite throw', events.length >= 1, `got ${events.length}`);
  const tagline = events.find((e) => e.type === 'TAGLINE_CHANGED');
  assert('includes TAGLINE_CHANGED (deterministic)', tagline !== undefined);
  assert(
    'no ai-classified events present',
    !events.some((e) => e.detectionMethod === 'ai-classified'),
  );
}

async function scenarioE_NLLanguageCoverage(): Promise<void> {
  console.log('\n## (e) NL-talige CATEGORY pair — taal-coverage check\n');
  const events = await classifyPatternEvents(NL_PREV, NL_NEXT);
  assert('returns at least 1 event on NL pair', events.length >= 1, `got ${events.length}`);
  if (events.length === 0) return;
  // Mag CATEGORY of TARGET_AUDIENCE zijn — accepteer beide (audit aud-03 toonde dual-natured shifts)
  const validTypes = events.filter(
    (e) => e.type === 'CATEGORY_REPOSITIONING' || e.type === 'TARGET_AUDIENCE_CHANGED',
  );
  assert('at least 1 supported event type detected', validTypes.length >= 1);
  const first = validTypes[0];
  if (first) {
    assert('NL detectionMethod = ai-classified', first.detectionMethod === 'ai-classified');
    assert(
      'NL confidence is positive number',
      typeof first.confidence === 'number' && first.confidence > 0,
    );
  }
}

// ─── Main ─────────────────────────────────────────────────

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is required (scenarios a + e doen echte calls)');
    process.exit(1);
  }

  console.log('='.repeat(70));
  console.log('Competitor AI-classifier smoke — 5 scenarios');
  console.log('Cost estimate: ~$0.005 (2 real Haiku calls)');
  console.log('='.repeat(70));

  try {
    await scenarioA_RealCategoryDetection();
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ scenario (a) threw: ${m}`);
    fail++;
  }

  try {
    await scenarioB_IdenticalSkip();
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ scenario (b) threw: ${m}`);
    fail++;
  }

  try {
    await scenarioC_CosmeticSkip();
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ scenario (c) threw: ${m}`);
    fail++;
  }

  try {
    await scenarioD_GracefulApiError();
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ scenario (d) threw: ${m}`);
    fail++;
  }

  try {
    await scenarioE_NLLanguageCoverage();
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ scenario (e) threw: ${m}`);
    fail++;
  }

  console.log('\n' + '='.repeat(70));
  console.log(`PASS: ${pass}   FAIL: ${fail}`);
  console.log('='.repeat(70));
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

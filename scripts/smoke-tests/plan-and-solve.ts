/**
 * Smoke-test voor Plan-and-Solve chain pipeline.
 * Sub-sprint #5.B chain-pattern C foundation.
 *
 * Test-strategie: dependency-injection van mock-AICompletionFn zodat we
 * pipeline-mechanica testen zonder echte AI-calls. Verifieert:
 *   - Plan-stage produceert valid ContentPlan
 *   - Sequential execute-loop maakt N sections (= plan.sections.length)
 *   - Running-anchor mechanism: sectie-N krijgt sectie-N-1 anchor
 *   - Assembly: H1 + per sectie H2 + content + optionele FAQ
 *   - Streaming variant emit events in juiste volgorde
 *   - Error-handling: AI-fail in stage X triggert error-event met juiste stage-tag
 *
 * Run: npx tsx scripts/smoke-tests/plan-and-solve.ts
 */
import {
  runPlanAndSolve,
  runPlanAndSolveStream,
  assembleMarkdown,
  buildRunningAnchor,
  type AICompletionFn,
} from '../../src/lib/ai/chains/plan-and-solve';
import type {
  PlanAndSolveBrief,
  ContentPlan,
  ExecutedSection,
} from '../../src/lib/ai/chains/plan-and-solve.types';

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

// ─── Fixtures ─────────────────────────────────────────────────

const BRIEF: PlanAndSolveBrief = {
  brandName: 'Napking',
  contentLanguage: 'nl',
  contentType: 'blog-post',
  objective: 'Restaurant-owners overtuigen om duurzame servieskeuze te maken',
  keyMessage: 'Restaurant-kwaliteit servies dat zowel mooi als duurzaam is',
  toneDirection: 'vakkundig, warm, professioneel',
  callToAction: 'Vraag een staal aan',
  audienceDescription: 'Restaurant-eigenaren in NL die premium-segment bedienen',
  seoKeyword: 'duurzaam servies horeca',
};

const FIXTURE_PLAN: ContentPlan = {
  title: 'Waarom duurzaam servies de toekomst is voor restaurants',
  metaDescription:
    'Ontdek waarom premium-restaurants overstappen op duurzaam servies. Vraag een staal aan en proef het verschil.',
  audienceAnchor: 'Premium-restaurant-eigenaren die kwaliteit + duurzaamheid willen',
  sections: [
    {
      heading: 'De stille kosten van wegwerp-servies',
      wordBudget: 200,
      goal: 'Lezer bewust maken van financiële + reputatie-kosten van wegwerp',
      keyPoints: ['Hidden costs analysis', 'Reputatie-impact', 'Gast-perceptie shift'],
    },
    {
      heading: 'Wat duurzaam servies werkelijk betekent',
      wordBudget: 250,
      goal: 'Verschil tussen marketing-claim en echte circulaire keten uitleggen',
      keyPoints: ['Circulaire keten definitie', 'Materialen-criteria', 'Certificeringen'],
    },
    {
      heading: 'De Napking aanpak: kwaliteit ÉN circulair',
      wordBudget: 200,
      goal: 'Napking value-prop concreet maken zonder salesy te zijn',
      keyPoints: ['Klei-naar-retour-keten', 'Premium-kwaliteit voorbeelden', 'Restaurant-ervaringen'],
    },
  ],
  faqQuestions: [
    'Wat kost duurzaam servies in vergelijking met wegwerp?',
    'Welke garantie geeft Napking op de levensduur?',
    'Hoe werkt het retoursysteem aan eind van levensduur?',
  ],
};

/**
 * Stage-detection helpers. Beide system-prompts bevatten "structuurplan"
 * dus we gebruiken meer unieke markers.
 */
function isPlanStage(systemPrompt: string): boolean {
  return systemPrompt.includes('structuurplan bouwt voor een long-form');
}

function isExecuteStage(systemPrompt: string): boolean {
  return systemPrompt.includes('Je schrijft één sectie van een long-form');
}

/** Mock AI-completion that returns fixture-data based on prompt-content heuristics. */
const mockAICompletion: AICompletionFn = async <T>(
  _provider: string,
  _model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<T> => {
  await new Promise((resolve) => setTimeout(resolve, 1)); // Simulate async
  if (isPlanStage(systemPrompt)) {
    return FIXTURE_PLAN as unknown as T;
  }
  if (isExecuteStage(systemPrompt)) {
    const match = userPrompt.match(/Schrijf nu sectie (\d+)/);
    const idx = match ? parseInt(match[1], 10) - 1 : 0;
    const heading = FIXTURE_PLAN.sections[idx]?.heading ?? 'Unknown';
    return {
      content: `Dit is mock-content voor sectie ${idx + 1}: ${heading}. ${'Lorem ipsum '.repeat(50)}`,
    } as unknown as T;
  }
  throw new Error(`Unmocked prompt: ${systemPrompt.slice(0, 80)}...`);
};

/** Mock that fails on plan-stage to test error-handling. */
const mockAIPlanFails: AICompletionFn = async <T>(
  _p: string,
  _m: string,
  systemPrompt: string,
): Promise<T> => {
  if (isPlanStage(systemPrompt)) {
    throw new Error('runPlanStage: simulated plan-stage AI failure');
  }
  return {} as T;
};

/** Mock that fails on 2nd execute-stage. */
const mockAIExecuteFails: AICompletionFn = async <T>(
  _p: string,
  _m: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<T> => {
  await new Promise((resolve) => setTimeout(resolve, 1));
  if (isPlanStage(systemPrompt)) return FIXTURE_PLAN as unknown as T;
  if (isExecuteStage(systemPrompt)) {
    const match = userPrompt.match(/Schrijf nu sectie (\d+)/);
    const idx = match ? parseInt(match[1], 10) - 1 : 0;
    if (idx === 1) {
      throw new Error('runExecuteStage: simulated execute-stage AI failure on section 2');
    }
    return { content: `Mock content sectie ${idx + 1}.` } as unknown as T;
  }
  throw new Error(`Unmocked prompt`);
};

// ─── Tests ────────────────────────────────────────────────────

async function main() {
  console.log('\n=== Plan-and-Solve pipeline smoke ===\n');

  // ─ Test 1: happy path ─
  console.log('## Test 1: Happy path — full pipeline\n');
  const output = await runPlanAndSolve(BRIEF, { aiCompletion: mockAICompletion });
  assert(
    'returns ContentPlan with title',
    output.plan.title === FIXTURE_PLAN.title,
  );
  assert(
    'returns N sections matching plan',
    output.sections.length === FIXTURE_PLAN.sections.length,
    `got ${output.sections.length}, expected ${FIXTURE_PLAN.sections.length}`,
  );
  assert(
    'each section has heading from plan',
    output.sections.every((s, i) => s.heading === FIXTURE_PLAN.sections[i].heading),
  );
  assert(
    'each section content non-empty',
    output.sections.every((s) => s.content.length > 0),
  );
  assert(
    'word-count tracking works',
    output.sections.every((s) => s.actualWordCount > 0),
  );
  assert(
    'metrics populated',
    output.metrics.totalSections === FIXTURE_PLAN.sections.length &&
      output.metrics.totalWordCount > 0,
  );

  // ─ Test 2: assembly markdown structure ─
  console.log('\n## Test 2: Assembly markdown structure\n');
  const md = output.assembledContent;
  assert('assembled markdown starts with H1', /^# /.test(md));
  assert(
    'H1 matches plan.title',
    md.split('\n')[0] === `# ${FIXTURE_PLAN.title}`,
  );
  const h2Count = (md.match(/^## /gm) ?? []).length;
  assert(
    `${FIXTURE_PLAN.sections.length} H2 headings + FAQ section = ${FIXTURE_PLAN.sections.length + 1}`,
    h2Count === FIXTURE_PLAN.sections.length + 1,
    `got ${h2Count}`,
  );
  assert('FAQ section present', md.includes('## Veelgestelde vragen'));
  assert(
    'all FAQ questions in output',
    FIXTURE_PLAN.faqQuestions!.every((q) => md.includes(`**${q}**`)),
  );

  // ─ Test 3: running-anchor mechanism ─
  console.log('\n## Test 3: Running-anchor mechanism\n');
  const emptyAnchor = buildRunningAnchor([]);
  assert('empty sections → empty anchor', emptyAnchor === '');
  const mockSections: ExecutedSection[] = [
    { heading: 'Sec 1', content: 'Lorem ipsum '.repeat(300), actualWordCount: 300 },
    { heading: 'Sec 2', content: 'Dolor sit amet '.repeat(300), actualWordCount: 300 },
    { heading: 'Sec 3', content: 'Consectetur adipiscing '.repeat(300), actualWordCount: 300 },
  ];
  const anchor = buildRunningAnchor(mockSections);
  assert(
    'anchor uses last 2 sections (not all 3)',
    anchor.includes('Sec 2') && anchor.includes('Sec 3') && !anchor.includes('Sec 1'),
  );
  const anchorWords = anchor.split(/\s+/).length;
  assert(
    `anchor truncates to ~200 words per section (got ${anchorWords})`,
    anchorWords < 500,
  );

  // ─ Test 4: streaming-variant event-order ─
  console.log('\n## Test 4: Streaming-variant event ordering\n');
  const events: string[] = [];
  for await (const ev of runPlanAndSolveStream(BRIEF, { aiCompletion: mockAICompletion })) {
    events.push(ev.event);
  }
  assert(
    'event order: plan_started → plan_complete',
    events[0] === 'plan_started' && events[1] === 'plan_complete',
  );
  const sectionEvents = events.filter((e) => e.startsWith('section_'));
  assert(
    `2 events per section × ${FIXTURE_PLAN.sections.length} sections = ${FIXTURE_PLAN.sections.length * 2}`,
    sectionEvents.length === FIXTURE_PLAN.sections.length * 2,
    `got ${sectionEvents.length}`,
  );
  assert(
    'final event: assembly_complete',
    events[events.length - 1] === 'assembly_complete',
  );

  // ─ Test 5: error-handling — plan-stage fail ─
  console.log('\n## Test 5: Error-handling — plan-stage failure\n');
  const planFailEvents: Array<{ event: string; stage?: string }> = [];
  for await (const ev of runPlanAndSolveStream(BRIEF, { aiCompletion: mockAIPlanFails })) {
    planFailEvents.push({ event: ev.event, stage: 'data' in ev && typeof ev.data === 'object' && ev.data && 'stage' in ev.data ? (ev.data as { stage: string }).stage : undefined });
  }
  const errorEvent = planFailEvents.find((e) => e.event === 'error');
  assert('error event emitted on plan-fail', errorEvent !== undefined);
  assert(
    'error event has stage="plan"',
    errorEvent?.stage === 'plan',
    `got ${errorEvent?.stage}`,
  );
  assert(
    'no section events after plan-fail',
    !planFailEvents.some((e) => e.event.startsWith('section_')),
  );

  // ─ Test 6: error-handling — execute-stage fail mid-pipeline ─
  console.log('\n## Test 6: Error-handling — execute-stage failure on section 2\n');
  const execFailEvents: Array<{ event: string; stage?: string }> = [];
  for await (const ev of runPlanAndSolveStream(BRIEF, { aiCompletion: mockAIExecuteFails })) {
    execFailEvents.push({ event: ev.event, stage: 'data' in ev && typeof ev.data === 'object' && ev.data && 'stage' in ev.data ? (ev.data as { stage: string }).stage : undefined });
  }
  const execErrorEvent = execFailEvents.find((e) => e.event === 'error');
  assert('error event emitted on execute-fail', execErrorEvent !== undefined);
  assert(
    'error event has stage="execute"',
    execErrorEvent?.stage === 'execute',
    `got ${execErrorEvent?.stage}`,
  );
  const completedSections = execFailEvents.filter((e) => e.event === 'section_complete').length;
  assert(
    'pipeline produced 1 completed section before fail (section 1 succeeded, section 2 fails)',
    completedSections === 1,
    `got ${completedSections}`,
  );

  // ─ Test 7: assembly without FAQ ─
  console.log('\n## Test 7: Assembly without FAQ (plan zonder faqQuestions)\n');
  const planNoFaq: ContentPlan = { ...FIXTURE_PLAN, faqQuestions: undefined };
  const sectionsNoFaq: ExecutedSection[] = FIXTURE_PLAN.sections.map((s) => ({
    heading: s.heading,
    content: 'Mock content.',
    actualWordCount: 2,
  }));
  const mdNoFaq = assembleMarkdown(planNoFaq, sectionsNoFaq);
  assert('no FAQ section when plan.faqQuestions undefined', !mdNoFaq.includes('Veelgestelde vragen'));
  const h2Plain = (mdNoFaq.match(/^## /gm) ?? []).length;
  assert(
    `exact ${FIXTURE_PLAN.sections.length} H2 headings (no FAQ)`,
    h2Plain === FIXTURE_PLAN.sections.length,
    `got ${h2Plain}`,
  );

  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

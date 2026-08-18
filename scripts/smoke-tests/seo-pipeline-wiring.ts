/**
 * Integratie-smoke voor de BEDRADING van de SEO-pipeline
 * (tasks/seo-pipeline-speedup.md — sluit het gat dat de adversariële review vond).
 *
 * Waarom dit bestaat: `seo-context-selection.ts` dekt de pure functies en die zijn
 * goed bewaakt — alle mutaties dáárin worden gevangen. Maar 11 van de 21 mutaties
 * in `seo-pipeline.ts` kwamen langs zowel `tsc` als die hele suite, waaronder een
 * rechtstreekse revert (`researchContext: state.accumulatedContext`) en het stil
 * weggooien van de stap-8-override. Die klasse is alleen te vangen door de échte
 * `runSeoPipeline` te draaien en te kijken wélke prompts eruit komen.
 *
 * Hoe: `globalThis.fetch` wordt onderschept vóór de eerste AI-call. De Anthropic-SDK
 * pakt zijn fetch bij client-constructie uit de global (`internal/shims.js`
 * `getDefaultFetch`), dus dit werkt zonder één regel productiecode te wijzigen —
 * en anders dan module-mocking, wat hier niet kan: esbuild geeft niet-configureerbare
 * getters, dus exports zijn niet te vervangen.
 *
 * Er gaat geen enkele echte AI-call uit. Wel DB-verkeer: de pipeline leest de
 * modelconfiguratie en persisteert het resultaat, dus de test maakt een wegwerp-
 * campagne + deliverable aan en ruimt die daarna op.
 *
 * Run: SMOKE_DB=1 npm run smoke:seo-wiring
 * Weigert te draaien zonder SMOKE_DB=1 of tegen een niet-lokale DATABASE_URL.
 */

import { prisma } from '@/lib/prisma';
import { runSeoPipeline } from '@/lib/ai/seo-pipeline';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
import { SEO_STEP_DEFINITIONS, type SeoInput } from '@/lib/ai/seo-pipeline.types';
import { renderStepBlock } from '@/lib/ai/seo-pipeline-utils';

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

// ─── Guards ──────────────────────────────────────────────────

if (process.env.SMOKE_DB !== '1') {
  console.error('Deze smoke schrijft naar de database. Draai bewust: SMOKE_DB=1 npm run smoke:seo-wiring');
  process.exit(1);
}
const dbUrl = process.env.DATABASE_URL ?? '';
if (!/@?localhost|127\.0\.0\.1/.test(dbUrl)) {
  console.error(`Weigert te draaien tegen een niet-lokale database (${dbUrl.slice(0, 40)}…).`);
  process.exit(1);
}

// ─── Fetch-onderschepping ────────────────────────────────────

interface CapturedCall {
  system: string;
  user: string;
}
const calls: CapturedCall[] = [];

/**
 * Welke stap hoort bij deze systemprompt? Op de openingszin uit
 * `src/lib/ai/prompts/seo-prompts.ts`, niet op volgorde — wave 2‖3 draait parallel,
 * dus aankomstvolgorde zegt niets. Volgorde van de checks doet ertoe: stap 7 en 8
 * delen dezelfde rol-omschrijving ("Senior SEO Editor").
 */
const SYSTEM_MARKERS: [string, string][] = [
  ['alternative version of an SEO-optimized page', 'variantB'],
  ['Senior SEO Strategist', 'step1'],
  ['SEO Specialist with deep expertise in keyword research', 'step2'],
  ['SEO Analyst specializing in competitive content analysis', 'step3'],
  ['SERP Analyst with expertise in content gap analysis', 'step4'],
  ['SEO Copywriter who creates content outlines', 'step5'],
  ['Conversion Copywriter who writes SEO-optimized web pages', 'step6'],
  ['Senior SEO Editor producing the technical publication checklist', 'step8'],
  ['Senior SEO Editor with expertise in content optimization', 'step7'],
];

function classify(system: string): string {
  for (const [marker, kind] of SYSTEM_MARKERS) {
    if (system.includes(marker)) return kind;
  }
  return 'onbekend';
}

/** Antwoord per stap, in het schema dat de pipeline verwacht. */
function cannedBody(kind: string): string {
  const article = '# Kop van het artikel\n\nDit is de tekst van variant A, ruim voldoende lang om als content te tellen.';
  switch (kind) {
    case 'step1':
      return JSON.stringify({ context: 'c', pageGoal: 'g', targetAudience: ['a'], primarySearchIntent: 'i', secondarySearchIntent: 's', customerJourneyRole: 'r', conversionActions: ['x'] });
    case 'step2':
      return JSON.stringify({ primaryKeyword: 'testkeyword', secondaryKeywords: ['k'], longTailKeywords: ['l'], questions: ['q'], underlyingProblems: ['p'], coreEntities: ['e'], topicClusters: [{ name: 'n', keywords: ['k'] }] });
    case 'step3':
      return JSON.stringify({ topResults: [], contentGaps: ['g'], recurringTopics: ['t'], intentFulfillment: 'f', dominantFormat: 'd', dominantLength: 1000, opportunities: ['o'] });
    case 'step4':
      return JSON.stringify({ contentGaps: ['g'], featuredSnippetOpportunities: ['f'], requiredContentFormats: ['t'], eeatRequirements: ['e'], schemaMarkupOpportunities: ['s'], uniqueAngles: ['u'] });
    case 'step5':
      return JSON.stringify({ h1: 'H1', sections: [], faqQuestions: ['q'], internalLinks: [], metaTitle: 'm', metaDescription: 'd' });
    case 'step6':
      return JSON.stringify({ draft: article });
    case 'step7':
      return JSON.stringify({ revisedContent: article, changes: ['c'], qualityNotes: 'n' });
    case 'step8':
      return JSON.stringify({ checklist: { titleTag: 't', metaDescription: 'm', h1: 'H1', urlSlug: 's', headingStructure: 'h', internalLinks: 'i', imageAltTexts: ['a'], faqSchema: null, howToSchema: null, canonicalTag: null, ogTitle: 'o', ogDescription: 'od' } });
    default:
      return JSON.stringify({ draft: `${article}\n\nVariant B, ander aangrijpingspunt.` });
  }
}

/** Anthropic-SSE: message_start → één text-delta → message_stop. */
function sseStream(text: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const event = (name: string, data: unknown) => enc.encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(event('message_start', {
        type: 'message_start',
        message: { id: 'msg_stub', type: 'message', role: 'assistant', model: 'stub', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } },
      }));
      controller.enqueue(event('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }));
      controller.enqueue(event('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } }));
      controller.enqueue(event('content_block_stop', { type: 'content_block_stop', index: 0 }));
      controller.enqueue(event('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 10 } }));
      controller.enqueue(event('message_stop', { type: 'message_stop' }));
      controller.close();
    },
  });
}

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  if (url.includes('api.anthropic.com')) {
    const body = JSON.parse(String(init?.body ?? '{}')) as {
      system?: string | { text?: string }[];
      messages?: { content?: string | { text?: string }[] }[];
    };
    const system = Array.isArray(body.system)
      ? body.system.map((b) => b.text ?? '').join('\n')
      : String(body.system ?? '');
    const first = body.messages?.[0]?.content;
    const user = Array.isArray(first) ? first.map((b) => b.text ?? '').join('\n') : String(first ?? '');
    calls.push({ system, user });

    // De pipeline gebruikt `client.messages.stream()`, dus dit moet SSE zijn en
    // geen JSON-body — een gewone body geeft "request ended without sending any chunks".
    return new Response(sseStream(cannedBody(classify(system))), {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    });
  }

  // Gemini (grounding voor stap 3) — leeg maar geldig antwoord.
  if (url.includes('generativelanguage.googleapis.com')) {
    return new Response(
      JSON.stringify({ candidates: [{ content: { parts: [{ text: 'geen live resultaten' }] }, finishReason: 'STOP' }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }

  return realFetch(input, init);
}) as typeof fetch;

// ─── Fixture ─────────────────────────────────────────────────

const stack: CanvasContextStack = {
  brand: { brandName: 'Wiring Testmerk', contentLanguage: 'nl' },
  concept: null,
  journeyPhase: null,
  medium: null,
  deliverableTypeId: 'landing-page',
  personas: [],
  brief: null,
  products: [],
} as unknown as CanvasContextStack;

const seoInput: SeoInput = {
  primaryKeyword: 'testkeyword',
  funnelStage: 'awareness',
} as SeoInput;

/** Draait een async generator leeg. */
async function drain(gen: AsyncGenerator<unknown>): Promise<void> {
  while (!(await gen.next()).done) {
    // events negeren
  }
}

async function main(): Promise<void> {
  const workspace = await prisma.workspace.findFirst({ select: { id: true, name: true } });
  if (!workspace) throw new Error('geen workspace in de lokale database');

  const campaign = await prisma.campaign.create({
    data: { workspaceId: workspace.id, title: '_seo-wiring-smoke (mag weg)', slug: `seo-wiring-${Date.now()}`, type: 'QUICK' },
  });
  const deliverable = await prisma.deliverable.create({
    data: { campaignId: campaign.id, title: 'seo-wiring', contentType: 'landing-page', status: 'NOT_STARTED' },
  });

  try {
    console.log(`\nPipeline draaien (workspace "${workspace.name}", alle AI-calls onderschept)…`);
    // Generator leegdraaien: de events zelf doen er niet toe, het gaat om de
    // prompts die onderweg worden opgebouwd en door de fetch-stub zijn gevangen.
    await drain(runSeoPipeline(deliverable.id, workspace.id, seoInput, stack, 'Schrijf in het Nederlands.', 'landing-page'));

    const find = (kind: string) => calls.filter((c) => classify(c.system) === kind);
    const hasBlock = (text: string, step: number) => text.includes(`## Step ${step}: `);

    console.log(`\n${calls.length} AI-calls onderschept.\n`);
    console.log('1. Alle stappen zijn gedraaid');
    for (const step of [1, 2, 3, 4, 5, 6, 7, 8]) {
      assert(`stap ${step} is aangeroepen`, find(`step${step}`).length === 1, `${find(`step${step}`).length}×`);
    }
    assert('variant B is aangeroepen', find('variantB').length === 1);

    console.log('\n2. Stap 8 — de override werkt in de échte pipeline');
    const step8 = find('step8')[0];
    if (step8) {
      assert('stap 8 krijgt de definitieve prose uit stap 7', hasBlock(step8.user, 7));
      assert('stap 8 krijgt NIET de achterhaalde stap-6-draft', !hasBlock(step8.user, 6));
      assert('stap 8 krijgt de research', [1, 2, 3, 4, 5].every((n) => hasBlock(step8.user, n)));
    } else {
      assert('stap 8 is aangeroepen', false);
    }

    console.log('\n3. Variant B — de research komt écht aan');
    const vb = find('variantB')[0];
    if (vb) {
      assert('variant B krijgt alle vijf de researchstappen', [1, 2, 3, 4, 5].every((n) => hasBlock(vb.user, n)));
      assert('variant B krijgt GEEN prose-blokken (artikel niet dubbel)', !hasBlock(vb.user, 6) && !hasBlock(vb.user, 7));
      assert('de research-kop staat erboven', vb.user.includes('## SEO RESEARCH CONTEXT'));
      assert('het artikel staat er als ORIGINAL PAGE', vb.user.includes('## ORIGINAL PAGE (Variant A)'));
      assert('de research begint op een blokgrens, niet midden in een zin', /## SEO RESEARCH CONTEXT[^\n]*\n\n\n## Step 1: /.test(vb.user));
    } else {
      assert('variant B is aangeroepen', false);
    }

    console.log('\n4. Stap 1-7 — ongewijzigd de volledige accumulatie');
    const step7 = find('step7')[0];
    if (step7) {
      assert('stap 7 krijgt stap 1 t/m 6', [1, 2, 3, 4, 5, 6].every((n) => hasBlock(step7.user, n)));
    }
    const step5 = find('step5')[0];
    if (step5) {
      assert('stap 5 krijgt stap 1 t/m 4', [1, 2, 3, 4].every((n) => hasBlock(step5.user, n)));
      assert('stap 5 krijgt nog geen prose', !hasBlock(step5.user, 6));
    }
    const step1 = find('step1')[0];
    if (step1) assert('stap 1 heeft geen voorgaande blokken', !hasBlock(step1.user, 1));

    console.log('\n5. Blokvolgorde is deterministisch');
    if (step7) {
      const order = [...step7.user.matchAll(/## Step (\d): /g)].map((m) => Number(m[1]));
      assert('blokken staan oplopend op stapnummer', order.join(',') === [...order].sort((a, b) => a - b).join(','), order.join(','));
    }
    // ── 6. Resume-pad ────────────────────────────────────────
    // Had volgens de adversariële review nul dekking: mutaties die de
    // checkpoint-hydratie slopen kwamen er allemaal langs. Drie scenario's, want
    // een volledig checkpoint (1-7) is juist het geval waarin níéts meer
    // `accumulatedContext` leest — daar is de hydratie dus onzichtbaar.
    const buildOutputs = (steps: number[]) =>
      steps.map((step) => ({
        step,
        name: SEO_STEP_DEFINITIONS.find((d) => d.step === step)!.name,
        rawText: cannedBody(`step${step}`),
      }));
    const accumulate = (outs: { step: number; rawText: string }[]) =>
      outs.map((o) => renderStepBlock(o.step, o.rawText)).join('');

    const runResume = async (steps: number[]) => {
      const before = calls.length;
      const outs = buildOutputs(steps);
      await drain(runSeoPipeline(
        deliverable.id, workspace.id, seoInput, stack, 'Schrijf in het Nederlands.', 'landing-page', [],
        { outputs: outs, accumulatedContext: accumulate(outs) },
      ));
      return calls.slice(before);
    };

    console.log('\n6a. Resume vanaf een VOLLEDIG checkpoint (stap 1-7)');
    {
      const resumed = await runResume([1, 2, 3, 4, 5, 6, 7]);
      assert('alleen stap 8 + variant B draaien nog', resumed.length === 2, `${resumed.length} calls`);
      const r8 = resumed.find((c) => classify(c.system) === 'step8');
      const rvb = resumed.find((c) => classify(c.system) === 'variantB');
      assert('stap 8 krijgt stap 7, niet stap 6', !!r8 && hasBlock(r8.user, 7) && !hasBlock(r8.user, 6));
      assert('variant B krijgt alle vijf researchstappen', !!rvb && [1, 2, 3, 4, 5].every((n) => hasBlock(rvb.user, n)));
      assert('variant B krijgt geen prose-blokken', !!rvb && !hasBlock(rvb.user, 6) && !hasBlock(rvb.user, 7));
    }

    console.log('\n6b. Resume vanaf een HALF checkpoint (stap 1-4) — hier telt de hydratie wél');
    {
      const resumed = await runResume([1, 2, 3, 4]);
      assert('stap 5 t/m 8 + variant B draaien alsnog', resumed.length === 5, `${resumed.length} calls`);
      const r5 = resumed.find((c) => classify(c.system) === 'step5');
      // Dit is de assert die een niet-gehydrateerde accumulatedContext betrapt:
      // stap 5 leest hem rechtstreeks, en zonder hydratie draait hij context-loos.
      assert('stap 5 ziet de gecheckpointe stappen 1 t/m 4', !!r5 && [1, 2, 3, 4].every((n) => hasBlock(r5.user, n)));
      const r6 = resumed.find((c) => classify(c.system) === 'step6');
      assert('stap 6 ziet stap 1 t/m 5', !!r6 && [1, 2, 3, 4, 5].every((n) => hasBlock(r6.user, n)));
    }

    console.log('\n6c. Resume met stap 8 al in het checkpoint');
    {
      const before = calls.length;
      const outs = buildOutputs([1, 2, 3, 4, 5, 6, 7, 8]);
      await drain(runSeoPipeline(
        deliverable.id, workspace.id, seoInput, stack, 'Schrijf in het Nederlands.', 'landing-page', [],
        { outputs: outs, accumulatedContext: accumulate(outs) },
      ));
      const resumed = calls.slice(before);
      assert('stap 8 wordt hergebruikt, niet opnieuw aangeroepen', !resumed.some((c) => classify(c.system) === 'step8'));
      assert('variant B draait wél opnieuw', resumed.some((c) => classify(c.system) === 'variantB'));
    }

  } finally {
    globalThis.fetch = realFetch;
    await prisma.campaign.delete({ where: { id: campaign.id } });
    console.log('\nwegwerp-campagne opgeruimd.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    fail++;
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log(`\n${'='.repeat(56)}`);
    console.log(`TOTAAL: ${pass} PASS / ${fail} FAIL`);
    if (fail > 0) process.exitCode = 1;
  });

/**
 * content-library-readiness — bewijs voor de twee `structured-unchosen`-keuzes
 * uit tasks/content-chain-accessor.md (fase 2, kruisingen #2 en #3).
 *
 * Wat hier bewezen moet worden en waarom tsc dat niet kan: beide content-ketens
 * compileren. De bug was dat de bibliotheek en de Brand Assistant de DÓDE keten
 * lazen, en dus "geen content" meldden op een volle, gepubliceerde pillar-page.
 * Alleen een run tegen echte rijen laat het verschil zien.
 *
 * Deel 1 draait puur (geen DB). Deel 2 draait tegen de lokale database: het zoekt
 * zelf een rij per staat, voert de ECHTE route-query en de ECHTE Claw-tool uit,
 * en toont per rij wat de oude regel zou hebben gezegd.
 *
 * Draaien:
 *   node --env-file-if-exists=.env.local node_modules/.bin/tsx scripts/smoke-tests/content-library-readiness.ts
 *   (zonder DB: SKIP_DB=1 — dan alleen deel 1)
 */

import {
  deriveReadinessBucket,
  readinessHintTokens,
  resolveLibraryContentSignal,
} from '../../src/lib/content/library-readiness';
import {
  resolveDeliverableContentSignal,
  TEXT_COMPONENT_WHERE,
} from '../../src/lib/content/resolve-deliverable-content';

let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/**
 * Schema-complete FAQ-variant — de eenvoudigste tak van de flatten-dispatch.
 * Zelfde vorm als in deliverable-content-accessor.ts: een variant die een veld
 * mist laat `flattenPageVariantToText` gooien, en dat degradeert bewust naar
 * `empty` (gotcha 2026-03-24).
 */
function validVariant(headline = 'Veelgestelde vragen') {
  return {
    hero: { headline, subline: 'Alles over onze dienstverlening' },
    popularQuestions: [{ question: 'Wat kost het?', answer: 'Vanaf 39 euro per maand.' }],
    categories: [
      { label: 'Facturatie', items: [{ question: 'Kan ik opzeggen?', answer: 'Maandelijks.' }] },
    ],
    contactEscape: { heading: 'Niet gevonden?', body: 'Mail ons.', ctaLabel: 'Contact' },
    closingCta: { heading: 'Aan de slag', ctaLabel: 'Start' },
  };
}

console.log('\n1. De vier staten door de lijst-accessor');
{
  const unchosen = resolveLibraryContentSignal(
    { settings: { structuredVariantOptions: [validVariant('A'), validVariant('B')] } },
    0,
  );
  check('unchosen → awaiting-choice', unchosen.contentState === 'awaiting-choice');
  check('unchosen telt NIET als publiceerbare content', unchosen.hasContent === false);
  check(
    'unchosen-hint noemt de handeling, niet het gemis',
    unchosen.contentHint === '2 versions — choose one',
    unchosen.contentHint ?? 'null',
  );

  const single = resolveLibraryContentSignal(
    { settings: { structuredVariantOptions: [validVariant('A')] } },
    0,
  );
  check('enkelvoud krijgt eigen formulering', single.contentHint === '1 version — choose it');

  // Beeld op de rij mag de keuze-staat niet overrulen: de publish-guard weigert
  // een ongekozen variant, dus `hasContent: true` zou een menu tonen dat afketst.
  const unchosenMetBeeld = resolveLibraryContentSignal(
    {
      settings: { structuredVariantOptions: [validVariant('A'), validVariant('B')] },
      generatedImageUrls: ['https://example.test/hero.png'],
    },
    0,
  );
  check(
    'ongekozen + beeld telt NIET als publiceerbaar',
    unchosenMetBeeld.hasContent === false && unchosenMetBeeld.isAwaitingChoice,
  );
  const beeldZonderKeuze = resolveLibraryContentSignal(
    { generatedImageUrls: ['https://example.test/hero.png'] },
    0,
  );
  check('beeld zónder openstaande keuze telt wél', beeldZonderKeuze.hasContent === true);

  const chosen = resolveLibraryContentSignal({ settings: { structuredVariant: validVariant() } }, 0);
  check('gekozen variant → ready', chosen.contentState === 'ready' && chosen.hasContent);
  check('gekozen variant heeft geen hint', chosen.contentHint === null);
  check('gekozen variant levert een woordentelling', (chosen.wordCount ?? 0) > 0);

  const components = resolveLibraryContentSignal({ settings: {} }, 3);
  check('componenten → ready', components.contentState === 'ready' && components.hasContent);
  check(
    'componenten leveren GEEN woordentelling (bodies niet opgehaald)',
    components.wordCount === null,
  );

  const legacy = resolveLibraryContentSignal({ generatedText: 'Vier woorden staan hier' }, 0);
  check('legacy generatedText → ready', legacy.contentState === 'ready');
  check('legacy levert wél een telling', legacy.wordCount === 4, String(legacy.wordCount));

  const empty = resolveLibraryContentSignal({ settings: {} }, 0);
  check('leeg → empty', empty.contentState === 'empty' && !empty.hasContent);
  check('leeg houdt de oude hint', empty.contentHint === 'No content generated');

  const visualsOnly = resolveLibraryContentSignal(
    { settings: {}, generatedImageUrls: ['https://cdn/a.jpg'] },
    0,
  );
  check('alleen beeld telt als content', visualsOnly.hasContent === true);
}

console.log('\n2. De flip — een gekozen variant wint van achtergebleven componenten');
{
  // Long-form defaultt op keten A; vinkt de gebruiker het GEO-doel aan, dan flipt
  // het deliverable naar keten B terwijl de oude componenten blijven staan.
  const flipped = resolveLibraryContentSignal({ settings: { structuredVariant: validVariant() } }, 9);
  check('gekozen variant wint van 9 achtergebleven componenten', flipped.contentState === 'ready');
  check('en levert de variant-telling, niet null', (flipped.wordCount ?? 0) > 0);

  // Componenten winnen wél van niet-gekozen opties: die volgorde staat in de accessor.
  const both = resolveLibraryContentSignal(
    { settings: { structuredVariantOptions: [validVariant('A'), validVariant('B')] } },
    4,
  );
  check('componenten winnen van ongekozen opties', both.contentState === 'ready');
}

console.log('\n3. Het stoplicht — de eigenlijke bug van kruising #2');
{
  const draft = { isPublishReady: false, status: 'NOT_STARTED', isScheduled: false, isPublished: false };
  const oud = deriveReadinessBucket({ ...draft, hasContent: false, isAwaitingChoice: false });
  const nieuw = deriveReadinessBucket({ ...draft, hasContent: false, isAwaitingChoice: true });
  check('zonder het signaal: rood ("Not started")', oud === 'red');
  check('wachtende versies maken het amber, niet rood', nieuw === 'amber');

  const gepubliceerd = deriveReadinessBucket({
    isPublishReady: true,
    status: 'COMPLETED',
    hasContent: true,
    isAwaitingChoice: false,
    isScheduled: false,
    isPublished: true,
  });
  check('gepubliceerd blijft groen', gepubliceerd === 'green');
}

console.log('\n4. Het filter-token');
{
  check(
    'de nieuwe hint levert het variant-unchosen-token',
    readinessHintTokens('2 versions — choose one').includes('variant-unchosen'),
  );
  check(
    'en NIET het no-content-token',
    !readinessHintTokens('2 versions — choose one').includes('no-content'),
  );
  check(
    'de oude hint blijft no-content',
    readinessHintTokens('No content generated · Not reviewed').join(',') ===
      'no-content,not-reviewed',
  );
}

console.log('\n5. De marker-component lekt niet naar buiten');
{
  const signal = resolveDeliverableContentSignal({ settings: {}, textComponentCount: 1 });
  check('component-probe geeft ready zonder telling', signal.state === 'ready' && signal.wordCount === null);
  check('optionCount is 0 buiten awaiting-choice', signal.optionCount === 0);
}

// ─── Deel 2: echte rijen, echte code-paden ──────────────────────────────────

async function runDbChecks(): Promise<void> {
  const { prisma } = await import('../../src/lib/prisma');
  const { readTools } = await import('../../src/lib/claw/tools/read-tools');

  type Row = { id: string; workspaceId: string; contentType: string };

  /** Eén rij per staat, gezocht in de DB zelf — geen vastgezette id's. */
  const pick = async (extra: string): Promise<Row | null> => {
    const rows = await prisma.$queryRawUnsafe<Row[]>(`
      SELECT d.id, c."workspaceId", d."contentType"
      FROM "Deliverable" d JOIN "Campaign" c ON c.id = d."campaignId"
      WHERE ${extra}
      LIMIT 1
    `);
    return rows[0] ?? null;
  };

  const TEXT_COMPS = `(SELECT count(*) FROM "DeliverableComponent" k WHERE k."deliverableId" = d.id
      AND k."generatedContent" IS NOT NULL AND k."generatedContent" <> ''
      AND k."componentType" NOT IN ('image','video'))`;

  const cases: Array<{ label: string; where: string; expect: 'ready' | 'awaiting-choice' | 'empty' }> = [
    {
      label: 'ongekozen varianten',
      where: `d.settings->'structuredVariantOptions' IS NOT NULL
        AND jsonb_array_length(d.settings->'structuredVariantOptions') > 0
        AND d.settings->'structuredVariant' IS NULL AND ${TEXT_COMPS} = 0`,
      expect: 'awaiting-choice',
    },
    {
      label: 'gekozen variant (keten B)',
      where: `d.settings->'structuredVariant' IS NOT NULL`,
      expect: 'ready',
    },
    {
      label: 'componenten (keten A)',
      where: `d.settings->'structuredVariant' IS NULL AND ${TEXT_COMPS} > 0`,
      expect: 'ready',
    },
    {
      label: 'echt leeg',
      where: `d."generatedText" IS NULL AND d.settings->'structuredVariant' IS NULL
        AND d.settings->'structuredVariantOptions' IS NULL AND ${TEXT_COMPS} = 0`,
      expect: 'empty',
    },
  ];

  console.log('\n6. Echte rijen door de ECHTE route-query (kruising #2)');
  const found: Record<string, Row> = {};
  for (const c of cases) {
    const row = await pick(c.where);
    if (!row) {
      console.log(`  – geen rij met "${c.label}" in deze database — overgeslagen`);
      continue;
    }
    found[c.expect === 'ready' ? c.label : c.expect] = row;

    // Exact de query-vorm van api/content-library/route.ts.
    const d = await prisma.deliverable.findFirstOrThrow({
      where: { id: row.id },
      include: {
        components: {
          // Dezelfde constante als de route — een kopie hier zou de drift die
          // deze smoke moet vangen juist onzichtbaar maken.
          where: TEXT_COMPONENT_WHERE,
          select: { id: true },
          take: 1,
        },
      },
    });
    const signal = resolveLibraryContentSignal(d, d.components.length);
    check(`${c.label} (${row.contentType}) → ${c.expect}`, signal.contentState === c.expect, signal.contentState);

    // Wat de oude regel zou hebben gezegd — bewijs dat de fix ergens over gaat.
    const oud =
      d.generatedText != null ||
      (Array.isArray(d.generatedImageUrls) && d.generatedImageUrls.length > 0) ||
      d.generatedVideoUrl != null;
    const oudeHint = oud ? null : 'No content generated';
    console.log(
      `      oud: hasContent=${oud}, hint=${JSON.stringify(oudeHint)}` +
        `  |  nieuw: hasContent=${signal.hasContent}, hint=${JSON.stringify(signal.contentHint)}`,
    );
  }

  console.log('\n7. Dezelfde rijen door de ECHTE Brand-Assistant-tool (kruising #3)');
  const tool = readTools.find((t) => t.name === 'read_deliverable_content');
  if (!tool) {
    check('read_deliverable_content bestaat', false);
    return;
  }

  for (const [label, row] of Object.entries(found)) {
    const result = (await tool.execute(
      { deliverableId: row.id },
      { workspaceId: row.workspaceId, userId: 'smoke' },
    )) as {
      hasContent?: boolean;
      content?: string;
      pendingVariantChoice?: boolean;
      variantOptionCount?: number;
      note?: string;
    };

    if (label === 'awaiting-choice') {
      check('ongekozen: meldt de keuze i.p.v. "geen content"', result.pendingVariantChoice === true);
      check('ongekozen: geeft géén ongekozen versie prijs', (result.content ?? '') === '');
      check('ongekozen: noemt het aantal versies', (result.variantOptionCount ?? 0) > 0);
      check('ongekozen: geeft het model een instructie mee', typeof result.note === 'string');
    } else if (label === 'empty') {
      check('leeg: hasContent false', result.hasContent === false);
      check('leeg: geen valse keuze-melding', result.pendingVariantChoice === false);
    } else {
      check(`${label}: assistent ziet de content`, result.hasContent === true, JSON.stringify(result).slice(0, 160));
      check(`${label}: content is niet leeg`, (result.content ?? '').trim().length > 0);
    }
  }

  console.log('\n8. Dezelfde rijen door de PUBLIEKE reader — MCP + /api/v1/deliverable (kruising #23)');
  const { getDeliverableContent } = await import('../../src/lib/content/deliverable-content');

  for (const [label, row] of Object.entries(found)) {
    const result = await getDeliverableContent(row.workspaceId, row.id);
    if (!result.ok) {
      check(`${label}: publieke reader vindt de rij`, false, result.code);
      continue;
    }
    const d = result.deliverable;

    if (label === 'awaiting-choice') {
      check('publiek/ongekozen: contentState = awaiting-choice', d.contentState === 'awaiting-choice');
      check('publiek/ongekozen: geen ongekozen versie prijsgegeven', d.text === null);
      check('publiek/ongekozen: noemt het aantal versies', d.variantOptionCount > 0);
    } else if (label === 'empty') {
      check('publiek/leeg: contentState = empty', d.contentState === 'empty');
      check('publiek/leeg: geen tekst', d.text === null);
    } else {
      check(`publiek/${label}: contentState = ready`, d.contentState === 'ready', d.contentState);
      check(`publiek/${label}: tekst is niet leeg`, (d.text ?? '').trim().length > 0);
      // Dít is de bug van #23: wie alleen `components` las kreeg een ánder
      // antwoord dan de waarheid — leeg bij een pure keten-B-pagina, en de
      // verouderde pre-flip-tekst bij een pagina die ná een GEO-flip zowel
      // componenten als een gekozen variant heeft.
      if (label.includes('keten B')) {
        const alleenComponenten = d.components
          .map((c) => (c.text ?? '').trim())
          .filter((t) => t.length > 0)
          .join('\n\n');
        check(
          'publiek/keten B: alleen `components` lezen geeft een ánder antwoord',
          alleenComponenten !== (d.text ?? ''),
          `components=${d.components.length} (${alleenComponenten.length} tekens), text=${(d.text ?? '').length} tekens`,
        );
      }
    }
  }

  await prisma.$disconnect();
}

async function main(): Promise<void> {
  if (process.env.SKIP_DB === '1') {
    console.log('\n(DB-deel overgeslagen — SKIP_DB=1)');
  } else {
    try {
      await runDbChecks();
    } catch (err) {
      fail++;
      console.log(`  ✗ DB-deel faalde — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\n${'='.repeat(56)}`);
  console.log(`TOTAAL: ${pass} PASS / ${fail} FAIL`);
  if (fail > 0) process.exit(1);
}

void main();

/**
 * Golden-set eval voor de ECHTE blog-post-prompt (2026-08-20, optie A).
 *
 * WAAROM DIT NAAST DE PROMPTFOO-SET BESTAAT
 *
 * `tests/content-golden-sets/long-form/blog-post.yaml` genereert met een eigen
 * inline prompt, niet met de productiecode. Twee gevolgen, beide kanten op:
 *
 *   - een regressie in `BLOG_POST_SYSTEM` is voor die set ONZICHTBAAR;
 *   - zijn kwaliteitsscores beschrijven een artefact dat geen gebruiker krijgt
 *     (gemeten 20-08: productie bestelt een meta-description en géén FAQ, de
 *     eval-prompt precies andersom).
 *
 * Die set beantwoordt "is de tekst goed?" — een oordeel, dat geld kost en 's
 * nachts hoort. Deze runner beantwoordt "is de prompt nog heel?" — deterministisch,
 * gratis, en dus in de PR-poort. Twee vragen, twee stukken gereedschap.
 *
 * Naar precedent `scripts/eval/lp-variant-golden/run.ts`. Net als daar: GEEN
 * database nodig (`GenerationContext` is vier platte strings) en GEEN API-sleutel
 * (er wordt niets gegenereerd, alleen gebouwd).
 *
 * Run: npx tsx scripts/eval/blog-post-golden/run.ts
 */
import {
  LONG_FORM_TEMPLATES,
} from '../../../src/lib/studio/prompt-templates/long-form';
import type { GenerationContext } from '../../../src/lib/studio/context-builder';

let pass = 0;
const failures: string[] = [];

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    pass++;
    console.log(`  PASS ${name}`);
  } else {
    failures.push(name);
    console.error(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`);
  }
}

/** Herkenbare, onwaarschijnlijke waarden — zodat een treffer niet toevallig kan zijn. */
const CTX: GenerationContext = {
  brandContext: 'MERKANKER-7Q: Napking levert vlekkeloos textiel zonder omkijken.',
  personaContext: 'PERSONA-ANKER-7Q: restauranteigenaar, nuchter, weinig tijd.',
  campaignContext: 'CAMPAGNE-ANKER-7Q: najaarsactie horeca.',
  deliverableBrief: 'BRIEF-ANKER-7Q: 1 blogpost over duurzaam servies.',
};

function bouw(overrides: Partial<{ userPrompt: string; settings: unknown }> = {}): string {
  const tpl = LONG_FORM_TEMPLATES['blog-post'];
  return tpl.buildUserPrompt({
    userPrompt: overrides.userPrompt ?? 'GEBRUIKERSPROMPT-ANKER-7Q',
    context: CTX,
    settings: overrides.settings ?? { tone: 'vakkundig-7Q', length: 'long' },
  } as unknown as Parameters<typeof tpl.buildUserPrompt>[0]);
}

function main(): void {
  const sys = LONG_FORM_TEMPLATES['blog-post'].systemPrompt as string;
  const user = bouw();

  console.log('\n── A. Het contract dat de eval aanneemt ───────────────────');
  // Deze drie zijn de aannames waarop de promptfoo-rubrics rusten. Verschuift er
  // één, dan hoort iemand die rubrics ernaast te leggen — dat is precies wat op
  // 18-08 niet gebeurde (#350 las de user-prompt i.p.v. de systeemprompt).
  assert('productie belooft het keyword in de H1',
    /H1 contains the primary keyword/i.test(sys),
    'De H1-assert van de LINFI-case toetst dan een belofte die niet meer bestaat.');
  assert('productie bestelt een meta-description',
    /meta.?desc/i.test(sys),
    'Verdwijnt dit, dan is de divergentie met de eval-prompt opgelost — pas de rubric aan.');
  assert('productie bestelt GEEN FAQ-sectie',
    !/\bFAQ\b/.test(sys),
    'Komt dit erbij, dan mag de FAQ-eis in de promptfoo-rubric blijven staan.');

  console.log('\n── B. Merk-context landt echt in de prompt ────────────────');
  // De ergste faalmodus van dit product is stil contextverlies: de prompt wordt
  // gebouwd, de generatie slaagt, en het merk zit er niet in. Daarom ankers.
  assert('brandContext staat in de prompt', user.includes('MERKANKER-7Q'));
  assert('personaContext staat in de prompt', user.includes('PERSONA-ANKER-7Q'));
  assert('campaignContext staat in de prompt', user.includes('CAMPAGNE-ANKER-7Q'));
  assert('deliverableBrief staat in de prompt', user.includes('BRIEF-ANKER-7Q'));
  assert('de gebruikersprompt staat in de prompt', user.includes('GEBRUIKERSPROMPT-ANKER-7Q'));
  assert('brand-context draagt zijn afbakening',
    user.includes('=== BRAND CONTEXT ===') && user.includes('=== END BRAND CONTEXT ==='),
    'Zonder afbakening loopt merk-context over in de brief; dat is eerder misgegaan.');

  console.log('\n── C. Instellingen komen door ─────────────────────────────');
  assert('tone komt uit de settings', user.includes('vakkundig-7Q'));
  assert('length=long geeft 2000-3000 words', user.includes('2000-3000 words'));
  assert('length=short geeft 500-800 words',
    bouw({ settings: { tone: 't', length: 'short' } }).includes('500-800 words'));
  assert('een onbekende length valt terug op 1000-1500 words',
    bouw({ settings: { tone: 't', length: 'onzin' } }).includes('1000-1500 words'));
  assert('het type-specifieke format staat erin',
    /Format: Blog post with H1 title/.test(user));

  console.log('\n── D. Mutatietest — merkt deze runner een breuk? ──────────');
  // Zonder deze sectie toetst het bovenstaande alleen dat er tekst is.
  const leeg = LONG_FORM_TEMPLATES['blog-post'].buildUserPrompt({
    userPrompt: 'x',
    context: { brandContext: '', personaContext: '', campaignContext: '', deliverableBrief: '' },
    settings: { tone: 't', length: 'long' },
  } as unknown as Parameters<typeof LONG_FORM_TEMPLATES['blog-post']['buildUserPrompt']>[0]);
  assert('MUTATIETEST — lege context laat de ankers verdwijnen',
    !leeg.includes('MERKANKER-7Q') && !leeg.includes('=== BRAND CONTEXT ==='),
    'Zou dit slagen met lege context, dan matcht de assertie op iets anders.');
  assert('MUTATIETEST — een ander content-type geeft een ander format',
    !/Format: Blog post with H1 title/.test(
      LONG_FORM_TEMPLATES['pillar-page'].buildUserPrompt({
        userPrompt: 'x', context: CTX, settings: { tone: 't', length: 'long' },
      } as unknown as Parameters<typeof LONG_FORM_TEMPLATES['pillar-page']['buildUserPrompt']>[0]),
    ),
    'Matcht het format van pillar-page ook, dan toetst check C niets specifieks.');

  console.log('');
  if (failures.length > 0) {
    console.error(`✗ blog-post-golden: ${failures.length} van ${pass + failures.length} gefaald`);
    failures.forEach((f) => console.error(`   - ${f}`));
    process.exit(1);
  }
  console.log(`✅ ${pass}/${pass} checks geslaagd`);
}

main();

/**
 * Drift-guard tussen de golden-set-evals en de productie-prompts.
 *
 * De aanleiding (`golden-set-blogpost-quality`, 2026-08-18): de blog-post-rubric
 * eiste een meta-description terwijl noch de eval-prompt noch de productie-prompt
 * er ooit een bestelt. Die case zakte daardoor vijf nachten op rij op uitsluitend
 * dat punt — geen kwaliteitssignaal maar een defect in de set.
 *
 * De onderliggende oorzaak is structureel en staat als open vraag in het
 * task-file: de promptfoo-sets dragen hun EIGEN inline prompt en verwijzen
 * nergens naar de productiecode. Ze kunnen dus ongemerkt uit elkaar lopen, en
 * dan meet de nightly iets anders dan wat gebruikers krijgen.
 *
 * Deze guard lost dat niet op — dat is de v2-vraag — maar maakt het luidruchtig:
 * verandert het productie-format, dan faalt dit en kijkt iemand naar de eval.
 *
 * ⚠ Bewust GEEN tekstvergelijking tussen prompt en rubric. Een guard die op
 * natuurlijke taal matcht geeft schijnzekerheid; hij zou "meta" ergens in een
 * toelichting al als eis lezen. Dit pint één ding vast dat exact is: de
 * format-regel die productie meegeeft.
 *
 * Run: npx tsx scripts/smoke-tests/golden-set-prompt-drift.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { LONG_FORM_TEMPLATES } from '../../src/lib/studio/prompt-templates/long-form';

let passed = 0;
const failures: string[] = [];
function check(label: string, ok: boolean, detail?: string): void {
  if (ok) { passed++; console.log(`  ✓ ${label}`); }
  else { failures.push(label); console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`); }
}

/**
 * Het productie-format zoals de eval het op 2026-08-18 aannam. Verandert dit,
 * dan hoort iemand de eval-prompt en de rubrics ernaast te leggen — niet dit
 * getal blind bij te werken.
 */
const VERWACHT_BLOG_FORMAT = 'Format: Blog post with H1 title, H2 sections, conclusion, and CTA.';

/** De systeemprompt die productie voor dit content-type meegeeft. Hier staat het
 *  outputcontract — niet in de user-prompt-formatregel. Dat onderscheid is de
 *  hele reden dat deze guard sinds 2026-08-20 anders toetst. */
function productionSystemFor(id: string): string {
  const tpl = LONG_FORM_TEMPLATES[id];
  return typeof tpl?.systemPrompt === 'string' ? tpl.systemPrompt : '';
}

function productionFormatFor(id: string): string {
  const tpl = LONG_FORM_TEMPLATES[id];
  if (!tpl) return '';
  // buildUserPrompt krijgt het format-fragment als vierde argument mee; we
  // roepen 'm met lege context aan en zoeken het fragment terug in de output.
  const built = tpl.buildUserPrompt({
    userPrompt: '', context: {}, settings: {},
  } as unknown as Parameters<typeof tpl.buildUserPrompt>[0]);
  const m = built.match(/Format:[^\n]*/);
  return m ? m[0].trim() : '';
}

function main(): void {
  console.log('\n── Productie-format vs. de aanname van de eval ────────────');

  const actual = productionFormatFor('blog-post');
  check('het productie-format voor blog-post is onveranderd',
    actual === VERWACHT_BLOG_FORMAT,
    `verwacht: ${VERWACHT_BLOG_FORMAT}\n      gevonden: ${actual || '(niet gevonden)'}`);

  // ⚠️ Hier stond: check('en het bestelt geen meta-description', !/meta.?desc/i
  // .test(actual)). Die assertie was waar én misleidend: hij toetste de
  // USER-prompt-formatregel, waar het antwoord triviaal 'nee' is. Het
  // outputcontract staat in de SYSTEEMprompt. Deze guard bevestigde daarmee de
  // premisse van #350 in plaats van hem te toetsen — een guard die draait is nog
  // geen guard die het juiste toetst. Vervangen op 2026-08-20.

  console.log('\n── Wat productie ECHT bestelt (systeemprompt) ─────────────');

  const sys = productionSystemFor('blog-post');
  check('de systeemprompt voor blog-post is vindbaar', sys.length > 1000,
    `lengte: ${sys.length}`);

  // Twee divergenties tussen eval-prompt en productie, beide kanten op. Ze staan
  // hier vastgepind zodat een wijziging aan één van beide kanten opvalt, in plaats
  // van dat de twee stil verder uit elkaar lopen.
  check('productie bestelt WEL een meta-description (eval-prompt niet)',
    /meta.?desc/i.test(sys),
    'Zo niet: de divergentie is opgelost of verplaatst — leg eval en productie naast elkaar.');

  check('productie bestelt GEEN FAQ-sectie (eval-prompt wel)',
    !/\bFAQ\b/.test(sys),
    'Zo wel: productie is bijgetrokken — dan mag de FAQ-eis in de rubric blijven staan.');

  check('productie belooft het keyword in de H1',
    /H1 contains the primary keyword/i.test(sys),
    'Zo niet: de H1-assert van de LINFI-case toetst een belofte die niet meer bestaat.');

  console.log('\n── De rubric volgt de EVAL-prompt (niet productie) ────────');

  const yamlPath = path.join('tests', 'content-golden-sets', 'long-form', 'blog-post.yaml');
  const raw = fs.readFileSync(yamlPath, 'utf8');
  // Alleen niet-commentaarregels: de toelichting bij de fix noemt het woord wel.
  const eisen = raw.split('\n').filter((l) => !l.trim().startsWith('#') && /meta.?desc/i.test(l));
  // De rubric hoort te matchen met de EVAL-prompt, want die genereert de output.
  // Eisen dat het model iets levert wat hem nooit is opgedragen, faalt per definitie.
  check('geen meta-description-eis in de blog-post-rubrics (de eval-prompt bestelt er geen)',
    eisen.length === 0, eisen.join('\n      '));

  console.log('\n── Mutatietest ───────────────────────────────────────────');
  // Zou de guard het merken als het productie-format verschuift? Toets de
  // vergelijking zelf, niet de huidige waarde.
  check('MUTATIETEST — een afwijkend format wordt herkend',
    productionFormatFor('pillar-page') !== VERWACHT_BLOG_FORMAT
      && productionFormatFor('pillar-page').length > 0,
    `pillar-page: ${productionFormatFor('pillar-page')}`);
  check('MUTATIETEST — een onbekend content-type geeft leeg, geen valse match',
    productionFormatFor('bestaat-niet') === '');

  console.log(`\n${failures.length === 0 ? '✅' : '❌'} ${passed}/${passed + failures.length} checks geslaagd`);
  if (failures.length) { failures.forEach((f) => console.error(`   - ${f}`)); process.exit(1); }
}

main();

/**
 * lp-locale-mixing-smoke — bewijst dat de web-page/LP-generator de gedeelde
 * locale-directive draagt, en dat een anderstalige zoekterm niet meer in de
 * output lekt.
 *
 * Aanleiding: BugReport 2026-07-16 (pilot-tester, severity high) — "in de
 * gegenereerde content lopen engels en nederlands door elkaar heen". Zijn
 * pillar-page leverde "The WooCommerce Bol.com koppeling that gives you your
 * evenings back": Engelse zinnen met een NL-term. Oorzaak: variant-generator.ts
 * had als enige taalregel een bullet ("Locale en-US: alle content in deze taal")
 * en adopteerde buildLocaleInstruction() nooit — die verbiedt code-switching
 * expliciet en eist vertaling van anderstalig bronmateriaal.
 *
 * Draaien (env-file nodig: de import-keten trekt prisma binnen en eist DATABASE_URL,
 * ook op het deterministische pad):
 *   node --env-file-if-exists=.env.local node_modules/.bin/tsx scripts/dev/lp-locale-mixing-smoke.ts
 *     → 20 deterministische checks, geen API-calls
 *   FULL_RUN=1 node --env-file-if-exists=.env.local node_modules/.bin/tsx scripts/dev/lp-locale-mixing-smoke.ts
 *     → + echte Anthropic-generatie (27 checks totaal)
 */

import {
  buildLandingPageVariantPrompt,
  generateLandingPageVariantBatch,
  type LandingPageGenerationParams,
} from '../../src/lib/landing-pages/variant-generator';

let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Minimale params; de generator vult de rest met defaults. */
function params(over: Partial<LandingPageGenerationParams> = {}): LandingPageGenerationParams {
  return {
    brand: { brandName: 'Flowwise' },
    userPrompt: 'WooCommerce Bol.com koppeling voor webshop-eigenaren',
    ...over,
  } as LandingPageGenerationParams;
}

/**
 * Reproductie-fixture, gemodelleerd op de échte melding (prod, 2026-07-16).
 *
 * De trigger is niet "een NL-woord in de prompt" — met een kale NL-zin gedraagt het
 * model zich ook zónder directive. De trigger is een briefing waarin de talen AL door
 * elkaar lopen: de gebruiker had een Engelse objective/keyMessage/toneDirection met een
 * NEDERLANDSE callToAction (zelf AI-gegenereerd). Het model spiegelt dan de bronvorm
 * i.p.v. één taal te kiezen — precies wat buildLocaleInstruction verbiedt
 * ("translate, don't mirror" / "block code-switching mid-output").
 *
 * Merknaam genericiseerd; de taalvorm is 1-op-1 die van de echte briefing.
 */
const MIXED_BRIEF_PROMPT = [
  'Objective: This page is a cornerstone of our educational content strategy, designed to',
  'establish us as the go-to authority for e-commerce automation. Entrepreneurs searching for',
  'WooCommerce and Bol.com synchronization should find us first.',
  '',
  'Key message: Reclaim your time and eliminate costly mistakes with effortless, real-time',
  'synchronization between WooCommerce and Bol.com. Products, inventory and orders stay',
  'perfectly aligned across both channels.',
  '',
  // ↓ de lek-vector: NL call-to-action in een verder Engelse briefing
  'Call to action: Start vandaag met automatiseren: Bekijk hoe Flowwise jouw WooCommerce en',
  'Bol.com koppelt zonder gedoe. Vraag een gratis demo aan en ontdek hoeveel uren je bespaart.',
  '',
  'Tone: approachable, down-to-earth Everyman. Sober, practical, relatable.',
  'SEO-keyword: WooCommerce Bol.com koppeling',
].join('\n');

console.log('\n1. De directive landt in de prompt');
{
  const { system } = buildLandingPageVariantPrompt(params({ locale: 'en-US' }));
  check('OUTPUT LANGUAGE-header aanwezig', system.includes('OUTPUT LANGUAGE (CRITICAL)'));
  check('noemt English', system.includes('**English (English)**'));
  check('verbiedt mengen', system.includes('Do NOT mix languages'));
  check('eist vertaling van anderstalige bron', system.includes('translate the meaning into English'));
  check('overrulet tone/style', system.includes('This rule outranks any tone or style guidance below'));
}

console.log('\n2. De directive staat BOVEN de stijl-stack (outranks moet kloppen)');
{
  const { system } = buildLandingPageVariantPrompt(
    params({ locale: 'en-US', archetype: 'SAGE', humanVoiceMode: 'BASELINE' }),
  );
  const iLocale = system.indexOf('OUTPUT LANGUAGE (CRITICAL)');
  const iTone = system.indexOf('BRAND-ARCHETYPE');
  check('locale-blok vóór archetype/tone-blok', iLocale >= 0 && iTone >= 0 && iLocale < iTone,
    `locale@${iLocale} tone@${iTone}`);
}

console.log('\n3. Alle 5 web-page-prompts dragen de directive');
{
  for (const contentType of ['landing-page', 'faq-page', 'product-page', 'microsite', 'pillar-page']) {
    const { system } = buildLandingPageVariantPrompt(params({ locale: 'en-US', contentType }));
    check(`${contentType}`, system.includes('OUTPUT LANGUAGE (CRITICAL)'));
  }
}

console.log('\n4. Taal volgt de locale (geen hardcoded NL meer)');
{
  const nl = buildLandingPageVariantPrompt(params({ locale: 'nl-NL' })).system;
  check('nl-NL → Dutch', nl.includes('**Dutch (Nederlands)**'));

  const def = buildLandingPageVariantPrompt(params()).system; // locale weggelaten
  check('default → English (was "nl-NL")', def.includes('**English (English)**'));
  check('default → géén Dutch-directive', !def.includes('**Dutch (Nederlands)**'));
}

console.log('\n5. Bijvangst: de-DE krijgt niet langer de NEDERLANDSE human-voice-directive');
{
  const de = buildLandingPageVariantPrompt(
    params({ locale: 'de-DE', humanVoiceMode: 'BASELINE' }),
  ).system;
  check('de-DE → German-directive', de.includes('**German (Deutsch)**'));
  // Markers letterlijk uit human-voice-directive.ts. buildHumanVoiceDirective kent alleen
  // 'nl' | 'en' (isDutch = language === 'nl') en valt terug op Engels; 'de-DE' moet dus op
  // de Engelse tak landen i.p.v. — zoals vóór de fix — op de Nederlandse.
  const NL_HVD = 'Echte tekst heeft ritme';
  const EN_HVD = 'Real writing has rhythm';
  check('de-DE → geen NEDERLANDSE HVD', !de.includes(NL_HVD),
    'Duitse workspace kreeg Nederlandse voice-regels');
  check('de-DE → Engelse HVD als fallback', de.includes(EN_HVD));
  // Regressie-borging: nl/en mogen niet verschoven zijn door de base-subtag-wijziging.
  const nlHvd = buildLandingPageVariantPrompt(params({ locale: 'nl-NL', humanVoiceMode: 'BASELINE' })).system;
  check('nl-NL → nog steeds Nederlandse HVD', nlHvd.includes(NL_HVD));
  const enHvd = buildLandingPageVariantPrompt(params({ locale: 'en-US', humanVoiceMode: 'BASELINE' })).system;
  check('en-US → nog steeds Engelse HVD', enHvd.includes(EN_HVD));
}

// ─── Echte generatie (opt-in) ───────────────────────────────

async function fullRun(): Promise<void> {
  console.log('\n6. Echte Anthropic-run: NL-zoekterm + Engelse contenttaal');
  try {
    const results = await generateLandingPageVariantBatch(
      params({ locale: 'en-US', contentType: 'pillar-page', userPrompt: MIXED_BRIEF_PROMPT }),
      1,
    );
    // ALLEEN de gegenereerde variant meten. Het batch-resultaat draagt ook
    // `prompt` (de Nederlandstalige system/user-prompt, inclusief de NL-zoekterm)
    // en token-metadata; die meenemen meet de INVOER en niet de UITVOER — precies
    // de fout die deze smoke bij zijn eerste run zelf maakte.
    const variants = (Array.isArray(results) ? results : [])
      .map((r) => (r as { variant?: unknown }).variant)
      .filter(Boolean);
    check('batch leverde ≥1 variant', variants.length > 0);
    if (process.env.DUMP === '1') {
      console.log('\n--- VARIANT ---\n' + JSON.stringify(variants, null, 2).slice(0, 2500) + '\n--- /VARIANT ---\n');
    }
    const blob = JSON.stringify(variants).toLowerCase();
    // De lek-marker uit de echte melding: 'koppeling' moet vertaald zijn
    // (verwacht: "integration"), niet onvertaald bewaard "voor authenticiteit".
    check('geen "koppeling" in Engelse output', !blob.includes('koppeling'),
      'NL-term lekt nog steeds — directive onvoldoende');
    check('NL-term is vertaald naar EN', blob.includes('integration'));
    // Woordgrens-gebonden NL-stopwoorden; los van elk Engels substring-toeval.
    for (const nlWord of ['jouw', 'zonder gedoe', 'webshop-eigenaren', 'bespaart']) {
      check(`geen NL-woord "${nlWord}"`, !new RegExp(`\\b${nlWord}\\b`).test(blob));
    }
    const hero = (variants[0] as { hero?: { headline?: string } } | undefined)?.hero;
    console.log('\n  hero.headline:', hero?.headline ?? '(geen)');
  } catch (err) {
    fail++;
    console.log(`  ✗ generatie faalde — ${err instanceof Error ? err.message : String(err)}`);
  }
}

const tail =
  process.env.FULL_RUN === '1'
    ? fullRun()
    : Promise.resolve(console.log('\n6. Echte generatie overgeslagen (zet FULL_RUN=1)'));

void tail.then(() => {
  console.log(`\n${pass}/${pass + fail} checks groen${fail ? ` — ${fail} FAIL` : ''}\n`);
  process.exit(fail ? 1 : 0);
});

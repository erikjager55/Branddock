/**
 * Golden-set eval voor de ECHTE LP-variant-prompt (audit 2026-06-10, fase 5).
 *
 * De promptfoo golden-set (tests/content-golden-sets/website/landing-page.yaml)
 * test een generieke MECLABS-markdown-prompt — niet buildLandingPageVariantPrompt.
 * Regressies in het productie-prompt-pad bleven daardoor onzichtbaar. Deze
 * runner exerceert de productie-prompt-builder zelf, naar precedent
 * scripts/eval/brandstyle-golden-set.
 *
 * Twee modi:
 *  - default (CI-safe, geen API-key nodig): deterministische prompt-assertions
 *  - --live: genereert per fixture een echte variant via Anthropic en assert
 *    op output-kwaliteit (parse, glued em-dash = 0, drieslag <= 1, detector
 *    verdict niet PURE_AI). Kost ~2 calls; vereist ANTHROPIC_API_KEY.
 *
 * Run: npx tsx scripts/eval/lp-variant-golden/run.ts [--live]
 */
import 'dotenv/config';
import {
  buildLandingPageVariantPrompt,
  generateLandingPageVariant,
  type LandingPageGenerationParams,
} from '../../../src/lib/landing-pages/variant-generator';
import { flattenVariantToText } from '../../../src/lib/landing-pages/flatten-variant';
import { detectAiTells } from '../../../src/lib/brand-fidelity/ai-tell-detector';

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

const FIXTURES: Array<{ label: string; params: LandingPageGenerationParams }> = [
  {
    label: 'Napking textielbeheer (NL, vocab-rails)',
    params: {
      brand: {
        brandName: 'Napking',
        brandPromise: 'Vlekkeloos textiel zonder omkijken',
        brandToneOfVoice: 'warm, nuchter, vakkundig zonder opsmuk',
        industry: 'horeca-textielservice',
      },
      persona: { name: 'Restauranteigenaar', role: 'eigenaar-operator' },
      userPrompt:
        'Landing page voor een textielbeheer-abonnement: levering, wassen en voorraadbeheer van servetten en tafellinnen voor restaurants in de Randstad. Doel: adviesgesprek-aanvragen.',
      locale: 'nl-NL',
      vocabularyDo: ['vlekkeloos', 'omkijken', 'kraakhelder'],
      vocabularyDont: ['goedkoop', 'deal'],
      archetype: 'CARETAKER',
      layoutStyle: 'COMMERCIAL',
    },
  },
  {
    label: 'Zwarthout gevelhout (NL, geen vocab)',
    params: {
      brand: {
        brandName: 'Zwarthout',
        brandToneOfVoice: 'eigenzinnig, ambachtelijk, direct',
        industry: 'bouwmaterialen / architectuur',
      },
      userPrompt:
        'Landing page voor Shou Sugi Ban verkoold gevelhout gericht op architecten. Doel: stalen-aanvragen.',
      locale: 'nl-NL',
      archetype: 'CREATOR',
      layoutStyle: 'EDITORIAL',
    },
  },
];

const GLUED_DASH = /[a-zà-öø-ÿ]—[a-zà-öø-ÿ]/g;
const TRIPLE_GEEN = /geen\s+[^.,;]{2,40},\s*geen\s+[^.,;]{2,40}[,—-]\s*(geen|alleen)/gi;

async function run() {
  const live = process.argv.includes('--live');

  for (const fx of FIXTURES) {
    console.log(`\n=== Fixture: ${fx.label} ===`);

    // ── Deterministische prompt-assertions ──────────────
    const prompt = buildLandingPageVariantPrompt(fx.params);
    assert('HVD met em-dash-verbod in system-prompt', prompt.system.includes('HUMAN VOICE') && prompt.system.includes('Em-dash'));
    assert('anti-drieslag regel aanwezig', prompt.system.includes('Maximaal 1 opsommende ontkenning'));
    assert('anti-fabricage regel aanwezig', prompt.system.includes('verzin NOOIT echte bedrijfsnamen'));
    assert('geen cross-brand voorbeelden', !prompt.system.includes('LINFI') && !prompt.system.includes('Better Brands'));
    const promptZonderHvd = buildLandingPageVariantPrompt({ ...fx.params, humanVoiceMode: 'OFF' });
    assert('instructietekst primet geen em-dashes (OFF-prompt — vrij)', !promptZonderHvd.system.includes('—'));
    assert('brand-naam in user-prompt', prompt.user.includes(fx.params.brand.brandName ?? ''));

    // ── Live generatie-assertions ───────────────────────
    if (live) {
      console.log('  ... live generatie (Anthropic) ...');
      try {
        const result = await generateLandingPageVariant(fx.params, { model: 'claude-sonnet-4-6' });
        const text = flattenVariantToText(result.variant);
        const gluedCount = (text.match(GLUED_DASH) ?? []).length;
        const tripleCount = (text.match(TRIPLE_GEEN) ?? []).length;
        const detector = detectAiTells(text, { brandVocabulary: fx.params.vocabularyDo ?? [] });
        assert('variant parset + valideert', text.length > 200);
        assert(`glued em-dashes = 0 (got ${gluedCount})`, gluedCount === 0);
        assert(`drieslag "geen/geen/alleen" <= 1 (got ${tripleCount})`, tripleCount <= 1);
        assert(`detector-verdict niet PURE_AI (got ${detector.verdict})`, detector.verdict !== 'PURE_AI');
        console.log(`  info: verdict=${detector.verdict} score=${detector.scorePer1000Words.toFixed(1)}/1000 woorden=${text.split(/\s+/).length}`);
      } catch (err) {
        assert('live generatie slaagt', false, (err as Error).message);
      }
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`TOTAAL: ${pass} PASS / ${fail} FAIL${live ? ' (live-mode)' : ' (prompt-only; --live voor generatie-checks)'}`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

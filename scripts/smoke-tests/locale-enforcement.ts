/**
 * Smoke-test for locale enforcement (content-locale-enforcement-fix).
 *
 * Two layers:
 *   1. Unit-level: verify locale-instruction is present in prompt strings
 *      built by formatBrandContext / formatBrandContextTier / buildBrandVoiceDirective
 *      (no DB, no AI — fast)
 *   2. Live AI-level: send a NL prompt with mixed-language brand-context to real AI
 *      and check the output is single-language NL (heuristic word-count detection)
 *
 * Run: `set -a && source .env.local && set +a && npx tsx scripts/smoke-tests/locale-enforcement.ts`
 */

import { buildLocaleInstruction, buildLocaleSystemFragment } from '@/lib/ai/locale-instruction';
import { formatBrandContext, formatBrandContextTier, type BrandContextBlock } from '@/lib/ai/prompt-templates';
import { buildBrandVoiceDirectiveFromContext } from '@/lib/studio/brand-voice-directive';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

console.log('\n=== LAYER 1: unit-level prompt construction ===\n');

console.log('## buildLocaleInstruction');
{
  const nl = buildLocaleInstruction('nl');
  assert('NL → contains "Dutch"', nl.includes('Dutch'));
  assert('NL → contains "Nederlands"', nl.includes('Nederlands'));
  assert('NL → contains "translate"', nl.includes('translate'));
  assert('NL → contains "outranks"', nl.includes('outranks'));

  const en = buildLocaleInstruction('en');
  assert('EN → contains "English"', en.includes('English'));
  assert('EN → also enforces (not empty)', en.length > 100, `len=${en.length}`);

  const bcp47 = buildLocaleInstruction('nl-BE');
  assert('BCP-47 nl-BE → tolerated, returns Dutch', bcp47.includes('Dutch'));

  // Fase 4 (audit 2026-06-11): a non-empty code NEVER yields '' anymore —
  // unknown codes get an explicit ISO-code fallback instruction.
  const unknown = buildLocaleInstruction('xx');
  assert("unknown lang → ISO-code fallback instruction", unknown.includes("ISO code 'xx'"));

  const intlResolved = buildLocaleInstruction('sv');
  assert('Intl-resolved lang (sv) → Swedish', intlResolved.includes('Swedish'));

  const undef = buildLocaleInstruction(undefined);
  assert('undefined → empty', undef === '');

  const empty = buildLocaleInstruction(null);
  assert('null → empty', empty === '');
}

console.log('\n## buildLocaleSystemFragment (for system-role prompts)');
{
  const nl = buildLocaleSystemFragment('nl');
  assert('NL fragment → contains "Dutch"', nl.includes('Dutch'));
  assert('NL fragment → no markdown header', !nl.startsWith('##'));
  assert('NL fragment → mentions translate', nl.includes('translate'));
}

console.log('\n## formatBrandContext (full tier)');
{
  const ctx: BrandContextBlock = {
    contentLanguage: 'nl',
    brandName: 'TestBrand',
    brandPurpose: 'Some EN brand purpose',
  };
  const out = formatBrandContext(ctx);
  assert('full tier → locale comes BEFORE brand-context header', out.indexOf('OUTPUT LANGUAGE') < out.indexOf('## Brand Context'));
  assert('full tier → contains brand name', out.includes('TestBrand'));
  assert('full tier → contains "Dutch"', out.includes('Dutch'));

  const enCtx: BrandContextBlock = { contentLanguage: 'en', brandName: 'TestBrand' };
  const enOut = formatBrandContext(enCtx);
  assert('full tier EN → still emits language block', enOut.includes('English'));

  const noLang: BrandContextBlock = { brandName: 'TestBrand' };
  const noLangOut = formatBrandContext(noLang);
  assert('full tier no-locale → falls back gracefully (no language block, but brand context still rendered)', !noLangOut.includes('OUTPUT LANGUAGE') && noLangOut.includes('## Brand Context'));
}

console.log('\n## formatBrandContextTier — all 3 tiers');
{
  const ctx: BrandContextBlock = { contentLanguage: 'nl', brandName: 'TestBrand', industry: 'SaaS' };
  for (const tier of ['summary', 'light', 'medium'] as const) {
    const out = formatBrandContextTier(ctx, tier);
    assert(`${tier} tier → contains locale instruction`, out.includes('Dutch'));
    assert(`${tier} tier → locale before brand context`, out.indexOf('Dutch') < out.indexOf('## Brand Context'));
  }
}

console.log('\n## buildBrandVoiceDirective');
{
  const nlCtx: BrandContextBlock = { contentLanguage: 'nl', brandName: 'TestBrand' };
  const nlOut = buildBrandVoiceDirectiveFromContext(nlCtx);
  assert('NL voice directive → emits language block', nlOut.includes('Dutch (Nederlands)'));
  assert('NL voice directive → contains translate clause', nlOut.includes('translate the meaning'));
  assert('NL voice directive → outranks clause', nlOut.includes('outranks tone'));

  const enCtx: BrandContextBlock = { contentLanguage: 'en', brandName: 'TestBrand' };
  const enOut = buildBrandVoiceDirectiveFromContext(enCtx);
  assert('EN voice directive → ALSO emits language block (regression check)', enOut.includes('English'));
  assert('EN voice directive → translate clause present for EN', enOut.includes('translate the meaning'));
}

console.log(`\n=== LAYER 1 RESULT: ${pass} passed, ${fail} failed ===\n`);

if (fail > 0) {
  console.error('UNIT-LEVEL CHECKS FAILED — fix before running live AI test.');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────
// LAYER 2: live AI roundtrip (only runs if unit-level passes)
// ─────────────────────────────────────────────────────────────────

console.log('=== LAYER 2: live AI roundtrip (NL output check) ===\n');

import { dispatchTextCompletion } from '@/lib/ai/dispatch-completion';
import { SYSTEM_BASE } from '@/lib/ai/prompt-templates';

interface LiveTestCase {
  name: string;
  contentLanguage: string;
  expectedLanguage: 'nl' | 'en';
  brandContext: BrandContextBlock;
  userInstruction: string;
}

const NL_HEURISTIC_WORDS = ['de ', 'het ', 'een ', 'is ', 'en ', 'voor ', 'met ', 'wij', 'onze', 'jij', 'je '];
const EN_HEURISTIC_WORDS = [' the ', ' is ', ' and ', ' for ', ' with ', ' we ', ' our ', ' you ', ' your '];

function detectLanguage(text: string): { nlScore: number; enScore: number } {
  const lower = ' ' + text.toLowerCase() + ' ';
  let nlScore = 0;
  let enScore = 0;
  for (const w of NL_HEURISTIC_WORDS) if (lower.includes(' ' + w.trim() + ' ')) nlScore++;
  for (const w of EN_HEURISTIC_WORDS) if (lower.includes(w)) enScore++;
  return { nlScore, enScore };
}

const liveTests: LiveTestCase[] = [
  {
    name: 'NL brand with EN brand-context input → output must be NL',
    contentLanguage: 'nl',
    expectedLanguage: 'nl',
    brandContext: {
      contentLanguage: 'nl',
      brandName: 'Better Brands',
      brandPurpose: 'Help marketing teams build stronger, more consistent brand identities through AI-powered tools.',
      brandPromise: 'Every brand deserves clarity, consistency and craft.',
      brandPersonality: 'Confident, direct, slightly irreverent. We avoid marketing jargon and corporate fluff.',
      industry: 'B2B SaaS / brand strategy',
      targetAudience: 'Senior marketers and brand strategists at mid-sized B2B companies',
    },
    userInstruction: 'Schrijf 1 LinkedIn-post over hoe een sterke merkstrategie de basis is voor consistente content. Max 150 woorden. Geen hashtags.',
  },
  {
    name: 'EN brand with mixed input → output must be EN',
    contentLanguage: 'en',
    expectedLanguage: 'en',
    brandContext: {
      contentLanguage: 'en',
      brandName: 'TestCo',
      brandPurpose: 'Wij bouwen tools voor moderne marketingteams.', // intentionally NL
      brandPromise: 'Better tools, better outcomes.',
      industry: 'B2B SaaS',
    },
    userInstruction: 'Write 1 LinkedIn post about why brand consistency drives growth. Max 150 words. No hashtags.',
  },
];

async function runLiveTest(tc: LiveTestCase): Promise<boolean> {
  console.log(`\n  Test: ${tc.name}`);
  const brandContextString = formatBrandContext(tc.brandContext);
  const directive = buildBrandVoiceDirectiveFromContext(tc.brandContext);
  const userPrompt = `${directive}\n\n${brandContextString}\n\n## TASK\n${tc.userInstruction}`;

  try {
    const result = await dispatchTextCompletion({
      resolvedModel: { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
      systemPrompt: SYSTEM_BASE,
      userPrompt,
      maxTokens: 1024,
      temperature: 0.7,
    });

    const output = result.content ?? '';
    const { nlScore, enScore } = detectLanguage(output);
    console.log(`    Output (first 200 chars): ${output.slice(0, 200).replace(/\n/g, ' ')}…`);
    console.log(`    Heuristic — NL score: ${nlScore}, EN score: ${enScore}`);

    if (tc.expectedLanguage === 'nl') {
      const ok = nlScore >= 4 && enScore <= 2;
      assert(`    → output is predominantly NL`, ok, `nl=${nlScore} en=${enScore} (need nl>=4 en<=2)`);
      return ok;
    } else {
      const ok = enScore >= 4 && nlScore <= 2;
      assert(`    → output is predominantly EN`, ok, `nl=${nlScore} en=${enScore} (need en>=4 nl<=2)`);
      return ok;
    }
  } catch (err) {
    assert(`    → AI call succeeded`, false, String(err));
    return false;
  }
}

(async () => {
  for (const tc of liveTests) {
    await runLiveTest(tc);
  }

  console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail > 0 ? 1 : 0);
})();

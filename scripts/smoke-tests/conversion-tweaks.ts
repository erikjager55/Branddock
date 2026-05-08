/**
 * Smoke-test for canvas-tweaks-conversion-shortform.
 *
 * Validates that the new conversion-hook bundle (hookFormat / payoffPromise /
 * targetObjection / proofPoint) plus per-type extras shift AI output away
 * from generic-promo / generic-LinkedIn fingerprints.
 *
 * Two-pass approach per test case:
 *   1. Generate WITHOUT conversion fields → expect generic fingerprints to appear
 *   2. Generate WITH conversion fields → expect generic fingerprints to NOT appear
 *
 * Run: `set -a && source .env.local && set +a && npm run smoke:conversion-tweaks`
 */

import { dispatchTextCompletion } from '@/lib/ai/dispatch-completion';
import {
  formatBrandContext,
  SYSTEM_BASE,
  type BrandContextBlock,
} from '@/lib/ai/prompt-templates';
import { buildBrandVoiceDirectiveFromContext } from '@/lib/studio/brand-voice-directive';
import { getContentTypeInputs } from '@/features/campaigns/lib/content-type-inputs';

let pass = 0;
let fail = 0;
let warn = 0;

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

function softCheck(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.warn(`  ⚠ ${name}${detail ? ` — ${detail}` : ''} (soft check — AI variance)`);
    warn++;
  }
}

// ── Brand context (minimal but realistic — Better Brands style) ──

const brandCtx: BrandContextBlock = {
  contentLanguage: 'nl',
  brandName: 'Better Brands',
  brandPurpose: 'Help merkmanagers consistente brand-content produceren zonder eigen taal-team.',
  brandPromise: 'Brand-control op AI-snelheid.',
  brandPersonality: 'Direct, concreet, anti-fluff. We benoemen problemen bij naam en bouwen tools die ze oplossen.',
  industry: 'B2B SaaS / brand-management',
  targetAudience: 'Senior brand-managers en marketing-leads bij mid-market B2B-bedrijven',
  brandToneOfVoice: 'Stellig, geen marketingjargon, korte zinnen, nederlands van werkvloer-niveau.',
};

// ── Generic fingerprints (output we want to AVOID in the WITH-fields output) ──

const GENERIC_PROMO_FINGERPRINTS = [
  /\blimited time\b/i,
  /\blast chance\b/i,
  /\bhurry\b/i,
  /\bdon't miss out\b/i,
  /\bbeperkte tijd\b/i,
  /\blaatste kans\b/i,
];

const GENERIC_LINKEDIN_FINGERPRINTS = [
  /\bdid you know\b/i,
  /\bi want to share\b/i,
  /\bexcited to announce\b/i,
  /\bin today's world\b/i,
  /\bwist je dat\b/i,
  /\bik wil graag delen\b/i,
];

function countMatches(text: string, patterns: RegExp[]): number {
  let n = 0;
  for (const p of patterns) if (p.test(text)) n++;
  return n;
}

// ── Test driver ──

interface TweakTestCase {
  name: string;
  contentType: string;
  briefingTask: string;
  withoutInputs: Record<string, string | number | boolean>;
  withInputs: Record<string, string | number | boolean>;
  fingerprints: RegExp[];
  expectMentions?: string[];
}

async function generateForCase(
  tc: TweakTestCase,
  inputs: Record<string, string | number | boolean>,
): Promise<string> {
  const fields = getContentTypeInputs(tc.contentType);
  const inputLines: string[] = [];
  for (const f of fields) {
    const v = inputs[f.key];
    if (v == null || v === '') continue;
    inputLines.push(`- ${f.label}: ${typeof v === 'boolean' ? (v ? 'yes' : 'no') : v}`);
  }

  const userPrompt = [
    buildBrandVoiceDirectiveFromContext(brandCtx),
    formatBrandContext(brandCtx),
    `## Content Type\n${tc.contentType}`,
    inputLines.length ? `## Content-Specific Inputs\n${inputLines.join('\n')}` : '',
    `## Task\n${tc.briefingTask}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const result = await dispatchTextCompletion({
    resolvedModel: { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
    systemPrompt: SYSTEM_BASE,
    userPrompt,
    maxTokens: 800,
    temperature: 0.7,
  });
  return result.content ?? '';
}

const testCases: TweakTestCase[] = [
  {
    name: 'promotional-email — generic vs. conversion-equipped',
    contentType: 'promotional-email',
    briefingTask: 'Schrijf een korte promo-email (max 150 woorden) voor onze nieuwe Brand Voice Analyzer feature. Doel: trial-signups van bestaande gebruikers.',
    withoutInputs: {
      offerDetails: '14-daagse gratis trial van Brand Voice Analyzer',
    },
    withInputs: {
      offerDetails: '14-daagse gratis trial van Brand Voice Analyzer',
      hookFormat: 'contrarian-take',
      payoffPromise: 'Detecteer brand-fluff in je copy voordat het de pers haalt',
      targetObjection: 'AI-tools snijden te veel persoonlijkheid weg',
      proofPoint: 'Better Brands zelf: +24% voice-fidelity in 4 weken',
      urgencyMechanism: 'none',
      socialProofSnippet: '"3x sneller dan ons vorige tool" — Maartje, brand lead bij Napking',
    },
    fingerprints: GENERIC_PROMO_FINGERPRINTS,
    expectMentions: ['+24%', 'fluff', 'persoonlijkheid'],
  },
  {
    name: 'linkedin-post — generic vs. pattern-interrupt opener',
    contentType: 'linkedin-post',
    briefingTask: 'Schrijf een LinkedIn-post (max 150 woorden) over waarom merkconsistentie de basis is voor effectieve content.',
    withoutInputs: {
      postType: 'Industry Insight',
    },
    withInputs: {
      postType: 'Industry Insight',
      hookFormat: 'pattern-interrupt',
      payoffPromise: 'Een 3-regel-test om te zien of jouw merk consistent is',
      targetObjection: 'consistentie maakt creatief werk saai',
      proofPoint: 'Merken met voice-fidelity >80 hebben 2.3x betere conversie (eigen data)',
      personalAnecdote: false,
    },
    fingerprints: GENERIC_LINKEDIN_FINGERPRINTS,
    expectMentions: ['2.3x', 'test'],
  },
];

async function runCase(tc: TweakTestCase): Promise<void> {
  console.log(`\n## ${tc.name}\n`);

  console.log('  Generating WITHOUT conversion fields...');
  const withoutOutput = await generateForCase(tc, tc.withoutInputs);
  console.log(`    Output (first 300 chars): ${withoutOutput.slice(0, 300).replace(/\n/g, ' ')}…`);
  const withoutFingerprintCount = countMatches(withoutOutput, tc.fingerprints);
  console.log(`    Generic fingerprints matched: ${withoutFingerprintCount}/${tc.fingerprints.length}`);

  console.log('\n  Generating WITH conversion fields...');
  const withOutput = await generateForCase(tc, tc.withInputs);
  console.log(`    Output (first 300 chars): ${withOutput.slice(0, 300).replace(/\n/g, ' ')}…`);
  const withFingerprintCount = countMatches(withOutput, tc.fingerprints);
  console.log(`    Generic fingerprints matched: ${withFingerprintCount}/${tc.fingerprints.length}`);

  // Hard check: WITH-output should not have MORE generic fingerprints than WITHOUT
  assert(
    'WITH-output has ≤ generic fingerprints than WITHOUT',
    withFingerprintCount <= withoutFingerprintCount,
    `with=${withFingerprintCount} without=${withoutFingerprintCount}`,
  );

  // Hard check: WITH-output should be 0 generic fingerprints (the goal)
  assert(
    'WITH-output has 0 generic fingerprints',
    withFingerprintCount === 0,
    `still matched: ${tc.fingerprints.filter((p) => p.test(withOutput)).map((p) => p.source).join(', ')}`,
  );

  // Soft checks: AI variance can drop expected mentions
  if (tc.expectMentions) {
    for (const mention of tc.expectMentions) {
      softCheck(
        `WITH-output mentions "${mention}" (proof-point / hook-payoff use)`,
        withOutput.toLowerCase().includes(mention.toLowerCase()),
      );
    }
  }
}

(async () => {
  console.log('=== conversion-tweaks smoke-test ===');
  for (const tc of testCases) {
    try {
      await runCase(tc);
    } catch (err) {
      assert(`${tc.name} — completed without error`, false, String(err));
    }
  }
  console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed, ${warn} soft-warnings ===\n`);
  process.exit(fail > 0 ? 1 : 0);
})();

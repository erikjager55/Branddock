/**
 * Smoke-test for canvas-tweaks-longform-authority.
 *
 * Validates that the new authority-frame and narrative-anchor bundles
 * shift AI output away from descriptive-blog defaults ("What is X — A
 * Comprehensive Guide") and corporate-PR boilerplate toward
 * argumentative-thesis output and pivot-driven storytelling.
 *
 * Two-pass approach per test case:
 *   1. Generate WITHOUT new fields → expect generic fingerprints / weak thesis
 *   2. Generate WITH new fields → expect specific thesis / pivot mention
 *
 * Run: `set -a && source .env.local && set +a && npm run smoke:longform-tweaks`
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

// Generic-blog-H1 fingerprints (descriptive-mode openers we want WITH-output to avoid)
const GENERIC_BLOG_H1_FINGERPRINTS = [
  /^#\s+(what is|what's)\b/im,
  /^#\s+the (ultimate|complete|essential) guide\b/im,
  /^#\s+a comprehensive guide\b/im,
  /^#\s+everything you need to know\b/im,
  /^#\s+(de|het) (ultieme|complete|definitieve) gids\b/im,
  /^#\s+wat is (.+)\?/im,
  /^#\s+alles wat je moet weten\b/im,
];

// Corporate-boilerplate-PR fingerprints
const GENERIC_PR_FINGERPRINTS = [
  /\bis pleased to announce\b/i,
  /\bcutting-edge\b/i,
  /\bmet trots\b/i,
  /\binnovatieve oplossing\b/i,
  /\bkondigt vandaag\b/i,
];

function countMatches(text: string, patterns: RegExp[]): number {
  let n = 0;
  for (const p of patterns) if (p.test(text)) n++;
  return n;
}

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

  // Long-form needs more headroom + slightly longer timeout
  const result = await dispatchTextCompletion({
    resolvedModel: { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
    systemPrompt: SYSTEM_BASE,
    userPrompt,
    maxTokens: 1500,
    temperature: 0.7,
  });
  return result.content ?? '';
}

const testCases: TweakTestCase[] = [
  {
    name: 'blog-post — descriptive vs. argumentative thesis',
    contentType: 'blog-post',
    briefingTask: 'Schrijf een blogpost (max 600 woorden) over hoe B2B-merken brand-consistency moeten benaderen. Output moet een H1 + lead-paragraph (eerste 100 woorden) + 2-3 body-paragrafen bevatten.',
    withoutInputs: {
      seoKeyword: 'brand consistency B2B',
    },
    withInputs: {
      seoKeyword: 'brand consistency B2B',
      uniqueAngle: 'Most positioning frameworks fail because they treat positioning as creative rather than operational — but operational positioning needs a measurement layer most brand-teams skip.',
      evidencePieces: 'Reichheld churn data 2024 — brands met inconsistente voice 2.3x hogere churn\nPatagonia case — Worn Wear consistency over 30+ jaar\nBetter Brands eigen benchmark (n=200 B2B) — voice-fidelity boven 80% correleert met +24% conversie',
      counterClaim: 'Brand consistency is een creatieve uitdaging die je oplost door betere brand-guides te schrijven.',
    },
    fingerprints: GENERIC_BLOG_H1_FINGERPRINTS,
    expectMentions: ['operationeel', 'churn'],
  },
  {
    name: 'case-study — boilerplate vs. pivot-driven story',
    contentType: 'case-study',
    briefingTask: 'Schrijf een case-study (max 500 woorden) over een klant die brand-consistency heeft geïmplementeerd. Output moet H1 + lead-paragraph + body bevatten.',
    withoutInputs: {
      customerName: 'Napking',
      challengeDescription: 'Marketingteam van 8 mensen produceerde inconsistente content over 5 kanalen.',
      keyMetrics: '+40% voice-fidelity in 8 weken, 60% minder review-rondes',
    },
    withInputs: {
      customerName: 'Napking',
      challengeDescription: 'Marketingteam van 8 mensen produceerde inconsistente content over 5 kanalen.',
      keyMetrics: '+40% voice-fidelity in 8 weken, 60% minder review-rondes',
      whyNowAngle: 'Met EU AI Act van kracht per Q1 2026 moeten brand-teams hun AI-content audit-trail kunnen bewijzen — Napking liep 6 maanden voor.',
      pivotMoment: 'het moment waarop de Brand Lead besloot om de creative agency niet te vervangen maar de brand-voice operationeel te maken',
      industryContext: 'in een markt waar 80% van AI-tools nog Engelse output teruggeven',
      solutionPhases: 'Discovery + voice-audit (week 1-2)\nVoice-baseline definitie + agreement (week 3)\nTeam rollout met dagelijkse review (week 4-6)\nMeting + iteratie (week 7-8)',
    },
    fingerprints: GENERIC_PR_FINGERPRINTS,
    expectMentions: ['pivot', 'EU AI Act', 'operationeel'],
  },
];

async function runCase(tc: TweakTestCase): Promise<void> {
  console.log(`\n## ${tc.name}\n`);

  console.log('  Generating WITHOUT authority/narrative fields...');
  const withoutOutput = await generateForCase(tc, tc.withoutInputs);
  console.log(`    Output (first 400 chars): ${withoutOutput.slice(0, 400).replace(/\n/g, ' ')}…`);
  const withoutFingerprintCount = countMatches(withoutOutput, tc.fingerprints);
  console.log(`    Generic fingerprints matched: ${withoutFingerprintCount}/${tc.fingerprints.length}`);

  console.log('\n  Generating WITH authority/narrative fields...');
  const withOutput = await generateForCase(tc, tc.withInputs);
  console.log(`    Output (first 400 chars): ${withOutput.slice(0, 400).replace(/\n/g, ' ')}…`);
  const withFingerprintCount = countMatches(withOutput, tc.fingerprints);
  console.log(`    Generic fingerprints matched: ${withFingerprintCount}/${tc.fingerprints.length}`);

  assert(
    'WITH-output has ≤ generic fingerprints than WITHOUT',
    withFingerprintCount <= withoutFingerprintCount,
    `with=${withFingerprintCount} without=${withoutFingerprintCount}`,
  );
  assert(
    'WITH-output has 0 generic fingerprints',
    withFingerprintCount === 0,
    `still matched: ${tc.fingerprints.filter((p) => p.test(withOutput)).map((p) => p.source).join(', ')}`,
  );

  if (tc.expectMentions) {
    for (const mention of tc.expectMentions) {
      // Soft because long-form has more variance and AI may paraphrase
      softCheck(
        `WITH-output mentions "${mention}" (thesis / pivot integration)`,
        withOutput.toLowerCase().includes(mention.toLowerCase()),
      );
    }
  }
}

(async () => {
  console.log('=== longform-tweaks smoke-test ===');
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

/**
 * scripts/fidelity/test-demo-full-flow.ts
 *
 * Comprehensive end-to-end demo flow validation. Simuleert de volledige
 * pilot-demo pipeline tegen real DB:
 *
 *   1. Branddock baseline scoring (BB-A research output, bekend AI_LEANING)
 *   2. STRICT mode rewrite + re-scoring
 *   3. Vanille GPT-4o generation + symmetric scoring
 *   4. Side-by-side comparison + demo claim verification
 *   5. Markdown report met cijfers voor de pilot
 *
 * Run:
 *   npx tsx scripts/fidelity/test-demo-full-flow.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

// ─── Env loading ────────────────────────────

const envPath = resolve(process.cwd(), '.env.local');
try {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!value.startsWith('"') && !value.startsWith("'")) {
      const hashIdx = value.indexOf('#');
      if (hashIdx !== -1) value = value.slice(0, hashIdx).trim();
    }
    if (value) process.env[key] = value;
  }
} catch (err) {
  console.warn(`(could not read ${envPath}: ${(err as Error).message})`);
}

const WORKSPACE_ID = 'cmnomsobx009q44msn0gpw7vb'; // Better brands

const TEST_BRIEF = {
  objective:
    'Differentiëren van purpose-washers via operationeel bewijs; brand managers overtuigen dat purpose alleen werkt met meetbare cases en data.',
  keyMessage:
    'Purpose zonder bewijs is greenwashing. Branddock helpt merken hun strategie operationeel te maken met merkbare resultaten.',
  toneDirection: 'Strategisch maar menselijk. Confident zonder arrogant. Visionair maar niet onpraktisch.',
  callToAction: 'Plan een gesprek over hoe Branddock jouw merkstrategie operationeel maakt.',
  contentOutline: [
    'Probleem: purpose statements zonder bewijs',
    'Onze methode: 3-laags operationeel bewijs',
    'Case: hoe één klant doorbrak',
    'Wat dit betekent voor jouw merk',
  ],
};

interface ScoreResult {
  composite: number;
  detectorVerdict: string;
  position: number;
  pillars: { style: number | null; judge: number | null; rules: number };
  wordCount: number;
  thresholdMet: boolean;
}

function summarizeScore(prefix: string, s: ScoreResult): void {
  console.log(`\n  ${prefix}`);
  console.log(`    Composite:           ${s.composite}/100  ${s.thresholdMet ? '(boven drempel)' : '(onder drempel)'}`);
  console.log(`    Detector verdict:    ${s.detectorVerdict} (pos ${s.position}/100)`);
  console.log(`    Word count:          ${s.wordCount}`);
  console.log('    Per-pijler:');
  console.log(`      Pijler 1 (style)  ${s.pillars.style ?? 'n.v.t.'}`);
  console.log(`      Pijler 2 (judge)  ${s.pillars.judge ?? 'skipped'}`);
  console.log(`      Pijler 3 (rules)  ${s.pillars.rules}`);
}

async function main() {
  const { computeFidelityScore } = await import('../../src/lib/brand-fidelity/composition-engine');
  const { generateVanillaBaseline } = await import('../../src/lib/brand-fidelity/vanilla-baseline');
  const { runStrictModeRewrite } = await import('../../src/lib/brand-fidelity/strict-mode');
  const { prisma } = await import('../../src/lib/prisma');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('F-VAL Demo Full Flow Validation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // ── Stap 0: BrandPersonality fetchen voor symmetric scoring ──
  console.log('\n→ Stap 0: BrandPersonality voor Better Brands ophalen…');
  const bp = await prisma.brandAsset.findFirst({
    where: { workspaceId: WORKSPACE_ID, frameworkType: 'BRAND_PERSONALITY' },
    select: { frameworkData: true },
  });
  const bpData = (bp?.frameworkData ?? null) as Record<string, unknown> | null;
  const personality = bpData
    ? {
        wordsWeUse: Array.isArray(bpData.wordsWeUse)
          ? (bpData.wordsWeUse as unknown[]).filter((w): w is string => typeof w === 'string')
          : [],
        personalityTraits: Array.isArray(bpData.personalityTraits)
          ? (bpData.personalityTraits as Array<Record<string, unknown>>).map((t) => ({
              name: typeof t.name === 'string' ? t.name : undefined,
              description: typeof t.description === 'string' ? t.description : undefined,
            }))
          : [],
      }
    : null;
  console.log(`✓ ${personality?.wordsWeUse.length ?? 0} wordsWeUse, ${personality?.personalityTraits.length ?? 0} traits`);

  // Shared scoring parameters across all 3 outputs (apples-to-apples)
  const sharedScoring = {
    workspaceId: WORKSPACE_ID,
    brandName: 'Better Brands',
    brandVoiceSummary:
      'Strategisch maar menselijk. Confident zonder arrogant. Visionair maar niet onpraktisch. Anti-greenwashing.',
    personality,
    generatorProvider: 'anthropic' as const,
    targetWordCount: 3000,
  };

  // ── Stap 1: Branddock baseline (BB-A research output) ──
  console.log('\n━━━ Stap 1: Branddock baseline (BB-A Opus + BVD + HVD) ━━━');
  const branddockText = readFileSync(
    join(process.cwd(), 'research', 'fidelity-week1', 'outputs', 'better-brands-case-study-A.md'),
    'utf8',
  );
  const branddockScore = await computeFidelityScore({ ...sharedScoring, contentText: branddockText });
  const branddockResult: ScoreResult = {
    composite: branddockScore.compositeScore,
    detectorVerdict: branddockScore.detectorVerdict,
    position: branddockScore.humanBaselinePosition,
    pillars: {
      style: branddockScore.pillars.style.weight > 0 ? branddockScore.pillars.style.score : null,
      judge: branddockScore.pillars.judge?.score ?? null,
      rules: branddockScore.pillars.rules.score,
    },
    wordCount: branddockScore.wordCount,
    thresholdMet: branddockScore.thresholdMet,
  };
  summarizeScore('Branddock + BVD + HVD', branddockResult);

  // ── Stap 2: STRICT mode rewrite ──
  console.log('\n━━━ Stap 2: STRICT mode rewrite + re-score ━━━');
  if (branddockResult.detectorVerdict !== 'AI_LEANING' && branddockResult.detectorVerdict !== 'PURE_AI') {
    console.log(`  STRICT NIET getriggerd (verdict ${branddockResult.detectorVerdict}) — skip`);
  } else {
    console.log('  Triggering STRICT rewrite (Anthropic Sonnet)…');
    const tStrict = Date.now();

    const strictOutcome = await runStrictModeRewrite(branddockText, async ({ feedbackPrompt }) => {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' });
      const stream = client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system:
          'You are a senior Dutch-language content editor. Rewrite to eliminate AI patterns while preserving structure, factual content, and approximate length. Output only the revised content, no preamble or commentary.',
        messages: [{ role: 'user', content: feedbackPrompt }],
      });
      const finalMessage = await stream.finalMessage();
      const block = finalMessage.content.find((b) => b.type === 'text');
      return block && 'text' in block ? block.text.trim() : '';
    });

    console.log(`  STRICT rewrite in ${((Date.now() - tStrict) / 1000).toFixed(0)}s`);
    console.log(`  Decision: ${strictOutcome.decisionReason}`);

    if (strictOutcome.rewriteAttempted && strictOutcome.finalText !== branddockText) {
      const strictScore = await computeFidelityScore({ ...sharedScoring, contentText: strictOutcome.finalText });
      const strictResult: ScoreResult = {
        composite: strictScore.compositeScore,
        detectorVerdict: strictScore.detectorVerdict,
        position: strictScore.humanBaselinePosition,
        pillars: {
          style: strictScore.pillars.style.weight > 0 ? strictScore.pillars.style.score : null,
          judge: strictScore.pillars.judge?.score ?? null,
          rules: strictScore.pillars.rules.score,
        },
        wordCount: strictScore.wordCount,
        thresholdMet: strictScore.thresholdMet,
      };
      summarizeScore('Branddock + STRICT', strictResult);

      // ── Stap 3: Vanille comparison ──
      console.log('\n━━━ Stap 3: Vanille GPT-4o (zonder Branddock context) ━━━');
      console.log('  Generating…');
      const vanilla = await generateVanillaBaseline({
        contentTypeId: 'blog-post',
        objective: TEST_BRIEF.objective,
        keyMessage: TEST_BRIEF.keyMessage,
        toneDirection: TEST_BRIEF.toneDirection,
        callToAction: TEST_BRIEF.callToAction,
        contentOutline: TEST_BRIEF.contentOutline,
      });
      console.log(`  Generated ${vanilla.wordCount} woorden in ${(vanilla.generationMs / 1000).toFixed(0)}s`);

      const vanillaScore = await computeFidelityScore({
        ...sharedScoring,
        contentText: vanilla.text,
        targetWordCount: vanilla.wordCount, // length-control uit
      });
      const vanillaResult: ScoreResult = {
        composite: vanillaScore.compositeScore,
        detectorVerdict: vanillaScore.detectorVerdict,
        position: vanillaScore.humanBaselinePosition,
        pillars: {
          style: vanillaScore.pillars.style.weight > 0 ? vanillaScore.pillars.style.score : null,
          judge: vanillaScore.pillars.judge?.score ?? null,
          rules: vanillaScore.pillars.rules.score,
        },
        wordCount: vanillaScore.wordCount,
        thresholdMet: vanillaScore.thresholdMet,
      };
      summarizeScore('Vanille GPT-4o', vanillaResult);

      // ── Stap 4: Comparison report ──
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Demo Claim Verificatie');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('Output                        Composite   Verdict          Position   P1   P2   P3');
      const fmt = (label: string, r: ScoreResult) =>
        `${label.padEnd(28)}  ${String(r.composite).padStart(9)}   ${r.detectorVerdict.padEnd(15)}    ${String(r.position).padStart(7)}   ${String(r.pillars.style ?? '-').padStart(2)}   ${String(r.pillars.judge ?? '-').padStart(2)}   ${String(r.pillars.rules).padStart(2)}`;
      console.log(fmt('Branddock + BVD + HVD', branddockResult));
      console.log(fmt('Branddock + STRICT', strictResult));
      console.log(fmt('Vanille GPT-4o', vanillaResult));

      const deltaStrictVsVanilla = strictResult.composite - vanillaResult.composite;
      const deltaBaselineVsVanilla = branddockResult.composite - vanillaResult.composite;
      const strictLift = strictResult.composite - branddockResult.composite;

      console.log('');
      console.log('Demo deltas:');
      console.log(`  Branddock+STRICT vs vanille  = ${deltaStrictVsVanilla >= 0 ? '+' : ''}${deltaStrictVsVanilla} punten`);
      console.log(`  Branddock baseline vs vanille = ${deltaBaselineVsVanilla >= 0 ? '+' : ''}${deltaBaselineVsVanilla} punten`);
      console.log(`  STRICT lift over baseline     = ${strictLift >= 0 ? '+' : ''}${strictLift} punten`);

      const claimVerdict =
        deltaStrictVsVanilla >= 25 && deltaBaselineVsVanilla >= 15
          ? '✓ DEMO CLAIM SOLID — gap >= research baseline'
          : deltaBaselineVsVanilla >= 5
          ? '△ DEMO CLAIM HOLDS — kleinere marge dan research baseline maar zichtbaar verschil'
          : '✗ DEMO CLAIM AT RISK — vanille te dichtbij Branddock';
      console.log(`\n${claimVerdict}`);

      // ── Save report ──
      const reportPath = join(
        process.cwd(),
        'research',
        'fidelity-week1',
        'reports',
        'demo-full-flow-validation.md',
      );
      mkdirSync(join(process.cwd(), 'research', 'fidelity-week1', 'reports'), { recursive: true });
      writeFileSync(
        reportPath,
        [
          `# F-VAL Demo Full Flow Validation`,
          `Datum: ${new Date().toISOString().slice(0, 10)}`,
          ``,
          `## Setup`,
          `- Workspace: Better Brands`,
          `- Brief: ${TEST_BRIEF.objective.slice(0, 100)}…`,
          `- Branddock baseline: BB-A research output (Opus + BVD + HVD, 2930 woorden)`,
          `- Symmetric scoring: alle outputs tegen workspace BrandPersonality`,
          ``,
          `## Resultaten`,
          ``,
          `| Output | Composite | Verdict | Pos | P1 | P2 | P3 | Word ct |`,
          `|---|---|---|---|---|---|---|---|`,
          `| Branddock + BVD + HVD | ${branddockResult.composite} | ${branddockResult.detectorVerdict} | ${branddockResult.position} | ${branddockResult.pillars.style ?? '-'} | ${branddockResult.pillars.judge ?? '-'} | ${branddockResult.pillars.rules} | ${branddockResult.wordCount} |`,
          `| Branddock + STRICT | ${strictResult.composite} | ${strictResult.detectorVerdict} | ${strictResult.position} | ${strictResult.pillars.style ?? '-'} | ${strictResult.pillars.judge ?? '-'} | ${strictResult.pillars.rules} | ${strictResult.wordCount} |`,
          `| Vanille GPT-4o | ${vanillaResult.composite} | ${vanillaResult.detectorVerdict} | ${vanillaResult.position} | ${vanillaResult.pillars.style ?? '-'} | ${vanillaResult.pillars.judge ?? '-'} | ${vanillaResult.pillars.rules} | ${vanillaResult.wordCount} |`,
          ``,
          `## Demo deltas`,
          `- **Branddock+STRICT vs vanille: ${deltaStrictVsVanilla >= 0 ? '+' : ''}${deltaStrictVsVanilla} punten**`,
          `- Branddock baseline vs vanille: ${deltaBaselineVsVanilla >= 0 ? '+' : ''}${deltaBaselineVsVanilla} punten`,
          `- STRICT lift over baseline: ${strictLift >= 0 ? '+' : ''}${strictLift} punten`,
          ``,
          `## Verdict`,
          claimVerdict,
        ].join('\n'),
        'utf8',
      );
      console.log(`\n✓ Report: ${reportPath}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  const { prisma } = await import('../../src/lib/prisma');
  await prisma.$disconnect();
  process.exit(1);
});

/**
 * scripts/fidelity/test-vanilla-comparison.ts
 *
 * End-to-end test van de "Vergelijk met vanille AI" demo flow:
 *  1. Set brief.objective op een Better Brands blog-post deliverable
 *  2. Run vanilla baseline (GPT-4o, geen Branddock context)
 *  3. Score via composition engine met personality:null
 *  4. Compare met bekende BB-A research baseline (composite 65)
 *  5. Print delta + draw conclusions
 *
 * Run:
 *   npx tsx scripts/fidelity/test-vanilla-comparison.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

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
const DELIVERABLE_ID = 'cmotr9lxf00702vc99ygat4he'; // "Blog Post" in BB

// Brief mirroring the original research brief so we can compare apples-to-apples
// with the known BB-A baseline (composite 65).
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

async function main() {
  const { generateVanillaBaseline } = await import('../../src/lib/brand-fidelity/vanilla-baseline');
  const { computeFidelityScore } = await import('../../src/lib/brand-fidelity/composition-engine');
  const { prisma } = await import('../../src/lib/prisma');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test: Vanille comparison flow against Better Brands');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // ── Stap 1: brief.objective + rest setten ──
  console.log('\n→ Stap 1: brief setten op BB Blog Post deliverable…');
  const existing = await prisma.deliverable.findUnique({
    where: { id: DELIVERABLE_ID },
    select: { settings: true, contentType: true, title: true },
  });
  if (!existing) {
    console.error(`✗ Deliverable ${DELIVERABLE_ID} niet gevonden`);
    process.exit(1);
  }
  const currentSettings = (existing.settings as Record<string, unknown> | null) ?? {};

  await prisma.deliverable.update({
    where: { id: DELIVERABLE_ID },
    data: { settings: { ...currentSettings, brief: TEST_BRIEF } },
  });
  console.log(`✓ Brief ingesteld op "${existing.title}" (${existing.contentType})`);
  console.log(`  Objective: ${TEST_BRIEF.objective.slice(0, 80)}…`);

  // ── Stap 2: Vanille baseline genereren ──
  console.log('\n→ Stap 2: GPT-4o vanille baseline genereren (zonder Branddock context)…');
  const t0 = Date.now();
  const vanilla = await generateVanillaBaseline({
    contentTypeId: existing.contentType,
    objective: TEST_BRIEF.objective,
    keyMessage: TEST_BRIEF.keyMessage,
    toneDirection: TEST_BRIEF.toneDirection,
    callToAction: TEST_BRIEF.callToAction,
    contentOutline: TEST_BRIEF.contentOutline,
  });
  const genMs = Date.now() - t0;
  console.log(`✓ Vanille baseline gegenereerd in ${(genMs / 1000).toFixed(1)}s`);
  console.log(`  Model:      ${vanilla.model}`);
  console.log(`  Word count: ${vanilla.wordCount}`);
  console.log(`  Preview:    ${vanilla.text.slice(0, 200).replace(/\n/g, ' ')}…`);

  // ── Stap 3: Score via composition engine ──
  // Symmetric scoring: tegen de workspace's BrandPersonality (zelfde
  // standaard als Branddock-side) — vanille mist de declared signals
  // dus pijler 1 score zakt → demo signaal wordt zichtbaar.
  console.log('\n→ Stap 3: Vanille output scoren tegen BB BrandPersonality…');
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
  console.log(`  Brand personality: ${personality ? `${personality.wordsWeUse.length}w / ${personality.personalityTraits.length}t` : 'none'}`);

  const tScore = Date.now();
  const score = await computeFidelityScore({
    contentText: vanilla.text,
    workspaceId: WORKSPACE_ID,
    brandName: 'Better Brands',
    brandVoiceSummary: 'No brand voice specified — generic content writer.',
    personality,
    generatorProvider: 'openai',
    targetWordCount: vanilla.wordCount,
  });
  const scoreMs = Date.now() - tScore;
  console.log(`✓ Composition score in ${(scoreMs / 1000).toFixed(1)}s`);
  console.log(`  Composite:        ${score.compositeScore}/100`);
  console.log(`  Threshold met:    ${score.thresholdMet ? 'YES' : 'NO'} (drempel ${score.compositeThreshold})`);
  console.log(`  Detector verdict: ${score.detectorVerdict} (pos ${score.humanBaselinePosition}/100)`);
  console.log('  Per-pijler:');
  console.log(`    Pijler 1 (style)  ${score.pillars.style.weight > 0 ? score.pillars.style.score : 'n.v.t.'} (weight ${score.pillars.style.weight.toFixed(2)})`);
  console.log(`    Pijler 2 (judge)  ${score.pillars.judge?.score ?? 'skipped'} (weight ${score.pillars.judge?.weight.toFixed(2) ?? 0})`);
  console.log(`    Pijler 3 (rules)  ${score.pillars.rules.score} (weight ${score.pillars.rules.weight.toFixed(2)})`);

  // ── Stap 4: Vergelijk met bekende BB-A baseline ──
  // Uit eerdere offline test: BB-A baseline (Opus + BVD) = composite 65, AI_LEANING pos 35
  // BB-A + STRICT = composite 75, TOP_TIER pos 8
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Vergelijking met bekende Branddock baselines');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Output                                    Composite  Verdict          Position');
  console.log('Branddock + STRICT (BB-A research)             75    TOP_TIER             8');
  console.log('Branddock + BVD + HVD (BB-A research)          65    AI_LEANING          35');
  console.log(`Vanille GPT-4o (deze test)                     ${String(score.compositeScore).padStart(2)}    ${score.detectorVerdict.padEnd(15)}     ${String(score.humanBaselinePosition).padStart(2)}`);
  console.log('');

  const deltaToStrict = 75 - score.compositeScore;
  const deltaToBaseline = 65 - score.compositeScore;
  console.log(`Demo-claim deltas:`);
  console.log(`  Branddock+STRICT vs vanille  = +${deltaToStrict} punten`);
  console.log(`  Branddock baseline vs vanille = +${deltaToBaseline} punten`);

  if (deltaToStrict >= 25 && deltaToBaseline >= 15) {
    console.log(`\n✓ Demo claim gevalideerd: Branddock-output meetbaar trouwer dan vanille AI`);
  } else if (deltaToBaseline > 0) {
    console.log(`\n△ Demo claim staat overeind, maar marge kleiner dan bij research baseline`);
  } else {
    console.log(`\n✗ DEMO CLAIM AT RISK — vanille scoorde hoger of gelijk aan Branddock`);
  }

  // ── Stap 5: Save report voor reference ──
  const reportPath = resolve(process.cwd(), 'research', 'fidelity-week1', 'reports', 'vanilla-comparison-test.md');
  const { writeFileSync, mkdirSync } = await import('fs');
  mkdirSync(resolve(process.cwd(), 'research', 'fidelity-week1', 'reports'), { recursive: true });
  writeFileSync(
    reportPath,
    [
      `# Vanille Comparison Test — ${new Date().toISOString().slice(0, 10)}`,
      ``,
      `## Test setup`,
      `- Workspace: Better brands (\`${WORKSPACE_ID}\`)`,
      `- Deliverable: ${existing.title} (\`${DELIVERABLE_ID}\`)`,
      `- Brief: ${TEST_BRIEF.objective}`,
      ``,
      `## Vanille GPT-4o resultaat`,
      `- Composite: ${score.compositeScore}/100`,
      `- Threshold met: ${score.thresholdMet ? 'YES' : 'NO'}`,
      `- Detector verdict: ${score.detectorVerdict} (pos ${score.humanBaselinePosition}/100)`,
      `- Word count: ${vanilla.wordCount}`,
      `- Generation time: ${(genMs / 1000).toFixed(1)}s`,
      `- Score time: ${(scoreMs / 1000).toFixed(1)}s`,
      ``,
      `## Demo claim`,
      `| Output | Composite | Delta vs vanille |`,
      `|---|---|---|`,
      `| Branddock + STRICT | 75 | +${deltaToStrict} |`,
      `| Branddock baseline | 65 | +${deltaToBaseline} |`,
      `| Vanille GPT-4o | ${score.compositeScore} | — |`,
      ``,
      `## Sample output (eerste 500 chars)`,
      ``,
      '```',
      vanilla.text.slice(0, 500),
      '```',
    ].join('\n'),
    'utf8',
  );
  console.log(`\n✓ Report saved: ${reportPath}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  const { prisma } = await import('../../src/lib/prisma');
  await prisma.$disconnect();
  process.exit(1);
});

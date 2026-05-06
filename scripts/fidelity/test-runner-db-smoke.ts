/**
 * scripts/fidelity/test-runner-db-smoke.ts
 *
 * End-to-end DB smoke-test van fidelity-runner — wat de canvas-orchestrator
 * doet, maar zonder HTTP/SSE laag. Verifieert:
 *
 *   - BrandPersonality fetcher tegen echte BrandAsset row
 *   - getOrCreateFidelityConfig in real DB
 *   - BrandRule lookup (waarschijnlijk leeg → ruleScore 100)
 *   - Persistence naar Deliverable.settings.fidelityScore
 *
 * Gebruikt BB-A Opus content (~74 composite verwacht uit eerdere test) tegen
 * de demo workspace die BrandPersonality + Branddock Demo data bevat.
 *
 * Run:
 *   npx tsx scripts/fidelity/test-runner-db-smoke.ts
 */

import { readFileSync } from 'fs';
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

const WORKSPACE_ID = 'demo-workspace-branddock-001';
// Deliverable met bijbehorende ContentVersion (versionNumber 3) zodat de
// opt-in dual-write naar ContentFidelityScore daadwerkelijk activeert.
const DELIVERABLE_ID = 'cmn8u20q000b1nimshyjcxczn'; // "AI Trends in Brand Strategy"

async function main() {
  const { runFidelityScoring, buildFidelityScoreEventPayload } = await import(
    '../../src/lib/brand-fidelity/fidelity-runner'
  );
  const { prisma } = await import('../../src/lib/prisma');
  const { PATHS } = await import('./config');

  console.log('→ DB smoke test: runFidelityScoring against real workspace\n');

  // 1. Verify workspace + BrandPersonality fixture exists
  const bp = await prisma.brandAsset.findFirst({
    where: { workspaceId: WORKSPACE_ID, frameworkType: 'BRAND_PERSONALITY' },
    select: { id: true, frameworkData: true },
  });
  if (!bp) {
    console.error(`✗ No BRAND_PERSONALITY asset found for workspace ${WORKSPACE_ID}`);
    process.exit(1);
  }
  const bpData = bp.frameworkData as Record<string, unknown> | null;
  console.log(`✓ BrandPersonality found (${bp.id})`);
  console.log(`  wordsWeUse: ${Array.isArray(bpData?.wordsWeUse) ? `${(bpData.wordsWeUse as unknown[]).length} declared` : 'none'}`);
  console.log(`  personalityTraits: ${Array.isArray(bpData?.personalityTraits) ? `${(bpData.personalityTraits as unknown[]).length} declared` : 'none'}`);

  // 2. Verify deliverable exists
  const deliverable = await prisma.deliverable.findUnique({
    where: { id: DELIVERABLE_ID },
    select: { id: true, title: true, contentType: true, settings: true, campaign: { select: { workspaceId: true } } },
  });
  if (!deliverable) {
    console.error(`✗ Deliverable ${DELIVERABLE_ID} not found`);
    process.exit(1);
  }
  console.log(`✓ Deliverable found: "${deliverable.title}" (${deliverable.contentType})`);

  // 3. Build a minimal CanvasContextStack — we don't need full assembly,
  //    fidelity-runner only reads brand.brandName, brand.brandPersonality (string),
  //    personas[0].serialized, brief.objective, concept.creativePlatform,
  //    deliverableTypeId.
  const contentText = readFileSync(
    join(PATHS.outputs, 'better-brands-case-study-A-STRICT.md'),
    'utf8',
  );
  console.log(`\n→ Test content: BB-A STRICT (${contentText.split(/\s+/).filter(Boolean).length} woorden)`);

  const stub = {
    brand: {
      brandName: 'Branddock Demo',
      brandPersonality:
        'Strategisch maar menselijk. Confident zonder arrogant. Visionair maar niet onpraktisch.',
      brandToneOfVoice: 'Professional, warm, direct',
    },
    concept: null,
    journeyPhase: null,
    medium: null,
    deliverableTypeId: deliverable.contentType,
    personas: [],
    brief: {
      objective: 'Differentiate from purpose-washers via operational proof',
      keyMessage: null,
      toneDirection: null,
      callToAction: null,
      contentOutline: [],
    },
    products: [],
  };

  // 4. Call runFidelityScoring
  console.log('\n→ Calling runFidelityScoring...\n');
  const t0 = Date.now();
  const outcome = await runFidelityScoring({
    workspaceId: WORKSPACE_ID,
    deliverableId: DELIVERABLE_ID,
    contentTypeId: deliverable.contentType,
    contentText,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stack: stub as any,
    generatorProvider: 'anthropic',
  });
  const elapsed = Date.now() - t0;

  if (!outcome) {
    console.error('✗ runFidelityScoring returned null — check logs above for cause');
    process.exit(1);
  }
  const result = outcome.result;

  console.log(`✓ Composition score computed in ${(elapsed / 1000).toFixed(1)}s`);
  console.log(`  Composite:           ${result.compositeScore}/100  ${result.thresholdMet ? '(above threshold)' : '(below threshold)'}`);
  console.log(`  Detector verdict:    ${result.detectorVerdict} (pos ${result.humanBaselinePosition}/100)`);
  console.log(`  Pillar 1 (style):    ${result.pillars.style.score}  (weight ${result.pillars.style.weight.toFixed(2)})`);
  if (result.pillars.judge) {
    console.log(
      `  Pillar 2 (judge):    ${result.pillars.judge.score}  (weight ${result.pillars.judge.weight.toFixed(2)}, ${result.pillars.judge.result.judgeProvider}/${result.pillars.judge.result.judgeModel})`,
    );
  }
  console.log(`  Pillar 3 (rules):    ${result.pillars.rules.score}  (weight ${result.pillars.rules.weight.toFixed(2)}; detector ${result.pillars.rules.result.detectorScore}, rules ${result.pillars.rules.result.rules.ruleScore})`);

  // Wait briefly for the async persistence side-effect
  await new Promise((r) => setTimeout(r, 1500));

  // 5. Verify persistence
  console.log('\n→ Verifying persistence to Deliverable.settings.fidelityScore...');
  const after = await prisma.deliverable.findUnique({
    where: { id: DELIVERABLE_ID },
    select: { settings: true },
  });
  const settings = after?.settings as Record<string, unknown> | null;
  const persisted = settings?.fidelityScore as Record<string, unknown> | undefined;

  if (!persisted) {
    console.error('✗ Deliverable.settings.fidelityScore is empty — persistence failed');
    process.exit(1);
  }

  console.log(`✓ Persistence verified — Deliverable.settings.fidelityScore present`);
  console.log(`  composite:        ${persisted.compositeScore}`);
  console.log(`  scoredAt:         ${persisted.scoredAt}`);
  console.log(`  scorerVersion:    ${persisted.scorerVersion}`);

  // 6. Verify SSE event payload shape
  console.log('\n→ SSE event payload shape (fidelity_score_complete):');
  console.log(JSON.stringify(buildFidelityScoreEventPayload(result), null, 2));

  // 7. Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Smoke-test summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✓ BrandPersonality fetcher works against real BrandAsset`);
  console.log(`✓ FidelityConfig get-or-create works`);
  console.log(`✓ BrandRule compiler runs (${result.pillars.rules.result.rules.rulesEvaluated} rules evaluated)`);
  console.log(`✓ Composition engine computes composite ${result.compositeScore}/100`);
  console.log(`✓ Persistence writes to Deliverable.settings.fidelityScore`);
  console.log(`✓ SSE event payload buildable from result`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  const { prisma } = await import('../../src/lib/prisma');
  await prisma.$disconnect();
  process.exit(1);
});

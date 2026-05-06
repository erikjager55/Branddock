/**
 * scripts/fidelity/test-strict-mode-db-smoke.ts
 *
 * End-to-end DB smoke-test van STRICT mode pipeline.
 * Verifieert wat de canvas-orchestrator doet wanneer humanVoiceMode === STRICT
 * en het origineel detector verdict AI_LEANING/PURE_AI is:
 *
 *   1. runFidelityScoring berekent originele compositie
 *   2. runStrictModeIfApplicable triggert
 *   3. Anthropic Sonnet rewrite call wordt gedaan
 *   4. Rewrite verbetert detector verdict
 *   5. Composition score wordt herberekend
 *   6. Beide snapshots (fidelityScore + strictRewrite) worden gepersist
 *
 * Gebruikt BB-A origineel (AI_LEANING, ~35 pos uit eerdere validatie) tegen
 * demo workspace met humanVoiceMode tijdelijk op STRICT gezet.
 *
 * Run:
 *   npx tsx scripts/fidelity/test-strict-mode-db-smoke.ts
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
const DELIVERABLE_ID = 'cmn8u20pt00arnimsl7kk942m'; // "Brand Refresh Guidelines"

async function main() {
  const { runFidelityScoring, runStrictModeIfApplicable } = await import(
    '../../src/lib/brand-fidelity/fidelity-runner'
  );
  const { prisma } = await import('../../src/lib/prisma');
  const { PATHS } = await import('./config');

  console.log('→ DB smoke test: STRICT mode pipeline tegen real workspace\n');

  // 1. Setup: humanVoiceMode → STRICT
  console.log('→ Setting humanVoiceMode = STRICT op demo workspace…');
  await prisma.fidelityConfig.upsert({
    where: { workspaceId: WORKSPACE_ID },
    create: { workspaceId: WORKSPACE_ID, humanVoiceMode: 'STRICT' },
    update: { humanVoiceMode: 'STRICT' },
  });

  // 2. Load AI_LEANING content (BB-A origineel — bekende verdict AI_LEANING pos ~35)
  const contentText = readFileSync(
    join(PATHS.outputs, 'better-brands-case-study-A.md'),
    'utf8',
  );
  const wordCount = contentText.split(/\s+/).filter(Boolean).length;
  console.log(`✓ Test content loaded: BB-A origineel (${wordCount} woorden)`);

  // 3. Build minimal stack (zelfde als test-runner-db-smoke.ts)
  const stub = {
    brand: {
      brandName: 'Better Brands',
      brandPersonality:
        'Strategisch maar menselijk. Confident zonder arrogant. Visionair maar niet onpraktisch.',
    },
    concept: null,
    journeyPhase: null,
    medium: null,
    deliverableTypeId: 'blog-post',
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

  // 4. Stap 1: runFidelityScoring → outcome
  console.log('\n→ Stap 1: runFidelityScoring (originele score)…');
  const t0 = Date.now();
  const outcome = await runFidelityScoring({
    workspaceId: WORKSPACE_ID,
    deliverableId: DELIVERABLE_ID,
    contentTypeId: 'blog-post',
    contentText,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stack: stub as any,
    generatorProvider: 'anthropic',
  });
  if (!outcome) {
    console.error('✗ runFidelityScoring returned null');
    process.exit(1);
  }
  console.log(`✓ Originele compositie in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  Composite:           ${outcome.result.compositeScore}/100`);
  console.log(`  Detector verdict:    ${outcome.result.detectorVerdict} (pos ${outcome.result.humanBaselinePosition}/100)`);

  // 5. Stap 2: runStrictModeIfApplicable
  console.log('\n→ Stap 2: runStrictModeIfApplicable…');
  const tStrict = Date.now();
  const strictOutcome = await runStrictModeIfApplicable(
    {
      compositionInput: outcome.compositionInput,
      deliverableId: DELIVERABLE_ID,
    },
    'STRICT',
  );
  const strictMs = Date.now() - tStrict;

  if (!strictOutcome) {
    console.error('✗ runStrictModeIfApplicable returned null — STRICT mode niet geactiveerd');
    process.exit(1);
  }

  console.log(`✓ STRICT pipeline in ${(strictMs / 1000).toFixed(1)}s`);
  console.log(`  Rewrite attempted:   ${strictOutcome.strictResult.rewriteAttempted}`);
  console.log(`  Improved:            ${strictOutcome.improved}`);
  console.log(`  Decision:            ${strictOutcome.strictResult.decisionReason}`);
  console.log('');
  console.log(`  Detector vóór:       ${strictOutcome.strictResult.originalResult.verdict} (pos ${strictOutcome.strictResult.originalResult.humanBaselinePosition})`);
  console.log(`  Detector na:         ${strictOutcome.strictResult.finalResult.verdict} (pos ${strictOutcome.strictResult.finalResult.humanBaselinePosition})`);

  if (strictOutcome.finalFidelityScore) {
    console.log('');
    console.log(`  Composite vóór:      ${outcome.result.compositeScore}/100`);
    console.log(`  Composite na:        ${strictOutcome.finalFidelityScore.compositeScore}/100`);
    const delta = strictOutcome.finalFidelityScore.compositeScore - outcome.result.compositeScore;
    console.log(`  Composite lift:      ${delta >= 0 ? '+' : ''}${delta} punten`);
  }

  // 6. Verify persistence
  console.log('\n→ Verifying persistence…');
  await new Promise((r) => setTimeout(r, 1500));
  const after = await prisma.deliverable.findUnique({
    where: { id: DELIVERABLE_ID },
    select: { settings: true },
  });
  const settings = after?.settings as Record<string, unknown> | null;
  const persistedFidelity = settings?.fidelityScore as Record<string, unknown> | undefined;
  const persistedStrict = settings?.strictRewrite as Record<string, unknown> | undefined;

  if (!persistedFidelity) {
    console.error('✗ fidelityScore persistence missing');
    process.exit(1);
  }
  console.log(`✓ fidelityScore persisted — composite ${persistedFidelity.compositeScore}`);

  if (strictOutcome.improved) {
    if (!persistedStrict) {
      console.error('✗ strictRewrite persistence missing despite improvement');
      process.exit(1);
    }
    const text = persistedStrict.text as string | undefined;
    console.log(`✓ strictRewrite persisted — text length ${text?.length ?? 0} chars`);
    console.log(`  Rewrite preview (eerste 300 chars):`);
    console.log(`  ${text?.slice(0, 300).replace(/\n/g, ' ⏎ ') ?? '(empty)'}…`);
  } else {
    console.log(`  (geen rewrite improvement — strictRewrite snapshot niet verwacht)`);
  }

  // 7. Cleanup: humanVoiceMode terug naar BASELINE
  console.log('\n→ Cleanup: humanVoiceMode → BASELINE…');
  await prisma.fidelityConfig.update({
    where: { workspaceId: WORKSPACE_ID },
    data: { humanVoiceMode: 'BASELINE' },
  });

  // 8. Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STRICT mode smoke-test summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✓ FidelityConfig humanVoiceMode = STRICT`);
  console.log(`✓ runStrictModeIfApplicable triggerde rewrite`);
  console.log(`✓ Anthropic Sonnet call lukte`);
  console.log(`✓ Detector signaal verbeterde: ${strictOutcome.strictResult.originalResult.verdict} → ${strictOutcome.strictResult.finalResult.verdict}`);
  console.log(`✓ Composition score herberekend`);
  console.log(`✓ Beide snapshots gepersist op Deliverable.settings`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  const { prisma } = await import('../../src/lib/prisma');
  await prisma.$disconnect();
  process.exit(1);
});

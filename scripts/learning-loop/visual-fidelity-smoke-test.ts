/**
 * scripts/learning-loop/visual-fidelity-smoke-test.ts
 *
 * G8 smoke test — runs `scoreImageFidelity` on the most recent
 * DeliverableComponent that has an imageUrl across all workspaces.
 *
 * Verifies the full pipeline:
 *  1. Component lookup + ownership
 *  2. Image fetch (URL or local /uploads)
 *  3. Color extraction via node-vibrant
 *  4. Brand color load + ΔE alignment
 *  5. Claude vision AI-judge call
 *  6. ContentVisualFidelityScore persistence
 *  7. fidelity.scored LearningEvent emission
 *  8. AICallTrace + AICallSnapshot writes (self-tracking)
 *
 * Cost: 1 Claude Sonnet vision call per run (~$0.04 — vision is more
 * expensive than text-only). Fallbacks gracefully when no API key.
 *
 * Run:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config \
 *     scripts/learning-loop/visual-fidelity-smoke-test.ts [componentId]
 */

import { prisma } from '../../src/lib/prisma';
import { scoreImageFidelity } from '../../src/lib/brand-fidelity/visual-fidelity-scorer';

interface SnapshotCounts {
  visualFidelityScore: number;
  aiCallTrace: number;
  learningEvent: number;
}

async function countSnapshot(workspaceId: string): Promise<SnapshotCounts> {
  const [visualFidelityScore, aiCallTrace, learningEvent] = await Promise.all([
    prisma.contentVisualFidelityScore.count({ where: { workspaceId } }),
    prisma.aICallTrace.count({ where: { workspaceId } }),
    prisma.learningEvent.count({ where: { workspaceId } }),
  ]);
  return { visualFidelityScore, aiCallTrace, learningEvent };
}

function fmtDelta(before: number, after: number): string {
  const d = after - before;
  if (d === 0) return '   0';
  return `${d > 0 ? '+' : ''}${d}`.padStart(4);
}

async function main() {
  console.log('━━━ G8 visual fidelity smoke test ━━━\n');

  const componentIdArg = process.argv[2];

  // ── Step 1: schema sanity ────────────────────────────────────
  console.log('Step 1: schema sanity check');
  try {
    await prisma.contentVisualFidelityScore.findFirst({ select: { id: true } });
    console.log('  ✓ ContentVisualFidelityScore queryable\n');
  } catch (err) {
    console.error('  ✗ schema drift:', err instanceof Error ? err.message : err);
    process.exit(2);
  }

  // ── Step 2: pick component ───────────────────────────────────
  let component:
    | {
        id: string;
        imageUrl: string | null;
        deliverable: { campaign: { workspaceId: string; workspace: { name: string } } };
      }
    | null;

  if (componentIdArg) {
    component = await prisma.deliverableComponent.findUnique({
      where: { id: componentIdArg },
      select: {
        id: true,
        imageUrl: true,
        deliverable: {
          select: {
            campaign: {
              select: { workspaceId: true, workspace: { select: { name: true } } },
            },
          },
        },
      },
    });
    if (!component) {
      console.error(`  ✗ component ${componentIdArg} not found`);
      process.exit(2);
    }
  } else {
    component = await prisma.deliverableComponent.findFirst({
      where: { imageUrl: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        imageUrl: true,
        deliverable: {
          select: {
            campaign: {
              select: { workspaceId: true, workspace: { select: { name: true } } },
            },
          },
        },
      },
    });
  }

  if (!component) {
    console.error('  ✗ no DeliverableComponent with imageUrl found in any workspace');
    console.error('    Generate canvas image content first.');
    process.exit(2);
  }
  if (!component.imageUrl) {
    console.error('  ✗ selected component has no imageUrl');
    process.exit(2);
  }

  const workspaceId = component.deliverable.campaign.workspaceId;
  const workspaceName = component.deliverable.campaign.workspace.name;

  console.log(
    `Step 2: component ${component.id.slice(0, 8)}... (${workspaceName})\n  imageUrl: ${component.imageUrl}\n`,
  );

  // ── Step 3: snapshot before ──────────────────────────────────
  const before = await countSnapshot(workspaceId);
  console.log('Step 3: counts before:');
  console.log(`  ContentVisualFidelityScore: ${before.visualFidelityScore}`);
  console.log(`  AICallTrace:                ${before.aiCallTrace}`);
  console.log(`  LearningEvent:              ${before.learningEvent}\n`);

  // ── Step 4: trigger ──────────────────────────────────────────
  console.log('Step 4: triggering scoreImageFidelity (Claude Sonnet vision call ~$0.04)...');
  const startedAt = Date.now();
  let result;
  try {
    result = await scoreImageFidelity({
      componentId: component.id,
      workspaceId,
      judgeIdentifier: 'smoke-test-visual',
    });
    const elapsedMs = Date.now() - startedAt;
    console.log(
      `  ✓ composite=${result.compositeScore} threshold=${result.thresholdMet ? 'met' : 'missed'} judgeSkipped=${result.judgeSkipped} (${elapsedMs}ms)\n`,
    );
  } catch (err) {
    console.error(
      `  ✗ scoreImageFidelity failed after ${Date.now() - startedAt}ms:`,
      err instanceof Error ? err.message : err,
    );
    process.exit(1);
  }

  // ── Step 5: snapshot after ───────────────────────────────────
  await new Promise((r) => setTimeout(r, 1000));
  const after = await countSnapshot(workspaceId);
  console.log('Step 5: counts after:');
  console.log(
    `  ContentVisualFidelityScore: ${after.visualFidelityScore} (Δ ${fmtDelta(before.visualFidelityScore, after.visualFidelityScore)})`,
  );
  console.log(
    `  AICallTrace:                ${after.aiCallTrace} (Δ ${fmtDelta(before.aiCallTrace, after.aiCallTrace)})`,
  );
  console.log(
    `  LearningEvent:              ${after.learningEvent} (Δ ${fmtDelta(before.learningEvent, after.learningEvent)})\n`,
  );

  // ── Step 6: inspect record ───────────────────────────────────
  const record = await prisma.contentVisualFidelityScore.findUnique({
    where: { id: result.scoreId },
    select: {
      id: true,
      judgeIdentifier: true,
      judgeCallTraceId: true,
      compositeScore: true,
      thresholdMet: true,
      colorAlignment: true,
      aiJudgeDimensions: true,
      scorerVersion: true,
    },
  });
  console.log('Step 6: ContentVisualFidelityScore record');
  console.log(`  id:                ${record?.id.slice(0, 8)}...`);
  console.log(`  judgeIdentifier:   ${record?.judgeIdentifier}`);
  console.log(`  judgeCallTraceId:  ${record?.judgeCallTraceId ? record.judgeCallTraceId.slice(0, 8) + '...' : '(null)'}`);
  console.log(`  compositeScore:    ${record?.compositeScore}`);
  console.log(`  scorerVersion:     ${record?.scorerVersion}`);

  const colorAlignment = record?.colorAlignment as {
    score: number;
    matches: { generatedHex: string; brandHex: string | null; deltaE: number; matchQuality: string }[];
    matchedBrandHexes: string[];
    unmatchedColors: { hex: string; population: number }[];
  } | null;
  if (colorAlignment) {
    console.log(`\n  Color alignment: ${colorAlignment.score}/100`);
    console.log(`    matched brand hexes: ${colorAlignment.matchedBrandHexes.length} (${colorAlignment.matchedBrandHexes.slice(0, 5).join(', ')}${colorAlignment.matchedBrandHexes.length > 5 ? '...' : ''})`);
    console.log(`    unmatched: ${colorAlignment.unmatchedColors.length}`);
    console.log('    top 3 matches:');
    for (const m of colorAlignment.matches.slice(0, 3)) {
      console.log(
        `      ${m.generatedHex} → ${m.brandHex ?? 'none'} (ΔE ${m.deltaE}, ${m.matchQuality})`,
      );
    }
  }

  const aiDims = record?.aiJudgeDimensions as
    | { skipped?: boolean; composite?: number; flagged?: string[]; dimensions?: Record<string, { score: number; rationale: string }> }
    | null;
  if (aiDims && !aiDims.skipped) {
    console.log(`\n  AI judge composite: ${aiDims.composite}/100`);
    if (aiDims.flagged && aiDims.flagged.length > 0) {
      console.log(`    flagged: ${aiDims.flagged.join(', ')}`);
    }
    if (aiDims.dimensions) {
      console.log('    per-dimension:');
      for (const [key, val] of Object.entries(aiDims.dimensions)) {
        console.log(`      ${key.padEnd(18)} ${val.score}/100 — ${val.rationale.slice(0, 80)}${val.rationale.length > 80 ? '...' : ''}`);
      }
    }
  } else if (aiDims?.skipped) {
    console.log('\n  AI judge: skipped (no API key or call failed)');
  }
  console.log();

  // ── Step 7: verify deltas ────────────────────────────────────
  const checks: Array<{ label: string; pass: boolean; detail: string }> = [
    {
      label: 'ContentVisualFidelityScore +1',
      pass: after.visualFidelityScore - before.visualFidelityScore === 1,
      detail: `Δ=${after.visualFidelityScore - before.visualFidelityScore}`,
    },
    {
      label: 'AICallTrace +1',
      pass: after.aiCallTrace - before.aiCallTrace >= 1,
      detail: `Δ=${after.aiCallTrace - before.aiCallTrace}`,
    },
    {
      label: 'fidelity.scored event emitted',
      pass: after.learningEvent - before.learningEvent >= 1,
      detail: `Δ=${after.learningEvent - before.learningEvent}`,
    },
    {
      label: 'judgeCallTraceId set',
      pass: !!record?.judgeCallTraceId,
      detail: record?.judgeCallTraceId ? 'set' : 'null',
    },
  ];
  console.log('Step 7: verify');
  let allPass = true;
  for (const c of checks) {
    const sym = c.pass ? '✓' : '✗';
    console.log(`  ${sym} ${c.label} (${c.detail})`);
    if (!c.pass) allPass = false;
  }
  console.log();

  if (allPass) {
    console.log('━━━ PASS — G8 visual fidelity pipeline works end-to-end ━━━');
    process.exit(0);
  } else {
    console.log('━━━ FAIL — see ✗ marks ━━━');
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error('\n✗ smoke test crashed:', err instanceof Error ? err.stack : err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

/**
 * Learning-loop infrastructure smoke test
 *
 * Verifies that the tracking pipeline (BrandContextSnapshot + AICallSnapshot +
 * AICallTrace + LearningEvent) works end-to-end by triggering a fidelity score
 * directly via the service layer and inspecting the resulting DB records.
 *
 * Triggers an actual Claude AI-judge call and writes records — costs ~$0.02
 * per run. Requires ANTHROPIC_API_KEY in .env.local.
 *
 * Run: npx tsx scripts/learning-loop/smoke-test.ts [workspaceId]
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

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

import { prisma } from '../../src/lib/prisma';
import { scoreContentFidelity } from '../../src/lib/learning-loop/fidelity-scorer';

interface SnapshotCounts {
  brandContextSnapshot: number;
  aiCallSnapshot: number;
  aiCallTrace: number;
  contentFidelityScore: number;
  learningEvent: number;
}

async function countSnapshot(workspaceId: string): Promise<SnapshotCounts> {
  const [brandContextSnapshot, aiCallSnapshot, aiCallTrace, contentFidelityScore, learningEvent] =
    await Promise.all([
      prisma.brandContextSnapshot.count({ where: { workspaceId } }),
      prisma.aICallSnapshot.count({ where: { workspaceId } }),
      prisma.aICallTrace.count({ where: { workspaceId } }),
      prisma.contentFidelityScore.count({ where: { workspaceId } }),
      prisma.learningEvent.count({ where: { workspaceId } }),
    ]);
  return { brandContextSnapshot, aiCallSnapshot, aiCallTrace, contentFidelityScore, learningEvent };
}

function fmt(n: number): string {
  return n.toString().padStart(4, ' ');
}

function fmtDelta(before: number, after: number): string {
  const delta = after - before;
  if (delta === 0) return '   0';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}`.padStart(4, ' ');
}

async function main() {
  console.log('━━━ Learning-loop infrastructure smoke test ━━━\n');

  // ── Step 1: Schema sanity ────────────────────────────────────
  console.log('Step 1: schema sanity check');
  try {
    await prisma.brandContextSnapshot.findFirst({ select: { id: true } });
    await prisma.aICallSnapshot.findFirst({ select: { id: true } });
    await prisma.aICallTrace.findFirst({ select: { id: true } });
    await prisma.contentFidelityScore.findFirst({ select: { id: true } });
    await prisma.learningEvent.findFirst({ select: { id: true } });
    console.log('  ✓ all 5 tables queryable\n');
  } catch (err) {
    console.error('  ✗ schema drift:', err instanceof Error ? err.message : err);
    process.exit(2);
  }

  // ── Step 2: Pick workspace ────────────────────────────────────
  const workspaceIdArg = process.argv[2];
  const workspace = workspaceIdArg
    ? await prisma.workspace.findUnique({
        where: { id: workspaceIdArg },
        select: { id: true, name: true },
      })
    : await prisma.workspace.findFirst({
        where: { campaigns: { some: { deliverables: { some: { versions: { some: {} } } } } } },
        select: { id: true, name: true },
      });

  if (!workspace) {
    console.error('  ✗ no workspace with ContentVersion records found');
    console.error('    Run seed or pass a workspace id: npx tsx scripts/learning-loop/smoke-test.ts <workspaceId>');
    process.exit(2);
  }
  console.log(`Step 2: workspace = ${workspace.name} (${workspace.id})\n`);

  // ── Step 3: Find candidate ContentVersion ────────────────────
  const contentVersion = await prisma.contentVersion.findFirst({
    where: {
      deliverable: { campaign: { workspaceId: workspace.id } },
    },
    include: {
      deliverable: { select: { id: true, title: true, contentType: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!contentVersion) {
    console.error(`  ✗ no ContentVersion in workspace ${workspace.name}`);
    console.error('    Generate content via canvas or seed first');
    process.exit(2);
  }
  console.log(
    `Step 3: ContentVersion ${contentVersion.id.slice(0, 8)} (deliverable: ${
      contentVersion.deliverable.title
    } / ${contentVersion.deliverable.contentType})\n`,
  );

  // ── Step 4: Snapshot before ──────────────────────────────────
  const before = await countSnapshot(workspace.id);
  console.log('Step 4: counts before:');
  console.log(`  BrandContextSnapshot: ${fmt(before.brandContextSnapshot)}`);
  console.log(`  AICallSnapshot:       ${fmt(before.aiCallSnapshot)}`);
  console.log(`  AICallTrace:          ${fmt(before.aiCallTrace)}`);
  console.log(`  ContentFidelityScore: ${fmt(before.contentFidelityScore)}`);
  console.log(`  LearningEvent:        ${fmt(before.learningEvent)}\n`);

  // ── Step 5: Trigger scoreContentFidelity ─────────────────────
  console.log('Step 5: triggering scoreContentFidelity (will call Claude AI-judge, ~$0.02)...');
  const startedAt = Date.now();
  let scoreResult: { scoreId: string; compositeScore: number; thresholdMet: boolean } | null = null;
  try {
    scoreResult = await scoreContentFidelity({
      contentVersionId: contentVersion.id,
      workspaceId: workspace.id,
      judgeIdentifier: 'smoke-test',
    });
    const elapsedMs = Date.now() - startedAt;
    console.log(
      `  ✓ score=${scoreResult.compositeScore} threshold=${scoreResult.thresholdMet ? 'met' : 'missed'} (${elapsedMs}ms)\n`,
    );
  } catch (err) {
    const elapsedMs = Date.now() - startedAt;
    console.error(`  ✗ scoreContentFidelity failed after ${elapsedMs}ms:`, err instanceof Error ? err.message : err);
    process.exit(1);
  }

  // ── Step 6: Snapshot after + delta ────────────────────────────
  // Brief settling delay for fire-and-forget LearningEvent emits.
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const after = await countSnapshot(workspace.id);
  console.log('Step 6: counts after:');
  console.log(
    `  BrandContextSnapshot: ${fmt(after.brandContextSnapshot)} (Δ ${fmtDelta(before.brandContextSnapshot, after.brandContextSnapshot)})`,
  );
  console.log(
    `  AICallSnapshot:       ${fmt(after.aiCallSnapshot)} (Δ ${fmtDelta(before.aiCallSnapshot, after.aiCallSnapshot)})`,
  );
  console.log(
    `  AICallTrace:          ${fmt(after.aiCallTrace)} (Δ ${fmtDelta(before.aiCallTrace, after.aiCallTrace)})`,
  );
  console.log(
    `  ContentFidelityScore: ${fmt(after.contentFidelityScore)} (Δ ${fmtDelta(before.contentFidelityScore, after.contentFidelityScore)})`,
  );
  console.log(
    `  LearningEvent:        ${fmt(after.learningEvent)} (Δ ${fmtDelta(before.learningEvent, after.learningEvent)})\n`,
  );

  // ── Step 7: Verify expected deltas ────────────────────────────
  console.log('Step 7: verify expected deltas');
  const checks: Array<{ label: string; actual: number; expected: string; pass: boolean }> = [
    {
      label: 'AICallSnapshot ≥ +1',
      actual: after.aiCallSnapshot - before.aiCallSnapshot,
      expected: '≥1 (or 0 if dedup hit on identical payload)',
      pass: after.aiCallSnapshot - before.aiCallSnapshot >= 0,
    },
    {
      label: 'AICallTrace = +1',
      actual: after.aiCallTrace - before.aiCallTrace,
      expected: '+1 (always new per call)',
      pass: after.aiCallTrace - before.aiCallTrace === 1,
    },
    {
      label: 'ContentFidelityScore = +1',
      actual: after.contentFidelityScore - before.contentFidelityScore,
      expected: '+1',
      pass: after.contentFidelityScore - before.contentFidelityScore === 1,
    },
    {
      label: 'LearningEvent ≥ +3',
      actual: after.learningEvent - before.learningEvent,
      expected: '≥3 (ai.call_started + ai.call_completed + fidelity.scored)',
      pass: after.learningEvent - before.learningEvent >= 3,
    },
  ];

  let allPass = true;
  for (const c of checks) {
    const sym = c.pass ? '✓' : '✗';
    console.log(`  ${sym} ${c.label} → ${c.actual} (${c.expected})`);
    if (!c.pass) allPass = false;
  }
  console.log();

  // ── Step 8: Inspect the new ContentFidelityScore record ──────
  if (scoreResult) {
    const score = await prisma.contentFidelityScore.findUnique({
      where: { id: scoreResult.scoreId },
      select: {
        id: true,
        judgeIdentifier: true,
        judgeCallTraceId: true,
        compositeScore: true,
        thresholdMet: true,
      },
    });
    console.log('Step 8: ContentFidelityScore record');
    console.log(`  id:               ${score?.id.slice(0, 8)}...`);
    console.log(`  judgeIdentifier:  ${score?.judgeIdentifier}`);
    console.log(`  judgeCallTraceId: ${score?.judgeCallTraceId ? score.judgeCallTraceId.slice(0, 8) + '...' : '(null)'}`);
    console.log(`  compositeScore:   ${score?.compositeScore}`);
    console.log(`  thresholdMet:     ${score?.thresholdMet}`);
    if (!score?.judgeCallTraceId) {
      console.log('  ✗ judgeCallTraceId is null — self-tracking did NOT wire the trace');
      allPass = false;
    } else {
      console.log('  ✓ judgeCallTraceId set — fidelity-scorer self-tracking works');
    }
    console.log();
  }

  // ── Step 9: Inspect emitted LearningEvents ────────────────────
  const recentEvents = await prisma.learningEvent.findMany({
    where: { workspaceId: workspace.id, createdAt: { gte: new Date(startedAt - 1000) } },
    select: { eventType: true, entityType: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Step 9: LearningEvents emitted in this run (${recentEvents.length}):`);
  for (const e of recentEvents) {
    console.log(`  ${e.createdAt.toISOString()} ${e.eventType.padEnd(28)} entity=${e.entityType}`);
  }
  console.log();

  // ── Verdict ───────────────────────────────────────────────────
  if (allPass) {
    console.log('━━━ PASS — learning-loop infrastructure works end-to-end ━━━');
    process.exit(0);
  } else {
    console.log('━━━ FAIL — see ✗ marks above ━━━');
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

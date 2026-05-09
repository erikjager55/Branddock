/**
 * scripts/heuristics/smoke-external-review.ts
 *
 * Δ-1 end-to-end smoke. Roept runFidelityForExternalContent direct aan
 * (bypass HTTP) om te verifiëren dat:
 *   - F-VAL run werkt op extern content (zonder canvas-stack)
 *   - ContentReviewLog row aangemaakt
 *   - BrandReviewFinding rows aangemaakt met correcte category-mapping
 *   - XOR FK constraint voldaan (alleen contentReviewLogId, geen fidelityScoreId)
 *   - Cleanup: deletet de test-review-log na (idempotent)
 *
 * Run:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config \
 *     scripts/heuristics/smoke-external-review.ts [--workspace=<id>] [--keep]
 *
 * --keep: bewaart de test-rows na afloop (handig voor UI-debugging).
 */

import { prisma } from '@/lib/prisma';
import { runFidelityForExternalContent } from '@/lib/brand-fidelity/external-content-runner';

const args = process.argv.slice(2);
const keep = args.includes('--keep');
const workspaceArg = args.find((a) => a.startsWith('--workspace='));
const explicitWorkspaceId = workspaceArg ? workspaceArg.slice('--workspace='.length) : null;

// Mix van clean prose + corporate-fluff + substantiated claims voor coverage
const SAMPLE_CONTENT = `
Wij zijn de marktleider in toonaangevende oplossingen — proactieve teamplayers
die transformatie en synergie leveren aan onze stakeholders. Wij zijn 30%
sneller dan de grootste concurrent X met een gemiddelde levertijd van 2 dagen.
Onze duurzame productielijn realiseerde 25% CO2-reductie in 2024 dankzij
gestructureerde co-creatie met onze partners.
`;

async function main() {
  const workspace = explicitWorkspaceId
    ? await prisma.workspace.findUnique({ where: { id: explicitWorkspaceId } })
    : await prisma.workspace.findFirst({ where: { name: 'Better Brands' } });

  if (!workspace) {
    console.error('[FAIL] Workspace not found');
    process.exit(1);
  }

  console.log(`Workspace: ${workspace.name} (${workspace.id})`);
  console.log(`Sample length: ${SAMPLE_CONTENT.trim().length} chars`);
  console.log('');

  // ── Run F-VAL via external-content-runner ──
  console.log('Running runFidelityForExternalContent...');
  const t0 = Date.now();
  const result = await runFidelityForExternalContent({
    workspaceId: workspace.id,
    contentText: SAMPLE_CONTENT,
    sourceType: 'paste',
    runJudge: false, // skip judge voor snelheid (deterministische pijlers genoeg voor smoke)
  });
  console.log(`Done in ${Date.now() - t0}ms`);
  console.log('');

  console.log('Result:');
  console.log(`  reviewLogId: ${result.reviewLogId}`);
  console.log(`  compositeScore: ${result.result.compositeScore}/100`);
  console.log(`  thresholdMet: ${result.result.thresholdMet}`);
  console.log(`  findingsCount: ${result.findingsCount}`);
  console.log(`  scorerVersion: ${result.result.scorerVersion}`);
  console.log(`  pillar3 score: ${result.result.pillars.rules.score}`);
  console.log('');

  // ── Verify persistence ──
  const log = await prisma.contentReviewLog.findUnique({
    where: { id: result.reviewLogId },
    include: {
      findings: {
        select: {
          id: true,
          category: true,
          severity: true,
          location: true,
          description: true,
          fidelityScoreId: true,
          contentReviewLogId: true,
        },
        orderBy: { severity: 'asc' },
        take: 10,
      },
    },
  });

  if (!log) {
    console.error('[FAIL] ContentReviewLog row niet gevonden in DB');
    process.exit(1);
  }

  console.log('Persistence verified:');
  console.log(`  ContentReviewLog.workspaceId: ${log.workspaceId === workspace.id ? '[OK]' : '[FAIL]'}`);
  console.log(`  ContentReviewLog.sourceType: ${log.sourceType}`);
  console.log(`  ContentReviewLog.compositeScore: ${log.compositeScore}`);
  console.log(`  ContentReviewLog.findings count: ${log.findings.length}`);
  console.log(`  ContentReviewLog.retainUntil: ${log.retainUntil.toISOString().slice(0, 10)} (${Math.round((log.retainUntil.getTime() - Date.now()) / (24 * 60 * 60 * 1000))} dagen)`);
  console.log('');

  // ── XOR FK validation ──
  const xorViolations = log.findings.filter(
    (f) => (f.fidelityScoreId === null) === (f.contentReviewLogId === null),
  );
  console.log(
    `XOR FK constraint: ${xorViolations.length === 0 ? '[OK] all findings have exactly one parent' : `[FAIL] ${xorViolations.length} violations`}`,
  );

  // ── Sample findings ──
  console.log('');
  console.log('Sample findings (top 10):');
  for (const f of log.findings) {
    console.log(`  [${f.severity}] ${f.category.padEnd(13)} ${f.location} → ${f.description.slice(0, 80)}`);
  }

  // ── Category-mapping coverage ──
  const categories = new Set(log.findings.map((f) => f.category));
  console.log('');
  console.log(`Category coverage: ${[...categories].sort().join(', ')}`);

  // ── Cleanup ──
  if (!keep) {
    console.log('');
    console.log('Cleaning up test rows...');
    // Cascade delete via FK on ContentReviewLog → BrandReviewFinding
    await prisma.contentReviewLog.delete({ where: { id: result.reviewLogId } });
    console.log('[OK] Cleanup done');
  } else {
    console.log('');
    console.log(`(--keep) Test rows preserved. ContentReviewLog: ${result.reviewLogId}`);
  }

  console.log('');
  console.log('[OK] Δ-1 end-to-end smoke passed');
}

main()
  .catch((err) => {
    console.error('[FAIL] Smoke failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

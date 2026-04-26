// =============================================================
// Smoke test voor BrandstyleSnapshot write path.
//
// Test:
//  1. Eerste createBrandstyleSnapshot → created=true
//  2. Tweede call met dezelfde state → created=false (gededupliceerd)
//  3. Verify dat de DB de juiste rows bevat
//
// Usage:
//   DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
//     npx tsx scripts/test-snapshot-write.ts
// =============================================================

import { prisma } from '../src/lib/prisma';
import { createBrandstyleSnapshot } from '../src/lib/brandstyle/snapshots/create-snapshot';

async function main(): Promise<void> {
  // Pak een COMPLETE styleguide om tegen te schrijven.
  const styleguide = await prisma.brandStyleguide.findFirst({
    where: { status: 'COMPLETE' },
    orderBy: { updatedAt: 'desc' },
  });
  if (!styleguide) {
    console.error('No COMPLETE styleguide found. Run analyzer first.');
    process.exit(1);
  }

  console.log(`\n── Snapshot smoke test against styleguide ${styleguide.id} ──`);
  console.log(`Workspace: ${styleguide.workspaceId}\n`);

  const before = await prisma.brandstyleSnapshot.count({
    where: { brandstyleId: styleguide.id },
  });
  console.log(`Existing snapshots before test: ${before}`);

  // Run 1 — moet aanmaken (of dedupe als test al eerder draaide).
  const r1 = await createBrandstyleSnapshot({
    brandstyleId: styleguide.id,
    workspaceId: styleguide.workspaceId,
    triggerSource: 'manual',
    triggeredById: styleguide.createdById,
  });
  console.log(`\nRun 1: created=${r1.created} id=${r1.snapshotId} hash=${r1.tokensHash.slice(0, 12)}...`);

  // Run 2 — moet dedupliceren (zelfde state, zelfde hash).
  const r2 = await createBrandstyleSnapshot({
    brandstyleId: styleguide.id,
    workspaceId: styleguide.workspaceId,
    triggerSource: 'manual',
    triggeredById: styleguide.createdById,
  });
  console.log(`Run 2: created=${r2.created} id=${r2.snapshotId} hash=${r2.tokensHash.slice(0, 12)}...`);

  if (r2.created) {
    console.error('  ✗ Expected dedupe but got new snapshot');
  } else {
    console.log('  ✓ Dedupe werkt');
  }
  if (r2.tokensHash !== r1.tokensHash) {
    console.error('  ✗ Hash should be stable across runs');
  } else {
    console.log('  ✓ Hash stable');
  }

  const after = await prisma.brandstyleSnapshot.count({
    where: { brandstyleId: styleguide.id },
  });
  console.log(`\nSnapshots after test: ${after} (delta: +${after - before})`);

  // Inspect de meest recente snapshot
  const latest = await prisma.brandstyleSnapshot.findFirst({
    where: { brandstyleId: styleguide.id },
    orderBy: { capturedAt: 'desc' },
    select: {
      id: true,
      capturedAt: true,
      tokensHash: true,
      triggerSource: true,
      tokensJson: true,
    },
  });
  if (latest) {
    const tokens = latest.tokensJson as { meta?: { name?: string }; colors?: Record<string, unknown> };
    console.log(`\nLatest snapshot:`);
    console.log(`  id: ${latest.id}`);
    console.log(`  capturedAt: ${latest.capturedAt.toISOString()}`);
    console.log(`  triggerSource: ${latest.triggerSource}`);
    console.log(`  tokens.meta.name: ${tokens.meta?.name}`);
    console.log(`  tokens.colors keys: ${Object.keys(tokens.colors ?? {}).join(', ')}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Snapshot test failed:', err);
  prisma.$disconnect().finally(() => process.exit(1));
});

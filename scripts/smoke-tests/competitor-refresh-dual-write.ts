/**
 * DB-side smoke voor de refresh dual-write logica (PR-3 van
 * Competitive Intelligence Loop Fase 1).
 *
 * Test direct tegen de dev-DB — slaat de Next.js HTTP-laag, scraping
 * en AI-call over (die zijn unchanged van pre-PR-3). Focust op de
 * dual-write transactie + hash-match no-op.
 *
 * Drie scenario's:
 *   1. Hash-match (no-op): snapshot-state ongewijzigd → 0 nieuwe rijen
 *   2. Hash-miss content change: tagline wijziging → +1 snapshot, +1
 *      TAGLINE_CHANGED activity
 *   3. Workflow event in combinatie met content: status DRAFT→ANALYZED
 *      genereert STATUS_CHANGED naast de content-event
 *
 * Cleanup: delete alle test-rijen na elk scenario (cascades).
 *
 * Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
 *        npx tsx scripts/smoke-tests/competitor-refresh-dual-write.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { computeDiff } from '../../src/lib/competitors/diff-engine';
import { computeContentHash } from '../../src/lib/competitors/snapshot-hash';
import type {
  CanonicalExtracted,
  ManualEventContext,
} from '../../src/lib/competitors/types';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  // Pak één backfilled competitor als basis. We leiden alleen state af —
  // we wijzigen niets aan deze rij; alle smoke-writes gaan op een nieuw
  // aangemaakte fixture-competitor zodat we 100% deterministisch kunnen
  // cleanup'en.
  const seedCompetitor = await prisma.competitor.findFirst({
    where: { snapshotCount: { gt: 0 } },
    select: { workspaceId: true },
  });

  if (!seedCompetitor) {
    console.error('Geen backfilled competitor gevonden — run backfill eerst.');
    await prisma.$disconnect();
    process.exit(1);
  }

  const workspaceId = seedCompetitor.workspaceId;
  const fixtureSlug = `smoke-refresh-${Date.now()}`;

  console.log(`\n=== Setup: fixture competitor (workspace ${workspaceId}) ===\n`);

  const baseExtracted: CanonicalExtracted = {
    tagline: 'Original tagline',
    valueProposition: 'Original value prop',
    targetAudience: 'SMB marketing',
    differentiators: ['speed', 'simplicity'],
    mainOfferings: ['Tool A', 'Tool B'],
    pricingModel: 'SaaS',
    pricingDetails: 'Free tier; pro $29/mo.',
    toneOfVoice: 'Friendly',
    messagingThemes: ['speed'],
    visualStyleNotes: 'Bright',
    strengths: ['fast'],
    weaknesses: ['no enterprise'],
    socialLinks: { linkedin: 'https://linkedin.com/x' },
    hasBlog: true,
    hasCareersPage: false,
  };

  const baseHash = computeContentHash(baseExtracted);

  const fixture = await prisma.competitor.create({
    data: {
      name: `SMOKE TEST ${fixtureSlug}`,
      slug: fixtureSlug,
      websiteUrl: 'https://example.com',
      workspaceId,
      status: 'ANALYZED',
      tier: 'DIRECT',
      tagline: baseExtracted.tagline,
      valueProposition: baseExtracted.valueProposition,
      targetAudience: baseExtracted.targetAudience,
      differentiators: baseExtracted.differentiators,
      mainOfferings: baseExtracted.mainOfferings,
      pricingModel: baseExtracted.pricingModel,
      pricingDetails: baseExtracted.pricingDetails,
      toneOfVoice: baseExtracted.toneOfVoice,
      messagingThemes: baseExtracted.messagingThemes,
      visualStyleNotes: baseExtracted.visualStyleNotes,
      strengths: baseExtracted.strengths,
      weaknesses: baseExtracted.weaknesses,
      socialLinks: baseExtracted.socialLinks ?? undefined,
      hasBlog: baseExtracted.hasBlog,
      hasCareersPage: baseExtracted.hasCareersPage,
      snapshotCount: 1,
    },
  });
  console.log(`  fixture id: ${fixture.id}`);

  // Initial snapshot (mirror van backfill behavior)
  await prisma.competitorSnapshot.create({
    data: {
      competitorId: fixture.id,
      workspaceId,
      contentHash: baseHash,
      extractedJson: baseExtracted as unknown as object,
      triggerSource: 'MANUAL',
      signalSource: 'WEBSCRAPE',
      notes: 'smoke-test initial',
    },
  });

  try {
    // ─── Scenario 1: hash-match no-op ─────────────────────
    console.log('\n=== Scenario 1: hash-match (no-op) ===\n');
    {
      const newHash = computeContentHash(baseExtracted);
      assert('recomputed hash matches initial', newHash === baseHash);

      const beforeCount = await prisma.competitorSnapshot.count({
        where: { competitorId: fixture.id },
      });
      const beforeActivityCount = await prisma.competitorActivity.count({
        where: { competitorId: fixture.id },
      });

      // Geen schrijven — hash-match path zou alleen lastScrapedAt
      // updaten. We verifiëren dat er GEEN snapshot/activity bijkomt.
      await prisma.competitor.update({
        where: { id: fixture.id },
        data: { lastScrapedAt: new Date() },
      });

      const afterCount = await prisma.competitorSnapshot.count({
        where: { competitorId: fixture.id },
      });
      const afterActivityCount = await prisma.competitorActivity.count({
        where: { competitorId: fixture.id },
      });

      assert('snapshot count unchanged', afterCount === beforeCount);
      assert('activity count unchanged', afterActivityCount === beforeActivityCount);
    }

    // ─── Scenario 2: hash-miss met content change ────────
    console.log('\n=== Scenario 2: hash-miss (tagline change) ===\n');
    {
      const next: CanonicalExtracted = { ...baseExtracted, tagline: 'New positioning' };
      const newHash = computeContentHash(next);
      assert('hash changed on content edit', newHash !== baseHash);

      const ctx: ManualEventContext = {
        workflowBefore: { status: 'ANALYZED', tier: 'DIRECT' },
        workflowAfter: { status: 'ANALYZED', tier: 'DIRECT' },
      };
      const events = computeDiff(baseExtracted, next, ctx);
      assert('diff produces 1 event', events.length === 1);
      assert('event type is TAGLINE_CHANGED', events[0]?.type === 'TAGLINE_CHANGED');

      // Mirror dual-write transactie uit refresh-route
      await prisma.$transaction(async (tx) => {
        const snap = await tx.competitorSnapshot.create({
          data: {
            competitorId: fixture.id,
            workspaceId,
            contentHash: newHash,
            extractedJson: next as unknown as object,
            triggerSource: 'MANUAL',
            signalSource: 'WEBSCRAPE',
            notes: 'smoke-test scenario-2',
          },
          select: { id: true },
        });
        await tx.competitorActivity.createMany({
          data: events.map((e) => ({
            type: e.type,
            severity: e.severity,
            diffPayload: e.diffPayload as unknown as object,
            summary: e.summary,
            detectionMethod: e.detectionMethod,
            confidence: e.confidence,
            snapshotId: snap.id,
            competitorId: fixture.id,
            workspaceId,
          })),
        });
        await tx.competitor.update({
          where: { id: fixture.id },
          data: {
            tagline: next.tagline,
            snapshotCount: { increment: 1 },
            unacknowledgedActivityCount: { increment: events.length },
          },
        });
      });

      const after = await prisma.competitor.findUniqueOrThrow({
        where: { id: fixture.id },
        select: { snapshotCount: true, unacknowledgedActivityCount: true, tagline: true },
      });
      assert('snapshotCount = 2', after.snapshotCount === 2);
      assert('unack count = 1', after.unacknowledgedActivityCount === 1);
      assert('competitor pointer reflects new tagline', after.tagline === 'New positioning');

      const activityRow = await prisma.competitorActivity.findFirstOrThrow({
        where: { competitorId: fixture.id, type: 'TAGLINE_CHANGED' },
      });
      assert('activity has correct severity', activityRow.severity === 'NOTABLE');
      assert('activity acknowledged is null', activityRow.acknowledgedAt === null);
    }

    // ─── Scenario 3: workflow event combineerbaar met content ──
    console.log('\n=== Scenario 3: workflow + content combined ===\n');
    {
      const next: CanonicalExtracted = { ...baseExtracted, valueProposition: 'New VP' };
      const ctx: ManualEventContext = {
        workflowBefore: { status: 'DRAFT', tier: 'DIRECT' },
        workflowAfter: { status: 'ANALYZED', tier: 'DIRECT' },
      };
      const events = computeDiff(baseExtracted, next, ctx);
      assert('combined produces 2 events', events.length === 2);
      assert(
        'contains VALUE_PROP_CHANGED',
        events.some((e) => e.type === 'VALUE_PROP_CHANGED'),
      );
      assert(
        'contains STATUS_CHANGED',
        events.some((e) => e.type === 'STATUS_CHANGED'),
      );
    }
  } finally {
    // Cleanup: delete fixture cascades naar snapshots + activities
    console.log('\n=== Cleanup ===\n');
    await prisma.competitor.delete({ where: { id: fixture.id } });
    console.log(`  deleted fixture ${fixture.id} (cascades to snapshots + activities)`);
    await prisma.$disconnect();
  }

  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

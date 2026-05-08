/**
 * DB-side smoke voor de refresh dual-write logica (PR-3 van
 * Competitive Intelligence Loop Fase 1).
 *
 * Test rechtstreeks tegen de helper `applyCompetitorRefreshDualWrite`
 * — dezelfde functie die de refresh-route aanroept binnen zijn
 * transactie. Een regression in helper-gedrag wordt dus ook hier
 * gevangen, niet alleen in de route. Slaat alleen scrape + AI over
 * (die zijn unchanged van pre-PR-3).
 *
 * Drie scenario's:
 *   1. Hash-match no-op met workflow event: identieke canonical +
 *      DRAFT→ANALYZED transitie → outcome=no-op-hash-match,
 *      +1 STATUS_CHANGED activity met snapshotId=null, geen nieuwe
 *      snapshot, metadata fields wel overschreven
 *   2. Hash-miss content change: tagline wijziging → +1 snapshot,
 *      +1 TAGLINE_CHANGED activity met snapshotId=new-snapshot.id
 *   3. Idempotency op consecutieve identieke refreshes: tweede
 *      refresh met identieke content → no-op via findUnique pre-check,
 *      snapshotCount blijft gelijk
 *
 * Cleanup: delete fixture cascades naar snapshots + activities.
 *
 * Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
 *        npx tsx scripts/smoke-tests/competitor-refresh-dual-write.ts
 */
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { applyCompetitorRefreshDualWrite } from '../../src/lib/competitors/refresh-write';
import { computeContentHash } from '../../src/lib/competitors/snapshot-hash';
import type { CanonicalExtracted } from '../../src/lib/competitors/types';

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

  // Pak één backfilled competitor's workspace om hetzelfde tenant-context
  // te delen met productie-data. Geen mutaties op die rij — wel een
  // dedicated fixture-Competitor in dezelfde workspace zodat we cleanup
  // deterministisch kunnen doen.
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
      status: 'DRAFT', // Start DRAFT zodat scenario 3 een echte transitie kan testen
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

  // Initial snapshot mirror van backfill behavior
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
    // ─── Scenario 1: hash-match no-op (no workflow change) ─
    console.log('\n=== Scenario 1: hash-match (no-op) — same content, status DRAFT→ANALYZED ===\n');
    {
      // Workflow change DRAFT→ANALYZED OOK in dit scenario; bewijst
      // dat workflow events op no-op pad worden geschreven (W.2 fix).
      const result = await prisma.$transaction((tx) =>
        applyCompetitorRefreshDualWrite(tx as unknown as Prisma.TransactionClient, {
          competitorId: fixture.id,
          workspaceId,
          workflowBefore: { status: 'DRAFT', tier: 'DIRECT' },
          workflowAfter: { status: 'ANALYZED', tier: 'DIRECT' },
          prevCanonical: baseExtracted,
          nextCanonical: baseExtracted,
          newContentHash: baseHash,
          newScrapeHash: null,
          metadataUpdate: { competitiveScore: 75 },
          triggerSource: 'MANUAL',
          signalSource: 'WEBSCRAPE',
          triggeredById: null,
          scrapedJsonInfo: undefined,
        }),
      );

      assert('outcome = no-op-hash-match', result.outcome === 'no-op-hash-match');
      assert('1 activity created (workflow event)', result.activitiesCreated === 1);

      const after = await prisma.competitor.findUniqueOrThrow({
        where: { id: fixture.id },
        select: {
          snapshotCount: true,
          unacknowledgedActivityCount: true,
          status: true,
          competitiveScore: true,
        },
      });
      assert('snapshotCount unchanged at 1', after.snapshotCount === 1);
      assert('unack count = 1 (status event)', after.unacknowledgedActivityCount === 1);
      assert('status updated to ANALYZED', after.status === 'ANALYZED');
      assert('metadata field competitiveScore updated', after.competitiveScore === 75);

      const statusEvent = await prisma.competitorActivity.findFirst({
        where: { competitorId: fixture.id, type: 'STATUS_CHANGED' },
      });
      assert('STATUS_CHANGED activity exists', statusEvent !== null);
      assert('STATUS_CHANGED snapshotId is null (workflow-only)', statusEvent?.snapshotId === null);
    }

    // ─── Scenario 2: hash-miss content change ────────────
    console.log('\n=== Scenario 2: hash-miss (tagline change) ===\n');
    {
      const next: CanonicalExtracted = { ...baseExtracted, tagline: 'New positioning' };
      const newHash = computeContentHash(next);
      assert('hash changed on content edit', newHash !== baseHash);

      const result = await prisma.$transaction((tx) =>
        applyCompetitorRefreshDualWrite(tx as unknown as Prisma.TransactionClient, {
          competitorId: fixture.id,
          workspaceId,
          workflowBefore: { status: 'ANALYZED', tier: 'DIRECT' },
          workflowAfter: { status: 'ANALYZED', tier: 'DIRECT' },
          prevCanonical: baseExtracted,
          nextCanonical: next,
          newContentHash: newHash,
          newScrapeHash: null,
          metadataUpdate: {},
          triggerSource: 'MANUAL',
          signalSource: 'WEBSCRAPE',
          triggeredById: null,
          scrapedJsonInfo: undefined,
        }),
      );

      assert('outcome = snapshot-written', result.outcome === 'snapshot-written');
      assert('1 activity created (TAGLINE_CHANGED)', result.activitiesCreated === 1);

      const after = await prisma.competitor.findUniqueOrThrow({
        where: { id: fixture.id },
        select: { snapshotCount: true, unacknowledgedActivityCount: true, tagline: true },
      });
      assert('snapshotCount = 2', after.snapshotCount === 2);
      assert('unack count = 2 (cumulative)', after.unacknowledgedActivityCount === 2);
      assert('competitor pointer reflects new tagline', after.tagline === 'New positioning');

      const taglineEvent = await prisma.competitorActivity.findFirst({
        where: { competitorId: fixture.id, type: 'TAGLINE_CHANGED' },
      });
      assert('TAGLINE_CHANGED activity exists', taglineEvent !== null);
      assert('snapshotId is set (linked to snapshot)', taglineEvent?.snapshotId !== null);
      assert('severity = NOTABLE', taglineEvent?.severity === 'NOTABLE');
    }

    // ─── Scenario 3: idempotency op consecutieve identieke refreshes ─
    //
    // NB: dit is geen P2002-race-test (sequentiële transacties triggeren
    // de unique-violation niet — de tweede tx ziet de bestaande row al
    // via findUnique). De daadwerkelijke race-protection bij echte
    // concurrentie is een MVP-tradeoff; zie comments in refresh-write.ts.
    console.log('\n=== Scenario 3: idempotency (consecutieve identieke refreshes) ===\n');
    {
      const next: CanonicalExtracted = { ...baseExtracted, valueProposition: 'Idempotency VP' };
      const newHash = computeContentHash(next);

      const first = await prisma.$transaction((tx) =>
        applyCompetitorRefreshDualWrite(tx as unknown as Prisma.TransactionClient, {
          competitorId: fixture.id,
          workspaceId,
          workflowBefore: { status: 'ANALYZED', tier: 'DIRECT' },
          workflowAfter: { status: 'ANALYZED', tier: 'DIRECT' },
          prevCanonical: { ...baseExtracted, tagline: 'New positioning' },
          nextCanonical: next,
          newContentHash: newHash,
          newScrapeHash: null,
          metadataUpdate: {},
          triggerSource: 'MANUAL',
          signalSource: 'WEBSCRAPE',
          triggeredById: null,
          scrapedJsonInfo: undefined,
        }),
      );
      assert('first refresh: snapshot-written', first.outcome === 'snapshot-written');
      const snapshotCountAfterFirst = first.competitor.snapshotCount;

      const second = await prisma.$transaction((tx) =>
        applyCompetitorRefreshDualWrite(tx as unknown as Prisma.TransactionClient, {
          competitorId: fixture.id,
          workspaceId,
          workflowBefore: { status: 'ANALYZED', tier: 'DIRECT' },
          workflowAfter: { status: 'ANALYZED', tier: 'DIRECT' },
          prevCanonical: next,
          nextCanonical: next,
          newContentHash: newHash,
          newScrapeHash: null,
          metadataUpdate: {},
          triggerSource: 'MANUAL',
          signalSource: 'WEBSCRAPE',
          triggeredById: null,
          scrapedJsonInfo: undefined,
        }),
      );
      assert('second refresh: no-op-hash-match', second.outcome === 'no-op-hash-match');
      assert('second refresh: 0 activities', second.activitiesCreated === 0);
      assert(
        'snapshotCount unchanged on no-op',
        second.competitor.snapshotCount === snapshotCountAfterFirst,
      );
    }
  } finally {
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

/**
 * Backfill — eerste CompetitorSnapshot per ANALYZED Competitor.
 *
 * Scope (Fase 1 PR-2 van Competitive Intelligence Loop):
 * Voor elke `ANALYZED` Competitor zonder snapshots wordt één
 * retroactive snapshot geschreven uit de huidige veld-state. Dat geeft
 * de diff-engine een baseline om volgende refreshes tegen te
 * vergelijken. Zonder backfill zou de eerste post-PR-3 refresh
 * `prev = null` zien en geen content-events produceren — al die
 * "first refresh"-changes zouden verloren gaan.
 *
 * Idempotent op `notes startswith "retroactive backfill"`. Tweede run
 * schrijft 0 nieuwe rijen. Per Competitor in eigen transactie zodat
 * één failure de hele run niet wegslaat.
 *
 * Niet-blokkerend: heeft geen runtime-effect tot PR-3 (refresh dual-
 * write) live gaat. Tot dan is dit puur historische data.
 *
 * Usage:
 *   DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
 *     npx tsx prisma/scripts/backfill-competitor-snapshots.ts
 *
 * Optionele env vars:
 *   BACKFILL_WORKSPACE_ID  # beperk tot één workspace
 *   BACKFILL_DRY_RUN=1     # toon counts zonder DB-writes
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { computeContentHash } from '../../src/lib/competitors/snapshot-hash';
import type { CanonicalExtracted } from '../../src/lib/competitors/types';

const WORKSPACE_ID = process.env.BACKFILL_WORKSPACE_ID ?? null;
const DRY_RUN = process.env.BACKFILL_DRY_RUN === '1';
const BACKFILL_NOTE_PREFIX = 'retroactive backfill';

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log('='.repeat(60));
  console.log('CompetitorSnapshot retroactive backfill');
  console.log('='.repeat(60));
  console.log(`Workspace:    ${WORKSPACE_ID ?? '(all)'}`);
  console.log(`Dry run:      ${DRY_RUN ? 'yes' : 'no'}`);
  console.log('');

  // Kandidaten: ANALYZED competitors zonder enige snapshot. We filteren
  // niet op snapshotCount alleen — een drift tussen aggregaat en feitelijke
  // rijen mag deze backfill niet skippen.
  const candidates = await prisma.competitor.findMany({
    where: {
      status: 'ANALYZED',
      ...(WORKSPACE_ID ? { workspaceId: WORKSPACE_ID } : {}),
      snapshots: { none: {} },
    },
    select: {
      id: true,
      name: true,
      workspaceId: true,
      tagline: true,
      valueProposition: true,
      targetAudience: true,
      differentiators: true,
      mainOfferings: true,
      pricingModel: true,
      pricingDetails: true,
      toneOfVoice: true,
      messagingThemes: true,
      visualStyleNotes: true,
      strengths: true,
      weaknesses: true,
      socialLinks: true,
      hasBlog: true,
      hasCareersPage: true,
    },
  });

  console.log(`Found ${candidates.length} ANALYZED competitors without snapshots.\n`);

  if (DRY_RUN) {
    for (const c of candidates) {
      console.log(`  [dry-run] would snapshot: ${c.name} (${c.id})`);
    }
    console.log('\nDry run — no writes.');
    await prisma.$disconnect();
    return;
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const competitor of candidates) {
    const extracted: CanonicalExtracted = {
      tagline: competitor.tagline,
      valueProposition: competitor.valueProposition,
      targetAudience: competitor.targetAudience,
      differentiators: competitor.differentiators ?? [],
      mainOfferings: competitor.mainOfferings ?? [],
      pricingModel: competitor.pricingModel,
      pricingDetails: competitor.pricingDetails,
      toneOfVoice: competitor.toneOfVoice,
      messagingThemes: competitor.messagingThemes ?? [],
      visualStyleNotes: competitor.visualStyleNotes,
      strengths: competitor.strengths ?? [],
      weaknesses: competitor.weaknesses ?? [],
      // socialLinks is JSON; cast naar verwacht record-shape, niet-record
      // wordt door canonicalize stilletjes als leeg behandeld.
      socialLinks:
        competitor.socialLinks &&
        typeof competitor.socialLinks === 'object' &&
        !Array.isArray(competitor.socialLinks)
          ? (competitor.socialLinks as Record<string, string>)
          : null,
      hasBlog: competitor.hasBlog,
      hasCareersPage: competitor.hasCareersPage,
    };

    const contentHash = computeContentHash(extracted);

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Idempotency-check binnen de transactie zelf — voorkomt race
        // bij parallelle runs.
        const existing = await tx.competitorSnapshot.findFirst({
          where: {
            competitorId: competitor.id,
            notes: { startsWith: BACKFILL_NOTE_PREFIX },
          },
          select: { id: true },
        });
        if (existing) return { skipped: true };

        await tx.competitorSnapshot.create({
          data: {
            competitorId: competitor.id,
            workspaceId: competitor.workspaceId,
            contentHash,
            scrapeHash: null,
            extractedJson: extracted as unknown as object,
            scrapedJson: undefined, // origineel scrape niet meer beschikbaar
            triggerSource: 'MANUAL',
            signalSource: 'WEBSCRAPE',
            triggeredById: null,
            notes: `${BACKFILL_NOTE_PREFIX} 2026-05-08 — initial snapshot from Competitor row state`,
            errors: undefined,
          },
        });

        await tx.competitor.update({
          where: { id: competitor.id },
          data: { snapshotCount: { increment: 1 } },
        });

        return { skipped: false };
      });

      if (result.skipped) {
        skipped++;
        console.log(`  ↪ skipped (already backfilled): ${competitor.name}`);
      } else {
        created++;
        console.log(`  ✓ snapshotted: ${competitor.name}`);
      }
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ failed: ${competitor.name} — ${message}`);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`Created:  ${created}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);
  console.log('='.repeat(60));

  await prisma.$disconnect();

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

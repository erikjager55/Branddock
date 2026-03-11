/**
 * Migration script: Merge Vision Statement into Mission & Vision
 *
 * For each workspace:
 * 1. Find both mission-statement and vision-statement brand assets
 * 2. Merge vision frameworkData into mission asset's frameworkData
 * 3. Update mission asset name to "Mission & Vision"
 * 4. Delete vision asset (cascades research methods, sessions, versions)
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/merge-mission-vision.ts
 */

import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Merge Mission Statement + Vision Statement → Mission & Vision ===\n');

  const workspaces = await prisma.workspace.findMany({ select: { id: true, name: true } });
  console.log(`Found ${workspaces.length} workspace(s)\n`);

  let merged = 0;
  let skipped = 0;

  for (const ws of workspaces) {
    console.log(`--- Workspace: ${ws.name} (${ws.id}) ---`);

    const missionAsset = await prisma.brandAsset.findFirst({
      where: { slug: 'mission-statement', workspaceId: ws.id },
    });

    const visionAsset = await prisma.brandAsset.findFirst({
      where: { slug: 'vision-statement', workspaceId: ws.id },
    });

    if (!missionAsset) {
      console.log('  ⚠ No mission-statement asset found — skipping');
      skipped++;
      continue;
    }

    if (!visionAsset) {
      // Vision already removed or never existed — just rename mission
      console.log('  ℹ No vision-statement asset found — renaming mission only');
      await prisma.brandAsset.update({
        where: { id: missionAsset.id },
        data: { name: 'Mission & Vision' },
      });
      console.log('  ✓ Renamed to "Mission & Vision"');
      merged++;
      continue;
    }

    // Merge vision frameworkData into mission
    const missionFw = (missionAsset.frameworkData as Record<string, unknown>) ?? {};
    const visionFw = (visionAsset.frameworkData as Record<string, unknown>) ?? {};

    // Vision fields go into mission frameworkData (don't overwrite existing mission fields)
    const mergedFw: Record<string, unknown> = { ...missionFw };
    for (const [key, value] of Object.entries(visionFw)) {
      if (!(key in mergedFw) || !mergedFw[key]) {
        mergedFw[key] = value;
      }
    }

    console.log(`  Merging ${Object.keys(visionFw).length} vision fields into mission asset`);
    console.log(`  Final frameworkData has ${Object.keys(mergedFw).length} fields`);

    // Update mission asset
    await prisma.brandAsset.update({
      where: { id: missionAsset.id },
      data: {
        name: 'Mission & Vision',
        frameworkData: mergedFw as Prisma.InputJsonValue,
      },
    });
    console.log('  ✓ Updated mission asset → "Mission & Vision"');

    // Delete vision asset (cascade: versions, research methods, AI sessions, workshops, interviews)
    // Delete dependent records first to avoid FK constraint errors
    await prisma.brandAssetVersion.deleteMany({ where: { brandAssetId: visionAsset.id } });
    await prisma.brandAssetResearchMethod.deleteMany({ where: { brandAssetId: visionAsset.id } });

    // Delete exploration sessions and messages
    const explorationSessions = await prisma.explorationSession.findMany({
      where: { itemId: visionAsset.id },
      select: { id: true },
    });
    if (explorationSessions.length > 0) {
      await prisma.explorationMessage.deleteMany({
        where: { sessionId: { in: explorationSessions.map(s => s.id) } },
      });
      await prisma.explorationSession.deleteMany({
        where: { itemId: visionAsset.id },
      });
    }

    // Delete workshops and related records
    const workshops = await prisma.workshop.findMany({
      where: { brandAssetId: visionAsset.id },
      select: { id: true },
    });
    if (workshops.length > 0) {
      const workshopIds = workshops.map(w => w.id);
      await prisma.workshopNote.deleteMany({ where: { workshopId: { in: workshopIds } } });
      await prisma.workshopPhoto.deleteMany({ where: { workshopId: { in: workshopIds } } });
      await prisma.workshopParticipant.deleteMany({ where: { workshopId: { in: workshopIds } } });
      await prisma.workshopStep.deleteMany({ where: { workshopId: { in: workshopIds } } });
      await prisma.workshopFinding.deleteMany({ where: { workshopId: { in: workshopIds } } });
      await prisma.workshopRecommendation.deleteMany({ where: { workshopId: { in: workshopIds } } });
      await prisma.workshopObjective.deleteMany({ where: { workshopId: { in: workshopIds } } });
      await prisma.workshopAgendaItem.deleteMany({ where: { workshopId: { in: workshopIds } } });
      await prisma.workshop.deleteMany({ where: { brandAssetId: visionAsset.id } });
    }

    // Delete interviews and related records
    const interviews = await prisma.interview.findMany({
      where: { brandAssetId: visionAsset.id },
      select: { id: true },
    });
    if (interviews.length > 0) {
      await prisma.interviewQuestion.deleteMany({
        where: { interviewId: { in: interviews.map(i => i.id) } },
      });
      await prisma.interview.deleteMany({ where: { brandAssetId: visionAsset.id } });
    }

    // Delete resource versions
    await prisma.resourceVersion.deleteMany({
      where: { resourceType: 'BRAND_ASSET', resourceId: visionAsset.id },
    });

    // Finally delete the vision asset itself
    await prisma.brandAsset.delete({ where: { id: visionAsset.id } });
    console.log('  ✓ Deleted vision-statement asset (with cascaded records)');

    merged++;
  }

  console.log(`\n=== Done: ${merged} workspace(s) merged, ${skipped} skipped ===`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

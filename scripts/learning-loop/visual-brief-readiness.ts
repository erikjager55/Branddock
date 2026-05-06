/**
 * Visual Brief Compose + Trained-Style readiness check
 *
 * Inventories prerequisites for the two new image sources from commit
 * `4cf67a3` and reports which workspaces can run the actual fal.ai calls.
 *
 * Does NOT execute paid fal.ai calls — those cost ~$0.05 per image. Run the
 * actual calls via the canvas UI or by flipping `--execute` (not implemented;
 * write a separate script when needed).
 *
 * Run: npx tsx scripts/learning-loop/visual-brief-readiness.ts
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

interface WorkspaceReadiness {
  id: string;
  name: string;
  imageMediaAssetCount: number;
  trainedConsistentModelCount: number;
  trainableTypes: string[];
  hasDeliverableForCanvas: boolean;
  composeReady: boolean;
  trainedStyleReady: boolean;
}

async function checkWorkspace(workspaceId: string, name: string): Promise<WorkspaceReadiness> {
  const [imageMediaAssets, trainedModels, deliverableCount] = await Promise.all([
    prisma.mediaAsset.count({
      where: { workspaceId, mediaType: 'IMAGE' },
    }),
    prisma.consistentModel.findMany({
      where: { workspaceId, status: 'READY' },
      select: { type: true },
    }),
    prisma.deliverable.count({
      where: { campaign: { workspaceId } },
    }),
  ]);

  const trainableTypes = [...new Set(trainedModels.map((m) => m.type as string))];

  return {
    id: workspaceId,
    name,
    imageMediaAssetCount: imageMediaAssets,
    trainedConsistentModelCount: trainedModels.length,
    trainableTypes,
    hasDeliverableForCanvas: deliverableCount > 0,
    composeReady: imageMediaAssets >= 2 && deliverableCount > 0,
    trainedStyleReady: trainedModels.length > 0 && deliverableCount > 0,
  };
}

async function main() {
  console.log('━━━ Visual Brief Compose + Trained-Style readiness check ━━━\n');

  // ── Step 1: API key check ─────────────────────────────────────
  console.log('Step 1: env keys');
  const hasFalKey = !!process.env.FAL_KEY;
  console.log(`  FAL_KEY: ${hasFalKey ? '✓ set' : '✗ MISSING — both routes will fail'}`);
  console.log();

  // ── Step 2: Schema sanity ─────────────────────────────────────
  console.log('Step 2: schema sanity (consistent-models + media-assets)');
  try {
    await prisma.consistentModel.findFirst({ select: { id: true } });
    await prisma.mediaAsset.findFirst({ select: { id: true } });
    console.log('  ✓ both tables queryable\n');
  } catch (err) {
    console.error('  ✗ schema drift:', err instanceof Error ? err.message : err);
    process.exit(2);
  }

  // ── Step 3: Per-workspace readiness ──────────────────────────
  const workspaces = await prisma.workspace.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  console.log(`Step 3: inventory across ${workspaces.length} workspaces:\n`);
  const results: WorkspaceReadiness[] = [];
  for (const ws of workspaces) {
    results.push(await checkWorkspace(ws.id, ws.name));
  }

  // Print table
  console.log(
    '  workspace'.padEnd(34) +
      'images'.padStart(8) +
      'models'.padStart(8) +
      'deliv?'.padStart(8) +
      '  compose       trained-style',
  );
  console.log('  ' + '─'.repeat(78));
  for (const r of results) {
    const composeFlag = r.composeReady ? '✓ ready' : '— missing';
    const trainedFlag = r.trainedStyleReady ? `✓ ${r.trainableTypes.join(',')}` : '— no trained models';
    console.log(
      '  ' +
        r.name.slice(0, 32).padEnd(32) +
        String(r.imageMediaAssetCount).padStart(8) +
        String(r.trainedConsistentModelCount).padStart(8) +
        (r.hasDeliverableForCanvas ? '✓' : '✗').padStart(8) +
        '  ' +
        composeFlag.padEnd(14) +
        trainedFlag,
    );
  }
  console.log();

  // ── Step 4: Summary + next-step recommendation ────────────────
  const composeReadyWorkspaces = results.filter((r) => r.composeReady);
  const trainedReadyWorkspaces = results.filter((r) => r.trainedStyleReady);

  console.log('Step 4: summary');
  console.log(`  Compose-ready workspaces:       ${composeReadyWorkspaces.length} / ${results.length}`);
  console.log(`  Trained-style-ready workspaces: ${trainedReadyWorkspaces.length} / ${results.length}`);
  console.log();

  if (composeReadyWorkspaces.length === 0 && trainedReadyWorkspaces.length === 0) {
    console.log('  ⚠ no workspace meets either prerequisite.');
    console.log('    For compose: upload ≥2 images via Media Library.');
    console.log('    For trained-style: train a ConsistentModel via AI Trainer.');
  } else {
    console.log('  Next step (manual): open canvas with a deliverable in a ready workspace,');
    console.log('  pick "Compose" or "Trained Style" in Step 1, fill the inputs, generate.');
    console.log();
    console.log('  Recommended workspaces:');
    if (composeReadyWorkspaces.length > 0) {
      console.log(`    Compose:      ${composeReadyWorkspaces.map((r) => r.name).join(', ')}`);
    }
    if (trainedReadyWorkspaces.length > 0) {
      console.log(`    Trained:      ${trainedReadyWorkspaces.map((r) => r.name).join(', ')}`);
    }
  }
  console.log();

  // ── Verdict ───────────────────────────────────────────────────
  const ok = hasFalKey && (composeReadyWorkspaces.length > 0 || trainedReadyWorkspaces.length > 0);
  if (ok) {
    console.log('━━━ READY for manual E2E ━━━');
    process.exit(0);
  } else {
    console.log('━━━ NOT READY — see ✗ / missing markers above ━━━');
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error('\n✗ readiness check crashed:', err instanceof Error ? err.stack : err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

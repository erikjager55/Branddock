/**
 * Archiveer MediaAsset-records waarvan het lokale bestand ontbreekt op disk.
 *
 * Achtergrond: `LocalStorageProvider` schrijft naar `public/uploads/media`
 * RELATIEF aan de cwd van de draaiende dev-server → per-worktree. De Postgres-DB
 * is daarentegen GEDEELD over alle worktrees. Beelden die zijn gegenereerd/
 * gescrapet in een inmiddels-verwijderde worktree laten een DB-record achter dat
 * naar een niet-bestaand `/uploads/...`-pad wijst → de library-picker toont
 * "Bestand ontbreekt". Dit script zet zulke orphans op `isArchived=true` zodat ze
 * uit elke picker verdwijnen (`isArchived: false`-filter).
 *
 * Niet-destructief: archiveren is omkeerbaar (geen DELETE, geen file-IO). De
 * bestanden zijn tóch al weg. Idempotent: raakt alleen niet-gearchiveerde
 * records met een ontbrekend lokaal bestand, t.o.v. de cwd waarin je 'm draait.
 *
 * Read-only (dry-run) by default. Pas toe met `--apply`.
 *   Dry-run:  DATABASE_URL=... npx tsx scripts/dev/prune-orphan-media.ts
 *   Toepassen: DATABASE_URL=... npx tsx scripts/dev/prune-orphan-media.ts --apply
 */
import { existsSync } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://erikjager:@localhost:5432/branddock';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const APPLY = process.argv.includes('--apply');
const PUBLIC_DIR = path.join(process.cwd(), 'public');

/** `/uploads/media/.../x.png` → absoluut pad onder de huidige worktree's public/. */
function localFileExists(fileUrl: string): boolean {
  const rel = fileUrl.replace(/^\//, '');
  return existsSync(path.join(PUBLIC_DIR, rel));
}

async function run() {
  // Alleen lokaal-opgeslagen, niet-gearchiveerde assets. R2/externe URLs
  // (http...) worden overgeslagen — die controleren we hier niet.
  const assets = await prisma.mediaAsset.findMany({
    where: { fileUrl: { startsWith: '/uploads/' }, isArchived: false },
    select: { id: true, fileUrl: true, workspaceId: true, source: true, name: true },
  });

  const orphans = assets.filter((a) => !localFileExists(a.fileUrl));

  console.log(`Lokale niet-gearchiveerde assets: ${assets.length}`);
  console.log(`Orphans (bestand ontbreekt in ${PUBLIC_DIR}): ${orphans.length}`);

  if (orphans.length === 0) {
    console.log('Niets te doen.');
    await prisma.$disconnect();
    return;
  }

  // Breakdown per workspace + source ter verificatie vóór mutatie.
  const wsNames = new Map<string, string>();
  for (const w of await prisma.workspace.findMany({ select: { id: true, name: true } })) {
    wsNames.set(w.id, w.name);
  }
  const byWs = new Map<string, number>();
  const bySource = new Map<string, number>();
  for (const o of orphans) {
    byWs.set(o.workspaceId, (byWs.get(o.workspaceId) ?? 0) + 1);
    bySource.set(o.source, (bySource.get(o.source) ?? 0) + 1);
  }
  console.log('\nPer workspace:');
  for (const [ws, n] of [...byWs.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${wsNames.get(ws) ?? '?'} (${ws})`);
  }
  console.log('Per source:');
  for (const [src, n] of [...bySource.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${src}`);
  }

  if (!APPLY) {
    console.log('\n[DRY-RUN] Geen wijzigingen. Draai met --apply om te archiveren.');
    await prisma.$disconnect();
    return;
  }

  const { count } = await prisma.mediaAsset.updateMany({
    where: { id: { in: orphans.map((o) => o.id) } },
    data: { isArchived: true },
  });
  console.log(`\n[APPLY] ${count} orphan-records gearchiveerd (omkeerbaar via isArchived=false).`);
  await prisma.$disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

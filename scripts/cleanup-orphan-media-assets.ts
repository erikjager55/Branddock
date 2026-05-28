/**
 * cleanup-orphan-media-assets.ts
 *
 * Detecteer + verwijder weeskinderen in de Media Library:
 *
 *   1. DB-record bestaat maar fysieke file NIET op disk
 *      → orphan DB-records (toont 'broken image' in UI)
 *   2. Bestand op disk bestaat maar GEEN DB-record
 *      → orphan files (eat disk-space, niet zichtbaar in UI)
 *
 * Run (dry-run, default):
 *   DATABASE_URL=... npx tsx scripts/cleanup-orphan-media-assets.ts
 *
 * Run (échte cleanup — VERWIJDERT DB-records + files):
 *   DATABASE_URL=... npx tsx scripts/cleanup-orphan-media-assets.ts --apply
 *
 * Run gericht op één workspace:
 *   DATABASE_URL=... npx tsx scripts/cleanup-orphan-media-assets.ts --workspace <id>
 *
 * Output: stats per workspace + lijst van orphans.
 */
import { existsSync, statSync, readdirSync } from "fs";
import { rm } from "fs/promises";
import path from "path";
import { prisma } from "../src/lib/prisma";

const UPLOAD_ROOT = "public/uploads/media";

interface Stats {
  workspaceId: string;
  workspaceName: string;
  totalDbRecords: number;
  orphanDbRecords: { id: string; name: string; fileUrl: string }[];
  totalDiskFiles: number;
  orphanDiskFiles: { absolutePath: string; sizeBytes: number }[];
}

function fileUrlToAbsolutePath(url: string): string {
  // /uploads/media/<ws>/<year>/<month>/<file> → public/uploads/media/...
  const cleaned = url.replace(/^\//, "");
  return path.resolve(process.cwd(), "public", cleaned);
}

async function getAllDbAssets(workspaceFilter: string | null) {
  return prisma.mediaAsset.findMany({
    where: workspaceFilter ? { workspaceId: workspaceFilter } : {},
    select: {
      id: true,
      name: true,
      fileUrl: true,
      thumbnailUrl: true,
      workspaceId: true,
      workspace: { select: { id: true, name: true } },
    },
  });
}

function scanDiskForWorkspace(workspaceId: string): { absolutePath: string; sizeBytes: number }[] {
  const root = path.resolve(process.cwd(), UPLOAD_ROOT, workspaceId);
  if (!existsSync(root)) return [];
  const results: { absolutePath: string; sizeBytes: number }[] = [];
  function walk(dir: string) {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) walk(full);
      else if (stat.isFile()) results.push({ absolutePath: full, sizeBytes: stat.size });
    }
  }
  walk(root);
  return results;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  const workspaceIdx = process.argv.indexOf("--workspace");
  const workspaceFilter = workspaceIdx > 0 ? process.argv[workspaceIdx + 1] ?? null : null;

  console.log("\n=== Branddock — Media-asset orphan cleanup ===");
  console.log(`Mode: ${apply ? "APPLY (will delete)" : "DRY-RUN (preview only)"}`);
  if (workspaceFilter) console.log(`Workspace filter: ${workspaceFilter}`);
  console.log();

  const allAssets = await getAllDbAssets(workspaceFilter);
  console.log(`Loaded ${allAssets.length} DB media-asset records`);

  // Groepeer per workspace
  const byWorkspace = new Map<string, typeof allAssets>();
  for (const a of allAssets) {
    if (!byWorkspace.has(a.workspaceId)) byWorkspace.set(a.workspaceId, []);
    byWorkspace.get(a.workspaceId)!.push(a);
  }
  // Voor workspaces met disk-files maar geen DB-records ook scannen
  const diskOnlyWorkspaces = new Set<string>();
  try {
    const rootEntries = readdirSync(path.resolve(process.cwd(), UPLOAD_ROOT));
    for (const ws of rootEntries) {
      if (!byWorkspace.has(ws) && (!workspaceFilter || ws === workspaceFilter)) {
        diskOnlyWorkspaces.add(ws);
      }
    }
  } catch {
    // upload-root bestaat niet — geen disk-files
  }

  const stats: Stats[] = [];

  // Workspaces met DB-records
  for (const [workspaceId, assets] of byWorkspace.entries()) {
    const workspaceName = assets[0]?.workspace?.name ?? "(onbekend)";
    const orphanDbRecords: Stats["orphanDbRecords"] = [];

    // Check elke DB-record tegen disk
    const knownDiskPaths = new Set<string>();
    for (const a of assets) {
      const mainPath = fileUrlToAbsolutePath(a.fileUrl);
      const thumbPath = a.thumbnailUrl ? fileUrlToAbsolutePath(a.thumbnailUrl) : null;
      knownDiskPaths.add(mainPath);
      if (thumbPath) knownDiskPaths.add(thumbPath);
      if (!existsSync(mainPath)) {
        orphanDbRecords.push({ id: a.id, name: a.name, fileUrl: a.fileUrl });
      }
    }

    // Scan workspace-dir voor orphan disk-files
    const diskFiles = scanDiskForWorkspace(workspaceId);
    const orphanDiskFiles = diskFiles.filter((f) => !knownDiskPaths.has(f.absolutePath));

    stats.push({
      workspaceId,
      workspaceName,
      totalDbRecords: assets.length,
      orphanDbRecords,
      totalDiskFiles: diskFiles.length,
      orphanDiskFiles,
    });
  }

  // Workspaces met alleen disk-files (geen DB-records)
  for (const ws of diskOnlyWorkspaces) {
    const diskFiles = scanDiskForWorkspace(ws);
    if (diskFiles.length === 0) continue;
    stats.push({
      workspaceId: ws,
      workspaceName: "(geen DB-records)",
      totalDbRecords: 0,
      orphanDbRecords: [],
      totalDiskFiles: diskFiles.length,
      orphanDiskFiles: diskFiles,
    });
  }

  // Output samenvatting
  let totalOrphanDb = 0;
  let totalOrphanDisk = 0;
  let totalOrphanBytes = 0;
  for (const s of stats) {
    totalOrphanDb += s.orphanDbRecords.length;
    totalOrphanDisk += s.orphanDiskFiles.length;
    totalOrphanBytes += s.orphanDiskFiles.reduce((sum, f) => sum + f.sizeBytes, 0);
  }

  console.log("\n--- Per workspace ---");
  for (const s of stats) {
    if (s.orphanDbRecords.length === 0 && s.orphanDiskFiles.length === 0) continue;
    console.log(`\n${s.workspaceName} (${s.workspaceId.slice(0, 8)}…)`);
    console.log(`  DB records:   ${s.totalDbRecords}, orphans: ${s.orphanDbRecords.length}`);
    console.log(`  Disk files:   ${s.totalDiskFiles}, orphans: ${s.orphanDiskFiles.length}`);
    if (s.orphanDbRecords.length > 0) {
      console.log("  Orphan DB-records:");
      for (const r of s.orphanDbRecords.slice(0, 5)) {
        console.log(`    - '${r.name}' (${r.fileUrl})`);
      }
      if (s.orphanDbRecords.length > 5) {
        console.log(`    ... +${s.orphanDbRecords.length - 5} meer`);
      }
    }
    if (s.orphanDiskFiles.length > 0) {
      const mb = (s.orphanDiskFiles.reduce((sum, f) => sum + f.sizeBytes, 0) / 1024 / 1024).toFixed(1);
      console.log(`  Orphan disk-files (${mb} MB):`);
      for (const f of s.orphanDiskFiles.slice(0, 5)) {
        console.log(`    - ${path.relative(process.cwd(), f.absolutePath)}`);
      }
      if (s.orphanDiskFiles.length > 5) {
        console.log(`    ... +${s.orphanDiskFiles.length - 5} meer`);
      }
    }
  }

  console.log("\n--- Totaal ---");
  console.log(`Orphan DB-records:  ${totalOrphanDb}`);
  console.log(`Orphan disk-files:  ${totalOrphanDisk} (${(totalOrphanBytes / 1024 / 1024).toFixed(1)} MB)`);

  if (!apply) {
    console.log("\nDRY-RUN — voer opnieuw uit met --apply om écht te verwijderen.");
    await prisma.$disconnect();
    return;
  }

  if (totalOrphanDb === 0 && totalOrphanDisk === 0) {
    console.log("\nGeen orphans gevonden, niets te doen.");
    await prisma.$disconnect();
    return;
  }

  console.log("\nVerwijderen...");

  // 1. Delete DB-records voor missing files
  if (totalOrphanDb > 0) {
    const ids: string[] = [];
    for (const s of stats) {
      for (const r of s.orphanDbRecords) ids.push(r.id);
    }
    // Delete in batches voor grote sets
    const BATCH = 200;
    let deleted = 0;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      // Cascade: MediaAssetTag-rows verdwijnen automatisch via Prisma onDelete
      const result = await prisma.mediaAsset.deleteMany({
        where: { id: { in: batch } },
      });
      deleted += result.count;
    }
    console.log(`  Deleted ${deleted} orphan DB-records`);
  }

  // 2. Delete orphan disk-files
  if (totalOrphanDisk > 0) {
    let deleted = 0;
    let failed = 0;
    for (const s of stats) {
      for (const f of s.orphanDiskFiles) {
        try {
          await rm(f.absolutePath);
          deleted++;
        } catch (err) {
          failed++;
          console.warn(`  Failed to delete ${f.absolutePath}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
    console.log(`  Deleted ${deleted} orphan disk-files${failed > 0 ? ` (${failed} failed)` : ""}`);
  }

  console.log("\nDone.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[cleanup-orphan-media-assets]", err);
  prisma.$disconnect();
  process.exit(1);
});

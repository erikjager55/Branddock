/**
 * Backfill MediaAsset-embeddings per workspace (Fase 5, audit 2026-06-10-
 * lp-feature-image-diversity — opstap naar library-first matching).
 *
 * Huidige dekking workspace-breed: 0/521 embeddings, 1/521 aiDescriptions —
 * elke toekomstige semantische bron-matching heeft vandaag niets om tegen te
 * matchen. Dit script vult per IMAGE-asset: (1) aiDescription via de
 * dam-auto-tagger wanneer leeg (Anthropic vision), (2) pgvector-embedding via
 * generateAndStoreMediaAssetEmbedding wanneer aiDescription er (daarna) is.
 *
 * Idempotent + rate-limited (sequentieel, korte pauze). Kosten: ~$0.002 per
 * te taggen asset (Haiku vision) + ~$0.0001 per embedding.
 *
 * Run (alle workspaces):  npx tsx scripts/dev/backfill-media-embeddings.ts
 * Run (één workspace):    npx tsx scripts/dev/backfill-media-embeddings.ts <naamBevat>
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"] });

const PAUSE_MS = 400;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { prisma } = await import("../../src/lib/prisma");
  const { tagMediaAssetIfPossible } = await import("../../src/lib/ai/dam-auto-tagger");
  const { generateAndStoreMediaAssetEmbedding } = await import("../../src/lib/media/embedding-search");

  const nameFilter = process.argv[2];
  const workspaces = await prisma.workspace.findMany({
    where: nameFilter ? { name: { contains: nameFilter, mode: "insensitive" } } : {},
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (workspaces.length === 0) {
    console.error(`Geen workspaces gevonden${nameFilter ? ` voor filter "${nameFilter}"` : ""}.`);
    process.exit(1);
  }

  let tagged = 0;
  let embedded = 0;
  let skipped = 0;
  for (const ws of workspaces) {
    const assets = await prisma.$queryRawUnsafe<Array<{ id: string; aiDescription: string | null; hasEmbedding: boolean }>>(
      `SELECT "id", "aiDescription", ("embedding" IS NOT NULL) AS "hasEmbedding"
       FROM "MediaAsset"
       WHERE "workspaceId" = $1 AND "fileType" = 'IMAGE'
       ORDER BY "createdAt" ASC`,
      ws.id,
    );
    if (assets.length === 0) continue;
    console.log(`\n${ws.name}: ${assets.length} image-assets`);

    for (const asset of assets) {
      if (asset.hasEmbedding) { skipped++; continue; }
      try {
        if (!asset.aiDescription?.trim()) {
          await tagMediaAssetIfPossible(asset.id);
          await sleep(PAUSE_MS);
          const fresh = await prisma.mediaAsset.findUnique({
            where: { id: asset.id },
            select: { aiDescription: true },
          });
          if (!fresh?.aiDescription?.trim()) { skipped++; continue; }
          tagged++;
        }
        const ok = await generateAndStoreMediaAssetEmbedding(asset.id, ws.id);
        if (ok) embedded++; else skipped++;
        await sleep(PAUSE_MS);
      } catch (err) {
        console.warn(`  asset ${asset.id} overgeslagen:`, err instanceof Error ? err.message : err);
        skipped++;
      }
    }
  }

  console.log(`\nKlaar: ${tagged} getagd, ${embedded} embeddings geschreven, ${skipped} overgeslagen.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Backfill faalde:", err instanceof Error ? err.message : err);
  process.exit(1);
});

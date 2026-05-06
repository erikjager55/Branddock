/**
 * Migratie BrandPersonality voice-velden → BrandVoiceguide.
 *
 * Per workspace met BrandPersonality canonical asset:
 *  1. Extract voice-velden uit BrandAsset.frameworkData
 *  2. Create BrandVoiceguide-record (source: 'extracted')
 *  3. Compute centroid embedding via OpenAI text-embedding-3-small (skip als no samples)
 *
 * Idempotent: workspaces met bestaande BrandVoiceguide worden geskipt.
 * Backwards-compatible: BrandPersonality voice-velden blijven onaangetast
 * tijdens 3-6 maand migratie-window (zie IMPLEMENTATIEPLAN-BRAND-VOICE.md).
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." \
 *     OPENAI_API_KEY="sk-..." \
 *     npx tsx prisma/scripts/migrate-personality-to-voiceguide.ts
 *
 * Optionele env vars:
 *   MIGRATE_WORKSPACE_ID  # beperk tot één workspace
 *   MIGRATE_DRY_RUN=1     # toon counts zonder DB-writes
 *   MIGRATE_SKIP_EMBEDDING=1  # skip centroid (use admin recompute later)
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import OpenAI from "openai";

const WORKSPACE_ID = process.env.MIGRATE_WORKSPACE_ID ?? null;
const DRY_RUN = process.env.MIGRATE_DRY_RUN === "1";
const SKIP_EMBEDDING = process.env.MIGRATE_SKIP_EMBEDDING === "1";

interface PersonalityVoiceFields {
  brandVoiceDescription?: string;
  toneDimensions?: Record<string, number>;
  writingSample?: string;
  wordsWeUse?: string[];
  wordsWeAvoid?: string[];
  channelTones?: Record<string, string>;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log("=".repeat(60));
  console.log("BrandPersonality → BrandVoiceguide migratie");
  console.log("=".repeat(60));
  console.log(`Workspace:        ${WORKSPACE_ID ?? "(all)"}`);
  console.log(`Dry run:          ${DRY_RUN ? "yes" : "no"}`);
  console.log(`Skip embedding:   ${SKIP_EMBEDDING ? "yes" : "no"}`);
  console.log("");

  // Find all BrandPersonality canonical assets
  const personalities = await prisma.brandAsset.findMany({
    where: {
      frameworkType: "BRAND_PERSONALITY",
      ...(WORKSPACE_ID ? { workspaceId: WORKSPACE_ID } : {}),
    },
    select: {
      id: true,
      workspaceId: true,
      frameworkData: true,
    },
  });

  console.log(`Found ${personalities.length} BrandPersonality asset(s)`);
  console.log("");

  if (personalities.length === 0) {
    console.log("Nothing to migrate.");
    await prisma.$disconnect();
    return;
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;
  let centroidsComputed = 0;

  // Filter unique workspaces (sometimes multiple personality assets per workspace)
  const workspacesSeen = new Set<string>();

  for (const asset of personalities) {
    try {
      if (workspacesSeen.has(asset.workspaceId)) continue;
      workspacesSeen.add(asset.workspaceId);

      // Skip if voiceguide already exists
      const existing = await prisma.brandVoiceguide.findUnique({
        where: { workspaceId: asset.workspaceId },
      });
      if (existing) {
        skipped++;
        console.log(`[skip] workspace ${asset.workspaceId}: voiceguide already exists`);
        continue;
      }

      const fw = (asset.frameworkData ?? {}) as PersonalityVoiceFields;
      const writingSamples: string[] = [];
      if (typeof fw.writingSample === "string" && fw.writingSample.trim().length > 0) {
        writingSamples.push(fw.writingSample);
      }

      if (DRY_RUN) {
        console.log(
          `[dry] workspace ${asset.workspaceId}: would create voiceguide ` +
            `(samples=${writingSamples.length}, ` +
            `wordsWeUse=${fw.wordsWeUse?.length ?? 0}, ` +
            `wordsWeAvoid=${fw.wordsWeAvoid?.length ?? 0}, ` +
            `channelTones=${Object.keys(fw.channelTones ?? {}).length})`,
        );
        created++;
        continue;
      }

      const voiceguide = await prisma.brandVoiceguide.create({
        data: {
          workspaceId: asset.workspaceId,
          voiceDescription: fw.brandVoiceDescription ?? null,
          toneDimensions: (fw.toneDimensions ?? null) as Prisma.InputJsonValue,
          writingSamples: writingSamples as Prisma.InputJsonValue,
          wordsWeUse: fw.wordsWeUse ?? [],
          wordsWeAvoid: fw.wordsWeAvoid ?? [],
          channelTones: (fw.channelTones ?? null) as Prisma.InputJsonValue,
          antiPatterns: [], // empty initially — user can populate via UI
          source: "extracted",
        },
        select: { id: true },
      });
      created++;
      console.log(`[ok]   workspace ${asset.workspaceId}: voiceguide ${voiceguide.id}`);

      // Compute centroid embedding if samples exist
      if (!SKIP_EMBEDDING && writingSamples.length > 0) {
        const computed = await computeCentroid(prisma, voiceguide.id, writingSamples);
        if (computed) centroidsComputed++;
      }
    } catch (err) {
      failed++;
      console.error(
        `[fail] workspace ${asset.workspaceId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log("");
  console.log("=".repeat(60));
  console.log(
    `Done. created=${created} skipped=${skipped} failed=${failed} centroids=${centroidsComputed}`,
  );
  console.log("=".repeat(60));

  await prisma.$disconnect();
}

/**
 * Compute centroid embedding for writingSamples[] via OpenAI.
 * Stores via raw SQL (Prisma doesn't support pgvector at type-level).
 */
async function computeCentroid(
  prisma: PrismaClient,
  voiceguideId: string,
  samples: string[],
): Promise<boolean> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn(`[warn] OPENAI_API_KEY not set — skipping centroid for ${voiceguideId}`);
    return false;
  }

  try {
    const client = new OpenAI({ apiKey });

    // Per-sample embedding, then average to centroid
    const embeddings: number[][] = [];
    for (const sample of samples) {
      const response = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: sample.slice(0, 8000),
      });
      const vector = response.data[0]?.embedding;
      if (vector) embeddings.push(vector);
    }

    if (embeddings.length === 0) return false;

    const dim = embeddings[0].length;
    const centroid = new Array(dim).fill(0);
    for (const vec of embeddings) {
      for (let i = 0; i < dim; i++) centroid[i] += vec[i];
    }
    for (let i = 0; i < dim; i++) centroid[i] /= embeddings.length;

    // Persist via raw SQL (pgvector format: '[0.1,0.2,...]')
    const vectorLiteral = `[${centroid.join(",")}]`;
    await prisma.$executeRaw`
      UPDATE "BrandVoiceguide"
      SET "centroidEmbedding" = ${vectorLiteral}::vector,
          "centroidComputedAt" = NOW()
      WHERE "id" = ${voiceguideId}
    `;
    console.log(
      `       └─ centroid computed (${embeddings.length} samples, dim=${dim})`,
    );
    return true;
  } catch (err) {
    console.warn(
      `[warn] centroid computation failed for ${voiceguideId}:`,
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

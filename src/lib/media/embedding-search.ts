// =============================================================
// Pattern G2 image-quality-chain — pgvector semantic-search voor MediaAsset.
//
// Driehoek:
//   1. Bij upload van een MediaAsset met aiDescription → genereer embedding
//      via OpenAI text-embedding-3-small, store via raw SQL.
//   2. Bij Canvas Step 2 vóór generation → embed briefingText, cosine-search
//      tegen workspace MediaAssets, threshold ≥ 0.75 = relevant.
//   3. UI banner toont matches met thumbnail + similarity-score, user kiest
//      hergebruik of skip naar generation.
//
// Beheerd via raw SQL omdat Prisma vector(1536) niet native ondersteunt.
// Pattern conform BrandVoiceguide.centroidEmbedding / AgentMemory.embedding.
// =============================================================

import { prisma } from "@/lib/prisma";
import { embedText, toPgVectorLiteral } from "@/lib/ai/embeddings";

export interface SimilarMediaAsset {
  id: string;
  name: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  aiDescription: string | null;
  similarity: number;
  mediaType: string;
  /** MediaCategory (HERO_IMAGE/LIFESTYLE/…) — null bij ongeclassificeerd. */
  category: string | null;
  /** dam-auto-tagger tags incl. 'auth:PHOTO_REAL' / 'style:…'-prefixen. */
  aiTags: string[];
}

export interface FindSimilarOptions {
  /** Minimum cosine similarity 0-1. Default 0.75. */
  threshold?: number;
  /** Max results. Default 6. */
  limit?: number;
  /** Filter op specifieke mediaType (IMAGE / VIDEO / etc.). Default IMAGE. */
  mediaType?: string;
  /** MediaCategory-waarden die NOOIT mogen matchen (bv. LOGO/ICON voor het
   *  library-first feature-pad). Additief — bestaande callers ongewijzigd. */
  excludeCategories?: string[];
}

/**
 * Generate + persist embedding voor een MediaAsset op basis van aiDescription.
 *
 * No-op wanneer:
 * - aiDescription leeg/null
 * - asset niet gevonden of niet in workspace
 *
 * Returns true wanneer embedding succesvol opgeslagen.
 */
export async function generateAndStoreMediaAssetEmbedding(
  assetId: string,
  workspaceId: string,
): Promise<boolean> {
  const asset = await prisma.mediaAsset.findFirst({
    where: { id: assetId, workspaceId },
    select: { id: true, aiDescription: true },
  });

  if (!asset) {
    console.warn(`[media-embedding] asset ${assetId} not found in workspace ${workspaceId}`);
    return false;
  }
  if (!asset.aiDescription || asset.aiDescription.trim().length === 0) {
    return false;
  }

  let vector: number[];
  try {
    vector = await embedText(asset.aiDescription);
  } catch (err) {
    console.error(
      `[media-embedding] embed failed for ${assetId}:`,
      err instanceof Error ? err.message : err,
    );
    return false;
  }

  const literal = toPgVectorLiteral(vector);
  // Cast naar ::vector zodat pgvector type-check slaagt (Prisma stuurt als text)
  await prisma.$executeRawUnsafe(
    `UPDATE "MediaAsset"
     SET "embedding" = $1::vector,
         "embeddingComputedAt" = NOW()
     WHERE "id" = $2`,
    literal,
    assetId,
  );

  return true;
}

/**
 * Find similar MediaAssets via cosine-similarity tegen embedding van queryText.
 *
 * Returns assets gesorteerd op similarity desc. Skip wanneer geen
 * OPENAI_API_KEY (embed gooit), queryText te kort, of geen workspace-assets
 * met embedding.
 *
 * Similarity-formule: 1 - cosine_distance (pgvector `<=>`).
 * Threshold 0.75 = mild — alleen duidelijk gerelateerde assets passeren.
 */
export async function findSimilarMediaAssets(
  workspaceId: string,
  queryText: string,
  options: FindSimilarOptions = {},
): Promise<SimilarMediaAsset[]> {
  const { threshold = 0.75, limit = 6, mediaType = "IMAGE", excludeCategories = [] } = options;

  const trimmed = queryText.trim();
  if (trimmed.length < 8) return [];

  let queryVector: number[];
  try {
    queryVector = await embedText(trimmed);
  } catch (err) {
    console.warn(
      "[media-embedding] embed query failed:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }

  const literal = toPgVectorLiteral(queryVector);
  // Cosine-distance operator `<=>` levert 0 (identiek) → 2 (tegengesteld).
  // Similarity = 1 - distance. Filter alleen rows met embedding != NULL.
  const distanceCutoff = 1 - threshold;

  type Row = {
    id: string;
    name: string;
    fileUrl: string;
    thumbnailUrl: string | null;
    aiDescription: string | null;
    distance: number;
    mediaType: string;
    category: string | null;
    aiTags: string[] | null;
  };

  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT
       "id",
       "name",
       "fileUrl",
       "thumbnailUrl",
       "aiDescription",
       ("embedding" <=> $1::vector) AS "distance",
       "mediaType",
       "category"::text AS "category",
       "aiTags"
     FROM "MediaAsset"
     WHERE "workspaceId" = $2
       AND "isArchived" = false
       AND "mediaType" = $3::"MediaType"
       AND "embedding" IS NOT NULL
       AND ("embedding" <=> $1::vector) <= $4
       AND ($6::text[] IS NULL OR "category" IS NULL OR NOT ("category"::text = ANY($6::text[])))
     ORDER BY "embedding" <=> $1::vector
     LIMIT $5`,
    literal,
    workspaceId,
    mediaType,
    distanceCutoff,
    limit,
    excludeCategories.length > 0 ? excludeCategories : null,
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    fileUrl: r.fileUrl,
    thumbnailUrl: r.thumbnailUrl,
    aiDescription: r.aiDescription,
    mediaType: r.mediaType,
    category: r.category,
    aiTags: r.aiTags ?? [],
    similarity: 1 - Number(r.distance),
  }));
}

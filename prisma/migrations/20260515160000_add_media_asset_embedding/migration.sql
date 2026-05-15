-- Pattern G2 image-quality-chain (ADR pending) — semantic-search embedding
-- voor reuse-detection in Canvas Step 2. OpenAI text-embedding-3-small van
-- MediaAsset.aiDescription wordt opgeslagen in een 1536-dim pgvector kolom.
-- Beheerd via raw SQL (Prisma ondersteunt vector-type niet native; zelfde
-- patroon als BrandVoiceguide.centroidEmbedding en AgentMemory.embedding).

ALTER TABLE "MediaAsset" ADD COLUMN "embedding" vector(1536);
ALTER TABLE "MediaAsset" ADD COLUMN "embeddingComputedAt" TIMESTAMP(3);

-- IVFFlat-index voor cosine-similarity queries (ORDER BY embedding <=> $1::vector).
-- Lists-parameter conservatief op 100 voor v1 — kan opgeschaald worden bij
-- grotere asset-volumes. Cosine-distance operator is <=> in pgvector.
CREATE INDEX "MediaAsset_embedding_cosine_idx"
  ON "MediaAsset"
  USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 100);

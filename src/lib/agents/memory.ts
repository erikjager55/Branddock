// =============================================================
// Agent Memory service (4.3)
//
// Workspace-scoped long-term memory for the Brandclaw agent, backed
// by a single pgvector column on AgentMemory. All writes and
// similarity reads go through raw SQL because the `embedding` field
// is declared Unsupported in Prisma. Non-vector columns still travel
// through the regular client for type-safety.
// =============================================================

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { embedText, toPgVectorLiteral } from '@/lib/ai/embeddings';
import type { AgentMemoryType } from '@prisma/client';

export type MemoryType = AgentMemoryType;

export interface StoreMemoryInput {
  workspaceId: string;
  /** Code-registry agent id — scopes the memory to one catalog agent (Fase 2). */
  agentId?: string;
  content: string;
  memoryType: MemoryType;
  confidence?: number;         // 0..1, defaults to 1.0
  source?: string;             // "user-input", "agent-inference", etc.
  metadata?: Record<string, unknown>;
}

export interface RecalledMemory {
  id: string;
  content: string;
  memoryType: MemoryType;
  similarity: number;          // cosine similarity 0..1
  score: number;               // similarity * decayWeight * confidence
  confidence: number;
  decayWeight: number;
  accessCount: number;
  source: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface RecallOptions {
  workspaceId: string;
  /** Strikte agent-scoping: alleen memories van déze agent (Fase 2). */
  agentId?: string;
  query: string;
  limit?: number;              // default 8
  memoryType?: MemoryType;     // optional filter
  minSimilarity?: number;      // default 0.25 — reject unrelated hits
}

// ─── Write path ────────────────────────────────────────────

/**
 * Embed a snippet and persist it as a memory. Returns the new id.
 * Vector + metadata column are inserted in a single statement.
 */
export async function storeMemory(input: StoreMemoryInput): Promise<string> {
  const content = input.content.trim();
  if (!content) throw new Error('storeMemory: content is empty');

  const vector = await embedText(content);
  const vectorLiteral = toPgVectorLiteral(vector);
  const id = makeCuid();

  const confidence = clampUnit(input.confidence ?? 1);
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

  // $executeRawUnsafe so the vector literal interpolates cleanly;
  // every other value is passed as a parameter.
  await prisma.$executeRawUnsafe(
    `INSERT INTO "AgentMemory"
       (id, "workspaceId", "agentId", content, "memoryType", embedding,
        confidence, "decayWeight", "accessCount",
        source, metadata, "createdAt", "updatedAt")
     VALUES
       ($1, $2, $3, $4, $5::"AgentMemoryType", '${vectorLiteral}'::vector,
        $6, 1.0, 0,
        $7, $8::jsonb, NOW(), NOW())`,
    id,
    input.workspaceId,
    input.agentId ?? null,
    content,
    input.memoryType,
    confidence,
    input.source ?? null,
    metadataJson,
  );

  return id;
}

// ─── Recall path ───────────────────────────────────────────

/**
 * Cosine-similarity search with decay + confidence weighting.
 * Bumps accessCount + lastAccessedAt on every hit so frequently
 * recalled memories get reinforced during the next decay sweep.
 */
export async function recallRelevant(options: RecallOptions): Promise<RecalledMemory[]> {
  const query = options.query.trim();
  if (!query) return [];

  const limit = Math.max(1, Math.min(50, options.limit ?? 8));
  const minSimilarity = options.minSimilarity ?? 0.25;

  const vector = await embedText(query);
  const vectorLiteral = toPgVectorLiteral(vector);

  const typeFilter = options.memoryType
    ? Prisma.sql`AND "memoryType" = ${options.memoryType}::"AgentMemoryType"`
    : Prisma.empty;
  // Strikt: een agent ziet uitsluitend zíjn memories (geen NULL-legacy-rijen).
  const agentFilter = options.agentId
    ? Prisma.sql`AND "agentId" = ${options.agentId}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{
    id: string;
    content: string;
    memoryType: MemoryType;
    similarity: number;
    score: number;
    confidence: number;
    decayWeight: number;
    accessCount: number;
    source: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
  }>>`
    SELECT
      id,
      content,
      "memoryType",
      1 - (embedding <=> ${Prisma.raw(`'${vectorLiteral}'`)}::vector) AS similarity,
      (1 - (embedding <=> ${Prisma.raw(`'${vectorLiteral}'`)}::vector))
        * "decayWeight" * confidence AS score,
      confidence,
      "decayWeight",
      "accessCount",
      source,
      metadata,
      "createdAt"
    FROM "AgentMemory"
    WHERE "workspaceId" = ${options.workspaceId}
      AND embedding IS NOT NULL
      ${typeFilter}
      ${agentFilter}
      AND (1 - (embedding <=> ${Prisma.raw(`'${vectorLiteral}'`)}::vector)) >= ${minSimilarity}
    ORDER BY score DESC
    LIMIT ${limit}
  `;

  if (rows.length > 0) {
    const ids = rows.map((r) => r.id);
    await prisma.agentMemory.updateMany({
      where: { id: { in: ids } },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });
  }

  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    memoryType: r.memoryType,
    similarity: Number(r.similarity),
    score: Number(r.score),
    confidence: Number(r.confidence),
    decayWeight: Number(r.decayWeight),
    accessCount: Number(r.accessCount),
    source: r.source,
    metadata: (r.metadata as Record<string, unknown> | null) ?? null,
    createdAt: r.createdAt,
  }));
}

// ─── Maintenance ───────────────────────────────────────────

export interface DecayOptions {
  workspaceId?: string;          // scope to one workspace; omit for global sweep
  halfLifeDays?: number;         // age at which decayWeight reaches 0.5 (default 90)
  reinforcementPerAccess?: number; // multiplier applied per accessCount (default 0.05)
}

/**
 * Recompute decayWeight across AgentMemory rows. Older memories decay
 * exponentially; frequently accessed memories are reinforced linearly
 * per accessCount. Should run as a nightly cron once 4.4 (job queue)
 * is in place — for now, call manually or from a webhook.
 */
export async function decayOldMemories(options: DecayOptions = {}): Promise<number> {
  const halfLifeDays = options.halfLifeDays ?? 90;
  const reinforcement = options.reinforcementPerAccess ?? 0.05;
  const scopeFilter = options.workspaceId
    ? Prisma.sql`WHERE "workspaceId" = ${options.workspaceId}`
    : Prisma.empty;

  // decayWeight = min(1, 2^(-ageDays/halfLife) + accessCount * reinforcement).
  // Casts to ::float8 so Postgres doesn't try to coerce the numeric
  // parameters through an integer path on the first reference.
  const result = await prisma.$executeRaw`
    UPDATE "AgentMemory"
    SET "decayWeight" = LEAST(
      1.0::float8,
      POWER(2::float8, -EXTRACT(EPOCH FROM (NOW() - "createdAt")) / (${halfLifeDays}::float8 * 86400))
        + "accessCount"::float8 * ${reinforcement}::float8
    ),
    "updatedAt" = NOW()
    ${scopeFilter}
  `;
  return result;
}

// ─── Helpers ───────────────────────────────────────────────

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(1, value));
}

/** Minimal cuid-like generator; avoids a runtime dependency on @paralleldrive/cuid2. */
function makeCuid(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `mem_${t}${r}`;
}

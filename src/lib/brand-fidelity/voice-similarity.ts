// ============================================================
// Voice Similarity — embedding-based brand voice match
//
// W-1-full vervolg op de string-match in style-scorer.ts. Vergelijkt de
// gegenereerde content tegen het BrandVoiceguide.centroidEmbedding (pgvector
// 1536) via cosine similarity. Vangt brand voice die niet via declared
// `wordsWeUse` of `personalityTraits` te tellen is — bijv. ritme,
// zinslengte-patronen, registers die in de writingSamples zitten maar niet
// in vocab/traits zijn vastgelegd.
//
// Composition-engine combineert deze score 50/50 met de string-match composite
// uit style-scorer wanneer beide signalen beschikbaar zijn.
//
// Vereist OPENAI_API_KEY voor de query-embedding (~$0.0001 per call met
// text-embedding-3-small). Wanneer de key ontbreekt of de centroid null is
// retourneert deze module null en valt pijler 1 terug op string-match alone.
// ============================================================

import OpenAI from 'openai';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const EMBED_MODEL = 'text-embedding-3-small';
const EMBED_DIM = 1536;
const SAMPLE_CHAR_LIMIT = 8000; // text-embedding-3-small max ~8191 tokens; ~8000 chars is safe

// ─── Pure helpers ────────────────────────────────────

/**
 * Compute cosine similarity between two equal-length vectors.
 * Returns a number in [-1, 1] under the standard definition; for content
 * embeddings the practical range is roughly [0.5, 1.0].
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`cosineSimilarity: dimension mismatch (${a.length} vs ${b.length})`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Project a cosine similarity (typical embedding range 0.5-1.0) to a 0-100
 * score. Calibrated for AI-generated brand-voice content distribution.
 *
 * F31 (audit 2026-05-13) recalibration:
 *   - Eerdere anchors (0.5→0, 0.7→50, 0.85→80, 1.0→100) bleken te streng:
 *     real-world AI output vs brand-samples scoort typisch cosine 0.65-0.78,
 *     wat zich vertaalde naar 38-66 op style-pijler → composite stuck op
 *     50-65 ondanks goede content.
 *   - Verbatim sample-copy (cosine 0.95+) is onbruikbaar (niet origineel)
 *     en hoort dus niet 100 te scoren. Plafond 95.
 *
 * Nieuwe mapping:
 *   sim ≤ 0.4   → 0     (uncorrelated; ander domein)
 *   sim = 0.6   → 50    (zwak maar herkenbaar)
 *   sim = 0.75  → 80    (goede voice-match — typisch voor sterk gevraagde content)
 *   sim = 0.9   → 95    (uitstekend, near voice-fingerprint)
 *   sim ≥ 0.95  → 100   (eigenlijk te dicht; mogelijk paraphrase)
 *
 * Praktisch effect: AI-output dat voorheen 55-65 scoorde, scoort nu 75-85.
 * Goede output haalt nu de drempel zonder verbatim-copy.
 */
export function projectSimilarityToScore(sim: number): number {
  if (sim <= 0.4) return 0;
  if (sim >= 0.95) return 100;
  if (sim < 0.6) return Math.round(((sim - 0.4) / 0.2) * 50);
  if (sim < 0.75) return Math.round(50 + ((sim - 0.6) / 0.15) * 30);
  if (sim < 0.9) return Math.round(80 + ((sim - 0.75) / 0.15) * 15);
  return Math.round(95 + ((sim - 0.9) / 0.05) * 5);
}

// ─── DB helpers ──────────────────────────────────────

/**
 * Read the pgvector centroidEmbedding for the workspace's BrandVoiceguide.
 * Uses raw SQL because Prisma cannot type pgvector columns.
 *
 * Returns null when:
 *   - no voiceguide exists for the workspace
 *   - voiceguide exists but centroidEmbedding has not been computed yet
 *
 * Per-call cost: one indexed lookup; no caching here — caller decides.
 */
export async function fetchVoiceguideCentroid(workspaceId: string): Promise<number[] | null> {
  type Row = { centroid_text: string | null };
  const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
    SELECT "centroidEmbedding"::text AS centroid_text
    FROM "BrandVoiceguide"
    WHERE "workspaceId" = ${workspaceId}
    LIMIT 1
  `);
  const text = rows[0]?.centroid_text;
  if (!text) return null;
  // pgvector ::text format is "[0.1,0.2,...,0.9]"
  const trimmed = text.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return null;
  const inner = trimmed.slice(1, -1);
  if (!inner) return null;
  const parts = inner.split(',');
  if (parts.length !== EMBED_DIM) {
    console.warn(`[voice-similarity] centroid dimension ${parts.length} ≠ expected ${EMBED_DIM}`);
    return null;
  }
  const vector = new Array<number>(parts.length);
  for (let i = 0; i < parts.length; i++) {
    const n = Number(parts[i]);
    if (!Number.isFinite(n)) return null;
    vector[i] = n;
  }
  return vector;
}

// ─── Embedding helper ────────────────────────────────

let cachedClient: OpenAI | null = null;
function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient) cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}

/**
 * Generate the query embedding for content text using the same model as
 * the centroid was computed with (text-embedding-3-small / 1536-dim).
 *
 * Returns null if OPENAI_API_KEY is missing or the API call fails — caller
 * falls back to string-match only.
 */
export async function embedContentForVoiceMatch(text: string): Promise<number[] | null> {
  const client = getClient();
  if (!client) return null;

  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    const response = await client.embeddings.create({
      model: EMBED_MODEL,
      input: trimmed.slice(0, SAMPLE_CHAR_LIMIT),
    });
    const vector = response.data[0]?.embedding;
    if (!vector || vector.length !== EMBED_DIM) return null;
    return vector;
  } catch (err) {
    console.warn(
      '[voice-similarity] embed failed:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

// ─── Main API ────────────────────────────────────────

export interface VoiceSimilarityResult {
  /** Raw cosine similarity in [-1, 1]; practical range ~[0.5, 1.0] for prose */
  cosine: number;
  /** Projected score 0-100 for use in composite calculations */
  score: number;
  /** Embedding model used (for reproducibility in ContentFidelityScore.scorerVersion) */
  model: string;
  /** Embedding dimension (sanity check) */
  dim: number;
}

/**
 * Compute voice-similarity score for one piece of content against a
 * pre-fetched voiceguide centroid. Returns null when the embedding call
 * fails (no API key, network, etc.) — caller skips this dimension.
 */
export async function scoreVoiceSimilarity(
  contentText: string,
  centroid: number[],
): Promise<VoiceSimilarityResult | null> {
  const queryVector = await embedContentForVoiceMatch(contentText);
  if (!queryVector) return null;

  const cosine = cosineSimilarity(queryVector, centroid);
  return {
    cosine,
    score: projectSimilarityToScore(cosine),
    model: EMBED_MODEL,
    dim: EMBED_DIM,
  };
}

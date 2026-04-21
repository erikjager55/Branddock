// =============================================================
// OpenAI embeddings wrapper (4.3)
//
// Thin layer over openai.embeddings.create for text-embedding-3-small
// (1536 dims). Used by the agent-memory service for both store and
// recall paths. Batch form handles up to 100 inputs per request.
// =============================================================

import OpenAI from 'openai';
import { aiConfig } from './config';

const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

const globalForOpenAI = globalThis as unknown as {
  embeddingsOpenAI: OpenAI | undefined;
};

function getClient(): OpenAI {
  if (!aiConfig.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not set — cannot generate embeddings');
  }
  if (!globalForOpenAI.embeddingsOpenAI) {
    globalForOpenAI.embeddingsOpenAI = new OpenAI({ apiKey: aiConfig.openaiApiKey });
  }
  return globalForOpenAI.embeddingsOpenAI;
}

/**
 * Embed a single string. Rejects empty input.
 */
export async function embedText(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('embedText: input is empty');

  const response = await getClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: trimmed,
  });
  const vector = response.data[0]?.embedding;
  if (!vector || vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`embedText: unexpected embedding shape (len=${vector?.length})`);
  }
  return vector;
}

/**
 * Embed many strings in a single API call. Caller is responsible for
 * staying under OpenAI's per-request input limits (~8k tokens total).
 */
export async function embedTextBatch(texts: string[]): Promise<number[][]> {
  const trimmed = texts.map((t) => t.trim()).filter(Boolean);
  if (trimmed.length === 0) return [];

  const response = await getClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: trimmed,
  });
  return response.data.map((d) => d.embedding);
}

/**
 * Convert a number[] vector into a PostgreSQL pgvector literal
 * (e.g. `[0.1,0.2,…]`). Safe to interpolate into raw SQL because
 * the numbers have been validated as finite.
 */
export function toPgVectorLiteral(vector: number[]): string {
  for (const value of vector) {
    if (!Number.isFinite(value)) {
      throw new Error('toPgVectorLiteral: vector contains non-finite values');
    }
  }
  return `[${vector.join(',')}]`;
}

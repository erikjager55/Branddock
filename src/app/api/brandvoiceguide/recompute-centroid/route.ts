// =============================================================
// POST /api/brandvoiceguide/recompute-centroid
//
// Re-computes the pgvector centroid embedding from writingSamples[]
// via OpenAI text-embedding-3-small. Persisted via raw SQL because
// Prisma cannot type pgvector columns.
//
// Triggers:
//   - Manual button in Voice DNA tab UI
//   - (Future) debounced background-job after writingSamples mutation
//
// Returns:
//   { ok: true, samples: N, dim: 1536, computedAt: ISO }
//
// 400 if writingSamples is empty (nothing to embed).
// 503 if OPENAI_API_KEY is missing.
// =============================================================

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateBrandContext } from "@/lib/ai/brand-context";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

const EMBED_MODEL = "text-embedding-3-small";
const SAMPLE_CHAR_LIMIT = 8000;

export async function POST() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured" },
        { status: 503 }
      );
    }

    const voiceguide = await prisma.brandVoiceguide.findUnique({
      where: { workspaceId },
      select: { id: true, writingSamples: true },
    });
    if (!voiceguide) {
      return NextResponse.json(
        { error: "No BrandVoiceguide found for this workspace" },
        { status: 404 }
      );
    }

    // Coerce JSON value to string[]. The schema stores Json with default [].
    const raw = voiceguide.writingSamples as Prisma.JsonValue;
    const samples = Array.isArray(raw)
      ? raw
          .filter((s): s is string => typeof s === "string")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];

    if (samples.length === 0) {
      return NextResponse.json(
        { error: "No writingSamples available — add samples before recomputing centroid" },
        { status: 400 }
      );
    }

    const client = new OpenAI({ apiKey });
    const embeddings: number[][] = [];
    for (const sample of samples) {
      const response = await client.embeddings.create({
        model: EMBED_MODEL,
        input: sample.slice(0, SAMPLE_CHAR_LIMIT),
      });
      const vector = response.data[0]?.embedding;
      if (vector) embeddings.push(vector);
    }

    if (embeddings.length === 0) {
      return NextResponse.json(
        { error: "Embedding generation produced no vectors" },
        { status: 502 }
      );
    }

    const dim = embeddings[0].length;
    const centroid = new Array<number>(dim).fill(0);
    for (const vec of embeddings) {
      for (let i = 0; i < dim; i++) centroid[i] += vec[i];
    }
    for (let i = 0; i < dim; i++) centroid[i] /= embeddings.length;

    const vectorLiteral = `[${centroid.join(",")}]`;
    await prisma.$executeRaw`
      UPDATE "BrandVoiceguide"
      SET "centroidEmbedding" = ${vectorLiteral}::vector,
          "centroidComputedAt" = NOW()
      WHERE "id" = ${voiceguide.id}
    `;

    // Read back computedAt for response
    const updated = await prisma.brandVoiceguide.findUnique({
      where: { id: voiceguide.id },
      select: { centroidComputedAt: true },
    });

    invalidateBrandContext(workspaceId);
    invalidateCache(cacheKeys.prefixes.brandvoiceguide(workspaceId));

    return NextResponse.json({
      ok: true,
      samples: embeddings.length,
      dim,
      computedAt: updated?.centroidComputedAt ?? null,
    });
  } catch (error) {
    console.error("[POST /api/brandvoiceguide/recompute-centroid]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

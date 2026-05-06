// =============================================================
// POST /api/brandvoiceguide/migrate-from-personality
//
// Extract voice-velden uit BrandPersonality.frameworkData en zet ze in
// een nieuwe BrandVoiceguide record. UI-zichtbare versie van de offline
// migration script — gebruikt door de empty-state CTA op /knowledge/brand-voice.
//
// Idempotent: als een voiceguide row al bestaat → 409 Conflict (UI moet
// dan alleen de migrate-CTA weghalen, geen data overschrijven).
//
// Body: optioneel { computeCentroid?: boolean } (default: true).
//   - true:  centroid embedding berekenen via OpenAI (extra kosten, ~10s)
//   - false: skip embedding, kan later via /recompute-centroid
//
// Returns:
//   { voiceguide, centroidComputed: boolean, source: 'extracted' }
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateBrandContext } from "@/lib/ai/brand-context";
import { syncVoiceguideToRules } from "@/lib/brand-fidelity/brand-rule-sync";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

const EMBED_MODEL = "text-embedding-3-small";

interface PersonalityVoiceFields {
  brandVoiceDescription?: string;
  toneDimensions?: Record<string, number>;
  writingSample?: string;
  wordsWeUse?: string[];
  wordsWeAvoid?: string[];
  channelTones?: Record<string, string | Record<string, number>>;
}

export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    let computeCentroid = true;
    try {
      const body = await request.json();
      if (typeof body?.computeCentroid === "boolean") computeCentroid = body.computeCentroid;
    } catch {
      // No body — keep default
    }

    // Block if already migrated
    const existing = await prisma.brandVoiceguide.findUnique({
      where: { workspaceId },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "BrandVoiceguide already exists for this workspace" },
        { status: 409 }
      );
    }

    // Source: BrandPersonality canonical asset
    const personality = await prisma.brandAsset.findFirst({
      where: { workspaceId, frameworkType: "BRAND_PERSONALITY" },
      select: { frameworkData: true },
    });

    const fw = (personality?.frameworkData ?? {}) as PersonalityVoiceFields;
    const writingSamples: string[] = [];
    if (typeof fw.writingSample === "string" && fw.writingSample.trim().length > 0) {
      writingSamples.push(fw.writingSample.trim());
    }

    const voiceguide = await prisma.brandVoiceguide.create({
      data: {
        workspaceId,
        voiceDescription: fw.brandVoiceDescription ?? null,
        toneDimensions: (fw.toneDimensions ?? null) as Prisma.InputJsonValue,
        writingSamples: writingSamples as Prisma.InputJsonValue,
        wordsWeUse: fw.wordsWeUse ?? [],
        wordsWeAvoid: fw.wordsWeAvoid ?? [],
        channelTones: (fw.channelTones ?? null) as Prisma.InputJsonValue,
        antiPatterns: [],
        source: "extracted",
      },
      select: {
        id: true,
        workspaceId: true,
        voiceDescription: true,
        toneDimensions: true,
        writingSamples: true,
        wordsWeUse: true,
        wordsWeAvoid: true,
        channelTones: true,
        antiPatterns: true,
        centroidComputedAt: true,
        source: true,
        createdAt: true,
      },
    });

    // Run rule-sync immediately (will pick up wordsWeAvoid; antiPatterns is empty)
    try {
      await syncVoiceguideToRules(workspaceId, {
        wordsWeAvoid: voiceguide.wordsWeAvoid,
        antiPatterns: voiceguide.antiPatterns,
      });
    } catch (err) {
      console.error("[migrate-from-personality] rule-sync failed (non-fatal)", err);
    }

    // Optional centroid compute
    let centroidComputed = false;
    if (computeCentroid && writingSamples.length > 0) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey) {
        try {
          const client = new OpenAI({ apiKey });
          const embeddings: number[][] = [];
          for (const sample of writingSamples) {
            const resp = await client.embeddings.create({
              model: EMBED_MODEL,
              input: sample.slice(0, 8000),
            });
            const vec = resp.data[0]?.embedding;
            if (vec) embeddings.push(vec);
          }
          if (embeddings.length > 0) {
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
            centroidComputed = true;
          }
        } catch (err) {
          console.error("[migrate-from-personality] centroid compute failed (non-fatal)", err);
        }
      }
    }

    invalidateBrandContext(workspaceId);
    invalidateCache(cacheKeys.prefixes.brandvoiceguide(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({
      voiceguide,
      centroidComputed,
      source: "extracted",
    });
  } catch (error) {
    console.error("[POST /api/brandvoiceguide/migrate-from-personality]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

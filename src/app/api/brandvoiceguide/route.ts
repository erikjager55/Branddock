// =============================================================
// /api/brandvoiceguide
//
// GET:    Fetch the workspace BrandVoiceguide row.
//         Returns null if the row does not exist (UI can decide
//         whether to render an empty state or auto-provision).
//
// PATCH:  Update the BrandVoiceguide row. Auto-creates the row if
//         it does not yet exist (workspace-singleton, @@unique on
//         workspaceId). Triggers downstream syncs:
//           - syncVoiceguideToRules (if wordsWeAvoid or antiPatterns
//             changed) → BrandRule auto-source records
//           - invalidateBrandContext → 5-min AI-context cache
//           - invalidateCache → server-side prefix cache
//
// Workspace isolation via resolveWorkspaceId() (session cookie).
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateBrandContext } from "@/lib/ai/brand-context";
import { syncVoiceguideToRules } from "@/lib/brand-fidelity/brand-rule-sync";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { SUPPORTED_LOCALES } from "@/lib/brand-fidelity/heuristics/locale-resolver";

const VOICEGUIDE_SELECT = {
  id: true,
  workspaceId: true,
  contentLocale: true,
  voiceDescription: true,
  toneDimensions: true,
  writingSamples: true,
  wordsWeUse: true,
  wordsWeAvoid: true,
  channelTones: true,
  antiPatterns: true,
  centroidComputedAt: true,
  voiceDnaSavedForAi: true,
  vocabularySavedForAi: true,
  channelTonesSavedForAi: true,
  antiPatternsSavedForAi: true,
  referencesSavedForAi: true,
  source: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

// =============================================================
// GET /api/brandvoiceguide
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const voiceguide = await prisma.brandVoiceguide.findUnique({
      where: { workspaceId },
      select: VOICEGUIDE_SELECT,
    });

    return NextResponse.json({ voiceguide });
  } catch (error) {
    console.error("[GET /api/brandvoiceguide]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// PATCH /api/brandvoiceguide — upsert the row
// =============================================================
// ChannelToneEntry shape used by the voiceguide UI + analyzer:
//   { description: string, axisShift?: { axis, direction } | null }
// The legacy personality shape (string per channel, or numeric tone deltas)
// is also accepted via the union below so soft-migrations don't break.
const channelToneEntrySchema = z.object({
  description: z.string(),
  axisShift: z
    .object({
      axis: z.enum([
        "formalCasual",
        "seriousFunny",
        "respectfulIrreverent",
        "matterOfFactEnthusiastic",
      ]),
      direction: z.enum(["increase", "decrease"]),
    })
    .nullable()
    .optional(),
});

const updateSchema = z.object({
  voiceDescription: z.string().nullable().optional(),
  contentLocale: z
    .enum(SUPPORTED_LOCALES)
    .nullable()
    .optional(),
  toneDimensions: z.record(z.string(), z.number()).nullable().optional(),
  writingSamples: z.array(z.string()).optional(),
  wordsWeUse: z.array(z.string()).optional(),
  wordsWeAvoid: z.array(z.string()).optional(),
  channelTones: z
    .record(
      z.string(),
      z.union([
        channelToneEntrySchema,                 // new structured shape
        z.string(),                             // legacy: free-text per channel
        z.record(z.string(), z.number()),       // legacy: per-channel tone deltas
      ]),
    )
    .nullable()
    .optional(),
  antiPatterns: z.array(z.string()).optional(),
  voiceDnaSavedForAi: z.boolean().optional(),
  vocabularySavedForAi: z.boolean().optional(),
  channelTonesSavedForAi: z.boolean().optional(),
  antiPatternsSavedForAi: z.boolean().optional(),
  referencesSavedForAi: z.boolean().optional(),
  source: z.string().optional(),
});

const NULLABLE_JSON_FIELDS = ["toneDimensions", "channelTones"] as const;

export async function PATCH(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Convert null → Prisma.JsonNull for nullable Json fields.
    const data: Record<string, unknown> = { ...parsed.data };
    for (const key of NULLABLE_JSON_FIELDS) {
      if (key in data && data[key] === null) {
        data[key] = Prisma.JsonNull;
      }
    }
    // writingSamples is a non-null Json column with default [] — accept the
    // raw array directly. Prisma treats string[] as InputJsonValue.
    if ("writingSamples" in data) {
      data.writingSamples = data.writingSamples as Prisma.InputJsonValue;
    }

    // Detect whether the rule-sync needs to run
    const wordsWeAvoidChanged = "wordsWeAvoid" in parsed.data;
    const antiPatternsChanged = "antiPatterns" in parsed.data;
    const shouldSyncRules = wordsWeAvoidChanged || antiPatternsChanged;

    // Upsert — first PATCH for a workspace creates the row.
    const voiceguide = await prisma.brandVoiceguide.upsert({
      where: { workspaceId },
      update: data,
      create: {
        workspaceId,
        ...data,
      },
      select: VOICEGUIDE_SELECT,
    });

    // Sync auto-source rules in the background. Errors are non-fatal — the
    // PATCH itself still succeeds and the UI gets the updated voiceguide.
    if (shouldSyncRules) {
      try {
        await syncVoiceguideToRules(workspaceId, {
          wordsWeAvoid: voiceguide.wordsWeAvoid,
          antiPatterns: voiceguide.antiPatterns,
        });
      } catch (err) {
        console.error("[PATCH /api/brandvoiceguide] rule-sync failed (non-fatal)", err);
      }
    }

    // Invalidate caches
    invalidateBrandContext(workspaceId);
    invalidateCache(cacheKeys.prefixes.brandvoiceguide(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ voiceguide });
  } catch (error) {
    console.error("[PATCH /api/brandvoiceguide]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

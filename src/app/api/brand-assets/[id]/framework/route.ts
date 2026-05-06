import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { requireUnlocked } from "@/lib/lock-guard";
import { createVersion } from "@/lib/versioning";
import { buildBrandAssetSnapshot } from "@/lib/snapshot-builders";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const FrameworkUpdateSchema = z.object({
  frameworkType: z.enum([
    "PURPOSE_WHEEL",
    "GOLDEN_CIRCLE",
    "BRAND_ESSENCE",
    "BRAND_PROMISE",
    "MISSION_STATEMENT",
    "BRAND_ARCHETYPE",
    "TRANSFORMATIVE_GOALS",
    "BRAND_PERSONALITY",
    "BRAND_STORY",
    "BRANDHOUSE_VALUES",
    // Legacy types
    "ESG",
    "SWOT",
    "PURPOSE_KOMPAS",
  ]).optional(),
  frameworkData: z.record(z.string(), z.unknown()),
});

// =============================================================
// PATCH /api/brand-assets/[id]/framework — update framework data
// =============================================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const lockResponse = await requireUnlocked("brandAsset", id);
    if (lockResponse) return lockResponse;

    const asset = await prisma.brandAsset.findFirst({
      where: { id, workspaceId },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = FrameworkUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Merge new frameworkData into existing (don't replace)
    const existingFrameworkData = (asset.frameworkData as Record<string, unknown>) ?? {};
    const mergedFrameworkData = { ...existingFrameworkData, ...parsed.data.frameworkData };

    const updated = await prisma.brandAsset.update({
      where: { id },
      data: {
        frameworkType: parsed.data.frameworkType ?? asset.frameworkType,
        frameworkData: mergedFrameworkData as Prisma.InputJsonValue,
      },
    });

    // Auto-versioning
    try {
      const session = await getServerSession();
      if (session?.user?.id) {
        await createVersion({
          resourceType: 'BRAND_ASSET',
          resourceId: id,
          snapshot: buildBrandAssetSnapshot(updated),
          changeType: 'MANUAL_SAVE',
          changeNote: 'Updated framework data',
          userId: session.user.id,
          workspaceId,
        });
      }
    } catch (versionError) {
      console.error('[Brand asset framework version snapshot failed]', versionError);
    }

    // F-VAL pijler 3c: auto-sync wordsWeAvoid → BrandRule (FORBIDDEN_WORD)
    // Alleen voor BRAND_PERSONALITY assets met wordsWeAvoid in frameworkData.
    if (
      (parsed.data.frameworkType ?? asset.frameworkType) === 'BRAND_PERSONALITY' &&
      'wordsWeAvoid' in mergedFrameworkData
    ) {
      try {
        const { syncWordsAvoidToRules } = await import('@/lib/brand-fidelity/brand-rule-sync');
        const wordsWeAvoid = mergedFrameworkData.wordsWeAvoid as unknown;
        const wordsArray = Array.isArray(wordsWeAvoid) ? (wordsWeAvoid as string[]) : [];
        await syncWordsAvoidToRules(workspaceId, wordsArray);
      } catch (syncError) {
        console.error('[BrandRule auto-sync failed]', syncError);
        // Non-fatal — framework update succeeds regardless
      }
    }

    // BV-WIRE W-6: Voiceguide takeover — when BrandVoiceguide exists for the
    // workspace, drop the legacy 'auto:wordsWeAvoid' rules just written above
    // and sync voiceguide rules instead (single source of truth — matches
    // getBrandContext priority). Idempotent: returns source='none' when no
    // voiceguide present, leaving legacy rules in place.
    // Verwijder de legacy syncWordsAvoidToRules-call hierboven zodra het BV-5
    // deprecation-window verstreken is (zie IMPLEMENTATIEPLAN-BV-WIRE.md W-6 stap 2).
    if ((parsed.data.frameworkType ?? asset.frameworkType) === 'BRAND_PERSONALITY') {
      try {
        const { syncWorkspaceBrandRules } = await import('@/lib/brand-fidelity/brand-rule-sync');
        await syncWorkspaceBrandRules(workspaceId);
      } catch (syncError) {
        console.error('[Voiceguide BrandRule sync failed]', syncError);
        // Non-fatal — framework update succeeds regardless
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/brand-assets/:id/framework]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

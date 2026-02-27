import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { requireUnlocked } from "@/lib/lock-guard";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const FrameworkUpdateSchema = z.object({
  frameworkType: z.enum([
    "PURPOSE_WHEEL",
    "GOLDEN_CIRCLE",
    "BRAND_ESSENCE",
    "BRAND_PROMISE",
    "MISSION_STATEMENT",
    "VISION_STATEMENT",
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

    const updated = await prisma.brandAsset.update({
      where: { id },
      data: {
        frameworkType: parsed.data.frameworkType ?? asset.frameworkType,
        frameworkData: parsed.data.frameworkData as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/brand-assets/:id/framework]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

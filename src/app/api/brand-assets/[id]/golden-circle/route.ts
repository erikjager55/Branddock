import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const GoldenCircleSectionSchema = z.object({
  statement: z.string(),
  details: z.string(),
});

const GoldenCircleUpdateSchema = z.object({
  why: GoldenCircleSectionSchema.optional(),
  how: GoldenCircleSectionSchema.optional(),
  what: GoldenCircleSectionSchema.optional(),
});

// =============================================================
// GET /api/brand-assets/[id]/golden-circle — get golden circle data
// =============================================================
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const asset = await prisma.brandAsset.findFirst({
      where: { id, workspaceId },
      select: {
        id: true,
        frameworkType: true,
        frameworkData: true,
        isLocked: true,
        lockedAt: true,
        lockedBy: {
          select: { id: true, name: true },
        },
        updatedAt: true,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const data = (asset.frameworkData as Record<string, unknown>) ?? {};

    return NextResponse.json({
      whyStatement: (data.why as Record<string, unknown>)?.statement ?? "",
      whyDetails: (data.why as Record<string, unknown>)?.details ?? "",
      howStatement: (data.how as Record<string, unknown>)?.statement ?? "",
      howDetails: (data.how as Record<string, unknown>)?.details ?? "",
      whatStatement: (data.what as Record<string, unknown>)?.statement ?? "",
      whatDetails: (data.what as Record<string, unknown>)?.details ?? "",
      isLocked: asset.isLocked,
      lastEditedAt: asset.updatedAt,
      lastEditedBy: asset.lockedBy,
    });
  } catch (error) {
    console.error("[GET /api/brand-assets/:id/golden-circle]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// =============================================================
// PATCH /api/brand-assets/[id]/golden-circle — update golden circle
// =============================================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const asset = await prisma.brandAsset.findFirst({
      where: { id, workspaceId },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    if (asset.isLocked) {
      return NextResponse.json(
        { error: "Asset is locked" },
        { status: 423 },
      );
    }

    const body = await request.json();
    const parsed = GoldenCircleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const currentData = (asset.frameworkData as Record<string, unknown>) ?? {};
    const updatedData = { ...currentData };
    if (parsed.data.why) updatedData.why = parsed.data.why;
    if (parsed.data.how) updatedData.how = parsed.data.how;
    if (parsed.data.what) updatedData.what = parsed.data.what;

    const updated = await prisma.brandAsset.update({
      where: { id },
      data: {
        frameworkType: "GOLDEN_CIRCLE",
        frameworkData: updatedData as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ success: true, updatedAt: updated.updatedAt });
  } catch (error) {
    console.error("[PATCH /api/brand-assets/:id/golden-circle]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

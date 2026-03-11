import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { requireUnlocked } from "@/lib/lock-guard";
import { computeValidationPercentage, getCompletedMethodsCount } from "@/lib/validation-percentage";

// =============================================================
// GET /api/brand-assets/[id] — detail with research methods, versions, validation %
// =============================================================
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const asset = await prisma.brandAsset.findFirst({
      where: { id, workspaceId },
      include: {
        researchMethods: {
          orderBy: { method: "asc" },
        },
        lockedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const validationPercentage = computeValidationPercentage(asset.researchMethods);
    const completedMethods = getCompletedMethodsCount(asset.researchMethods);

    return NextResponse.json({
      ...asset,
      validationPercentage,
      completedMethods,
      totalMethods: asset.researchMethods.length,
    });
  } catch (error) {
    console.error("[GET /api/brand-assets/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// PATCH /api/brand-assets/[id] — update basic fields (description, etc.)
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
    const ALLOWED_STRING_FIELDS = ["description", "frameworkType"] as const;
    const data: Record<string, unknown> = {};

    for (const field of ALLOWED_STRING_FIELDS) {
      if (field in body && typeof body[field] === "string") {
        data[field] = body[field];
      }
    }

    // Allow frameworkData as object
    if ("frameworkData" in body && typeof body.frameworkData === "object" && body.frameworkData !== null) {
      data.frameworkData = body.frameworkData;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await prisma.brandAsset.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/brand-assets/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// DELETE /api/brand-assets/[id] — cascade delete
// =============================================================
export async function DELETE(
  _request: NextRequest,
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

    await prisma.brandAsset.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/brand-assets/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string }> };

// =============================================================
// GET /api/research/studies/[id] — study detail
// =============================================================
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const study = await prisma.researchStudy.findFirst({
      where: { id, workspaceId },
    });

    if (!study) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: study.id,
      title: study.title,
      method: study.method,
      progress: study.progress,
      status: study.status,
      personaId: study.personaId,
      brandAssetId: study.brandAssetId,
      lastActivityAt: study.lastActivityAt.toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/research/studies/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const updateStudySchema = z.object({
  progress: z.number().min(0).max(100).optional(),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "PENDING_REVIEW", "CANCELLED"]).optional(),
});

// =============================================================
// PATCH /api/research/studies/[id] — update study progress/status
// =============================================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateStudySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.issues }, { status: 400 });
    }

    const existing = await prisma.researchStudy.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      lastActivityAt: new Date(),
    };

    if (parsed.data.progress !== undefined) {
      updateData.progress = parsed.data.progress;
    }

    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status;
      if (parsed.data.status === "COMPLETED") {
        updateData.completedAt = new Date();
      }
    }

    const updated = await prisma.researchStudy.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      method: updated.method,
      progress: updated.progress,
      status: updated.status,
      personaId: updated.personaId,
      brandAssetId: updated.brandAssetId,
      lastActivityAt: updated.lastActivityAt.toISOString(),
    });
  } catch (error) {
    console.error("[PATCH /api/research/studies/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

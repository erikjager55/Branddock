import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string; interviewId: string }> };

// =============================================================
// GET /api/brand-assets/[id]/interviews/[interviewId]
// Interview detail + questions
// =============================================================
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id: assetId, interviewId } = await params;

    const interview = await prisma.interview.findFirst({
      where: { id: interviewId, brandAssetId: assetId, workspaceId },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
          include: { linkedAsset: { select: { id: true, name: true, category: true } } },
        },
        selectedAssets: {
          include: { brandAsset: { select: { id: true, name: true, category: true } } },
        },
      },
    });

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    return NextResponse.json({ interview });
  } catch (error) {
    console.error("[GET /api/brand-assets/:id/interviews/:interviewId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// PATCH /api/brand-assets/[id]/interviews/[interviewId]
// Update interview (contact/schedule/notes/step)
// =============================================================
const updateSchema = z.object({
  title: z.string().optional(),
  intervieweeName: z.string().optional(),
  intervieweePosition: z.string().optional(),
  intervieweeEmail: z.string().email().optional().or(z.literal("")),
  intervieweePhone: z.string().optional(),
  intervieweeCompany: z.string().optional(),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  durationMinutes: z.number().min(15).max(180).optional(),
  generalNotes: z.string().optional(),
  currentStep: z.number().min(1).max(5).optional(),
  completedSteps: z.array(z.number()).optional(),
  status: z.enum(["TO_SCHEDULE", "DRAFT", "SCHEDULED", "INTERVIEW_HELD", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "APPROVED", "CANCELLED"]).optional(),
}).strict();

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id: assetId, interviewId } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.interview.findFirst({
      where: { id: interviewId, brandAssetId: assetId, workspaceId },
      select: { id: true, isLocked: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }
    if (existing.isLocked) {
      return NextResponse.json({ error: "Interview is locked" }, { status: 409 });
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.scheduledDate) {
      data.scheduledDate = new Date(parsed.data.scheduledDate);
      if (parsed.data.status === undefined) {
        data.status = "SCHEDULED";
      }
    }

    const interview = await prisma.interview.update({
      where: { id: interviewId },
      data,
    });

    return NextResponse.json({ interview });
  } catch (error) {
    console.error("[PATCH /api/brand-assets/:id/interviews/:interviewId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// DELETE /api/brand-assets/[id]/interviews/[interviewId]
// Delete interview
// =============================================================
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id: assetId, interviewId } = await params;

    const existing = await prisma.interview.findFirst({
      where: { id: interviewId, brandAssetId: assetId, workspaceId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    await prisma.interview.delete({ where: { id: interviewId } });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/brand-assets/:id/interviews/:interviewId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

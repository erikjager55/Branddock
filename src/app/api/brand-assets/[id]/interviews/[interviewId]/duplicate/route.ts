import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string; interviewId: string }> };

// =============================================================
// POST /api/brand-assets/[id]/interviews/[interviewId]/duplicate
// Duplicate interview with questions
// =============================================================
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id: assetId, interviewId } = await params;

    const original = await prisma.interview.findFirst({
      where: { id: interviewId, brandAssetId: assetId, workspaceId },
      include: { questions: { orderBy: { orderIndex: "asc" } } },
    });
    if (!original) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const maxOrder = await prisma.interview.aggregate({
      where: { brandAssetId: assetId, workspaceId },
      _max: { orderNumber: true },
    });

    const session = await getServerSession();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const duplicate = await prisma.interview.create({
      data: {
        brandAssetId: assetId,
        workspaceId,
        createdById: userId,
        status: "DRAFT",
        title: original.title ? `${original.title} (Copy)` : null,
        orderNumber: (maxOrder._max.orderNumber ?? 0) + 1,
        intervieweeName: null,
        intervieweePosition: null,
        intervieweeEmail: null,
        intervieweePhone: null,
        intervieweeCompany: null,
        durationMinutes: original.durationMinutes,
        currentStep: 1,
        completedSteps: [],
        questions: {
          create: original.questions.map((q) => ({
            linkedAssetId: q.linkedAssetId,
            questionType: q.questionType,
            questionText: q.questionText,
            options: q.options,
            orderIndex: q.orderIndex,
            isFromTemplate: q.isFromTemplate,
            templateId: q.templateId,
          })),
        },
      },
      include: { questions: true },
    });

    return NextResponse.json({ interview: duplicate }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/brand-assets/:id/interviews/:interviewId/duplicate]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

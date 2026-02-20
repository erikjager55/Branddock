import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";

type RouteParams = { params: Promise<{ workshopId: string; stepNumber: string }> };

const updateStepSchema = z.object({
  response: z.string().optional(),
  isCompleted: z.boolean().optional(),
});

// =============================================================
// PATCH /api/workshops/[workshopId]/steps/[stepNumber]
// Save step response
// =============================================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { workshopId, stepNumber } = await params;
    const stepNum = parseInt(stepNumber, 10);

    if (isNaN(stepNum)) {
      return NextResponse.json({ error: "Invalid step number" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateStepSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const workshop = await prisma.workshop.findFirst({
      where: { id: workshopId, workspaceId },
      include: { steps: true },
    });

    if (!workshop) {
      return NextResponse.json({ error: "Workshop not found" }, { status: 404 });
    }

    const step = workshop.steps.find((s) => s.stepNumber === stepNum);
    if (!step) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.response !== undefined) updateData.response = parsed.data.response;
    if (parsed.data.isCompleted !== undefined) {
      updateData.isCompleted = parsed.data.isCompleted;
      if (parsed.data.isCompleted) updateData.completedAt = new Date();
    }

    const updated = await prisma.workshopStep.update({
      where: { id: step.id },
      data: updateData,
    });

    // Update workshop currentStep
    await prisma.workshop.update({
      where: { id: workshopId },
      data: { currentStep: stepNum },
    });

    // Calculate progress
    const allSteps = await prisma.workshopStep.findMany({
      where: { workshopId },
    });
    const completedSteps = allSteps.filter((s) => s.isCompleted).length;
    const progress = Math.round((completedSteps / allSteps.length) * 100);

    return NextResponse.json({ step: updated, progress });
  } catch (error) {
    console.error("[PATCH /api/workshops/:workshopId/steps/:stepNumber]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

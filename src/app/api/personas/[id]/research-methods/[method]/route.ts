import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

// Validation weights for computing validationPercentage
const VALIDATION_WEIGHTS: Record<string, number> = {
  AI_EXPLORATION: 0.15,
  INTERVIEWS: 0.30,
  QUESTIONNAIRE: 0.30,
  USER_TESTING: 0.25,
};

function computeValidationPercentage(
  researchMethods: { method: string; status: string }[]
): number {
  let total = 0;
  for (const rm of researchMethods) {
    if (rm.status === "COMPLETED") {
      const weight = VALIDATION_WEIGHTS[rm.method] ?? 0;
      total += weight * 100;
    }
  }
  return Math.round(total);
}

// PATCH /api/personas/[id]/research-methods/[method]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; method: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    await getServerSession();

    const { id, method } = await params;

    // Validate method is a valid PersonaResearchMethodType
    const validMethods = ["AI_EXPLORATION", "INTERVIEWS", "QUESTIONNAIRE", "USER_TESTING"];
    if (!validMethods.includes(method)) {
      return NextResponse.json(
        { error: `Invalid method. Must be one of: ${validMethods.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify persona exists in workspace
    const persona = await prisma.persona.findFirst({
      where: { id, workspaceId },
    });
    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const body = await request.json();
    const { status, progress } = body;

    if (!status || typeof status !== "string") {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 }
      );
    }

    // Find and update the research method
    const existingMethod = await prisma.personaResearchMethod.findFirst({
      where: { personaId: id, method: method as "AI_EXPLORATION" | "INTERVIEWS" | "QUESTIONNAIRE" | "USER_TESTING" },
    });

    if (!existingMethod) {
      return NextResponse.json(
        { error: "Research method not found for this persona" },
        { status: 404 }
      );
    }

    const updatedMethod = await prisma.personaResearchMethod.update({
      where: { id: existingMethod.id },
      data: {
        status: status as "AVAILABLE" | "IN_PROGRESS" | "COMPLETED" | "VALIDATED" | "NOT_STARTED",
        ...(progress !== undefined && { progress: Number(progress) }),
        ...(status === "COMPLETED" && { completedAt: new Date() }),
      },
    });

    // Recompute validation percentage
    const allMethods = await prisma.personaResearchMethod.findMany({
      where: { personaId: id },
    });

    const validationPercentage = computeValidationPercentage(
      allMethods.map((m) => ({ method: m.method, status: m.status }))
    );

    invalidateCache(cacheKeys.prefixes.personas(workspaceId));

    return NextResponse.json({
      method: {
        id: updatedMethod.id,
        method: updatedMethod.method,
        status: updatedMethod.status,
        progress: updatedMethod.progress,
        completedAt: updatedMethod.completedAt?.toISOString() ?? null,
        artifactsCount: updatedMethod.artifactsCount,
      },
      validationPercentage,
    });
  } catch (error) {
    console.error("[PATCH /api/personas/:id/research-methods/:method]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

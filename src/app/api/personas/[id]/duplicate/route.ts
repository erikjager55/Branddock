import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

// POST /api/personas/[id]/duplicate
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const original = await prisma.persona.findFirst({
      where: { id, workspaceId },
    });

    if (!original) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const persona = await prisma.persona.create({
      data: {
        name: `${original.name} (Copy)`,
        tagline: original.tagline,
        avatarUrl: original.avatarUrl,
        avatarSource: original.avatarSource,
        age: original.age,
        gender: original.gender,
        location: original.location,
        occupation: original.occupation,
        education: original.education,
        income: original.income,
        familyStatus: original.familyStatus,
        personalityType: original.personalityType,
        coreValues: original.coreValues,
        interests: original.interests,
        goals: original.goals,
        motivations: original.motivations,
        frustrations: original.frustrations,
        behaviors: original.behaviors,
        strategicImplications: original.strategicImplications,
        isLocked: false,
        lockedById: null,
        lockedAt: null,
        workspaceId,
        createdById: session.user.id,
        researchMethods: {
          create: [
            { method: "AI_EXPLORATION", status: "AVAILABLE", workspaceId },
            { method: "INTERVIEWS", status: "AVAILABLE", workspaceId },
            { method: "QUESTIONNAIRE", status: "AVAILABLE", workspaceId },
            { method: "USER_TESTING", status: "AVAILABLE", workspaceId },
          ],
        },
      },
      include: {
        researchMethods: true,
      },
    });

    invalidateCache(cacheKeys.prefixes.personas(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ persona }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/personas/:id/duplicate]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

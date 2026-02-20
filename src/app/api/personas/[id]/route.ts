import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { z } from "zod";
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

const updatePersonaSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tagline: z.string().max(200).optional(),
  age: z.string().max(20).optional(),
  gender: z.string().max(50).optional(),
  location: z.string().max(100).optional(),
  occupation: z.string().max(100).optional(),
  education: z.string().max(150).optional(),
  income: z.string().max(50).optional(),
  familyStatus: z.string().max(100).optional(),
  goals: z.array(z.string().max(500)).max(10).optional(),
  motivations: z.array(z.string().max(500)).optional(),
  frustrations: z.array(z.string().max(500)).optional(),
  behaviors: z.array(z.string().max(500)).optional(),
  coreValues: z.array(z.string().max(100)).max(10).optional(),
  interests: z.array(z.string().max(200)).optional(),
  personalityType: z.string().max(200).optional(),
});

// GET /api/personas/[id]
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

    const persona = await prisma.persona.findFirst({
      where: { id, workspaceId },
      include: {
        researchMethods: true,
        createdBy: { select: { name: true, avatarUrl: true } },
      },
    });

    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const validationPercentage = computeValidationPercentage(
      persona.researchMethods.map((m) => ({ method: m.method, status: m.status }))
    );

    return NextResponse.json({
      ...persona,
      validationPercentage,
      lockedAt: persona.lockedAt?.toISOString() ?? null,
      createdAt: persona.createdAt.toISOString(),
      updatedAt: persona.updatedAt.toISOString(),
      researchMethods: persona.researchMethods.map((m) => ({
        ...m,
        completedAt: m.completedAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[GET /api/personas/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/personas/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    await getServerSession();

    const { id } = await params;

    const existing = await prisma.persona.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updatePersonaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const persona = await prisma.persona.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.tagline !== undefined && { tagline: data.tagline }),
        ...(data.age !== undefined && { age: data.age }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.occupation !== undefined && { occupation: data.occupation }),
        ...(data.education !== undefined && { education: data.education }),
        ...(data.income !== undefined && { income: data.income }),
        ...(data.familyStatus !== undefined && { familyStatus: data.familyStatus }),
        ...(data.goals !== undefined && { goals: data.goals }),
        ...(data.motivations !== undefined && { motivations: data.motivations }),
        ...(data.frustrations !== undefined && { frustrations: data.frustrations }),
        ...(data.behaviors !== undefined && { behaviors: data.behaviors }),
        ...(data.coreValues !== undefined && { coreValues: data.coreValues }),
        ...(data.interests !== undefined && { interests: data.interests }),
        ...(data.personalityType !== undefined && { personalityType: data.personalityType }),
      },
      include: {
        researchMethods: true,
      },
    });

    invalidateCache(cacheKeys.prefixes.personas(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ persona });
  } catch (error) {
    console.error("[PATCH /api/personas/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/personas/[id]
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

    const existing = await prisma.persona.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    await prisma.persona.delete({ where: { id } });

    invalidateCache(cacheKeys.prefixes.personas(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/personas/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

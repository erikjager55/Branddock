import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";

// POST /api/personas/[id]/strategic-implications
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    await getServerSession();

    const { id } = await params;

    const persona = await prisma.persona.findFirst({
      where: { id, workspaceId },
    });
    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // Generate mock strategic implications text based on persona data
    const name = persona.name;
    const occupation = persona.occupation || "their profession";
    const location = persona.location || "their region";
    const personalityType = persona.personalityType || "their personality type";
    const coreValues = persona.coreValues || [];
    const frustrations = persona.frustrations || [];

    const valuesText =
      coreValues.length >= 2
        ? `${coreValues[0]} and ${coreValues[1]}`
        : coreValues.length === 1
          ? coreValues[0]
          : "their core values";

    const frustrationText =
      frustrations.length > 0
        ? frustrations[0]
        : "common industry challenges";

    const strategicImplications = `Based on ${name}'s profile as ${occupation} in ${location}, key strategic implications include: targeting ${personalityType} profiles who value ${valuesText}. Their frustrations with ${frustrationText} present opportunities for differentiation.`;

    const updated = await prisma.persona.update({
      where: { id },
      data: { strategicImplications },
    });

    return NextResponse.json({
      strategicImplications: updated.strategicImplications,
    });
  } catch (error) {
    console.error("[POST /api/personas/:id/strategic-implications]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

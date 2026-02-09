import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personaId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { personaId } = await params;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify persona exists
    const persona = await prisma.persona.findUnique({
      where: { id: personaId },
    });

    if (!persona) {
      return NextResponse.json(
        { error: "Persona not found" },
        { status: 404 }
      );
    }

    const analyses = await prisma.newAIAnalysis.findMany({
      where: { personaId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: analyses });
  } catch (error) {
    console.error("Error fetching AI analyses for persona:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI analyses" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ personaId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { personaId } = await params;

    // Get user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify persona exists
    const persona = await prisma.persona.findUnique({
      where: { id: personaId },
    });

    if (!persona) {
      return NextResponse.json(
        { error: "Persona not found" },
        { status: 404 }
      );
    }

    // Create new AI analysis for this persona
    const analysis = await prisma.newAIAnalysis.create({
      data: {
        type: "PERSONA_ANALYSIS",
        status: "IN_PROGRESS",
        progress: 0,
        dataPoints: 0,
        personaId,
        createdById: user.id,
      },
    });

    return NextResponse.json({ data: analysis }, { status: 201 });
  } catch (error) {
    console.error("Error creating AI analysis for persona:", error);
    return NextResponse.json(
      { error: "Failed to create AI analysis" },
      { status: 500 }
    );
  }
}

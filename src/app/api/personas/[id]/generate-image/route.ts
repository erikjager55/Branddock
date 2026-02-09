import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const persona = await prisma.persona.findUnique({
      where: { id, deletedAt: null },
      include: {
        workspace: {
          include: { members: true },
        },
      },
    });

    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // Check workspace access
    const hasAccess =
      persona.workspace.ownerId === user.id ||
      persona.workspace.members.some((m) => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Stub: return mock image URL with first letter of persona name
    const firstLetter = persona.name.charAt(0).toUpperCase();
    const imageUrl = `https://placeholder.co/400x400/10B981/FFFFFF?text=${firstLetter}`;

    // Update persona with the generated image URL
    await prisma.persona.update({
      where: { id },
      data: { imageUrl },
    });

    return NextResponse.json({ success: true, imageUrl });
  } catch (error) {
    console.error("Error generating persona image:", error);
    return NextResponse.json(
      { error: "Failed to generate persona image" },
      { status: 500 }
    );
  }
}

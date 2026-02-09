import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { updatePersonaSchema } from "@/lib/validations/persona";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const persona = await prisma.persona.findUnique({
      where: { id, deletedAt: null },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        aiAnalyses: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        products: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    return NextResponse.json(persona);
  } catch (error) {
    console.error("Error fetching persona:", error);
    return NextResponse.json(
      { error: "Failed to fetch persona" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updatePersonaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await prisma.persona.findUnique({
      where: { id, deletedAt: null },
      include: { workspace: { include: { members: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // Reject if persona is locked
    if (existing.isLocked) {
      return NextResponse.json(
        { error: "Persona is locked and cannot be edited" },
        { status: 403 }
      );
    }

    const hasAccess =
      existing.workspace.ownerId === user.id ||
      existing.workspace.members.some((m) => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const updateData: Prisma.PersonaUpdateInput = {};

    // String fields
    if (data.name !== undefined) updateData.name = data.name;
    if (data.tagline !== undefined) updateData.tagline = data.tagline;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.age !== undefined) updateData.age = data.age;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.occupation !== undefined) updateData.occupation = data.occupation;
    if (data.education !== undefined) updateData.education = data.education;
    if (data.income !== undefined) updateData.income = data.income;
    if (data.familyStatus !== undefined) updateData.familyStatus = data.familyStatus;
    if (data.personalityType !== undefined) updateData.personalityType = data.personalityType;

    // Numeric fields
    if (data.researchConfidence !== undefined) updateData.researchConfidence = data.researchConfidence;
    if (data.methodsCompleted !== undefined) updateData.methodsCompleted = data.methodsCompleted;

    // JSON fields
    if (data.coreValues !== undefined)
      updateData.coreValues = (data.coreValues ?? Prisma.DbNull) as Prisma.InputJsonValue;
    if (data.interests !== undefined)
      updateData.interests = (data.interests ?? Prisma.DbNull) as Prisma.InputJsonValue;
    if (data.goals !== undefined)
      updateData.goals = (data.goals ?? Prisma.DbNull) as Prisma.InputJsonValue;
    if (data.motivations !== undefined)
      updateData.motivations = (data.motivations ?? Prisma.DbNull) as Prisma.InputJsonValue;
    if (data.frustrations !== undefined)
      updateData.frustrations = (data.frustrations ?? Prisma.DbNull) as Prisma.InputJsonValue;
    if (data.painPoints !== undefined)
      updateData.painPoints = (data.painPoints ?? Prisma.DbNull) as Prisma.InputJsonValue;
    if (data.behaviors !== undefined)
      updateData.behaviors = (data.behaviors ?? Prisma.DbNull) as Prisma.InputJsonValue;
    if (data.strategicImplications !== undefined)
      updateData.strategicImplications = (data.strategicImplications ?? Prisma.DbNull) as Prisma.InputJsonValue;
    if (data.demographics !== undefined)
      updateData.demographics = (data.demographics ?? Prisma.DbNull) as Prisma.InputJsonValue;

    // Array field
    if (data.tags !== undefined) updateData.tags = data.tags ?? [];

    const updated = await prisma.persona.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        aiAnalyses: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        products: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating persona:", error);
    return NextResponse.json(
      { error: "Failed to update persona" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const existing = await prisma.persona.findUnique({
      where: { id, deletedAt: null },
      include: { workspace: { include: { members: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const hasAccess =
      existing.workspace.ownerId === user.id ||
      existing.workspace.members.some(
        (m) =>
          m.userId === user.id &&
          (m.role === "OWNER" || m.role === "ADMIN")
      );

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Soft delete
    await prisma.persona.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting persona:", error);
    return NextResponse.json(
      { error: "Failed to delete persona" },
      { status: 500 }
    );
  }
}

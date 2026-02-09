import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { updateContentSchema } from "@/lib/validations/content";

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

    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        campaign: { select: { id: true, name: true } },
      },
    });

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    return NextResponse.json(content);
  } catch (error) {
    console.error("Error fetching content:", error);
    return NextResponse.json(
      { error: "Failed to fetch content" },
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
    const parsed = updateContentSchema.safeParse(body);

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

    const existing = await prisma.content.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const hasAccess =
      existing.workspace.ownerId === user.id ||
      existing.workspace.members.some((m) => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const updateData: Prisma.ContentUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.body !== undefined) updateData.body = data.body;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.onBrand !== undefined) updateData.onBrand = data.onBrand;
    if (data.brandScore !== undefined) updateData.brandScore = data.brandScore;
    if (data.wordCount !== undefined) updateData.wordCount = data.wordCount;
    if (data.campaignId !== undefined) {
      if (data.campaignId === null) {
        updateData.campaign = { disconnect: true };
      } else {
        updateData.campaign = { connect: { id: data.campaignId } };
      }
    }

    const updated = await prisma.content.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        campaign: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating content:", error);
    return NextResponse.json(
      { error: "Failed to update content" },
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

    const existing = await prisma.content.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
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

    await prisma.content.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting content:", error);
    return NextResponse.json(
      { error: "Failed to delete content" },
      { status: 500 }
    );
  }
}

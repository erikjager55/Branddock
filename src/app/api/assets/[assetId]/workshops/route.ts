import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { createWorkshopSchema } from "@/lib/validations/workshop";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assetId } = await params;

    // Verify asset exists
    const asset = await prisma.brandAsset.findUnique({
      where: { id: assetId },
      select: { id: true, name: true, type: true, category: true, workspaceId: true },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const workshops = await prisma.workshop.findMany({
      where: { assetId },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            type: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: workshops, asset });
  } catch (error) {
    console.error("Error fetching workshops:", error);
    return NextResponse.json(
      { error: "Failed to fetch workshops" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assetId } = await params;
    const body = await request.json();
    const parsed = createWorkshopSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Get user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify asset exists and user has access via workspace
    const asset = await prisma.brandAsset.findUnique({
      where: { id: assetId },
      include: {
        workspace: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const hasAccess =
      asset.workspace.ownerId === user.id ||
      asset.workspace.members.some((member) => member.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Determine status based on purchase
    const isPurchased = data.purchaseAmount != null && data.purchaseAmount > 0;

    const workshop = await prisma.workshop.create({
      data: {
        title: data.title,
        type: data.type,
        bundle: data.bundle,
        hasFacilitator: data.hasFacilitator,
        purchaseAmount: data.purchaseAmount,
        totalSteps: data.totalSteps,
        objectives: data.objectives as Prisma.InputJsonValue ?? undefined,
        agenda: data.agenda as Prisma.InputJsonValue ?? undefined,
        status: isPurchased ? "PURCHASED" : "DRAFT",
        purchasedAt: isPurchased ? new Date() : null,
        assetId,
        createdById: user.id,
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            type: true,
            category: true,
          },
        },
      },
    });

    return NextResponse.json(workshop, { status: 201 });
  } catch (error) {
    console.error("Error creating workshop:", error);
    return NextResponse.json(
      { error: "Failed to create workshop" },
      { status: 500 }
    );
  }
}

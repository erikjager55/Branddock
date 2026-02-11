import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthOrFallback } from "@/lib/auth-dev";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthOrFallback();
    if (!authResult) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
    }

    const { id } = await params;

    const original = await prisma.brandAsset.findUnique({
      where: { id },
    });

    if (!original) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const duplicate = await prisma.brandAsset.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        type: original.type,
        category: original.category,
        status: "DRAFT",
        content: original.content ?? undefined,
        workspaceId: original.workspaceId,
        createdBy: authResult.user.id,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        workspace: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(duplicate, { status: 201 });
  } catch (error) {
    console.error("Error duplicating brand asset:", error);
    return NextResponse.json(
      { error: "Failed to duplicate brand asset" },
      { status: 500 }
    );
  }
}

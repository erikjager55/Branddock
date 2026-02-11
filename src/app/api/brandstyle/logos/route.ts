import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthOrFallback } from "@/lib/auth-dev";

export async function POST(request: NextRequest) {
  try {
    const authData = await getAuthOrFallback();
    if (!authData) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const styleguide = await prisma.brandStyleguide.findUnique({
      where: { workspaceId: authData.workspaceId },
    });
    if (!styleguide) {
      return NextResponse.json({ error: "Styleguide not found" }, { status: 404 });
    }

    const body = await request.json();
    const { variant, label, description, imageUrl, backgroundColor } = body;

    if (!label) {
      return NextResponse.json({ error: "label is required" }, { status: 400 });
    }

    const maxSort = await prisma.styleguideLogo.findFirst({
      where: { styleguideId: styleguide.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const logo = await prisma.styleguideLogo.create({
      data: {
        variant: variant || "PRIMARY",
        label,
        description,
        imageUrl,
        backgroundColor,
        sortOrder: (maxSort?.sortOrder ?? -1) + 1,
        styleguideId: styleguide.id,
      },
    });

    return NextResponse.json({ data: logo }, { status: 201 });
  } catch (error) {
    console.error("Error creating logo:", error);
    return NextResponse.json({ error: "Failed to create logo" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.styleguideLogo.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting logo:", error);
    return NextResponse.json({ error: "Failed to delete logo" }, { status: 500 });
  }
}

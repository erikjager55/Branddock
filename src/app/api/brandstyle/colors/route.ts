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
    const { name, hex, rgb, hsl, cmyk, tags, category, notes } = body;

    if (!name || !hex) {
      return NextResponse.json({ error: "name and hex are required" }, { status: 400 });
    }

    const maxSort = await prisma.styleguideColor.findFirst({
      where: { styleguideId: styleguide.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const color = await prisma.styleguideColor.create({
      data: {
        name,
        hex,
        rgb,
        hsl,
        cmyk,
        tags,
        category: category || "PRIMARY",
        notes,
        sortOrder: (maxSort?.sortOrder ?? -1) + 1,
        styleguideId: styleguide.id,
      },
    });

    return NextResponse.json({ data: color }, { status: 201 });
  } catch (error) {
    console.error("Error creating color:", error);
    return NextResponse.json({ error: "Failed to create color" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updated = await prisma.styleguideColor.update({
      where: { id },
      data,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error updating color:", error);
    return NextResponse.json({ error: "Failed to update color" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.styleguideColor.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting color:", error);
    return NextResponse.json({ error: "Failed to delete color" }, { status: 500 });
  }
}

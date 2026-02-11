import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthOrFallback } from "@/lib/auth-dev";

export async function GET() {
  try {
    const authData = await getAuthOrFallback();
    if (!authData) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const styleguide = await prisma.brandStyleguide.findUnique({
      where: { workspaceId: authData.workspaceId },
      include: {
        logos: { orderBy: { sortOrder: "asc" } },
        colors: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ data: styleguide });
  } catch (error) {
    console.error("Error fetching styleguide:", error);
    return NextResponse.json(
      { error: "Failed to fetch styleguide" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authData = await getAuthOrFallback();
    if (!authData) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();

    const styleguide = await prisma.brandStyleguide.findUnique({
      where: { workspaceId: authData.workspaceId },
    });

    if (!styleguide) {
      return NextResponse.json(
        { error: "Styleguide not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "name",
      "primaryFont",
      "secondaryFont",
      "typeScale",
      "contentGuidelines",
      "writingGuidelines",
      "examplePhrases",
      "photographyGuidelines",
      "illustrationGuidelines",
      "imageryDonts",
      "photographyExamples",
      "logoUsageGuidelines",
      "logoDonts",
      "colorDonts",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updated = await prisma.brandStyleguide.update({
      where: { id: styleguide.id },
      data: updateData,
      include: {
        logos: { orderBy: { sortOrder: "asc" } },
        colors: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error updating styleguide:", error);
    return NextResponse.json(
      { error: "Failed to update styleguide" },
      { status: 500 }
    );
  }
}

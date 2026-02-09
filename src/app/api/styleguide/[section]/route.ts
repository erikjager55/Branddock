import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";

const VALID_SECTIONS = [
  "logo",
  "colors",
  "typography",
  "toneOfVoice",
  "imagery",
] as const;

type StyleguideSection = (typeof VALID_SECTIONS)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { section } = await params;

    // Validate section name
    if (!VALID_SECTIONS.includes(section as StyleguideSection)) {
      return NextResponse.json(
        {
          error: `Invalid section "${section}". Valid sections: ${VALID_SECTIONS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Body must be a JSON object" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find user's workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 403 }
      );
    }

    const styleguide = await prisma.brandStyleguide.findFirst({
      where: { workspaceId: workspace.id },
    });

    if (!styleguide) {
      return NextResponse.json(
        { error: "Styleguide not found" },
        { status: 404 }
      );
    }

    // Update only the specified section
    const updateData: Prisma.BrandStyleguideUpdateInput = {
      [section]: body as Prisma.InputJsonValue,
    };

    const updated = await prisma.brandStyleguide.update({
      where: { id: styleguide.id },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error updating styleguide section:", error);
    return NextResponse.json(
      { error: "Failed to update styleguide section" },
      { status: 500 }
    );
  }
}

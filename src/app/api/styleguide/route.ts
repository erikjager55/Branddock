import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import {
  createStyleguideSchema,
  updateStyleguideSchema,
} from "@/lib/validations/styleguide";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;

    // Get workspaceId: from query params, or derive from user session
    let workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email! },
        include: {
          memberships: { select: { workspaceId: true }, take: 1 },
          ownedWorkspaces: { select: { id: true }, take: 1 },
        },
      });
      workspaceId = user?.memberships[0]?.workspaceId ?? user?.ownedWorkspaces[0]?.id ?? null;
    }
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 400 }
      );
    }

    const styleguide = await prisma.brandStyleguide.findFirst({
      where: { workspaceId },
    });

    return NextResponse.json({ data: styleguide ?? null });
  } catch (error) {
    console.error("Error fetching styleguide:", error);
    return NextResponse.json(
      { error: "Failed to fetch styleguide" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createStyleguideSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
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

    // Only one styleguide per workspace
    const existing = await prisma.brandStyleguide.findFirst({
      where: { workspaceId: workspace.id },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Styleguide already exists for this workspace" },
        { status: 409 }
      );
    }

    const styleguide = await prisma.brandStyleguide.create({
      data: {
        sourceUrl: data.sourceUrl,
        sourceType: data.sourceType,
        logo: (data.logo || undefined) as Prisma.InputJsonValue | undefined,
        colors: (data.colors || undefined) as
          | Prisma.InputJsonValue
          | undefined,
        typography: (data.typography || undefined) as
          | Prisma.InputJsonValue
          | undefined,
        toneOfVoice: (data.toneOfVoice || undefined) as
          | Prisma.InputJsonValue
          | undefined,
        imagery: (data.imagery || undefined) as
          | Prisma.InputJsonValue
          | undefined,
        workspaceId: workspace.id,
        createdById: user.id,
      },
    });

    return NextResponse.json({ data: styleguide }, { status: 201 });
  } catch (error) {
    console.error("Error creating styleguide:", error);
    return NextResponse.json(
      { error: "Failed to create styleguide" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateStyleguideSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
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

    // Build update data — only include provided fields
    const updateData: Prisma.BrandStyleguideUpdateInput = {};
    if (data.sourceUrl !== undefined) updateData.sourceUrl = data.sourceUrl;
    if (data.sourceType !== undefined) updateData.sourceType = data.sourceType;
    if (data.logo !== undefined)
      updateData.logo = data.logo as Prisma.InputJsonValue;
    if (data.colors !== undefined)
      updateData.colors = data.colors as Prisma.InputJsonValue;
    if (data.typography !== undefined)
      updateData.typography = data.typography as Prisma.InputJsonValue;
    if (data.toneOfVoice !== undefined)
      updateData.toneOfVoice = data.toneOfVoice as Prisma.InputJsonValue;
    if (data.imagery !== undefined)
      updateData.imagery = data.imagery as Prisma.InputJsonValue;

    const updated = await prisma.brandStyleguide.update({
      where: { id: styleguide.id },
      data: updateData,
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

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createStyleguideSchema,
  updateStyleguideSchema,
} from "@/lib/validations/styleguide";
import { getAuthOrFallback } from "@/lib/auth-dev";

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthOrFallback();
    if (!authResult) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;

    const workspaceId = searchParams.get("workspaceId") || authResult.workspaceId;

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
    const authResult = await getAuthOrFallback();
    if (!authResult) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
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

    // Only one styleguide per workspace
    const existing = await prisma.brandStyleguide.findFirst({
      where: { workspaceId: authResult.workspaceId },
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
        workspaceId: authResult.workspaceId,
        createdById: authResult.user.id,
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
    const authResult = await getAuthOrFallback();
    if (!authResult) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
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

    const styleguide = await prisma.brandStyleguide.findFirst({
      where: { workspaceId: authResult.workspaceId },
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

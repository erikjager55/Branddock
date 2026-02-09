import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { createContentSchema } from "@/lib/validations/content";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspaceId");
    const campaignId = searchParams.get("campaignId");
    const type = searchParams.get("type") as string | null;
    const status = searchParams.get("status") as string | null;
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    const where: Prisma.ContentWhereInput = {
      workspaceId,
      ...(campaignId && { campaignId }),
      ...(type && { type: type as Prisma.EnumContentTypeFilter["equals"] }),
      ...(status && { status: status as Prisma.EnumContentStatusFilter["equals"] }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { body: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [content, total] = await Promise.all([
      prisma.content.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          campaign: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.content.count({ where }),
    ]);

    return NextResponse.json({ data: content, total, limit, offset });
  } catch (error) {
    console.error("Error fetching content:", error);
    return NextResponse.json(
      { error: "Failed to fetch content" },
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
    const parsed = createContentSchema.safeParse(body);

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

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: data.workspaceId,
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

    const content = await prisma.content.create({
      data: {
        title: data.title,
        body: data.body,
        type: data.type,
        status: data.status,
        onBrand: data.onBrand,
        brandScore: data.brandScore,
        wordCount: data.wordCount,
        campaignId: data.campaignId,
        workspaceId: data.workspaceId,
        createdById: user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        campaign: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(content, { status: 201 });
  } catch (error) {
    console.error("Error creating content:", error);
    return NextResponse.json(
      { error: "Failed to create content" },
      { status: 500 }
    );
  }
}

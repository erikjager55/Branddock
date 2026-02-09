import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { createContentSchema } from "@/lib/validations/content";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: campaignId } = await params;

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") as string | null;
    const status = searchParams.get("status") as string | null;
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify campaign exists and user has workspace access
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { workspace: { include: { members: true } } },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const hasAccess =
      campaign.workspace.ownerId === user.id ||
      campaign.workspace.members.some((m) => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const where: Prisma.ContentWhereInput = {
      campaignId,
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
    console.error("Error fetching campaign contents:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign contents" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: campaignId } = await params;
    const body = await request.json();

    // Override campaignId from URL params; remove workspaceId requirement for nested route
    const parsed = createContentSchema.safeParse({
      ...body,
      campaignId,
    });

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

    // Verify campaign exists and user has workspace access
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { workspace: { include: { members: true } } },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const hasAccess =
      campaign.workspace.ownerId === user.id ||
      campaign.workspace.members.some((m) => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const content = await prisma.content.create({
      data: {
        title: data.title,
        body: data.body,
        type: data.type,
        status: data.status,
        format: data.format,
        channel: data.channel,
        onBrand: data.onBrand,
        brandScore: data.brandScore,
        wordCount: data.wordCount,
        campaignId,
        workspaceId: campaign.workspaceId,
        createdById: user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        campaign: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(content, { status: 201 });
  } catch (error) {
    console.error("Error creating content in campaign:", error);
    return NextResponse.json(
      { error: "Failed to create content" },
      { status: 500 }
    );
  }
}

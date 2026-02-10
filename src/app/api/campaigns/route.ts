import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { createCampaignSchema } from "@/lib/validations/campaign";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as string | null;
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

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

    const where: Prisma.CampaignWhereInput = {
      workspaceId,
      ...(status && { status: status as Prisma.EnumCampaignStatusFilter["equals"] }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { content: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.campaign.count({ where }),
    ]);

    return NextResponse.json({ data: campaigns, total, limit, offset });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
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
    const parsed = createCampaignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: { select: { workspaceId: true }, take: 1 },
        ownedWorkspaces: { select: { id: true }, take: 1 },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const workspaceId = data.workspaceId ?? user.memberships[0]?.workspaceId ?? user.ownedWorkspaces[0]?.id;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        description: data.description,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        workspaceId,
        createdById: user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { content: true } },
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}

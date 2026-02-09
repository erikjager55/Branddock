import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { z } from "zod";

const insightTypeEnum = z.enum(["TREND", "COMPETITOR", "INDUSTRY"]);

const createInsightSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  source: z.string().max(500).optional(),
  type: insightTypeEnum,
  summary: z.string().max(2000).optional(),
  content: z.string().max(50000).optional(),
  workspaceId: z.string().uuid("Invalid workspace ID"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspaceId");
    const type = searchParams.get("type") as string | null;
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    const where: Prisma.MarketInsightWhereInput = {
      workspaceId,
      ...(type && { type: type as Prisma.EnumInsightTypeFilter["equals"] }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { summary: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [insights, total] = await Promise.all([
      prisma.marketInsight.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.marketInsight.count({ where }),
    ]);

    return NextResponse.json({ data: insights, total, limit, offset });
  } catch (error) {
    console.error("Error fetching market insights:", error);
    return NextResponse.json(
      { error: "Failed to fetch market insights" },
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
    const parsed = createInsightSchema.safeParse(body);

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

    const insight = await prisma.marketInsight.create({
      data: {
        title: data.title,
        source: data.source,
        type: data.type,
        summary: data.summary,
        content: data.content,
        workspaceId: data.workspaceId,
        createdById: user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(insight, { status: 201 });
  } catch (error) {
    console.error("Error creating market insight:", error);
    return NextResponse.json(
      { error: "Failed to create market insight" },
      { status: 500 }
    );
  }
}

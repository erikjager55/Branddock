import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { z } from "zod";

const goalStatusEnum = z.enum(["ON_TRACK", "BEHIND", "COMPLETED"]);

const createGoalSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  targetValue: z.number().min(0),
  currentValue: z.number().min(0).optional().default(0),
  unit: z.string().min(1, "Unit is required").max(50),
  deadline: z.string().datetime().optional().nullable(),
  status: goalStatusEnum.optional().default("ON_TRACK"),
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
    const status = searchParams.get("status") as string | null;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    const where: Prisma.GoalWhereInput = {
      workspaceId,
      ...(status && { status: status as Prisma.EnumGoalStatusFilter["equals"] }),
    };

    const [goals, total] = await Promise.all([
      prisma.goal.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { deadline: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.goal.count({ where }),
    ]);

    return NextResponse.json({ data: goals, total, limit, offset });
  } catch (error) {
    console.error("Error fetching goals:", error);
    return NextResponse.json(
      { error: "Failed to fetch goals" },
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
    const parsed = createGoalSchema.safeParse(body);

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

    const goal = await prisma.goal.create({
      data: {
        title: data.title,
        targetValue: data.targetValue,
        currentValue: data.currentValue,
        unit: data.unit,
        deadline: data.deadline ? new Date(data.deadline) : null,
        status: data.status,
        workspaceId: data.workspaceId,
        createdById: user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error("Error creating goal:", error);
    return NextResponse.json(
      { error: "Failed to create goal" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createStrategySchema } from "@/lib/validations/strategy";
import { getAuthOrFallback } from "@/lib/auth-dev";

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthOrFallback();
    if (!authResult) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const workspaceId = searchParams.get("workspaceId") || authResult.workspaceId;

    const where: Prisma.BusinessStrategyWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(type && { type }),
      ...(status && { status }),
    };

    const [strategies, total] = await Promise.all([
      prisma.businessStrategy.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.businessStrategy.count({ where }),
    ]);

    return NextResponse.json({ data: strategies, total, limit, offset });
  } catch (error) {
    console.error("Error fetching strategies:", error);
    return NextResponse.json(
      { error: "Failed to fetch strategies" },
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
    const parsed = createStrategySchema.safeParse(body);

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
    const workspaceId = data.workspaceId || authResult.workspaceId;

    const strategy = await prisma.businessStrategy.create({
      data: {
        type: data.type,
        title: data.title,
        description: data.description,
        status: data.status,
        content: (data.content || undefined) as
          | Prisma.InputJsonValue
          | undefined,
        workspaceId,
        createdById: authResult.user.id,
      },
    });

    return NextResponse.json({ data: strategy }, { status: 201 });
  } catch (error) {
    console.error("Error creating strategy:", error);
    return NextResponse.json(
      { error: "Failed to create strategy" },
      { status: 500 }
    );
  }
}

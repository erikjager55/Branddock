import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { createPersonaSchema } from "@/lib/validations/persona";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
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

    const where: Prisma.PersonaWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { tagline: { contains: search, mode: "insensitive" as const } },
          { role: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [personas, total] = await Promise.all([
      prisma.persona.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          _count: {
            select: {
              aiAnalyses: true,
              products: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.persona.count({ where }),
    ]);

    return NextResponse.json({ data: personas, total, limit, offset });
  } catch (error) {
    console.error("Error fetching personas:", error);
    return NextResponse.json(
      { error: "Failed to fetch personas" },
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
    const parsed = createPersonaSchema.safeParse(body);

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

    const persona = await prisma.persona.create({
      data: {
        name: data.name,
        tagline: data.tagline,
        role: data.role,
        description: data.description,
        avatar: data.avatar,
        imageUrl: data.imageUrl,
        age: data.age,
        gender: data.gender,
        location: data.location,
        occupation: data.occupation,
        education: data.education,
        income: data.income,
        familyStatus: data.familyStatus,
        personalityType: data.personalityType,
        coreValues: (data.coreValues || undefined) as Prisma.InputJsonValue | undefined,
        interests: (data.interests || undefined) as Prisma.InputJsonValue | undefined,
        goals: (data.goals || undefined) as Prisma.InputJsonValue | undefined,
        motivations: (data.motivations || undefined) as Prisma.InputJsonValue | undefined,
        frustrations: (data.frustrations || undefined) as Prisma.InputJsonValue | undefined,
        painPoints: (data.painPoints || undefined) as Prisma.InputJsonValue | undefined,
        behaviors: (data.behaviors || undefined) as Prisma.InputJsonValue | undefined,
        tags: data.tags || [],
        workspaceId,
        createdById: user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            aiAnalyses: true,
            products: true,
          },
        },
      },
    });

    return NextResponse.json(persona, { status: 201 });
  } catch (error) {
    console.error("Error creating persona:", error);
    return NextResponse.json(
      { error: "Failed to create persona" },
      { status: 500 }
    );
  }
}

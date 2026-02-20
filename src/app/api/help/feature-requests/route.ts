import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-server";
import { z } from "zod";

const submitFeatureRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().default(""),
});

export async function GET() {
  try {
    const requests = await prisma.featureRequest.findMany({
      orderBy: { voteCount: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        voteCount: true,
        createdAt: true,
        submittedBy: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("[GET /api/help/feature-requests]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = submitFeatureRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const featureRequest = await prisma.featureRequest.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        submittedById: session.user.id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        voteCount: true,
        createdAt: true,
      },
    });

    return NextResponse.json(featureRequest, { status: 201 });
  } catch (error) {
    console.error("[POST /api/help/feature-requests]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string }> };

// =============================================================
// GET /api/brand-assets/[id]/interviews/templates
// Get interview question templates, optionally filtered by category
// =============================================================
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    await params; // validate route params exist

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const where: Record<string, unknown> = {
      OR: [{ workspaceId }, { workspaceId: null }],
    };
    if (category) {
      where.category = category;
    }

    const templates = await prisma.interviewQuestionTemplate.findMany({
      where,
      orderBy: [{ category: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("[GET /api/brand-assets/:id/interviews/templates]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

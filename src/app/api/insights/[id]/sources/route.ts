import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

type RouteParams = { params: Promise<{ id: string }> };

const addSourceSchema = z.object({
  name: z.string().min(1, "name is required"),
  url: z.string().url("url must be a valid URL"),
});

// =============================================================
// POST /api/insights/:id/sources — add source URL
// =============================================================
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = addSourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Verify insight belongs to workspace
    const insight = await prisma.marketInsight.findFirst({
      where: { id, workspaceId },
    });
    if (!insight) {
      return NextResponse.json({ error: "Insight not found" }, { status: 404 });
    }

    const source = await prisma.insightSourceUrl.create({
      data: {
        name: parsed.data.name,
        url: parsed.data.url,
        insightId: id,
      },
    });

    invalidateCache(cacheKeys.prefixes.insights(workspaceId));

    return NextResponse.json(
      { id: source.id, name: source.name, url: source.url },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/insights/:id/sources]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

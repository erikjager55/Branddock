import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

type RouteParams = { params: Promise<{ id: string }> };

const dismissSchema = z.object({
  reason: z.string().optional(),
});

// =============================================================
// POST /api/alignment/issues/:id/dismiss — dismiss issue
// =============================================================
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = dismissSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.alignmentIssue.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }
    if (existing.status !== "OPEN") {
      return NextResponse.json(
        { error: `Issue is already ${existing.status.toLowerCase()}` },
        { status: 409 }
      );
    }

    const issue = await prisma.alignmentIssue.update({
      where: { id },
      data: {
        status: "DISMISSED",
        dismissedAt: new Date(),
        dismissReason: parsed.data.reason ?? null,
      },
    });

    invalidateCache(cacheKeys.prefixes.alignment(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({
      id: issue.id,
      status: issue.status,
      dismissedAt: issue.dismissedAt?.toISOString() ?? null,
      dismissReason: issue.dismissReason,
    });
  } catch (error) {
    console.error("[POST /api/alignment/issues/:id/dismiss]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

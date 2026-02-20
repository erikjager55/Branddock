import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string }> };

// =============================================================
// GET /api/alignment/issues/:id — issue detail
// =============================================================
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const issue = await prisma.alignmentIssue.findFirst({
      where: { id, workspaceId },
      include: {
        scan: {
          select: {
            id: true,
            score: true,
            status: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: issue.id,
      severity: issue.severity,
      title: issue.title,
      modulePath: issue.modulePath,
      description: issue.description,
      conflictsWith: issue.conflictsWith,
      recommendation: issue.recommendation,
      status: issue.status,
      dismissedAt: issue.dismissedAt?.toISOString() ?? null,
      dismissReason: issue.dismissReason,
      fixAppliedAt: issue.fixAppliedAt?.toISOString() ?? null,
      fixOption: issue.fixOption,
      sourceItemId: issue.sourceItemId,
      sourceItemType: issue.sourceItemType,
      targetItemId: issue.targetItemId,
      targetItemType: issue.targetItemType,
      scanId: issue.scanId,
      scan: {
        id: issue.scan.id,
        score: issue.scan.score,
        status: issue.scan.status,
        startedAt: issue.scan.startedAt.toISOString(),
        completedAt: issue.scan.completedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("[GET /api/alignment/issues/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

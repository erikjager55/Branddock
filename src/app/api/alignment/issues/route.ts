import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { ALIGNMENT_ISSUE_LIST_SELECT } from "@/lib/db/queries";
import { setCache, cachedJson } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";

// =============================================================
// GET /api/alignment/issues — open issues with filters
// Filters: severity, module, status
// =============================================================
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const severity = searchParams.get("severity");
    const module = searchParams.get("module");
    const status = searchParams.get("status");

    // Cache default request (OPEN issues, no filters)
    const isUnfiltered = !severity && !module && !status;
    if (isUnfiltered) {
      const hit = cachedJson(cacheKeys.alignment.issues(workspaceId));
      if (hit) return hit;
    }

    const where: Record<string, unknown> = { workspaceId };
    if (severity) where.severity = severity;
    if (status) {
      where.status = status;
    } else {
      where.status = "OPEN"; // default to open issues
    }
    if (module) {
      where.modulePath = { startsWith: module };
    }

    const issues = await prisma.alignmentIssue.findMany({
      where,
      orderBy: [
        { severity: "asc" }, // CRITICAL first (alphabetical: CRITICAL < SUGGESTION < WARNING)
        { title: "asc" },
      ],
      select: {
        ...ALIGNMENT_ISSUE_LIST_SELECT,
        scan: { select: { id: true, score: true, startedAt: true } },
      },
    });

    // Count by severity
    const bySeverity = {
      critical: issues.filter((i) => i.severity === "CRITICAL").length,
      warning: issues.filter((i) => i.severity === "WARNING").length,
      suggestion: issues.filter((i) => i.severity === "SUGGESTION").length,
    };

    const responseData = {
      issues: issues.map((i) => ({
        id: i.id,
        severity: i.severity,
        title: i.title,
        modulePath: i.modulePath,
        description: i.description,
        conflictsWith: i.conflictsWith,
        recommendation: i.recommendation,
        status: i.status,
        dismissedAt: i.dismissedAt?.toISOString() ?? null,
        dismissReason: i.dismissReason,
        fixAppliedAt: i.fixAppliedAt?.toISOString() ?? null,
        fixOption: i.fixOption,
        sourceItemId: i.sourceItemId,
        sourceItemType: i.sourceItemType,
        targetItemId: i.targetItemId,
        targetItemType: i.targetItemType,
        scanId: i.scanId,
      })),
      stats: {
        total: issues.length,
        bySeverity,
      },
    };

    if (isUnfiltered) {
      setCache(cacheKeys.alignment.issues(workspaceId), responseData, CACHE_TTL.OVERVIEW);
    }

    return NextResponse.json(responseData, {
      headers: isUnfiltered ? { 'X-Cache': 'MISS' } : {},
    });
  } catch (error) {
    console.error("[GET /api/alignment/issues]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { runScan } from "@/lib/alignment/scanner";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

// =============================================================
// POST /api/alignment/scan — start new scan (multi-step)
// Creates a RUNNING scan, then runs 8-step simulation in background
// =============================================================
export async function POST() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    // Create scan record in RUNNING state
    const scan = await prisma.alignmentScan.create({
      data: {
        score: 0,
        totalItems: 0,
        alignedCount: 0,
        reviewCount: 0,
        misalignedCount: 0,
        status: "RUNNING",
        workspaceId,
      },
    });

    // Start scan in background (fire-and-forget)
    runScan(scan.id, workspaceId).catch((err) => {
      console.error("[Scanner] Background scan failed:", err);
      // Try to mark as FAILED
      prisma.alignmentScan
        .update({
          where: { id: scan.id },
          data: { status: "FAILED" },
        })
        .catch(() => {});
    });

    invalidateCache(cacheKeys.prefixes.alignment(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json(
      { scanId: scan.id, status: "RUNNING" as const },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/alignment/scan]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

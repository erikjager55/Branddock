import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { AssetStatsResponse } from "@/types/brand-asset";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    // Run all stat queries in parallel for efficiency
    const [
      total,
      byCategory,
      byStatus,
      avgResult,
      lockedCount,
    ] = await Promise.all([
      // Total count
      prisma.brandAsset.count({
        where: { workspaceId },
      }),

      // Group by category
      prisma.brandAsset.groupBy({
        by: ["category"],
        where: { workspaceId },
        _count: { id: true },
      }),

      // Group by status
      prisma.brandAsset.groupBy({
        by: ["status"],
        where: { workspaceId },
        _count: { id: true },
      }),

      // Average validation score
      prisma.brandAsset.aggregate({
        where: { workspaceId },
        _avg: { validationScore: true },
      }),

      // Locked count
      prisma.brandAsset.count({
        where: { workspaceId, isLocked: true },
      }),
    ]);

    // Transform groupBy results into record format
    const byCategoryMap: Record<string, number> = {};
    for (const group of byCategory) {
      byCategoryMap[group.category] = group._count.id;
    }

    const byStatusMap: Record<string, number> = {};
    for (const group of byStatus) {
      byStatusMap[group.status] = group._count.id;
    }

    const response: AssetStatsResponse = {
      total,
      byCategory: byCategoryMap,
      byStatus: byStatusMap,
      avgValidationScore: avgResult._avg.validationScore ?? 0,
      lockedCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching brand asset stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand asset stats" },
      { status: 500 }
    );
  }
}

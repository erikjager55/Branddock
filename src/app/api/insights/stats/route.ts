import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/insights/stats
// Returns: { active, highImpact, newThisMonth }
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [active, highImpact, newThisMonth] = await Promise.all([
      prisma.marketInsight.count({ where: { workspaceId } }),
      prisma.marketInsight.count({ where: { workspaceId, impactLevel: "HIGH" } }),
      prisma.marketInsight.count({ where: { workspaceId, createdAt: { gte: monthStart } } }),
    ]);

    return NextResponse.json({ active, highImpact, newThisMonth });
  } catch (error) {
    console.error("[GET /api/insights/stats]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

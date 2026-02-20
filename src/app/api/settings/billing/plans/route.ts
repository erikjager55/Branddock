import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/settings/billing/plans
// Returns all plans sorted by sortOrder, with isCurrentPlan flag
// =============================================================
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const [allPlans, subscription] = await Promise.all([
      prisma.plan.findMany({
        orderBy: { sortOrder: "asc" },
      }),
      prisma.subscription.findUnique({
        where: { workspaceId },
        select: { planId: true },
      }),
    ]);

    const currentPlanId = subscription?.planId ?? null;

    const plans = allPlans.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      monthlyPrice: p.monthlyPrice,
      yearlyPrice: p.yearlyPrice,
      maxSeats: p.maxSeats,
      maxAiGenerations: p.maxAiGenerations,
      maxResearchStudies: p.maxResearchStudies,
      maxStorageGb: p.maxStorageGb,
      features: p.features,
      isRecommended: p.isRecommended,
      isCurrentPlan: p.id === currentPlanId,
    }));

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("[GET /api/settings/billing/plans]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

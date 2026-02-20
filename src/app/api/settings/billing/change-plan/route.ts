import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";

const changePlanSchema = z.object({
  planId: z.string().min(1, "planId is required"),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).optional(),
});

// =============================================================
// POST /api/settings/billing/change-plan
// Upsert subscription for workspace with the given plan
// =============================================================
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = changePlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { planId, billingCycle } = parsed.data;

    // Verify plan exists
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const cycle = billingCycle ?? "MONTHLY";
    const now = new Date();
    const periodEnd = new Date(now);
    if (cycle === "MONTHLY") {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    const subscription = await prisma.subscription.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        planId,
        billingCycle: cycle,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
      update: {
        planId,
        billingCycle: cycle,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
      include: { plan: true },
    });

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        planName: subscription.plan.name,
        planSlug: subscription.plan.slug,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        currentPeriodStart: subscription.currentPeriodStart.toISOString(),
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        price:
          subscription.billingCycle === "MONTHLY"
            ? subscription.plan.monthlyPrice
            : subscription.plan.yearlyPrice,
      },
    });
  } catch (error) {
    console.error("[POST /api/settings/billing/change-plan]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

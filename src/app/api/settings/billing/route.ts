import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";
import { getOrgFeatureLimit } from "@/lib/stripe/enforcement";

// =============================================================
// GET /api/settings/billing
// Returns billing overview: subscription + next invoice date + default payment method
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

    const activeOrgId = (session.session as Record<string, unknown>)
      .activeOrganizationId as string | undefined;

    const [subscription, defaultPaymentMethod, orgWorkspacesLimit, orgTeamMembersLimit] = await Promise.all([
      prisma.subscription.findUnique({
        where: { workspaceId },
        include: { plan: true },
      }),
      prisma.paymentMethod.findFirst({
        where: { workspaceId, isDefault: true },
      }),
      activeOrgId ? getOrgFeatureLimit(activeOrgId, "WORKSPACES") : Promise.resolve(Infinity),
      activeOrgId ? getOrgFeatureLimit(activeOrgId, "TEAM_MEMBERS") : Promise.resolve(Infinity),
    ]);

    const billing: Record<string, unknown> = {
      subscription: subscription
        ? {
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
          }
        : null,
      nextInvoiceDate: subscription
        ? subscription.currentPeriodEnd.toISOString()
        : null,
      defaultPaymentMethod: defaultPaymentMethod
        ? {
            type: defaultPaymentMethod.type,
            last4: defaultPaymentMethod.last4,
            expiryMonth: defaultPaymentMethod.expiryMonth,
            expiryYear: defaultPaymentMethod.expiryYear,
          }
        : null,
    };

    // Organization-scoped effective limits (respects the Credit Admin -1
    // "developer-granted unlimited" override on top of the plan tier — see
    // getOrgFeatureLimit()). null over JSON means unlimited (Infinity isn't
    // representable in JSON).
    const orgLimits = {
      WORKSPACES: Number.isFinite(orgWorkspacesLimit) ? orgWorkspacesLimit : null,
      TEAM_MEMBERS: Number.isFinite(orgTeamMembersLimit) ? orgTeamMembersLimit : null,
    };

    return NextResponse.json({ billing, orgLimits });
  } catch (error) {
    console.error("[GET /api/settings/billing]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

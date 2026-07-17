import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { getOrgFeatureLimit } from "@/lib/stripe/enforcement";

// GET /api/settings/team — team overview: name, memberCount, maxSeats, myRole
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let activeOrgId = (session.session as Record<string, unknown>)
      .activeOrganizationId as string | undefined;

    if (!activeOrgId) {
      const firstMembership = await prisma.organizationMember.findFirst({
        where: { userId: session.user.id },
        select: { organizationId: true },
      });
      activeOrgId = firstMembership?.organizationId ?? undefined;
    }

    if (!activeOrgId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: activeOrgId },
      select: { id: true, name: true },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // PLAN_LIMITS[workspace.planTier].TEAM_MEMBERS (+ -1 developer-unlimited
    // override) — not the legacy Organization.maxSeats column, which is
    // never updated after signup. JSON can't carry Infinity (becomes null),
    // so cap unlimited at a large safe sentinel instead.
    const maxSeatsRaw = await getOrgFeatureLimit(activeOrgId, "TEAM_MEMBERS");
    const maxSeats = Number.isFinite(maxSeatsRaw) ? maxSeatsRaw : Number.MAX_SAFE_INTEGER;

    const myMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: activeOrgId,
        },
      },
    });

    if (!myMembership) {
      return NextResponse.json(
        { error: "Not a member of this organization" },
        { status: 403 }
      );
    }

    const memberCount = await prisma.organizationMember.count({
      where: { organizationId: activeOrgId },
    });

    return NextResponse.json({
      team: {
        name: org.name,
        memberCount,
        maxSeats,
        myRole: myMembership.role,
        organizationId: org.id,
      },
    });
  } catch (error) {
    console.error("[GET /api/settings/team]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

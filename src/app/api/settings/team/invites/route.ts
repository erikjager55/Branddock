import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";

// GET /api/settings/team/invites — list pending invitations (owner/admin only)
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

    // Only owner/admin can view invites
    const myMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: activeOrgId,
        },
      },
    });

    if (!myMembership || !["owner", "admin"].includes(myMembership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can view invitations" },
        { status: 403 }
      );
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        organizationId: activeOrgId,
        status: "pending",
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      invites: invitations.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        status: i.status,
        expiresAt: i.expiresAt.toISOString(),
        createdAt: i.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[GET /api/settings/team/invites]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

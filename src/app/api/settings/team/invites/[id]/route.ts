import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string }> };

// DELETE /api/settings/team/invites/[id] — cancel a pending invitation
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

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

    // Only owner/admin can cancel invites
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
        { error: "Only owners and admins can cancel invitations" },
        { status: 403 }
      );
    }

    // Find the invitation
    const invitation = await prisma.invitation.findFirst({
      where: {
        id,
        organizationId: activeOrgId,
        status: "pending",
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found or not pending" },
        { status: 404 }
      );
    }

    // Set status to cancelled
    await prisma.invitation.update({
      where: { id },
      data: { status: "cancelled" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/settings/team/invites/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

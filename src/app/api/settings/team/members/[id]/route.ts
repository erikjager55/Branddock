import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string }> };

// DELETE /api/settings/team/members/[id] — remove a member from the organization
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

    // Only owner/admin can remove members
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
        { error: "Only owners and admins can remove members" },
        { status: 403 }
      );
    }

    // Find the target member
    const targetMember = await prisma.organizationMember.findFirst({
      where: { id, organizationId: activeOrgId },
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Cannot remove self
    if (targetMember.userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot remove yourself" },
        { status: 400 }
      );
    }

    // Cannot remove owner
    if (targetMember.role === "owner") {
      return NextResponse.json(
        { error: "Cannot remove the organization owner" },
        { status: 400 }
      );
    }

    await prisma.organizationMember.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/settings/team/members/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string }> };

// Leeg array = toegang tot alle workspaces (ACL-rijen worden verwijderd).
const accessSchema = z.object({
  workspaceIds: z.array(z.string().min(1).max(100)).max(100),
});

/**
 * PATCH /api/settings/team/members/[id]/workspace-access — vervang de
 * workspace-toegang (WorkspaceMemberAccess) van een member/viewer-lid.
 * Owner/admin only; owner/admin-leden zelf kunnen niet gescoped worden
 * omdat de ACL voor die rollen wordt gebypasst (zie hasWorkspaceAccess).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
        { error: "Only owners and admins can change workspace access" },
        { status: 403 }
      );
    }

    const targetMember = await prisma.organizationMember.findFirst({
      where: { id, organizationId: activeOrgId },
    });

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (!["member", "viewer"].includes(targetMember.role)) {
      return NextResponse.json(
        {
          error: "Workspace access only applies to member/viewer roles — owners and admins always see all workspaces",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = accessSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const workspaceIds = [...new Set(parsed.data.workspaceIds)];

    if (workspaceIds.length > 0) {
      const validCount = await prisma.workspace.count({
        where: { id: { in: workspaceIds }, organizationId: activeOrgId },
      });
      if (validCount !== workspaceIds.length) {
        return NextResponse.json(
          { error: "One or more workspaces do not belong to this organization" },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction([
      prisma.workspaceMemberAccess.deleteMany({
        where: { memberId: targetMember.id },
      }),
      ...(workspaceIds.length > 0
        ? [
            prisma.workspaceMemberAccess.createMany({
              data: workspaceIds.map((workspaceId) => ({
                memberId: targetMember.id,
                workspaceId,
              })),
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ workspaceIds });
  } catch (error) {
    console.error(
      "[PATCH /api/settings/team/members/[id]/workspace-access]",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

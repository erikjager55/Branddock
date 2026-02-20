import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";

// POST /api/workspace/switch — switch active workspace (sets cookie)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    // Validate workspace exists and user has access
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { organization: true },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Check user is member of the workspace's organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: workspace.organizationId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No access to this workspace" },
        { status: 403 }
      );
    }

    // Check WorkspaceMemberAccess if exists (for non-owner/admin)
    if (!["owner", "admin"].includes(membership.role)) {
      const access = await prisma.workspaceMemberAccess.findUnique({
        where: {
          memberId_workspaceId: {
            memberId: membership.id,
            workspaceId,
          },
        },
      });

      // If there are any access records for this member, they need one for this workspace
      const hasAnyAccess = await prisma.workspaceMemberAccess.count({
        where: { memberId: membership.id },
      });

      if (hasAnyAccess > 0 && !access) {
        return NextResponse.json(
          { error: "No access to this workspace" },
          { status: 403 }
        );
      }
    }

    // Set cookie with active workspace ID
    const response = NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      },
    });

    response.cookies.set("branddock-workspace-id", workspaceId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return response;
  } catch (error) {
    console.error("[POST /api/workspace/switch]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

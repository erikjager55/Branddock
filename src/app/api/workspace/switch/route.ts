import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { clearAllCache } from "@/lib/api/cache";

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

      // `workspaceScoped` beslist, niet het aantal rijen: anders zou een
      // gescopet lid met nul rijen hier 200 krijgen en een cookie zetten die
      // `getExplicitWorkspace` daarna weigert — de gebruiker houdt dan
      // helemaal geen workspace over (2026-07-22).
      const scoped = await prisma.organizationMember.findUnique({
        where: { id: membership.id },
        select: { workspaceScoped: true },
      });

      if (scoped?.workspaceScoped && !access) {
        return NextResponse.json(
          { error: "No access to this workspace" },
          { status: 403 }
        );
      }
    }

    // Clear all server-side caches to prevent stale data after workspace switch
    clearAllCache();

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
      secure: process.env.NODE_ENV === "production",
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

// DELETE /api/workspace/switch — clear workspace cookie (used when switching organizations)
export async function DELETE() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Clear all server-side caches
    clearAllCache();

    const response = NextResponse.json({ cleared: true });

    // Delete the workspace cookie
    response.cookies.set("branddock-workspace-id", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("[DELETE /api/workspace/switch]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

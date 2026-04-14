import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";
import { CANONICAL_BRAND_ASSETS, ACTIVE_RESEARCH_METHOD_TYPES } from "@/lib/constants/canonical-brand-assets";

// GET /api/workspaces — list workspaces for the active organization
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrgId = (session.session as Record<string, unknown>)
      .activeOrganizationId as string | undefined;

    if (!activeOrgId) {
      return NextResponse.json({ workspaces: [], activeWorkspaceId: null });
    }

    const [workspaces, activeWorkspaceId] = await Promise.all([
      prisma.workspace.findMany({
        where: { organizationId: activeOrgId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true, createdAt: true, contentLanguage: true },
      }),
      resolveWorkspaceId(),
    ]);

    return NextResponse.json({ workspaces, activeWorkspaceId }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error("[GET /api/workspaces]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/workspaces — create a new workspace (agency only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrgId = (session.session as Record<string, unknown>)
      .activeOrganizationId as string | undefined;

    if (!activeOrgId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    // Check org type and role
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: activeOrgId,
        },
      },
      include: { organization: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    if (membership.organization.type !== "AGENCY") {
      return NextResponse.json(
        { error: "Only agencies can create multiple workspaces" },
        { status: 403 }
      );
    }

    if (!["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can create workspaces" },
        { status: 403 }
      );
    }

    // Check workspace limit
    const workspaceCount = await prisma.workspace.count({
      where: { organizationId: activeOrgId },
    });

    if (workspaceCount >= membership.organization.maxWorkspaces) {
      return NextResponse.json(
        {
          error: `Workspace limit reached (${membership.organization.maxWorkspaces})`,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check slug uniqueness
    const existing = await prisma.workspace.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "A workspace with this name already exists" },
        { status: 409 }
      );
    }

    // Create workspace + 11 canonical brand assets + research methods atomically
    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name,
          slug,
          organizationId: activeOrgId,
        },
      });

      // Create 11 canonical brand assets with active research methods
      for (const asset of CANONICAL_BRAND_ASSETS) {
        await tx.brandAsset.create({
          data: {
            name: asset.name,
            slug: asset.slug,
            description: asset.description,
            category: asset.category as never,
            status: "DRAFT",
            frameworkType: asset.frameworkType,
            workspaceId: ws.id,
            researchMethods: {
              create: ACTIVE_RESEARCH_METHOD_TYPES.map((method) => ({
                method: method as never,
                status: "AVAILABLE" as never,
                progress: 0,
              })),
            },
          },
        });
      }

      return ws;
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    console.error("[POST /api/workspaces]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/workspaces — update workspace settings (owner/admin)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrgId = (session.session as Record<string, unknown>)
      .activeOrganizationId as string | undefined;

    if (!activeOrgId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    const body = await request.json();
    const { workspaceId, contentLanguage } = body;

    if (!workspaceId || typeof workspaceId !== "string") {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    // Verify membership and role
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: activeOrgId,
        },
      },
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Only owners and admins can update workspace settings" }, { status: 403 });
    }

    // Verify workspace belongs to this organization
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, organizationId: true },
    });

    if (!workspace || workspace.organizationId !== activeOrgId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Build update data
    const VALID_LANGUAGES = new Set(["en", "nl", "de", "fr", "es", "pt", "it"]);
    const updateData: Record<string, unknown> = {};
    if (typeof contentLanguage === "string") {
      if (!VALID_LANGUAGES.has(contentLanguage)) {
        return NextResponse.json({ error: "Invalid language code" }, { status: 400 });
      }
      updateData.contentLanguage = contentLanguage;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: updateData,
      select: { id: true, name: true, contentLanguage: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/workspaces]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/workspaces — delete a workspace (owner only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrgId = (session.session as Record<string, unknown>)
      .activeOrganizationId as string | undefined;

    if (!activeOrgId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { workspaceId } = body;

    if (!workspaceId || typeof workspaceId !== "string") {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    // Verify membership and owner role
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: activeOrgId,
        },
      },
    });

    if (!membership || membership.role !== "owner") {
      return NextResponse.json(
        { error: "Only owners can delete workspaces" },
        { status: 403 }
      );
    }

    // Verify workspace belongs to this organization
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, organizationId: true },
    });

    if (!workspace || workspace.organizationId !== activeOrgId) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Prevent deleting the last workspace
    const workspaceCount = await prisma.workspace.count({
      where: { organizationId: activeOrgId },
    });

    if (workspaceCount <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last workspace" },
        { status: 400 }
      );
    }

    // Delete workspace (cascade deletes all related data)
    await prisma.workspace.delete({
      where: { id: workspaceId },
    });

    return NextResponse.json({
      success: true,
      deleted: { id: workspace.id, name: workspace.name },
    });
  } catch (error) {
    console.error("[DELETE /api/workspaces]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

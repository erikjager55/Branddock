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
        select: { id: true, name: true, slug: true, createdAt: true },
      }),
      resolveWorkspaceId(),
    ]);

    return NextResponse.json({ workspaces, activeWorkspaceId });
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

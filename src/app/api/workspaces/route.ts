import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { CANONICAL_BRAND_ASSETS, ACTIVE_RESEARCH_METHOD_TYPES } from "@/lib/constants/canonical-brand-assets";
import { invalidateBrandContext } from "@/lib/ai/brand-context";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { ensureBrandWithDefaultProfile, localeForLanguage, syncDefaultLocaleProfile } from "@/lib/content-locale/default-profile";
import { enforceOrgPlanLimit, getOrgPlanTier } from "@/lib/stripe/enforcement";

// Content-taal-opties (ISO-639-1) — gedeeld door POST (create-form) + PATCH.
const VALID_LANGUAGES = new Set(["en", "nl", "de", "fr", "es", "pt", "it"]);

// L8 Zod-sweep (audit 2026-06-26, batch 7): `name` was untyped (non-string
// 500'de op .toLowerCase). De taal-fallback/allowlist-semantiek blijft in de
// routes zelf. NB de parse gebeurt bewust NÁ de rol-checks zodat 403 vóór
// 400 blijft gaan (de RBAC-e2e-asserts leunen daarop).
const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
  contentLanguage: z.string().max(10).optional(),
});
const patchWorkspaceSchema = z.object({
  workspaceId: z.string().min(1).max(100),
  contentLanguage: z.string().max(10).optional(),
  // Rename (PR #187) — trim/1-60-semantiek blijft in de route (nette melding).
  name: z.string().max(200).optional(),
});
const deleteWorkspaceSchema = z.object({
  workspaceId: z.string().min(1).max(100),
});

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

    // Per-workspace ACL: member/viewer met WorkspaceMemberAccess-rijen ziet
    // alleen die workspaces (leeg = alle; owner/admin bypassen — zelfde
    // semantiek als hasWorkspaceAccess en de switch-route).
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: activeOrgId,
        },
      },
      select: {
        role: true,
        workspaceAccess: { select: { workspaceId: true } },
      },
    });
    const restrictedIds =
      membership &&
      !["owner", "admin"].includes(membership.role) &&
      membership.workspaceAccess.length > 0
        ? membership.workspaceAccess.map((wa) => wa.workspaceId)
        : null;

    const [workspaces, activeWorkspaceId] = await Promise.all([
      prisma.workspace.findMany({
        where: {
          organizationId: activeOrgId,
          ...(restrictedIds ? { id: { in: restrictedIds } } : {}),
        },
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
        { error: "No active organization", code: "NO_ACTIVE_ORG" },
        { status: 400 }
      );
    }

    // Check membership and role
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: activeOrgId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member", code: "NOT_MEMBER" }, { status: 403 });
    }

    if (!["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can create workspaces", code: "NOT_OWNER_OR_ADMIN" },
        { status: 403 }
      );
    }

    // Plan-limit check: reads PLAN_LIMITS[workspace.planTier].WORKSPACES
    // across the org's existing workspaces (+ the -1 developer-unlimited
    // override) — not the legacy Organization.type/maxWorkspaces gate.
    const limited = await enforceOrgPlanLimit(activeOrgId, "WORKSPACES");
    if (limited) return limited;

    const parsed = await parseJsonBody(request, createWorkspaceSchema);
    if (!parsed.ok) return parsed.response;
    const { name, contentLanguage: rawContentLanguage } = parsed.data;
    const contentLanguage =
      rawContentLanguage !== undefined && VALID_LANGUAGES.has(rawContentLanguage)
        ? rawContentLanguage
        : "en";

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Gereserveerde slugs: elke workspace krijgt <slug>.branddock.app als
    // landingspagina-subdomein — deze zouden botsen met app/apex/infra-hosts
    // (zie host-router.ts + custom-domain-branddock-app runbook).
    const RESERVED_SLUGS = new Set(["app", "www", "api", "admin", "p", "static", "assets"]);
    if (RESERVED_SLUGS.has(slug)) {
      return NextResponse.json(
        { error: "This workspace name is reserved — please choose another.", code: "WORKSPACE_NAME_RESERVED" },
        { status: 409 }
      );
    }

    // Check slug uniqueness
    const existing = await prisma.workspace.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "A workspace with this name already exists", code: "WORKSPACE_NAME_TAKEN" },
        { status: 409 }
      );
    }

    // A new workspace inherits the org's highest existing tier — otherwise it
    // defaults to FREE and the (already-correct) per-workspace plan-limit
    // checks for personas/campaigns/etc. would wrongly apply FREE limits
    // under a paid org.
    const inheritedTier = await getOrgPlanTier(activeOrgId);

    // Create workspace + 11 canonical brand assets + research methods atomically
    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name,
          slug,
          organizationId: activeOrgId,
          contentLanguage,
          planTier: inheritedTier,
        },
      });

      // Content-locale anker (ADR 2026-07-16) — via de gedeelde helper, dezelfde die
      // provisionNewUser gebruikt. Was hier inline, waardoor het sign-up-pad 'm miste en
      // 3 van de 4 prod-workspaces zonder anker stonden. Eén helper, alle creatiepaden.
      await ensureBrandWithDefaultProfile(tx, ws.id, localeForLanguage(contentLanguage));

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

    const parsed = await parseJsonBody(request, patchWorkspaceSchema);
    if (!parsed.ok) return parsed.response;
    const { workspaceId, contentLanguage, name } = parsed.data;

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
    const updateData: Record<string, unknown> = {};
    if (typeof contentLanguage === "string") {
      if (!VALID_LANGUAGES.has(contentLanguage)) {
        return NextResponse.json({ error: "Invalid language code" }, { status: 400 });
      }
      updateData.contentLanguage = contentLanguage;
    }
    if (typeof name === "string") {
      const trimmed = name.trim();
      if (trimmed.length < 1 || trimmed.length > 60) {
        return NextResponse.json({ error: "Name must be 1-60 characters" }, { status: 400 });
      }
      updateData.name = trimmed;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: updateData,
      select: { id: true, name: true, contentLanguage: true },
    });

    // Content-locale foundation: sync het default-profiel + invalideer de
    // brand-context-cache (anders serveert getBrandContext tot 5 min de oude taal).
    if (typeof contentLanguage === "string") {
      await syncDefaultLocaleProfile(workspaceId, localeForLanguage(contentLanguage));
      invalidateBrandContext(workspaceId);
      invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));
    } else if (typeof name === "string") {
      // Naam zit in de brand-context en dashboard-payloads — zelfde 5-min-staleness.
      invalidateBrandContext(workspaceId);
      invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));
    }

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

    const parsed = await parseJsonBody(request, deleteWorkspaceSchema);
    if (!parsed.ok) return parsed.response;
    const { workspaceId } = parsed.data;

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

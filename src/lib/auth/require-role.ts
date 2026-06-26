import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";

/**
 * Require that the caller holds one of `roles` in their active organization.
 * Returns a membership context on success, or a {@link NextResponse} error the
 * route should return directly.
 *
 * Security-audit 2026-06-26 H4: org-level destructive/billing actions must be
 * role-gated (owner/admin by default), not merely authenticated. Mirrors the
 * existing role-check in `settings/team/members/[id]/role`.
 *
 * @example
 *   const role = await requireOrgRole();
 *   if (role instanceof NextResponse) return role;
 */
export async function requireOrgRole(
  roles: readonly string[] = ["owner", "admin"],
): Promise<{ organizationId: string; userId: string; role: string } | NextResponse> {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let activeOrgId = (session.session as Record<string, unknown>)
    .activeOrganizationId as string | undefined;
  if (!activeOrgId) {
    const first = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    activeOrgId = first?.organizationId ?? undefined;
  }
  if (!activeOrgId) {
    return NextResponse.json({ error: "No active organization" }, { status: 400 });
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: activeOrgId,
      },
    },
    select: { role: true },
  });
  if (!membership || !roles.includes(membership.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions — owner or admin required" },
      { status: 403 },
    );
  }

  return {
    organizationId: activeOrgId,
    userId: session.user.id,
    role: membership.role,
  };
}

/**
 * Like {@link requireOrgRole}, but binds the role check to the organization that
 * OWNS the caller's currently-resolved workspace — not the session's active org.
 *
 * Security-audit 2026-06-26 (review WARNING): a route that role-checks against
 * `activeOrganizationId` but then mutates a workspace resolved via the cookie
 * (`branddock-workspace-id`) could let a user who is owner/admin in org A but
 * only viewer in org B mutate B's resources by pointing the cookie at B. This
 * helper checks the role in the SAME org as the workspace it returns.
 *
 * Returns `{ workspaceId, organizationId, role }` or a {@link NextResponse} error.
 */
export async function requireWorkspaceRole(
  roles: readonly string[] = ["owner", "admin"],
): Promise<{ workspaceId: string; organizationId: string; role: string } | NextResponse> {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace found" }, { status: 403 });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { organizationId: true },
  });
  if (!workspace) {
    return NextResponse.json({ error: "No workspace found" }, { status: 403 });
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: workspace.organizationId,
      },
    },
    select: { role: true },
  });
  if (!membership || !roles.includes(membership.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions — owner or admin required" },
      { status: 403 },
    );
  }

  return {
    workspaceId,
    organizationId: workspace.organizationId,
    role: membership.role,
  };
}

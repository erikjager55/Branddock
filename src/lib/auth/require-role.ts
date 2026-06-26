import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";

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

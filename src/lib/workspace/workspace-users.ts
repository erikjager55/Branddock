// =============================================================
// Workspace users — resolve de users die toegang hebben tot een
// workspace via OrganizationMember (de huidige multi-tenant join).
//
// Waarom: de legacy `User.workspaceId` FK ("wordt gefaseerd vervangen
// door OrganizationMember") mist users die alleen via OrganizationMember
// aan de workspace hangen. Notificatie- en team-resolutie moeten via de
// org-member-keten lopen. De per-user ACL-regel spiegelt `hasWorkspaceAccess()`
// (workspace-resolver.ts): owner/admin bypassen de per-workspace ACL;
// member/viewer met lege `WorkspaceMemberAccess` zien alle workspaces in de
// org, anders alleen de expliciet toegekende.
//
// Bewuste afwijking van `hasWorkspaceAccess()`: hier óók `isActive: true`,
// zodat gedeactiveerde members geen notificaties/emails ontvangen. Dat is de
// veilige richting voor een fan-out; de ACL-beslissing zelf is identiek.
// =============================================================

import { prisma } from "@/lib/prisma";

export interface WorkspaceUser {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Geeft de actieve users die deze workspace mogen zien, via OrganizationMember.
 * Gede-dupliceerd op userId. Lege array wanneer de workspace niet bestaat.
 */
export async function getWorkspaceUsers(workspaceId: string): Promise<WorkspaceUser[]> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { organizationId: true },
  });
  if (!workspace) return [];

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: workspace.organizationId, isActive: true },
    orderBy: { joinedAt: "asc" }, // deterministische volgorde voor single-recipient callers
    select: {
      role: true,
      user: { select: { id: true, email: true, name: true } },
      workspaceAccess: { select: { workspaceId: true } },
    },
  });

  const seen = new Set<string>();
  const result: WorkspaceUser[] = [];
  for (const m of members) {
    // Spiegelt hasWorkspaceAccess(): owner/admin bypassen de per-workspace ACL.
    const canSee =
      m.role === "owner" ||
      m.role === "admin" ||
      m.workspaceAccess.length === 0 ||
      m.workspaceAccess.some((wa) => wa.workspaceId === workspaceId);
    if (!canSee || seen.has(m.user.id)) continue;
    seen.add(m.user.id);
    result.push({ id: m.user.id, email: m.user.email, name: m.user.name });
  }
  return result;
}

/**
 * Mag deze user als acting identity voor agent-runs in deze workspace
 * optreden? Vereist een actief lidmaatschap mét schrijfrol (owner/admin/
 * member — viewers zijn read-only, zelfde policy als de run-/confirm-routes)
 * én workspace-toegang via de ACL-regel hierboven. Gebruikt door de
 * AGENT_TASK-handler (untrusted payload, webhook-pad) en de schedule-enqueue
 * (membership/rol kan tussen create en due-slot vervallen).
 */
export async function canActInWorkspace(workspaceId: string, userId: string): Promise<boolean> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { organizationId: true },
  });
  if (!workspace) return false;

  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId: workspace.organizationId,
      userId,
      isActive: true,
      role: { in: ["owner", "admin", "member"] },
    },
    select: {
      role: true,
      workspaceAccess: { select: { workspaceId: true } },
    },
  });
  if (!member) return false;

  return (
    member.role === "owner" ||
    member.role === "admin" ||
    member.workspaceAccess.length === 0 ||
    member.workspaceAccess.some((wa) => wa.workspaceId === workspaceId)
  );
}

import { prisma } from "./prisma";
import { cookies } from "next/headers";

/**
 * Get workspace by explicit cookie selection.
 * Used when an agency user has switched to a specific workspace.
 */
export async function getExplicitWorkspace(userId: string) {
  const cookieStore = await cookies();
  const workspaceId = cookieStore.get("branddock-workspace-id")?.value;
  if (!workspaceId) return null;

  // Validate the user still has access to this workspace
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) return null;

  // Check membership in the workspace's organization
  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: workspace.organizationId,
      },
    },
  });

  if (!membership) return null;

  return workspace;
}

export async function getWorkspaceForOrganization(organizationId: string) {
  return prisma.workspace.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getWorkspaceForUser(userId: string) {
  // Find user's first organization membership → first workspace
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    include: {
      organization: {
        include: {
          workspaces: { take: 1 },
        },
      },
    },
  });

  if (!membership?.organization?.workspaces?.[0]) {
    return null;
  }

  return membership.organization.workspaces[0];
}

/**
 * Effective access check for a (user, workspace) pair.
 *
 * Rules (mirrors `/api/workspace/switch`):
 *   1. User must be an OrganizationMember of the workspace's org.
 *   2. OWNER/ADMIN bypass per-workspace ACL.
 *   3. For member/viewer: empty `WorkspaceMemberAccess` = unrestricted
 *      (all workspaces in the org). Non-empty = must have an explicit row
 *      for the target workspace.
 *
 * Use this for any direct-ID lookup that would otherwise trust
 * `resolveWorkspaceId()`'s cookie/session path — that path does not
 * re-check ACL, so a stale cookie or direct product-ID hit could
 * bypass revoked access without this guard (9.6 M9).
 */
export async function hasWorkspaceAccess(
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { organizationId: true },
  });
  if (!workspace) return false;

  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: workspace.organizationId,
      },
    },
    select: { id: true, role: true },
  });
  if (!membership) return false;

  if (["owner", "admin"].includes(membership.role)) return true;

  const aclCount = await prisma.workspaceMemberAccess.count({
    where: { memberId: membership.id },
  });
  if (aclCount === 0) return true;

  const row = await prisma.workspaceMemberAccess.findUnique({
    where: {
      memberId_workspaceId: {
        memberId: membership.id,
        workspaceId,
      },
    },
    select: { id: true },
  });
  return row !== null;
}

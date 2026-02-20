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

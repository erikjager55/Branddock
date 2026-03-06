import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";

/**
 * Resolves the workspace for a given product ID.
 *
 * 1. Try standard workspace resolution (cookie / session / org)
 * 2. Verify the product actually belongs to that workspace
 * 3. If not, fall back to looking up the product directly and
 *    verifying the user has access through org membership
 *
 * Returns the product's workspaceId, or null if access is denied.
 */
export async function resolveWorkspaceForProduct(
  productId: string,
): Promise<string | null> {
  // Try standard resolver first
  const workspaceId = await resolveWorkspaceId();

  if (workspaceId) {
    // Verify the product belongs to this workspace
    const product = await prisma.product.findFirst({
      where: { id: productId, workspaceId },
      select: { id: true },
    });
    if (product) return workspaceId;
  }

  // Fallback: look up product directly and verify user access
  const session = await getServerSession();
  if (!session) return null;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { workspaceId: true },
  });
  if (!product) return null;

  const workspace = await prisma.workspace.findUnique({
    where: { id: product.workspaceId },
    select: { organizationId: true },
  });
  if (!workspace) return null;

  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: workspace.organizationId,
      },
    },
  });
  if (!membership) return null;

  return product.workspaceId;
}

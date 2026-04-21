import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { hasWorkspaceAccess } from "@/lib/workspace-resolver";

/**
 * Resolves the workspace for a given product ID.
 *
 * Always looks the product up by id, then verifies the current user has
 * effective access to that workspace via `hasWorkspaceAccess()` — this
 * respects per-workspace ACL (`WorkspaceMemberAccess`) in addition to
 * org membership, closing the 9.6 M9 hole where a MEMBER restricted to
 * workspace A could still read/write workspace B by hitting a direct
 * product ID.
 *
 * Returns the product's workspaceId, or null if access is denied.
 */
export async function resolveWorkspaceForProduct(
  productId: string,
): Promise<string | null> {
  const session = await getServerSession();
  if (!session) return null;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { workspaceId: true },
  });
  if (!product) return null;

  const allowed = await hasWorkspaceAccess(
    session.user.id,
    product.workspaceId,
  );
  return allowed ? product.workspaceId : null;
}

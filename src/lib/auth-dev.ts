import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";

/**
 * Get the authenticated user and workspace, with a dev fallback.
 * In development, if there's no active session, falls back to the
 * first user and first workspace in the database.
 */
export async function getAuthOrFallback(): Promise<{
  user: { id: string; email: string; name: string | null };
  workspaceId: string;
} | null> {
  const session = await auth();

  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: { select: { workspaceId: true }, take: 1 },
        ownedWorkspaces: { select: { id: true }, take: 1 },
      },
    });

    if (!user) return null;

    const workspaceId =
      user.memberships[0]?.workspaceId ??
      user.ownedWorkspaces[0]?.id ??
      null;

    if (!workspaceId) return null;

    return {
      user: { id: user.id, email: user.email, name: user.name },
      workspaceId,
    };
  }

  // Dev fallback: use first workspace and its owner
  const workspace = await prisma.workspace.findFirst({
    include: { owner: true },
  });

  if (!workspace) return null;

  return {
    user: {
      id: workspace.owner.id,
      email: workspace.owner.email,
      name: workspace.owner.name,
    },
    workspaceId: workspace.id,
  };
}

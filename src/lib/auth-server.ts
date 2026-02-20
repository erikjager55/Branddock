import { auth } from "./auth";
import { headers } from "next/headers";
import {
  getExplicitWorkspace,
  getWorkspaceForOrganization,
  getWorkspaceForUser,
} from "./workspace-resolver";

export async function getServerSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireAuth() {
  const session = await getServerSession();
  if (!session) {
    return null;
  }
  return session;
}

/**
 * Resolves workspaceId from session.
 * Priority:
 * 1. Explicit workspace cookie (set by workspace switcher)
 * 2. First workspace of active organization
 * 3. First workspace of user's first org
 * 4. NEXT_PUBLIC_WORKSPACE_ID env variable (deprecated fallback)
 */
export async function resolveWorkspaceId(): Promise<string | null> {
  const session = await getServerSession();

  if (session) {
    // 1. Check explicit workspace cookie
    const explicit = await getExplicitWorkspace(session.user.id);
    if (explicit) return explicit.id;

    // 2. Active organization's first workspace
    const activeOrgId = (session.session as Record<string, unknown>)
      .activeOrganizationId as string | undefined;

    if (activeOrgId) {
      const workspace = await getWorkspaceForOrganization(activeOrgId);
      if (workspace) return workspace.id;
    }

    // 3. User's first org's first workspace
    const workspace = await getWorkspaceForUser(session.user.id);
    if (workspace) return workspace.id;
  }

  // 4. Backward compat: use env variable
  return process.env.NEXT_PUBLIC_WORKSPACE_ID ?? null;
}

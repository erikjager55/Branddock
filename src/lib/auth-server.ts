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
 */
export async function resolveWorkspaceId(): Promise<string | null> {
  const session = await getServerSession();

  if (session) {
    console.log('[resolveWorkspaceId] session found, userId:', session.user.id);

    // 1. Check explicit workspace cookie
    const explicit = await getExplicitWorkspace(session.user.id);
    if (explicit) {
      console.log('[resolveWorkspaceId] explicit workspace:', explicit.id);
      return explicit.id;
    }

    // 2. Active organization's first workspace
    const activeOrgId = (session.session as Record<string, unknown>)
      .activeOrganizationId as string | undefined;
    console.log('[resolveWorkspaceId] activeOrgId:', activeOrgId);

    if (activeOrgId) {
      const workspace = await getWorkspaceForOrganization(activeOrgId);
      console.log('[resolveWorkspaceId] workspace for org:', workspace?.id);
      if (workspace) return workspace.id;
    }

    // 3. User's first org's first workspace
    const workspace = await getWorkspaceForUser(session.user.id);
    console.log('[resolveWorkspaceId] workspace for user:', workspace?.id);
    if (workspace) return workspace.id;
  } else {
    console.log('[resolveWorkspaceId] NO SESSION FOUND');
  }

  return null;
}

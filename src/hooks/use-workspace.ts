import { useSession, authClient } from '@/lib/auth-client';
import { useMemo } from 'react';

export function useWorkspace() {
  const { data: session, isPending } = useSession();

  const result = useMemo(() => {
    if (isPending) {
      return { workspaceId: null, organizationId: null, isLoading: true };
    }

    // Try session-based org
    const activeOrgId = (session?.session as Record<string, unknown> | undefined)?.activeOrganizationId as string | undefined;
    if (activeOrgId) {
      // workspaceId will be resolved server-side; client just needs to know it exists
      return { workspaceId: activeOrgId, organizationId: activeOrgId, isLoading: false };
    }

    // Fallback: env variable
    const envWorkspaceId = process.env.NEXT_PUBLIC_WORKSPACE_ID;
    if (envWorkspaceId) {
      return { workspaceId: envWorkspaceId, organizationId: null, isLoading: false };
    }

    return { workspaceId: null, organizationId: null, isLoading: false };
  }, [session, isPending]);

  return result;
}

import { useSession } from '@/lib/auth-client';
import { useState, useEffect, useMemo } from 'react';

/**
 * Returns the active workspace ID resolved by the server (from cookie or session fallback).
 *
 * Previously this hook returned the organization ID as workspaceId, which is
 * semantically wrong and prevented client-side cache keys from changing when
 * switching workspaces within the same organization.
 *
 * Now it fetches the actual workspace ID from GET /api/workspace/active.
 */
export function useWorkspace() {
  const { data: session, isPending: sessionPending } = useSession();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [wsLoading, setWsLoading] = useState(true);

  const organizationId = useMemo(() => {
    if (sessionPending || !session) return null;
    return (session.session as Record<string, unknown> | undefined)
      ?.activeOrganizationId as string | undefined ?? null;
  }, [session, sessionPending]);

  useEffect(() => {
    if (sessionPending) return;

    if (!organizationId) {
      setWorkspaceId(null);
      setWsLoading(false);
      return;
    }

    let cancelled = false;
    setWsLoading(true);

    fetch('/api/workspace/active')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setWorkspaceId(data?.workspaceId ?? null);
          setWsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('[useWorkspace] Failed to resolve workspace:', err);
          setWorkspaceId(null);
          setWsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, sessionPending]);

  return {
    workspaceId,
    organizationId,
    isLoading: sessionPending || wsLoading,
  };
}

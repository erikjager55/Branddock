'use client';

// =============================================================
// useCreditAdmin — superuser-hooks voor het credit-beheer-paneel
// (Settings → Developer → Credits). Alleen zinvol voor DEVELOPER_EMAILS-
// accounts; de API geeft anders 403.
// =============================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  unlimited: boolean;
  balance: number;
  reserved: number;
  trialEndsAt: string | null;
  members: number;
  workspaces: string[];
}

async function fetchOrgs(): Promise<AdminOrg[]> {
  const res = await fetch('/api/admin/credit-orgs');
  if (!res.ok) throw new Error('Failed to fetch organizations');
  const data = await res.json();
  return (data.orgs ?? []) as AdminOrg[];
}

async function postAction(body:
  | { action: 'grant'; organizationId: string; credits: number }
  | { action: 'setUnlimited'; organizationId: string; value: boolean },
): Promise<void> {
  const res = await fetch('/api/admin/credit-orgs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? 'Action failed');
  }
}

export function useCreditAdminOrgs(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'credit-orgs'],
    queryFn: fetchOrgs,
    enabled,
    staleTime: 15_000,
  });
}

export function useCreditAdminAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postAction,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'credit-orgs'] });
    },
  });
}

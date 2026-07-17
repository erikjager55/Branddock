'use client';

// =============================================================
// useWorkspaceEntitlements() / useCreateWorkspace() — shared workspace-
// creation state for the 3 UI surfaces that offer it (org switcher, Settings
// → Workspaces, Agency Settings → Workspaces). Replaces 3 separate inline
// fetch()-and-local-state implementations, none of which proactively checked
// the plan limit before letting the user click "New workspace".
//
// The limit comes from billing.limits.WORKSPACES (PLAN_CONFIGS-derived, live)
// — not the legacy Organization.maxWorkspaces column — matching the pattern
// TeamPlanHeader.tsx already uses correctly for seats.
// =============================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBillingPlan } from '@/hooks/use-billing';
import { fetchWorkspaces, createWorkspace, type WorkspaceItem } from '@/lib/api/workspaces';
import { ApiError } from '@/lib/api/api-error';

export interface WorkspaceEntitlements {
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string | null;
  current: number;
  limit: number;
  isUnlimited: boolean;
  atLimit: boolean;
  canCreate: boolean;
  isLoading: boolean;
}

export function useWorkspaceEntitlements(): WorkspaceEntitlements {
  const billing = useBillingPlan();
  const { data, isLoading } = useQuery({
    queryKey: ['workspaces', 'list'],
    queryFn: fetchWorkspaces,
  });

  const workspaces = data?.workspaces ?? [];
  const current = workspaces.length;
  const limit = billing.limits.WORKSPACES;
  const isUnlimited = !isFinite(limit);
  const atLimit = !isUnlimited && current >= limit;

  return {
    workspaces,
    activeWorkspaceId: data?.activeWorkspaceId ?? null,
    current,
    limit,
    isUnlimited,
    atLimit,
    canCreate: isUnlimited || current < limit,
    isLoading: isLoading || billing.isLoading,
  };
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation<WorkspaceItem, ApiError, { name: string; contentLanguage?: string }>({
    mutationFn: createWorkspace,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['workspaces', 'list'] });
      void qc.invalidateQueries({ queryKey: ['billing', 'plan'] });
    },
  });
}

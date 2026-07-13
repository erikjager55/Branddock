// =============================================================
// Agents UI — TanStack Query hooks (query-key-factory-conventie,
// status-aware polling conform trend-radar/website-scanner-patroon).
// =============================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAgentCatalog,
  fetchAgentRun,
  fetchAgentRuns,
  fetchAgentSchedules,
  createAgentSchedule,
  updateAgentSchedule,
  deleteAgentSchedule,
  patchArtifact,
  startAgentRun,
  confirmProposal,
} from '../api/agents.api';
import type {
  ArtifactAction,
  ConfirmProposalBody,
  CreateScheduleBody,
  RunTriggerFilter,
  StartAgentRunBody,
  UpdateScheduleBody,
} from '../types/agents.types';
import { isRunActive } from '../lib/run-utils';

export const agentKeys = {
  all: ['agents'] as const,
  catalog: () => [...agentKeys.all, 'catalog'] as const,
  // runs() blijft de invalidatie-root: runsList-keys nesten eronder zodat
  // bestaande invalidateQueries({queryKey: runs()}) álle filter-varianten raakt.
  runs: () => [...agentKeys.all, 'runs'] as const,
  runsList: (trigger?: RunTriggerFilter) => [...agentKeys.runs(), trigger ?? 'all'] as const,
  run: (runId: string) => [...agentKeys.all, 'run', runId] as const,
  schedules: () => [...agentKeys.all, 'schedules'] as const,
  schedulesList: (agentId?: string) => [...agentKeys.schedules(), agentId ?? 'all'] as const,
};

/** Registry-catalogus — code-based, dus lang vers (5 min). */
export function useAgentCatalog() {
  return useQuery({
    queryKey: agentKeys.catalog(),
    queryFn: fetchAgentCatalog,
    staleTime: 5 * 60_000,
    select: (data) => data.agents,
  });
}

/**
 * Runs-lijst voor de inbox. Pollt elke 5s zolang er een échte actieve
 * run is (stale-RUNNING telt niet mee — anders pollt de inbox eeuwig
 * op een vastgelopen run).
 */
export function useAgentRuns(trigger?: RunTriggerFilter) {
  return useQuery({
    queryKey: agentKeys.runsList(trigger),
    queryFn: () => fetchAgentRuns(trigger),
    staleTime: 10_000,
    select: (data) => data.runs,
    refetchInterval: (query) => {
      const runs = query.state.data?.runs;
      if (!runs?.length) return false;
      return runs.some((run) => isRunActive(run)) ? 5_000 : false;
    },
  });
}

/**
 * Run-detail incl. volledige artefacten. Pollt elke 3s zolang de run
 * non-terminaal en niet stale is (de server cachet non-terminale
 * responses bewust niet).
 */
export function useAgentRun(runId: string | null) {
  return useQuery({
    queryKey: agentKeys.run(runId ?? 'none'),
    queryFn: () => fetchAgentRun(runId as string),
    enabled: !!runId,
    select: (data) => data.run,
    refetchInterval: (query) => {
      const run = query.state.data?.run;
      if (!run) return false;
      return isRunActive(run) ? 3_000 : false;
    },
  });
}

/**
 * Start een synchrone run. Invalideert de runs-lijst op settled — óók
 * bij een FAILED run bestaat de run-rij en hoort die in de inbox.
 */
export function useStartAgentRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: StartAgentRunBody) => startAgentRun(body),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.runs() });
    },
  });
}

/**
 * Accept/dismiss van een artefact. Accept kan materialiseren naar de
 * Knowledge Library → dat cache-domein mee-invalideren (resourceKeys.all
 * in knowledge-library/hooks is ['knowledge-resources']).
 */
export function useArtifactAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ artifactId, action }: { artifactId: string; action: ArtifactAction }) =>
      patchArtifact(artifactId, action),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['knowledge-resources'] });
    },
  });
}

/** Approve/reject van een PROPOSAL-artefact via de agents-confirm-route. */
export function useConfirmProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, ...body }: ConfirmProposalBody & { runId: string }) =>
      confirmProposal(runId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.all });
    },
  });
}

// ─── Schedules (agents-scheduling, slice 2) ──────────────────

/** Schedules per agent (detail-pagina) of workspace-breed. */
export function useAgentSchedules(agentId?: string) {
  return useQuery({
    queryKey: agentKeys.schedulesList(agentId),
    queryFn: () => fetchAgentSchedules(agentId),
    staleTime: 30_000,
    select: (data) => data.schedules,
  });
}

export function useCreateAgentSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateScheduleBody) => createAgentSchedule(body),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.schedules() });
    },
  });
}

export function useUpdateAgentSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, ...body }: UpdateScheduleBody & { scheduleId: string }) =>
      updateAgentSchedule(scheduleId, body),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.schedules() });
    },
  });
}

export function useDeleteAgentSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) => deleteAgentSchedule(scheduleId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.schedules() });
    },
  });
}

// =============================================================
// Agents API client — fetch-laag voor catalogus, runs en artefacten.
// Endpoints: foundation-contract (zie types/agents.types.ts).
// =============================================================

import type {
  AgentCatalogResponse,
  AgentMemoriesResponse,
  AgentRunsResponse,
  AgentRunDetailResponse,
  AgentSchedulesResponse,
  AgentScheduleResponse,
  CreateScheduleBody,
  UpdateScheduleBody,
  RunTriggerFilter,
  StartAgentRunBody,
  StartAgentRunResponse,
  ArtifactAction,
  ArtifactActionResponse,
  ConfirmProposalBody,
  ConfirmProposalResponse,
} from '../types/agents.types';

/** Fetch-error met HTTP-status, zodat de UI kan differentiëren (bv. 409 = al afgehandeld). */
export class AgentsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AgentsApiError';
  }
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON error body — keep the status message */
    }
    throw new AgentsApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}

/**
 * Catalog of registered (non-hidden) agents. Endpoint wordt geleverd
 * door agents-motor-wiring (GET /api/agents); tot die merge antwoordt
 * dit pad 404 — dat mappen we op een lege catalogus zodat de UI de
 * nette empty-state toont i.p.v. een error (afgesproken pre-merge-
 * gedrag; échte fouten (500) blijven de error-state raken).
 */
export async function fetchAgentCatalog(): Promise<AgentCatalogResponse> {
  const res = await fetch('/api/agents');
  if (res.status === 404) return { agents: [] };
  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }
  return res.json() as Promise<AgentCatalogResponse>;
}

/** Workspace-scoped runs list (max 50, artifacts-summary included). */
export function fetchAgentRuns(trigger?: RunTriggerFilter): Promise<AgentRunsResponse> {
  const query = trigger ? `?trigger=${trigger}` : '';
  return json(`/api/agents/runs${query}`);
}

// ─── Schedules ────────────────────────────────────────────────

/** Schedules van de workspace, optioneel per agent. */
export function fetchAgentSchedules(agentId?: string): Promise<AgentSchedulesResponse> {
  const query = agentId ? `?agentId=${encodeURIComponent(agentId)}` : '';
  return json(`/api/agents/schedules${query}`);
}

export function createAgentSchedule(body: CreateScheduleBody): Promise<AgentScheduleResponse> {
  return json('/api/agents/schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function updateAgentSchedule(
  scheduleId: string,
  body: UpdateScheduleBody,
): Promise<AgentScheduleResponse> {
  return json(`/api/agents/schedules/${scheduleId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function deleteAgentSchedule(scheduleId: string): Promise<{ deleted: boolean }> {
  return json(`/api/agents/schedules/${scheduleId}`, { method: 'DELETE' });
}

// ─── Memories ─────────────────────────────────────────────────

/** Memory-items van één agent (user-bevestigd via het confirm-pad). */
export function fetchAgentMemories(agentId: string): Promise<AgentMemoriesResponse> {
  return json(`/api/agents/memories?agentId=${encodeURIComponent(agentId)}`);
}

export function deleteAgentMemory(memoryId: string): Promise<{ deleted: boolean }> {
  return json(`/api/agents/memories/${memoryId}`, { method: 'DELETE' });
}

/** Run detail including full artifact content. */
export function fetchAgentRun(runId: string): Promise<AgentRunDetailResponse> {
  return json(`/api/agents/runs/${runId}`);
}

/**
 * Start a synchronous agent run. Resolves when the run finishes — for
 * real agents this can take minutes. A FAILED run resolves normally
 * (200 + status FAILED); only pre-run errors reject.
 */
export function startAgentRun(body: StartAgentRunBody): Promise<StartAgentRunResponse> {
  return json('/api/agents/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Accept or dismiss an artifact (accept materializes REPORT/TABLE). */
export function patchArtifact(
  artifactId: string,
  action: ArtifactAction,
): Promise<ArtifactActionResponse> {
  return json(`/api/agents/artifacts/${artifactId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
}

/**
 * Approve/reject a PROPOSAL artifact. The confirm-route is delivered by
 * agents-motor-wiring — until it lands this call surfaces a 404, which
 * the ProposalConfirmCard shows as an inline error.
 */
export function confirmProposal(
  runId: string,
  body: ConfirmProposalBody,
): Promise<ConfirmProposalResponse> {
  return json(`/api/agents/runs/${runId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

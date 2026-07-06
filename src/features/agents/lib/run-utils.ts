// =============================================================
// Run-status helpers — o.a. de stale-RUNNING-heuristiek (task-eis):
// een proces-crash/deploy mid-run kan een AgentRun eeuwig op RUNNING
// laten staan (reaper is Fase 2). Client-side markeren we zulke runs
// als "mogelijk vastgelopen" i.p.v. een eeuwige spinner.
// =============================================================

import type { AgentRunStatusValue } from '../types/agents.types';

export const STALE_RUNNING_THRESHOLD_MS = 15 * 60 * 1000;

const NON_TERMINAL: ReadonlySet<AgentRunStatusValue> = new Set(['QUEUED', 'RUNNING']);

interface RunLike {
  status: AgentRunStatusValue;
  createdAt: string;
}

/** True when the run is QUEUED/RUNNING but older than the stale threshold. */
export function isRunStale(run: RunLike, now: number = Date.now()): boolean {
  if (!NON_TERMINAL.has(run.status)) return false;
  const startedAt = new Date(run.createdAt).getTime();
  return Number.isFinite(startedAt) && now - startedAt > STALE_RUNNING_THRESHOLD_MS;
}

/** True when the run is genuinely in progress (non-terminal and not stale). */
export function isRunActive(run: RunLike, now: number = Date.now()): boolean {
  return NON_TERMINAL.has(run.status) && !isRunStale(run, now);
}

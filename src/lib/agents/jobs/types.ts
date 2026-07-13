// =============================================================
// Agent Job types (4.4)
// =============================================================

import type { AgentJob, AgentJobType } from '@prisma/client';

export type { AgentJob, AgentJobType };

/** A handler receives the full DB row and returns an optional result blob. */
export type JobHandler = (job: AgentJob) => Promise<Record<string, unknown> | void>;

export interface JobRunResult {
  id: string;
  type: AgentJobType;
  /** SKIPPED: claim verloren aan een concurrerende tick óf tegengehouden door
   * de per-workspace AGENT_TASK-cap — job onaangeraakt, volgende tick opnieuw. */
  status: 'COMPLETED' | 'FAILED' | 'RETRY' | 'SKIPPED';
  attempts: number;
  error?: string;
  result?: Record<string, unknown>;
}

export interface RunPendingJobsResult {
  processed: number;
  results: JobRunResult[];
}

// =============================================================
// Agent Job types (4.4)
// =============================================================

import type { AgentJob, AgentJobType } from '@prisma/client';

export type { AgentJob, AgentJobType };

/** A handler receives the full DB row and returns an optional result blob. */
export type JobHandler = (job: AgentJob) => Promise<Record<string, unknown> | void>;

/**
 * Domein-fout: de job is definitief mislukt en opnieuw proberen heeft geen zin
 * (of is te duur). De runner finaliseert 'm als FAILED zónder retry.
 *
 * Bestaat omdat het alternatief erger was: `runSeoGenerationJob` kón "mislukt
 * maar niet opnieuw proberen" niet uitdrukken en keerde daarom normaal terug,
 * waarna de AgentJob COMPLETED boekte terwijl de SeoGenerationJob op FAILED
 * stond. Elke monitoring op jobstatus was daar per definitie blind voor
 * (gevonden in de e2e-sweep van 2026-08-15).
 */
export class NonRetryableJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableJobError';
  }
}

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

// =============================================================
// Brand Alignment — Brandclaw observations API client (Phase A).
//
// Fetch + mutate helpers voor /api/brandclaw/* endpoints. Consumed
// door useStrategyObservations / useRunStrategyAnalyst / usePatchObservation
// hooks.
// =============================================================

export type ObservationSeverity = "HIGH" | "MEDIUM" | "LOW";
export type ObservationConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface StrategyObservationResponse {
  id: string;
  dimension: string;
  severity: ObservationSeverity;
  confidence: ObservationConfidence;
  summary: string;
  evidence: {
    snapshotIds?: string[];
    toolCalls?: Array<{ name: string; inputHash?: string }>;
  };
  agentVersion: string;
  promptVersion: string;
  createdAt: string;
  markedReadAt: string | null;
  markedActedAt: string | null;
  dismissedAt: string | null;
  dismissReason: string | null;
  runId: string;
}

export interface StrategyObservationRunResponse {
  id: string;
  createdAt: string;
  totalCostUsd: string;
  latencyMs: number;
  agentVersion: string;
}

export interface ListObservationsResult {
  observations: StrategyObservationResponse[];
  lastRun: StrategyObservationRunResponse | null;
}

export interface ListObservationsFilters {
  dimension?: string;
  severity?: ObservationSeverity;
  includeDismissed?: boolean;
  limit?: number;
}

export async function fetchStrategyObservations(
  filters: ListObservationsFilters = {},
): Promise<ListObservationsResult> {
  const params = new URLSearchParams();
  if (filters.dimension) params.set("dimension", filters.dimension);
  if (filters.severity) params.set("severity", filters.severity);
  if (filters.includeDismissed) params.set("includeDismissed", "true");
  if (filters.limit) params.set("limit", String(filters.limit));

  const res = await fetch(`/api/brandclaw/observations?${params.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to fetch observations (${res.status})`);
  }
  return res.json();
}

export interface RunAnalystResult {
  runId: string;
  observationsCount: number;
  latencyMs: number;
  totalCostUsd: number;
  truncated: boolean;
  toolCallCount: number;
}

export async function runStrategyAnalystApi(): Promise<RunAnalystResult> {
  const res = await fetch("/api/brandclaw/strategy-analyst/run", {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to run Analyst (${res.status})`);
  }
  return res.json();
}

export type ObservationAction = "markRead" | "markActed" | "dismiss" | "undo";

export async function patchObservation(
  id: string,
  action: ObservationAction,
  reason?: string,
): Promise<{ id: string; markedReadAt: string | null; markedActedAt: string | null; dismissedAt: string | null; dismissReason: string | null }> {
  const res = await fetch(`/api/brandclaw/observations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...(reason ? { reason } : {}) }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to update observation (${res.status})`);
  }
  return res.json();
}

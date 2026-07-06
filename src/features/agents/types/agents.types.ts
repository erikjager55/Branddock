// =============================================================
// Agents UI — client-side types voor de catalogus, run-flow en
// results-inbox. Spiegelt de foundation-API-contracten
// (POST /api/agents/run, GET /api/agents/runs[/runId],
// PATCH /api/agents/artifacts/[id]) — wijzigingen dáár zijn leidend.
// =============================================================

/** Mirror of Prisma `AgentRunStatus` (string over the wire). */
export type AgentRunStatusValue =
  | 'QUEUED'
  | 'RUNNING'
  | 'AWAITING_CONFIRMATION'
  | 'COMPLETED'
  | 'FAILED';

/** Mirror of Prisma `AgentArtifactType` (string over the wire). */
export type AgentArtifactTypeValue = 'REPORT' | 'TABLE' | 'FINDINGS' | 'LINK' | 'PROPOSAL';

// ─── Catalog (GET /api/agents-catalog) ───────────────────────

export interface CatalogAgentUseCase {
  id: string;
  label: string;
}

export interface CatalogAgentPersona {
  name: string;
  role: string;
  /** Lucide icon name, resolved client-side (fallback: Bot). */
  icon: string;
}

export interface CatalogAgent {
  id: string;
  persona: CatalogAgentPersona;
  useCases: CatalogAgentUseCase[];
}

export interface AgentCatalogResponse {
  agents: CatalogAgent[];
}

// ─── Runs (GET /api/agents/runs[/runId]) ─────────────────────

export interface AgentArtifactSummary {
  id: string;
  type: AgentArtifactTypeValue;
  title: string;
  fidelityScore: number | null;
  acceptedAt: string | null;
  dismissedAt: string | null;
}

export interface AgentRunSummary {
  id: string;
  agentId: string;
  status: AgentRunStatusValue;
  triggerType: string;
  latencyMs: number;
  totalCostUsd: number;
  truncated: boolean;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  artifacts: AgentArtifactSummary[];
}

export interface AgentRunsResponse {
  runs: AgentRunSummary[];
}

/**
 * Full artifact as returned by the run-detail endpoint. `content` is the
 * per-type JSON payload (see prisma AgentArtifact.content doc-comment);
 * the viewer parses it defensively.
 */
export interface AgentArtifactFull extends AgentArtifactSummary {
  runId: string;
  content: Record<string, unknown>;
  createdAt: string;
}

export interface AgentRunDetail extends Omit<AgentRunSummary, 'artifacts'> {
  input: Record<string, unknown>;
  artifacts: AgentArtifactFull[];
}

export interface AgentRunDetailResponse {
  run: AgentRunDetail;
}

// ─── Run start (POST /api/agents/run) ────────────────────────

export interface StartAgentRunBody {
  agentId: string;
  useCaseId?: string;
  input: { message: string };
}

/** Mirror of RunAgentResponse — a FAILED run still returns 200 with a runId. */
export interface StartAgentRunResponse {
  runId: string;
  status: 'COMPLETED' | 'FAILED' | 'AWAITING_CONFIRMATION';
  artifactIds: string[];
  totalCostUsd: number;
  latencyMs: number;
  truncated: boolean;
  error: string | null;
}

// ─── Artifact accept/dismiss (PATCH /api/agents/artifacts/[id]) ──

export type ArtifactAction = 'accept' | 'dismiss';

export interface ArtifactActionResponse {
  artifact: AgentArtifactFull;
  materialized: { knowledgeResourceId: string } | null;
}

// ─── Proposal confirm (POST /api/agents/runs/[runId]/confirm) ──
// Route wordt geleverd door agents-motor-wiring (contract-afspraak
// 2026-07-06): body {artifactId, approved} → {executed, result?,
// runStatus}. PROPOSAL-artefacten lopen NOOIT via PATCH-accept.

export interface ConfirmProposalBody {
  artifactId: string;
  approved: boolean;
}

export interface ConfirmProposalResponse {
  executed: boolean;
  result?: unknown;
  runStatus: AgentRunStatusValue;
}

// ─── LINK artifact payload ───────────────────────────────────

export interface LinkArtifactContent {
  entityType: string;
  entityId: string;
  label?: string;
  /** Optional — deliverable links need the campaign for Canvas navigation. */
  campaignId?: string;
}

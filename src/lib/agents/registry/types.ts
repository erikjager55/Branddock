// =============================================================
// Agents registry — shared types (ADR 2026-07-05-agents-architectuur, D4).
//
// Code-based curated registry: een agent is een code-object, geen
// DB-rij. Nieuwe agents = code-change (bewust — geen custom-builder
// in het MVP-model). Dependency-richting: dit pakket importeert de
// orchestrator-types; de orchestrator kent dit pakket NIET.
// =============================================================

import type { AgentArtifactType } from "@prisma/client";
import type {
  AgentOutputContract,
  AgentToolNamespace,
} from "@/lib/brandclaw/orchestrator/types";
import type { AiFeatureKey } from "@/lib/ai/feature-models";
// Type-only import uit claw — geen runtime-dependency (dependency-richting blijft schoon).
import type { ContextSelection as AgentContextSelection } from "@/lib/claw/claw.types";

/**
 * Curated agent ids (ADR D4). 'echo-test' is test-only: hidden +
 * dev-gated registration — nooit zichtbaar in de catalogus.
 */
export type AgentId =
  | "research-analyst"
  | "brand-guardian"
  | "strategist"
  | "content-creator"
  | "market-analyst"
  | "data-analyst"
  | "echo-test";

/** Persona-framing (user-besluit 2026-07-05): benoemde agents, professioneel. */
export interface AgentPersona {
  /** Persona name, e.g. "Nova". Final names are a Fase-1 design decision. */
  name: string;
  /** Role label, e.g. "Research Analyst". */
  role: string;
  /** Lucide icon name (resolved client-side in agents-ui-inbox), e.g. "Telescope". */
  icon: string;
}

/**
 * Clickable use-case (Sintra-pattern): pre-baked task button that lowers
 * the prompting threshold. `{{input}}` in the template is replaced with
 * the run input message.
 */
export interface AgentUseCase {
  id: string;
  label: string;
  promptTemplate: string;
}

/**
 * Artifact draft as parsed from the agent's final message. Pragmatically
 * typed: `content` shape per type is documented on the Prisma model
 * (AgentArtifact.content) and validated deeper where it matters (the
 * Data Analyst TABLE parser has its own strict validation — see
 * tasks/agents-data-analyst.md). Foundation validates: known type,
 * non-empty title, object content, clamped fidelityScore.
 */
export interface AgentArtifactDraft {
  type: AgentArtifactType;
  title: string;
  content: Record<string, unknown>;
  /** F-VAL fidelity score (0-100) for content-producing agents. */
  fidelityScore?: number;
}

/** Result of the artifact-contract finalize step. */
export interface AgentFinalizeResult {
  status: "COMPLETED" | "FAILED" | "AWAITING_CONFIRMATION";
  artifactIds: string[];
  error: string | null;
}

/**
 * A curated agent definition. Thin config over existing engines: the
 * loop, guards, cost-tracking and tool-registry are shared (ADR D1);
 * the definition only scopes prompt, tools, use-cases, model-slot and
 * output-contract.
 */
export interface AgentDefinition {
  id: AgentId;
  /** Semver of the agent implementation → AgentRun.agentVersion. */
  agentVersion: string;
  persona: AgentPersona;
  /**
   * System-prompt builder (sync or async) so motor-wiring can embed
   * brand context lazily per run.
   */
  buildSystemPrompt(args: {
    workspaceId: string;
    /** Optionele content-sources-selectie (pariteit met de Brand Assistant);
     * afwezig = volledige merkcontext (default-gedrag). */
    contextSelection?: AgentContextSelection;
  }): string | Promise<string>;
  /** Stable version tag of the system prompt → AgentRun.promptVersion. */
  promptVersion: string;
  /** Tool-namespace in the shared registry, by convention `agent:${id}`. */
  toolNamespace: AgentToolNamespace;
  useCases: AgentUseCase[];
  /** Per-agent model slot (WorkspaceAiConfig via resolveFeatureModel). */
  featureKey: AiFeatureKey;
  outputContract: AgentOutputContract<AgentArtifactDraft[], AgentFinalizeResult>;
  /**
   * Credit-billing (ADR 2026-07-07): true = deze agent produceert user-facing
   * content en boekt output-credits af. Default (undefined/false) = gratis —
   * analyse/F-VAL/research/exploratie-agents zijn floor-gedekt (ADR §2/§3).
   */
  billable?: boolean;
  /** Override loop guards (defaults: 5min / 20 tool-calls). */
  timeoutMs?: number;
  maxToolCalls?: number;
  /**
   * Max output-tokens per model-turn (default 4096). Agents die een groot
   * eind-rapport in hun artifacts-JSON schrijven (strategist) hebben meer
   * nodig — anders kapt max_tokens de JSON af (smoke 2026-07-06).
   */
  maxTokens?: number;
  /** Excluded from listAgents(); run-entry rejects hidden agents in production. */
  hidden?: boolean;
}

export type { AgentContextSelection };

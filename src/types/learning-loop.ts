/**
 * Learning Loop — TypeScript types
 *
 * Types voor de continuous-learning-loop infrastructuur uit ontwerp-sessies 1+2:
 * - BrandContextSnapshot, AICallSnapshot, AICallTrace (cat 2)
 * - ContentFidelityScore (cat 6) + pillar/criterion definities
 * - ContentVersion diff-velden (cat 4)
 * - LearningEvent payload-shapes (cat 9)
 *
 * Zie: IMPLEMENTATIEPLAN-LEARNING-LOOP.md, IMPLEMENTATIEPLAN-FIDELITY-CRITERIA.md,
 * branddock-learning-loop-decisions.md (memory).
 */

// ─────────────────────────────────────────────────────────────────────────
// CAT 6 — Fidelity scoring
// ─────────────────────────────────────────────────────────────────────────

/** Drie pillars uniform over alle content-types. Optie 3 uit audit. */
export type FidelityPillarKey = "strategic" | "audience" | "execution";

/** Bron van een sub-criterion-score. */
export type FidelityCriterionSource = "deterministic" | "ai-judge" | "human";

/** Definitie van één pillar — uniform across content-types. */
export interface FidelityPillarDefinition {
  key: FidelityPillarKey;
  label: string;
  description: string;
  /** Gewicht binnen composite-score. Som over alle 3 pillars = 1.0 (per content-type config). */
  weight: number;
}

/** Definitie van één sub-criterion binnen een pillar. */
export interface FidelityCriterionDefinition {
  /** Stable identifier, snake-case. */
  key: string;
  label: string;
  description: string;
  pillar: FidelityPillarKey;
  source: FidelityCriterionSource;
  /** Gewicht binnen pillar. Som over alle criteria in dezelfde pillar = 1.0. */
  weight: number;
}

/** Volledige fidelity-config voor één content-type (of categorie-default). */
export interface ContentTypeFidelityConfig {
  /** Lege string = categorie-default. Anders specifieke contentType-id. */
  contentTypeId: string;
  /** Display-naam van de categorie (matcht `deliverable-types.ts` DELIVERABLE_CATEGORIES). */
  category: string;
  /** Drie pillars met gewichten. */
  pillars: FidelityPillarDefinition[];
  /** Zes sub-criteria. */
  criteria: FidelityCriterionDefinition[];
  /** Composite-score threshold voor `thresholdMet: true` (0-100). */
  compositeThreshold: number;
}

// ─── ContentFidelityScore Json-blob shapes ─────────────────────────────────

/**
 * Shape van `ContentFidelityScore.pillarScores`.
 * Exact 3 keys.
 */
export interface PillarScores {
  strategic: { score: number; weight: number };
  audience: { score: number; weight: number };
  execution: { score: number; weight: number };
}

/**
 * Shape van `ContentFidelityScore.subCriteriaScores`.
 * Exact 6 keys; key-namen variëren per content-type.
 */
export type SubCriteriaScores = Record<
  string,
  {
    score: number; // 0-100
    pillar: FidelityPillarKey;
    source: FidelityCriterionSource;
    /** Optionele toelichting van AI-judge of rule-engine. */
    rationale?: string;
  }
>;

/** Eén regel-overtreding binnen `ContentFidelityScore.ruleViolations`. */
export interface RuleViolation {
  /** Stable rule identifier, bijv. "platform.linkedin.maxChars". */
  ruleId: string;
  severity: "error" | "warning" | "info";
  message: string;
  /** Snippet uit de content waar de regel geschonden wordt. */
  snippet?: string;
  source: "rule-engine" | "ai-judge" | "human";
  pillar?: FidelityPillarKey;
}

// ─────────────────────────────────────────────────────────────────────────
// CAT 4 — Diff-tracking
// ─────────────────────────────────────────────────────────────────────────

/** Aggregate stats van een ContentVersion-edit. Shape voor `diffSummary Json`. */
export interface DiffSummary {
  charsAdded: number;
  charsRemoved: number;
  paragraphsTouched: number;
  /** 0-100. */
  percentChanged: number;
  sectionsReordered: boolean;
  /** charsAdded / max(charsBefore, 1). */
  ratio: number;
}

/** Auto-classified edit-type uit edit-classifier. */
export type EditTypeKey =
  | "shorten"
  | "expand"
  | "restructure"
  | "polish"
  | "rewrite"
  | "factual"
  | "tone";

// ─────────────────────────────────────────────────────────────────────────
// CAT 2 — Snapshots & Trace
// ─────────────────────────────────────────────────────────────────────────

/**
 * Shape van `AICallSnapshot.payload`. Provider-agnostiek met
 * provider-specifieke extensions.
 */
export interface AICallPayload {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant" | "tool";
    content: string | unknown[];
    tool_use_id?: string;
    tool_results?: unknown;
  }>;
  tools?: unknown[];
  params?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    stop_sequences?: string[];
    response_format?: unknown;
  };
  /** Provider-specifieke output-determinanten — bijv. extended_thinking, reasoning_effort. */
  providerExtensions?: Record<string, unknown>;
}

/** Source-type voor `AICallSnapshot.sourceType`. */
export type AICallSourceType = "ts-builder" | "db-config" | "inline";

/**
 * Shape van `AICallTrace.responseMetadata`. OUTPUT-side data van de call.
 */
export interface AICallResponseMetadata {
  inputTokens: number;
  outputTokens: number;
  /** Anthropic prompt-caching tokens. */
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  stopReason: string;
  latencyMs: number;
  errorCode?: string;
  errorMessage?: string;
  /** Was de brand-context-snapshot uit cache gehaald (vs fresh DB)? */
  wasFromCache: boolean;
  /** Hoe oud was de cache-entry op moment van call (seconden). */
  cacheAgeSeconds?: number;
}

// ─────────────────────────────────────────────────────────────────────────
// CAT 9 — LearningEvent payload-shapes
// ─────────────────────────────────────────────────────────────────────────

/**
 * Curated event-type taxonomy. ~25 types over 7 lifecycle-domeinen.
 * String-enum (geen DB-enum) — uitbreiden vereist alleen TS-update.
 */
export type LearningEventType =
  // Content lifecycle
  | "content.created"
  | "content.edited"
  | "content.regenerated"
  | "content.approved"
  | "content.rejected"
  | "content.published"
  | "content.archived"
  // AI-call lifecycle
  | "ai.call_started"
  | "ai.call_completed"
  | "ai.call_failed"
  // Fidelity
  | "fidelity.scored"
  | "fidelity.threshold_crossed"
  // Suggestions
  | "suggestion.accepted"
  | "suggestion.dismissed"
  | "suggestion.previewed"
  // Alignment
  | "alignment.issue_dismissed"
  | "alignment.fix_applied"
  // Configuratie
  | "prompt.template_changed"
  | "config.exploration_updated";

/**
 * Discriminated union — payload-shape per event-type.
 * Database slaat als Json op; emitter is type-safe.
 */
export type LearningEventPayload =
  | {
      type: "content.created" | "content.regenerated";
      data: {
        deliverableId: string;
        contentVersionId: string;
        contentType: string;
        callTraceId?: string;
      };
    }
  | {
      type: "content.edited";
      data: {
        deliverableId: string;
        contentVersionId: string;
        previousVersionId: string;
        editType: EditTypeKey | null;
        diffSummary: DiffSummary;
      };
    }
  | {
      type:
        | "content.approved"
        | "content.rejected"
        | "content.published"
        | "content.archived";
      data: {
        deliverableId: string;
        previousStatus: string;
        newStatus: string;
        reason?: string;
      };
    }
  | {
      type: "ai.call_started";
      data: {
        callTraceId: string;
        aiCallSnapshotId: string;
        sourceIdentifier: string;
        parentEntityType: string;
        parentEntityId: string;
      };
    }
  | {
      type: "ai.call_completed";
      data: {
        callTraceId: string;
        latencyMs: number;
        inputTokens: number;
        outputTokens: number;
        stopReason: string;
      };
    }
  | {
      type: "ai.call_failed";
      data: {
        callTraceId: string;
        errorCode: string;
        errorMessage: string;
      };
    }
  | {
      type: "fidelity.scored";
      data: {
        scoreId: string;
        contentVersionId: string;
        compositeScore: number;
        thresholdMet: boolean;
        judgeIdentifier: string;
      };
    }
  | {
      type: "fidelity.threshold_crossed";
      data: {
        contentVersionId: string;
        previousComposite: number;
        newComposite: number;
        direction: "up" | "down";
      };
    }
  | {
      type:
        | "suggestion.accepted"
        | "suggestion.dismissed"
        | "suggestion.previewed";
      data: {
        suggestionId: string;
        deliverableId: string;
        metric: string;
        impactPoints: number;
      };
    }
  | {
      type: "alignment.issue_dismissed";
      data: {
        issueId: string;
        scanId: string;
        reason?: string;
      };
    }
  | {
      type: "alignment.fix_applied";
      data: {
        issueId: string;
        scanId: string;
        fixOption: string;
      };
    }
  | {
      type: "prompt.template_changed";
      data: {
        sourceIdentifier: string;
        previousGitSha?: string;
        newGitSha: string;
        previousContentHash?: string;
        newContentHash: string;
      };
    }
  | {
      type: "config.exploration_updated";
      data: {
        configId: string;
        itemType: string;
        itemSubType?: string;
        previousContentHash?: string;
        newContentHash: string;
      };
    };

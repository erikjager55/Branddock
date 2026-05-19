// =============================================================
// Competitor snapshot/diff types
//
// Shared TS-types voor de competitor-historie data-laag (Fase 1
// van Competitive Intelligence Loop). Volgt het BrandstyleSnapshot
// pattern (zie src/lib/brandstyle/snapshots/types.ts).
//
// CanonicalExtracted is de input van zowel de hash-berekening als
// de diff-engine. Door één canonical shape te delen blijven hash
// en diff in lockstep — een verandering die de hash beweegt is
// gegarandeerd diff-detecteerbaar.
//
// Zie ADR docs/adr/2026-05-08-competitor-snapshot-historie.md.
// =============================================================
import type {
  CompetitorActivityType,
  ActivitySeverity,
} from '@prisma/client';

/**
 * De velden die in de hash + diff worden meegenomen. Bewust een
 * subset van Competitor — metadata (lastScrapedAt, updatedAt, ids,
 * lock-state) is uitgesloten zodat re-runs zonder content-wijziging
 * geen nieuwe snapshot opleveren.
 *
 * Volgorde van velden hier is de canonical sort-volgorde voor de
 * hash. NIET wijzigen zonder bestaande hashes te invalideren.
 */
export interface CanonicalExtracted {
  tagline: string | null;
  valueProposition: string | null;
  targetAudience: string | null;
  differentiators: string[];
  mainOfferings: string[];
  pricingModel: string | null;
  pricingDetails: string | null;
  toneOfVoice: string | null;
  messagingThemes: string[];
  visualStyleNotes: string | null;
  strengths: string[];
  weaknesses: string[];
  socialLinks: Record<string, string> | null;
  hasBlog: boolean | null;
  hasCareersPage: boolean | null;
}

/**
 * Workflow-state velden die NIET in de hash zitten maar wel in
 * STATUS_CHANGED / TIER_CHANGED diff-events worden gebruikt.
 * Apart bijgehouden zodat een tier-wijziging geen content-snapshot
 * triggert, maar wel een Activity-event produceert.
 */
export interface WorkflowState {
  status: string; // CompetitorStatus enum-waarde
  tier: string; // CompetitorTier enum-waarde
}

// ─── Diff payloads — per ActivityType ───────────────────

interface BaseDiffPayload {
  /** Voor render-zekerheid en future-migrations. Bump bij schema-shape change. */
  version: 1;
}

export interface FieldChangePayload extends BaseDiffPayload {
  kind: 'field-change';
  field: keyof CanonicalExtracted;
  before: string | null;
  after: string | null;
}

export interface ListChangePayload extends BaseDiffPayload {
  kind: 'list-change';
  field: keyof CanonicalExtracted;
  added: string[];
  removed: string[];
}

export interface PricingChangePayload extends BaseDiffPayload {
  kind: 'pricing-change';
  modelBefore: string | null;
  modelAfter: string | null;
  detailsBefore: string | null;
  detailsAfter: string | null;
  /** True als de wijziging primair op pricingDetails zat (>30% chars). */
  detailsSignificant: boolean;
}

export interface WorkflowChangePayload extends BaseDiffPayload {
  kind: 'workflow-change';
  field: 'status' | 'tier';
  before: string;
  after: string;
}

/**
 * AI-classifier output payload — pattern-level shifts die meerdere
 * velden combineren (CATEGORY_REPOSITIONING, TARGET_AUDIENCE_CHANGED).
 * Bevat de classifier rationale + welke canonical fields de detectie
 * gedreven hebben, zodat UI en debug-tools de bron kunnen tonen.
 */
export interface PatternChangePayload extends BaseDiffPayload {
  kind: 'pattern-change';
  /**
   * Canonical fields die de classifier *als kandidaten* heeft bekeken voor
   * dit event-type. Voor CATEGORY_REPOSITIONING zijn dat alle 4 snapshot-
   * velden (valueProposition + targetAudience + differentiators + mainOfferings);
   * voor TARGET_AUDIENCE_CHANGED alleen targetAudience. Dit is NIET een
   * lijst van velden die daadwerkelijk wijzigden — die info zit in `rationale`.
   */
  fields: Array<keyof CanonicalExtracted>;
  /** 1-zin AI-uitleg, direct uit classifier-output. */
  rationale: string;
}

export type DiffPayload =
  | FieldChangePayload
  | ListChangePayload
  | PricingChangePayload
  | WorkflowChangePayload
  | PatternChangePayload;

// ─── Detected activity (wat de diff-engine produceert) ───

/**
 * Eén activity-event afgeleid uit een snapshot-vergelijking.
 * Wordt door de refresh-route omgezet naar een CompetitorActivity
 * Prisma-record. Geen ids hier — die kent de engine niet.
 */
export interface DetectedActivity {
  type: CompetitorActivityType;
  severity: ActivitySeverity;
  diffPayload: DiffPayload;
  summary: string; // 1-zin human-readable
  detectionMethod: 'hash-diff' | 'manual' | 'ai-classified';
  /** Null voor deterministische diff-rules; gevuld door AI-classifier
   *  (zie `src/lib/competitors/ai-classifier.ts`). */
  confidence: number | null;
}

/**
 * Signature voor de AI-pattern-classifier. Wordt geïnjecteerd in
 * `computeDiffWithClassifier` (diff-engine.ts) zodat tests een mock
 * kunnen passen ipv de echte Anthropic-call.
 */
export type ClassifierFn = (
  prev: CanonicalExtracted | null,
  next: CanonicalExtracted,
) => Promise<DetectedActivity[]>;

// ─── Manual event context ───────────────────────────────

/**
 * Inputs die niet uit de extracted-state komen, maar wel als
 * Activity-events moeten verschijnen. Status- en tier-wijzigingen
 * zijn workflow-acties zonder content-impact, dus geen aparte
 * snapshot, maar wel een event op de bestaande snapshot.
 */
export interface ManualEventContext {
  workflowBefore: WorkflowState | null;
  workflowAfter: WorkflowState;
}

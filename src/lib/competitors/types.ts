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

export type DiffPayload =
  | FieldChangePayload
  | ListChangePayload
  | PricingChangePayload
  | WorkflowChangePayload;

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
  detectionMethod: 'hash-diff' | 'manual';
  /** Null voor deterministische diff-rules; gevuld door AI-classifier
   *  in vervolg-task `competitor-ai-event-classifier`. */
  confidence: number | null;
}

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

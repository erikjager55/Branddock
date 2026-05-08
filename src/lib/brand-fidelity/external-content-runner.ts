// ============================================================
// External-content runner — Δ-1 sub-cluster A engine
//
// Run F-VAL op extern content (paste / URL-fetch / file-upload) zonder
// canvas-stack of deliverable-context. Foundation voor de drie review-
// surfaces (Brand Alignment Tab 3, Brand Assistant `review_content` tool,
// PublishGate uitbreiding).
//
// Verschil met `runFidelity` (deliverable-pad):
//   - Geen `stack: CanvasContextStack` — brand-context komt uit `getBrandContext`
//   - Geen `deliverableId` — persisteert naar `ContentReviewLog` (Δ-1 model)
//     i.p.v. `ContentFidelityScore` (deliverable-bound)
//   - Findings persisteren via `BrandReviewFinding` met `contentReviewLogId`
//     XOR FK (per ADR-1)
//   - Default 90-dagen retention (per beslispunt 4 idea-doc)
// ============================================================

import { prisma } from '@/lib/prisma';
import { fetchVoiceguideCentroid } from './voice-similarity';
import {
  deriveVoiceBaseline1Pager,
  formatVoiceBaseline1Pager,
} from './voice-baseline-1pager';
import {
  computeFidelityScore,
  type FidelityCompositionInput,
  type FidelityCompositeResult,
} from './composition-engine';
import type { GeneratorProvider } from './judge-dispatcher';
import type { RuleViolation } from './rule-compiler';
import { Prisma } from '@prisma/client';
import type {
  BrandReviewSeverity,
  FindingCategory,
} from '@prisma/client';

// ─── Public API ──────────────────────────────────────

export interface ExternalContentReviewInput {
  workspaceId: string;
  /** UTF-8 paste-in / URL-fetch / file-extracted text. Char-cap 50k recommended at API-boundary. */
  contentText: string;
  /** 'paste' | 'url' | 'file' */
  sourceType: 'paste' | 'url' | 'file';
  /** Original URL when sourceType = 'url' (for source-attribution). */
  sourceUrl?: string;
  /** User-id van de trigger; null voor system-runs (cron audits). */
  userId?: string;
  /** Optional explicit locale override; else falls back via `BrandVoiceguide.contentLocale`. */
  language?: string;
  /** Default true — skip in fast-preview pad. */
  runJudge?: boolean;
  /** Default 90 days per beslispunt 4 idea-doc; override voor pilots indien nodig. */
  retentionDays?: number;
}

export interface ExternalContentReviewResult {
  reviewLogId: string;
  findingsCount: number;
  result: FidelityCompositeResult;
}

const DEFAULT_RETENTION_DAYS = 90;

/**
 * Orchestreer F-VAL run + ContentReviewLog + BrandReviewFinding persistence
 * voor extern content. Single entry-point voor alle drie review-surfaces.
 */
export async function runFidelityForExternalContent(
  input: ExternalContentReviewInput,
): Promise<ExternalContentReviewResult> {
  const startedAt = Date.now();

  // ── Fetch brand-context for prompt-embed (parallel with centroid) ──
  const [workspace, voiceguide, voiceguideCentroid] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: input.workspaceId },
      select: { name: true },
    }),
    prisma.brandVoiceguide.findUnique({
      where: { workspaceId: input.workspaceId },
    }),
    fetchVoiceguideCentroid(input.workspaceId),
  ]);

  if (!workspace) {
    throw new Error(`Workspace not found: ${input.workspaceId}`);
  }

  // ── Build minimal composition input ──
  // No persona/strategy summaries — external content has no campaign-context.
  const voiceBaseline1Pager = formatVoiceBaseline1Pager(
    deriveVoiceBaseline1Pager(voiceguide),
  );

  const compositionInput: FidelityCompositionInput = {
    contentText: input.contentText,
    workspaceId: input.workspaceId,
    brandName: workspace.name ?? 'Brand',
    brandVoiceSummary: voiceguide?.voiceDescription ?? '',
    voiceBaseline1Pager,
    personality: null,
    // Anthropic is the safest default cross-family judge; review-pad heeft
    // geen generator-provider om mee te kruisen (extern content is generator-agnostisch).
    generatorProvider: 'anthropic' as GeneratorProvider,
    targetWordCount: countWords(input.contentText),
    skipJudge: input.runJudge === false,
    voiceguideCentroid,
  };

  // ── Compute F-VAL ──
  const result = await computeFidelityScore(compositionInput);

  const durationMs = Date.now() - startedAt;
  const retainUntil = new Date(
    Date.now() + (input.retentionDays ?? DEFAULT_RETENTION_DAYS) * 24 * 60 * 60 * 1000,
  );

  // ── Persist ContentReviewLog + findings in transaction ──
  const ruleViolations = result.pillars.rules.result.rules.violations;
  const findings = ruleViolations.map(mapViolationToFindingInput);

  const reviewLog = await prisma.contentReviewLog.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId ?? null,
      sourceType: input.sourceType,
      sourceContent: truncateForStorage(input.contentText),
      sourceUrl: input.sourceUrl ?? null,
      language: input.language ?? null,
      compositeScore: result.compositeScore,
      pillarScoresJson: pillarsToJson(result),
      scorerVersion: result.scorerVersion,
      durationMs,
      retainUntil,
      findings: {
        create: findings.map((f) => ({
          workspaceId: input.workspaceId,
          location: f.location,
          severity: f.severity,
          category: f.category,
          description: f.description,
          suggestion: f.suggestion ?? null,
          beforeText: null,
          afterText: null,
          evidence: f.evidence ?? Prisma.JsonNull,
        })),
      },
    },
    select: { id: true },
  });

  return {
    reviewLogId: reviewLog.id,
    findingsCount: findings.length,
    result,
  };
}

// ─── Internals ───────────────────────────────────────

const STORAGE_CHAR_LIMIT = 50_000;

/** Truncate paste-in content for DB-storage budget. Char-offset positions in
 *  findings remain valid for the truncated copy (they reference the same text). */
function truncateForStorage(text: string): string {
  if (text.length <= STORAGE_CHAR_LIMIT) return text;
  return text.slice(0, STORAGE_CHAR_LIMIT) + '\n\n[truncated for storage]';
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function pillarsToJson(result: FidelityCompositeResult): Prisma.InputJsonValue {
  return {
    style: { score: result.pillars.style.score, weight: result.pillars.style.weight },
    judge: result.pillars.judge
      ? { score: result.pillars.judge.score, weight: result.pillars.judge.weight }
      : { score: 0, weight: 0 },
    rules: { score: result.pillars.rules.score, weight: result.pillars.rules.weight },
    pillar1Effective: result.pillar1EffectiveScore,
    detector: {
      verdict: result.detectorVerdict,
      humanBaselinePosition: result.humanBaselinePosition,
    },
  };
}

interface FindingInput {
  location: string;
  severity: BrandReviewSeverity;
  category: FindingCategory;
  description: string;
  suggestion?: string;
  evidence?: Prisma.InputJsonValue;
}

/**
 * Map RuleViolation (rule-compiler shape) → BrandReviewFinding insert-input.
 * Synthetic heuristic ruleIds (`heuristic:<locale>:<category>:<term>`) get
 * category-prefix parsed; BrandRule violations fall back to TERMINOLOGY.
 */
function mapViolationToFindingInput(v: RuleViolation): FindingInput {
  const severity = mapSeverity(v.severity);
  const category = inferCategory(v.ruleId);

  const location = `char ${v.position}: "${v.snippet}"`;

  return {
    location,
    severity,
    category,
    description: v.message,
    evidence: { ruleId: v.ruleId, ruleType: v.ruleType, pattern: v.pattern },
  };
}

function mapSeverity(s: RuleViolation['severity']): BrandReviewSeverity {
  switch (s) {
    case 'error':
      return 'HIGH' as BrandReviewSeverity;
    case 'warning':
      return 'MEDIUM' as BrandReviewSeverity;
    case 'info':
    default:
      return 'LOW' as BrandReviewSeverity;
  }
}

/**
 * Parse `heuristic:<locale>:<category>:<term>` ruleId-prefix → FindingCategory.
 * Non-heuristic violations (BrandRule rows) → TERMINOLOGY default.
 */
function inferCategory(ruleId: string): FindingCategory {
  if (!ruleId.startsWith('heuristic:')) {
    return 'TERMINOLOGY' as FindingCategory;
  }
  const parts = ruleId.split(':');
  const heuristicCategory = parts[2] ?? '';
  switch (heuristicCategory) {
    case 'corporate-fluff':
      return 'VOICE' as FindingCategory;
    case 'superlatives':
    case 'vague-quality':
    case 'risky-comparatives':
      return 'CLAIMS' as FindingCategory;
    case 'fillers':
      return 'STYLE' as FindingCategory;
    case 'ai-tells':
      return 'AI_TELL' as FindingCategory;
    default:
      return 'BUSINESS' as FindingCategory;
  }
}

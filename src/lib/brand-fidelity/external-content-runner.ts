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
import { Prisma, BrandReviewSeverity, FindingCategory } from '@prisma/client';

// ─── Public API ──────────────────────────────────────

const REVIEW_CHAR_LIMIT = 50_000;
const DEFAULT_RETENTION_DAYS = 90;

export class WorkspaceNotFoundError extends Error {
  constructor(public readonly workspaceId: string) {
    super(`Workspace not found: ${workspaceId}`);
    this.name = 'WorkspaceNotFoundError';
    Object.setPrototypeOf(this, WorkspaceNotFoundError.prototype);
  }
}

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
  /**
   * Stored on `ContentReviewLog.language` as audit-metadata. v1 doet GEEN active
   * locale-override op de evaluator — heuristic-pakket-resolution loopt altijd via
   * `BrandVoiceguide.contentLocale` (per ADR-3). Activeren als override = follow-up.
   */
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

/**
 * Orchestreer F-VAL run + ContentReviewLog + BrandReviewFinding persistence
 * voor extern content. Single entry-point voor alle drie review-surfaces.
 */
export async function runFidelityForExternalContent(
  input: ExternalContentReviewInput,
): Promise<ExternalContentReviewResult> {
  const startedAt = Date.now();

  // Cap content BEFORE F-VAL run so finding char-offsets reference positions
  // that exist in the persisted sourceContent. Pure slice — geen marker in de
  // text die naar de evaluator gaat (anders pollueert "[truncated]" word-count
  // en heuristic-matches). Storage krijgt het truncated-flag via aparte
  // metadata-marker.
  const wasTruncated = input.contentText.length > REVIEW_CHAR_LIMIT;
  const cappedContentText = wasTruncated
    ? input.contentText.slice(0, REVIEW_CHAR_LIMIT)
    : input.contentText;
  const storedSourceContent = wasTruncated
    ? cappedContentText + '\n\n[truncated for review]'
    : cappedContentText;

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
    throw new WorkspaceNotFoundError(input.workspaceId);
  }

  // ── Build minimal composition input ──
  // No persona/strategy summaries — external content has no campaign-context.
  const voiceBaseline1Pager = formatVoiceBaseline1Pager(
    deriveVoiceBaseline1Pager(voiceguide),
  );

  const compositionInput: FidelityCompositionInput = {
    contentText: cappedContentText,
    workspaceId: input.workspaceId,
    brandName: workspace.name ?? 'Brand',
    brandVoiceSummary: voiceguide?.voiceDescription ?? '',
    voiceBaseline1Pager,
    personality: null,
    // Anthropic is the safest default cross-family judge; review-pad heeft
    // geen generator-provider om mee te kruisen (extern content is generator-agnostisch).
    generatorProvider: 'anthropic' as GeneratorProvider,
    // External content heeft geen "target" word-count (geen brief). 0 signaleert
    // dat length-fit dimension genegeerd moet worden door composition-engine.
    targetWordCount: 0,
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
      sourceContent: storedSourceContent,
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
  // rule-compiler emit `position: 0, snippet: ''` als sentinel voor
  // non-positional violations (REQUIRED_PHRASE / STYLE_LIMIT counters).
  const isDocumentLevel = v.position === 0 && (!v.snippet || v.snippet === '');
  const location = isDocumentLevel
    ? 'document-level'
    : `char ${v.position}: "${v.snippet}"`;

  return {
    location,
    severity: mapSeverity(v.severity),
    category: inferCategory(v.ruleId),
    description: v.message,
    evidence: { ruleId: v.ruleId, ruleType: v.ruleType, pattern: v.pattern },
  };
}

function mapSeverity(s: RuleViolation['severity']): BrandReviewSeverity {
  switch (s) {
    case 'error':
      return BrandReviewSeverity.HIGH;
    case 'warning':
      return BrandReviewSeverity.MEDIUM;
    case 'info':
    default:
      return BrandReviewSeverity.LOW;
  }
}

/**
 * Parse `heuristic:<locale>:<category>:<term>` ruleId-prefix → FindingCategory.
 * Non-heuristic violations (BrandRule rows) → TERMINOLOGY default. Onbekende
 * heuristic-categorieën fallthrough → TERMINOLOGY (consistent met BrandRule
 * fallback) i.p.v. silent BUSINESS-bucketing van future packs.
 */
function inferCategory(ruleId: string): FindingCategory {
  if (!ruleId.startsWith('heuristic:')) {
    return FindingCategory.TERMINOLOGY;
  }
  const parts = ruleId.split(':');
  const heuristicCategory = parts[2] ?? '';
  switch (heuristicCategory) {
    case 'corporate-fluff':
      return FindingCategory.VOICE;
    case 'superlatives':
    case 'vague-quality':
    case 'risky-comparatives':
      return FindingCategory.CLAIMS;
    case 'fillers':
      return FindingCategory.STYLE;
    case 'ai-tells':
      return FindingCategory.AI_TELL;
    default:
      return FindingCategory.TERMINOLOGY;
  }
}

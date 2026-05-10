// ============================================================
// Shared util — RuleViolation → BrandReviewFinding mapper
//
// Gebruikt door external-content-runner (Δ-1 review-surfaces) en internal
// fidelity-runner (Δ-1 Surface E PublishGate findings-block) zodat beide
// paden dezelfde mapping logica delen. Voorkomt drift tussen externe en
// interne content-review categorisatie en severity-toekenning.
// ============================================================

import { Prisma, BrandReviewSeverity, FindingCategory } from '@prisma/client';
import type { RuleViolation } from './rule-compiler';

/**
 * Insert-input shape voor `BrandReviewFinding.create` — caller voegt
 * workspaceId + de XOR-FK (`fidelityScoreId` of `contentReviewLogId`)
 * toe alvorens te persisteren.
 */
export interface FindingInput {
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
export function mapViolationToFindingInput(v: RuleViolation): FindingInput {
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

export function mapSeverity(s: RuleViolation['severity']): BrandReviewSeverity {
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
export function inferCategory(ruleId: string): FindingCategory {
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

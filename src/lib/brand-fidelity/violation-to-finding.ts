// ============================================================
// Shared util — RuleViolation → BrandReviewFinding mapper
//
// Gebruikt door external-content-runner (Δ-1 review-surfaces) en internal
// fidelity-runner (Δ-1 Surface E PublishGate findings-block) zodat beide
// paden dezelfde mapping logica delen. Voorkomt drift tussen externe en
// interne content-review categorisatie en severity-toekenning.
// ============================================================

import { Prisma, BrandReviewSeverity, FindingCategory } from '@prisma/client';
import type { BrandRuleType } from '@prisma/client';
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
    category: inferCategory(v.ruleId, v.ruleType),
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
 * Bepaal `FindingCategory` per RuleViolation. Twee paden:
 *
 *  1. **Heuristic violations** (`ruleId` starts met `heuristic:`): parse
 *     `heuristic:<locale>:<category>:<term>` prefix; mapping zoals voorheen.
 *
 *  2. **BrandRule violations** (DB-rules): gebruik `ruleType` voor
 *     categorisatie i.p.v. blind TERMINOLOGY-fallback (insights-tab toonde
 *     anders 100% TERMINOLOGY voor alle BrandRule findings, wat de category-
 *     spread waardeloos maakt). FORBIDDEN_WORD blijft TERMINOLOGY want
 *     daar is geen eenduidig pad zonder schema-veld.
 *
 * Onbekende heuristic-categorieën fallthrough → TERMINOLOGY (consistent met
 * BrandRule-fallback) i.p.v. silent BUSINESS-bucketing van future packs.
 */
export function inferCategory(
  ruleId: string,
  ruleType?: BrandRuleType,
): FindingCategory {
  // Heuristic-violations: parse de `<category>` segment uit de ruleId.
  if (ruleId.startsWith('heuristic:')) {
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

  // BrandRule violations: routeer per ruleType. FORBIDDEN_WORD heeft geen
  // eenduidige category zonder schema-extension; blijft TERMINOLOGY.
  switch (ruleType) {
    case 'REQUIRED_PHRASE':
      // Verplichte claims/positionering — businessfoundation voor on-brand
      return FindingCategory.BUSINESS;
    case 'STYLE_LIMIT':
      // sentence-length, bullet-counts — pure style-constraints
      return FindingCategory.STYLE;
    case 'PILLAR_REFERENCE':
      // Brand-pillar keywords missing — businessfoundation
      return FindingCategory.BUSINESS;
    case 'FORBIDDEN_WORD':
    default:
      return FindingCategory.TERMINOLOGY;
  }
}

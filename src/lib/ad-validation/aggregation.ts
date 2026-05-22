// =============================================================
// Ad Quality Validation — weighted score-aggregation
//
// Per spec sectie 6.1:
//   overallScore = clamp(0, 100, (L1_BASE - L1_PENALTIES) * L1_WEIGHT
//                                + L2_AVG * L2_WEIGHT)
//   L1_BASE       = 100
//   L1_PENALTIES  = first fail -25, each subsequent fail -10, each warn -5
//   L2_AVG        = average(dimensions[*].score)
//
// Label-mapping (matches Google Ad Strength colors per spec sectie 6.3):
//   0-25   Poor       (red)
//   26-50  Average    (orange)
//   51-75  Good       (yellow)
//   76-100 Excellent  (green)
// =============================================================

import type {
  AdQualityLabel,
  AggregatedScore,
  L2JudgeResult,
  RuleResult,
  ValidatorWeights,
} from './types';
import { isFallback } from './types';

const L1_BASE = 100;
const FIRST_FAIL_PENALTY = 25;
const SUBSEQUENT_FAIL_PENALTY = 10;
const WARN_PENALTY = 5;

export function computeL1Score(results: RuleResult[]): number {
  let penalty = 0;
  let failCount = 0;
  for (const r of results) {
    if (r.status === 'fail') {
      penalty += failCount === 0 ? FIRST_FAIL_PENALTY : SUBSEQUENT_FAIL_PENALTY;
      failCount += 1;
    } else if (r.status === 'warn') {
      penalty += WARN_PENALTY;
    }
  }
  return Math.max(0, Math.min(100, L1_BASE - penalty));
}

export function computeL2Score(l2: L2JudgeResult): number | null {
  if (isFallback(l2)) return null;
  const scores = Object.values(l2.dimensions).map((d) => d.score);
  if (scores.length === 0) return null;
  return scores.reduce((acc, s) => acc + s, 0) / scores.length;
}

export function aggregate(
  l1Results: RuleResult[],
  l2: L2JudgeResult,
  weights: ValidatorWeights,
): AggregatedScore {
  const l1Score = computeL1Score(l1Results);
  const l2Score = computeL2Score(l2);

  // When L2 falls back (LLM-call failed), score is L1-only weighted by
  // the L1 weight. The badge surface this via the drawer's "AI-judge
  // unavailable" notice per spec sectie 5.2.1.
  let overall: number;
  if (l2Score === null) {
    overall = l1Score * weights.l1;
  } else {
    overall = l1Score * weights.l1 + l2Score * weights.l2;
  }

  const overallScore = Math.max(0, Math.min(100, Math.round(overall)));
  return {
    overallScore,
    ratingLabel: scoreToLabel(overallScore),
  };
}

export function scoreToLabel(score: number): AdQualityLabel {
  if (score >= 76) return 'excellent';
  if (score >= 51) return 'good';
  if (score >= 26) return 'average';
  return 'poor';
}

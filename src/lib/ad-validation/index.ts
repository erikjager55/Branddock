// =============================================================
// Ad Quality Validation Layer — public API entry-point
//
// Re-exports public symbols zodat consumers één import-pad hebben:
//   import { runAdQualityValidation, type AdQualityLabel } from '@/lib/ad-validation';
//
// Implementation files (types, content-hash, aggregation, runner,
// registry) zijn intern; alleen wat hier ge-export'd is hoort public.
// =============================================================

export { runAdQualityValidation } from './runner';
export { contentHash } from './content-hash';
export { aggregate, scoreToLabel } from './aggregation';
export { getValidator, registerValidator, listRegisteredTypes } from './registry';
export {
  type AdQualityLabel,
  type AggregatedScore,
  type Rule,
  type RuleResult,
  type RuleStatus,
  type RuleCategory,
  type ValidatorContext,
  type ValidatorEntry,
  type ValidatorWeights,
  type L2JudgeResult,
  type L2JudgeSuccess,
  type L2JudgeFallback,
  type ComponentTemplateItem,
  type GroupContents,
  type AdJudge,
  isFallback,
} from './types';
export { RULE_VERSION, JUDGE_VERSION, WEIGHTS_VERSION } from './versions';

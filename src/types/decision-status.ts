import type { DecisionQuality, ValidationMethodId } from './validation';

// Re-export the canonical DecisionQuality type — this file now acts as
// the decision-status-specific metadata hub (info, config, ranking) while
// delegating the status enum to the shared validation types.
export type { DecisionQuality };

/**
 * Alias kept so existing `DecisionStatus` imports continue to compile.
 * New code should import `DecisionQuality` from './validation' directly.
 */
export type DecisionStatus = DecisionQuality;

export interface DecisionStatusInfo {
  status: DecisionQuality;
  coverage: number;
  completedMethods: ValidationMethodId[];
  topMethodsCompleted: boolean;
  missingTopMethods: ValidationMethodId[];
  recommendation: string;
  risk: string;
  nextSteps: string[];
}

export interface DecisionStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  description: string;
  risk: string;
  canProceed: boolean;
  warningLevel: 'none' | 'warning' | 'critical';
}

export const DECISION_STATUS_CONFIG: Record<DecisionQuality, DecisionStatusConfig> = {
  'safe': {
    label: 'Safe to Decide',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800/30',
    icon: '✓',
    description: 'Sufficient research completed to make informed strategic decisions',
    risk: 'Minimal risk - decisions are backed by validated research',
    canProceed: true,
    warningLevel: 'none'
  },
  'at-risk': {
    label: 'Proceed with Caution',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 dark:bg-amber-950/20',
    borderColor: 'border-amber-200 dark:border-amber-800/30',
    icon: '⚠',
    description: 'Partial research coverage - proceed with caution',
    risk: 'Moderate risk - decisions may lack critical strategic insights',
    canProceed: true,
    warningLevel: 'warning'
  },
  'blocked': {
    label: 'Complete Research First',
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-50 dark:bg-slate-950/20',
    borderColor: 'border-slate-200 dark:border-slate-800/30',
    icon: '•',
    description: 'Insufficient research to make strategic decisions',
    risk: 'High risk - decisions would be speculative without proper validation',
    canProceed: false,
    warningLevel: 'critical'
  }
};

// Research method strategic ranking
export const RESEARCH_METHOD_RANKING: Record<string, number> = {
  'workshop': 1,
  'interviews': 2,
  'questionnaire': 3,
  'ai-exploration': 4
};

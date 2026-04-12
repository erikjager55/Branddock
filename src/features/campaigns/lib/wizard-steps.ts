/**
 * Wizard Step Registry
 *
 * Each step is defined once and cherry-picked by campaign/content flows.
 * Shared steps (Knowledge, Strategy, Concept) are identical across flows.
 * No component imports here — avoids circular deps (registry → components → store → registry).
 */

import { getTimeBinding } from "./goal-types";

// ─── Types ────────────────────────────────────────────────

export type WizardMode = 'campaign' | 'content';

/** Minimal state snapshot read by canProceed functions */
export interface WizardStepState {
  wizardMode: WizardMode;
  name: string;
  campaignGoalType: string | null;
  selectedContentType: string | null;
  startDate: string;
  endDate: string;
  selectedKnowledgeIds: string[];
  strategyPhase: string;
  briefingValidation: { overallScore: number } | null;
  blueprintResult: unknown | null;
  selectedDeliverables: { type: string; quantity: number }[];
  selectedInsightIndex: number | null;
  selectedConceptIndex: number | null;
  finalStrategy: unknown | null;
  contentGenPhase?: string;
  hasSelectedVariant?: boolean;
}

export interface StepDefinition {
  /** Stable identifier — never changes, used for component lookup */
  key: string;
  /** Label shown in the stepper UI */
  label: string;
  /** Can the user proceed past this step? */
  canProceed: (state: WizardStepState) => boolean;
}

// ─── Step Definitions ─────────────────────────────────────

export const SETUP_STEP: StepDefinition = {
  key: 'setup',
  label: 'Setup',
  canProceed: (s) => {
    const hasName = s.name.trim().length > 0;
    if (s.wizardMode === 'content') {
      return hasName && s.selectedContentType !== null;
    }
    const hasGoal = s.campaignGoalType !== null;
    if (!hasName || !hasGoal) return false;
    if (s.campaignGoalType && getTimeBinding(s.campaignGoalType) === 'time-bound') {
      return s.startDate.length > 0 && s.endDate.length > 0 && s.endDate >= s.startDate;
    }
    return true;
  },
};

export const KNOWLEDGE_STEP: StepDefinition = {
  key: 'knowledge',
  label: 'Knowledge',
  canProceed: (s) => s.selectedKnowledgeIds.length > 0,
};

export const STRATEGY_STEP: StepDefinition = {
  key: 'strategy',
  label: 'Strategy',
  canProceed: (s) => {
    if (s.strategyPhase === 'review_briefing') {
      return (s.briefingValidation?.overallScore ?? 0) >= 80;
    }
    if (s.strategyPhase === 'building_foundation') return false;
    if (s.strategyPhase === 'validating_briefing') return false;
    if (s.strategyPhase === 'review_strategy') return false;
    return s.strategyPhase === 'rationale_complete';
  },
};

export const CONCEPT_STEP: StepDefinition = {
  key: 'concept',
  label: 'Concept',
  canProceed: (s) => {
    if (s.strategyPhase === 'mining_insights') return false;
    if (s.strategyPhase === 'review_insights') return s.selectedInsightIndex !== null;
    if (s.strategyPhase === 'generating_concepts') return false;
    if (s.strategyPhase === 'review_concepts') return s.selectedConceptIndex !== null;
    if (s.strategyPhase === 'building_strategy') return false;
    if (s.strategyPhase === 'review_final_strategy') return s.finalStrategy !== null;
    if (s.strategyPhase === 'creative_debate') return false;
    if (s.strategyPhase === 'review_debate') return true;
    return s.strategyPhase === 'complete' && s.blueprintResult !== null;
  },
};

export const CONTENT_GENERATE_STEP: StepDefinition = {
  key: 'content-generate',
  label: 'Content',
  canProceed: (s) => {
    // Content generation no longer happens in the wizard — it happens in
    // the Canvas after the user reviews context. The wizard only needs the
    // launch to have succeeded (deliverable created) to allow "Open in Canvas".
    return s.contentGenPhase === 'complete';
  },
};

export const DELIVERABLES_STEP: StepDefinition = {
  key: 'deliverables',
  label: 'Deliverables',
  canProceed: (s) => s.selectedDeliverables.length > 0,
};

export const REVIEW_STEP: StepDefinition = {
  key: 'review',
  label: 'Review',
  canProceed: () => true,
};

// ─── Flow Compositions ───────────────────────────────────

export const CAMPAIGN_STEPS: StepDefinition[] = [
  SETUP_STEP,
  KNOWLEDGE_STEP,
  STRATEGY_STEP,
  CONCEPT_STEP,
  DELIVERABLES_STEP,
  REVIEW_STEP,
];

export const CONTENT_STEPS: StepDefinition[] = [
  SETUP_STEP,
  KNOWLEDGE_STEP,
  STRATEGY_STEP,
  CONCEPT_STEP,
  CONTENT_GENERATE_STEP,
];

// ─── Helper ──────────────────────────────────────────────

export function getStepsForMode(mode: WizardMode): StepDefinition[] {
  return mode === 'content' ? CONTENT_STEPS : CAMPAIGN_STEPS;
}

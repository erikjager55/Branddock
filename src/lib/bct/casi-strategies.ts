/**
 * CASI 7 Intervention Strategies — BCT Technique Filters
 *
 * Each CASI intervention strategy maps to a set of BCT techniques
 * from the BCT Taxonomy v1. The strategy filters which techniques
 * are appropriate for the identified behavioral barriers.
 *
 * @see CASI Model — RIVM/Dutch Government Communication Science
 * @see BCT Taxonomy v1 — Michie et al., 2013
 */

import type { CasiDeterminant } from '../campaigns/strategy-blueprint.types';

// ─── Types ────────────────────────────────────────────────

export type CasiStrategyId = 'inform' | 'instruct' | 'model' | 'persuade' | 'facilitate' | 'incentivize' | 'regulate';

export interface CasiStrategy {
  id: CasiStrategyId;
  name: string;
  description: string;
  targetDeterminants: CasiDeterminant[];
  bctTechniqueIds: string[];
  whenToUse: string;
  marketingApplication: string;
}

// ─── CASI Intervention Strategies ─────────────────────────

export const CASI_STRATEGIES: Record<CasiStrategyId, CasiStrategy> = {
  inform: {
    id: 'inform',
    name: 'Inform',
    description: 'Provide factual information to increase knowledge and awareness. Education-first approach.',
    targetDeterminants: ['knowledge', 'attitude_risk_perception'],
    bctTechniqueIds: [
      'BCT_5_1',  // Information about health consequences
      'BCT_5_3',  // Information about social/environmental consequences
      'BCT_2_2',  // Feedback on behavior
      'BCT_2_7',  // Feedback on outcome(s) of behavior
    ],
    whenToUse: 'When the audience lacks knowledge about the behavior, its benefits, or how to perform it.',
    marketingApplication: 'Content marketing, educational campaigns, awareness campaigns, thought leadership.',
  },
  instruct: {
    id: 'instruct',
    name: 'Instruct',
    description: 'Teach specific skills and procedures. Show how to perform the behavior step by step.',
    targetDeterminants: ['capability', 'knowledge'],
    bctTechniqueIds: [
      'BCT_4_1',  // Instruction on how to perform the behavior
      'BCT_6_1',  // Demonstration of the behavior
      'BCT_8_1',  // Behavioral practice/rehearsal
      'BCT_8_7',  // Graded tasks
    ],
    whenToUse: 'When the audience knows what to do but not how to do it. Skill gap is the primary barrier.',
    marketingApplication: 'Tutorial content, how-to guides, onboarding sequences, product demos, interactive workshops.',
  },
  model: {
    id: 'model',
    name: 'Model',
    description: 'Use social influence and role models. Show others performing the behavior successfully.',
    targetDeterminants: ['social_environment', 'self_image'],
    bctTechniqueIds: [
      'BCT_6_1',  // Demonstration of the behavior
      'BCT_6_2',  // Social comparison
      'BCT_3_1',  // Social support (unspecified)
      'BCT_3_2',  // Social support (practical)
    ],
    whenToUse: 'When social norms or peer behavior influence the audience. Identity and belonging are key drivers.',
    marketingApplication: 'Influencer partnerships, case studies, testimonials, community building, ambassador programs.',
  },
  persuade: {
    id: 'persuade',
    name: 'Persuade',
    description: 'Change attitudes through argumentation, credibility, and reframing. Shift perception of the behavior.',
    targetDeterminants: ['attitude_risk_perception', 'resistance', 'emotions'],
    bctTechniqueIds: [
      'BCT_9_1',  // Credible source
      'BCT_9_2',  // Pros and cons
      'BCT_9_3',  // Comparative imagining of future outcomes
      'BCT_13_2', // Framing/reframing
      'BCT_13_5', // Identity associated with changed behavior
      'BCT_16_3', // Anticipated regret
    ],
    whenToUse: 'When the audience has negative attitudes, perceives high risk, or actively resists the behavior.',
    marketingApplication: 'Brand repositioning, objection handling, competitive messaging, thought leadership, rebranding campaigns.',
  },
  facilitate: {
    id: 'facilitate',
    name: 'Facilitate',
    description: 'Make the behavior easier by restructuring the environment. Reduce friction, add cues and prompts.',
    targetDeterminants: ['physical_environment', 'automatisms', 'capability'],
    bctTechniqueIds: [
      'BCT_7_1',  // Prompts/cues
      'BCT_12_1', // Restructuring the physical environment
      'BCT_12_5', // Adding objects to the environment
      'BCT_1_4',  // Action planning
    ],
    whenToUse: 'When the environment creates barriers or when habitual behaviors need disruption through environmental design.',
    marketingApplication: 'UX optimization, onboarding simplification, environmental nudges, product placement, trigger-based campaigns.',
  },
  incentivize: {
    id: 'incentivize',
    name: 'Incentivize',
    description: 'Provide rewards and reinforcement for performing the desired behavior. External motivation.',
    targetDeterminants: ['attitude_risk_perception', 'emotions', 'automatisms'],
    bctTechniqueIds: [
      'BCT_10_1', // Material incentive (behavior)
      'BCT_10_3', // Non-specific reward
      'BCT_10_4', // Social reward
      'BCT_2_3',  // Self-monitoring of behavior
      'BCT_8_3',  // Habit formation
    ],
    whenToUse: 'When the audience needs external motivation to start or maintain the behavior. Useful for habit formation.',
    marketingApplication: 'Loyalty programs, referral bonuses, gamification, milestone rewards, early-bird pricing.',
  },
  regulate: {
    id: 'regulate',
    name: 'Regulate',
    description: 'Use rules, restrictions, or social contracts. Create commitment devices and behavioral contracts.',
    targetDeterminants: ['resistance', 'social_environment', 'automatisms'],
    bctTechniqueIds: [
      'BCT_12_2', // Restructuring the social environment
      'BCT_1_9',  // Commitment
      'BCT_1_1',  // Goal setting (behavior)
      'BCT_1_3',  // Goal setting (outcome)
      'BCT_11_2', // Reduce negative emotions
    ],
    whenToUse: 'When voluntary change is insufficient. Creates structural support for behavior maintenance.',
    marketingApplication: 'Subscription commitments, pledge campaigns, brand manifestos, community rules, accountability programs.',
  },
} as const satisfies Record<CasiStrategyId, CasiStrategy>;

// ─── Helpers ──────────────────────────────────────────────

export function getCasiStrategy(id: CasiStrategyId): CasiStrategy | undefined {
  return CASI_STRATEGIES[id];
}

export function getStrategiesForDeterminant(determinant: CasiDeterminant): CasiStrategy[] {
  return Object.values(CASI_STRATEGIES).filter(
    (s) => s.targetDeterminants.includes(determinant),
  );
}

/**
 * Format all CASI strategies as a markdown prompt section for AI consumption.
 */
export function formatCasiStrategiesForPrompt(): string {
  const lines = ['## CASI Intervention Strategies (7 approaches)', ''];
  for (const strategy of Object.values(CASI_STRATEGIES)) {
    lines.push(`### ${strategy.name}`);
    lines.push(strategy.description);
    lines.push(`Targets: ${strategy.targetDeterminants.join(', ')}`);
    lines.push(`BCT techniques: ${strategy.bctTechniqueIds.join(', ')}`);
    lines.push(`When to use: ${strategy.whenToUse}`);
    lines.push('');
  }
  return lines.join('\n');
}

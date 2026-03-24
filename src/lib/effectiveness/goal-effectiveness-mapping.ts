/**
 * Goal → Effectiveness Mapping — Maps each of the 15 campaign goal types to
 * IPA-derived effectiveness parameters including brand/activation split,
 * emotional/rational balance, and strategic timeline guidance.
 */

import { IPA_EFFECTIVENESS } from './ipa-effectiveness';

// ─── Types ──────────────────────────────────────────────

export interface GoalEffectivenessMapping {
  goalType: string;
  recommendedSplit: { brand: number; activation: number };
  emotionalRationalBalance: 'emotional-led' | 'rational-led' | 'balanced';
  fameOpportunity: 'high' | 'medium' | 'low';
  channelMultiplierTarget: number;
  timeHorizon: 'short' | 'medium' | 'long';
  strategicImplication: string;
}

// ─── Mapping Data ───────────────────────────────────────

const GOAL_EFFECTIVENESS_MAP: Record<string, GoalEffectivenessMapping> = {
  // ── Growth & Awareness ─────────────────────────────────

  BRAND_AWARENESS: {
    goalType: 'BRAND_AWARENESS',
    recommendedSplit: { brand: 80, activation: 20 },
    emotionalRationalBalance: 'emotional-led',
    fameOpportunity: 'high',
    channelMultiplierTarget: 4,
    timeHorizon: 'long',
    strategicImplication: 'Pure brand play — invest heavily in emotional, fame-driving creative across 4+ channels. Effects will compound over 6-18 months. Resist short-term activation pressure.',
  },

  PRODUCT_LAUNCH: {
    goalType: 'PRODUCT_LAUNCH',
    recommendedSplit: { brand: 40, activation: 60 },
    emotionalRationalBalance: 'balanced',
    fameOpportunity: 'high',
    channelMultiplierTarget: 4,
    timeHorizon: 'short',
    strategicImplication: 'Launches need activation spike with brand halo. Lead with emotional "why it matters" supported by rational proof points. Aim for fame to earn media amplification.',
  },

  MARKET_EXPANSION: {
    goalType: 'MARKET_EXPANSION',
    recommendedSplit: { brand: 70, activation: 30 },
    emotionalRationalBalance: 'emotional-led',
    fameOpportunity: 'medium',
    channelMultiplierTarget: 3,
    timeHorizon: 'long',
    strategicImplication: 'New markets require brand-building investment to establish mental availability. Emotional connection overcomes cultural distance. Plan for 12+ month commitment.',
  },

  REBRANDING: {
    goalType: 'REBRANDING',
    recommendedSplit: { brand: 90, activation: 10 },
    emotionalRationalBalance: 'emotional-led',
    fameOpportunity: 'high',
    channelMultiplierTarget: 5,
    timeHorizon: 'long',
    strategicImplication: 'Almost entirely brand investment. Emotional storytelling about evolution is essential. Maximum channel presence needed to reset mental availability.',
  },

  // ── Engagement & Loyalty ───────────────────────────────

  CONTENT_MARKETING: {
    goalType: 'CONTENT_MARKETING',
    recommendedSplit: { brand: 60, activation: 40 },
    emotionalRationalBalance: 'balanced',
    fameOpportunity: 'medium',
    channelMultiplierTarget: 3,
    timeHorizon: 'long',
    strategicImplication: 'Content serves both brand and activation. Balance valuable insights (brand) with gated resources (activation). Consistency over time is the multiplier.',
  },

  AUDIENCE_ENGAGEMENT: {
    goalType: 'AUDIENCE_ENGAGEMENT',
    recommendedSplit: { brand: 70, activation: 30 },
    emotionalRationalBalance: 'emotional-led',
    fameOpportunity: 'high',
    channelMultiplierTarget: 3,
    timeHorizon: 'medium',
    strategicImplication: 'Engagement is a brand metric. Emotional, shareable content drives participation. Design for fame — engaged audiences amplify your message.',
  },

  COMMUNITY_BUILDING: {
    goalType: 'COMMUNITY_BUILDING',
    recommendedSplit: { brand: 80, activation: 20 },
    emotionalRationalBalance: 'emotional-led',
    fameOpportunity: 'medium',
    channelMultiplierTarget: 2,
    timeHorizon: 'long',
    strategicImplication: 'Communities are long-term brand assets. Invest in emotional belonging over transactional value. Fewer channels but deeper presence.',
  },

  LOYALTY_RETENTION: {
    goalType: 'LOYALTY_RETENTION',
    recommendedSplit: { brand: 50, activation: 50 },
    emotionalRationalBalance: 'balanced',
    fameOpportunity: 'low',
    channelMultiplierTarget: 3,
    timeHorizon: 'long',
    strategicImplication: 'Balance emotional brand reinforcement with tangible activation rewards. Retention is a long game — consistent touch over dramatic gestures.',
  },

  // ── Brand & Culture ────────────────────────────────────

  EMPLOYER_BRANDING: {
    goalType: 'EMPLOYER_BRANDING',
    recommendedSplit: { brand: 75, activation: 25 },
    emotionalRationalBalance: 'emotional-led',
    fameOpportunity: 'medium',
    channelMultiplierTarget: 3,
    timeHorizon: 'long',
    strategicImplication: 'Employer brand follows consumer brand rules. Emotional stories of employee experience outperform job listing optimization. Think long-term reputation.',
  },

  INTERNAL_BRANDING: {
    goalType: 'INTERNAL_BRANDING',
    recommendedSplit: { brand: 90, activation: 10 },
    emotionalRationalBalance: 'emotional-led',
    fameOpportunity: 'low',
    channelMultiplierTarget: 3,
    timeHorizon: 'long',
    strategicImplication: 'Almost entirely brand investment focused internally. Emotional connection to purpose drives behavior change. Multi-channel internal comms essential.',
  },

  THOUGHT_LEADERSHIP: {
    goalType: 'THOUGHT_LEADERSHIP',
    recommendedSplit: { brand: 70, activation: 30 },
    emotionalRationalBalance: 'rational-led',
    fameOpportunity: 'high',
    channelMultiplierTarget: 3,
    timeHorizon: 'long',
    strategicImplication: 'Exception to emotional-led rule: thought leadership requires rational credibility. But fame-driving contrarian perspectives create emotional impact.',
  },

  CSR_IMPACT: {
    goalType: 'CSR_IMPACT',
    recommendedSplit: { brand: 80, activation: 20 },
    emotionalRationalBalance: 'emotional-led',
    fameOpportunity: 'high',
    channelMultiplierTarget: 4,
    timeHorizon: 'long',
    strategicImplication: 'CSR is a brand-building powerhouse when done authentically. Emotional impact stories drive fame. Rational proof points prevent greenwashing perception.',
  },

  // ── Conversion & Activation ────────────────────────────

  LEAD_GENERATION: {
    goalType: 'LEAD_GENERATION',
    recommendedSplit: { brand: 30, activation: 70 },
    emotionalRationalBalance: 'rational-led',
    fameOpportunity: 'low',
    channelMultiplierTarget: 3,
    timeHorizon: 'short',
    strategicImplication: 'Activation-heavy but don\'t ignore brand context. Rational value propositions drive form fills. Multi-channel attribution essential for optimization.',
  },

  SALES_ACTIVATION: {
    goalType: 'SALES_ACTIVATION',
    recommendedSplit: { brand: 20, activation: 80 },
    emotionalRationalBalance: 'balanced',
    fameOpportunity: 'low',
    channelMultiplierTarget: 3,
    timeHorizon: 'short',
    strategicImplication: 'Heaviest activation split. But emotional triggers (urgency, FOMO, aspiration) outperform pure rational offers. Don\'t compete on price alone.',
  },

  EVENT_SEASONAL: {
    goalType: 'EVENT_SEASONAL',
    recommendedSplit: { brand: 45, activation: 55 },
    emotionalRationalBalance: 'emotional-led',
    fameOpportunity: 'high',
    channelMultiplierTarget: 4,
    timeHorizon: 'short',
    strategicImplication: 'Events are fame-driving opportunities even with activation goals. Emotional, culturally relevant creative stands out in seasonal noise.',
  },
};

// Legacy aliases
GOAL_EFFECTIVENESS_MAP.BRAND = GOAL_EFFECTIVENESS_MAP.BRAND_AWARENESS;
GOAL_EFFECTIVENESS_MAP.PRODUCT = GOAL_EFFECTIVENESS_MAP.PRODUCT_LAUNCH;
GOAL_EFFECTIVENESS_MAP.CONTENT = GOAL_EFFECTIVENESS_MAP.CONTENT_MARKETING;
GOAL_EFFECTIVENESS_MAP.ENGAGEMENT = GOAL_EFFECTIVENESS_MAP.AUDIENCE_ENGAGEMENT;

// ─── Public API ─────────────────────────────────────────

/**
 * Get formatted effectiveness context for injection into AI prompts.
 * Returns an empty string if no mapping exists.
 */
export function getEffectivenessContext(goalType: string): string {
  const mapping = GOAL_EFFECTIVENESS_MAP[goalType];
  if (!mapping) return '';

  return [
    '### Marketing Effectiveness (Binet & Field IPA Data)',
    `**Recommended budget split**: ${mapping.recommendedSplit.brand}% brand / ${mapping.recommendedSplit.activation}% activation`,
    `**Creative balance**: ${mapping.emotionalRationalBalance}`,
    `**Fame opportunity**: ${mapping.fameOpportunity}`,
    `**Channel target**: ${mapping.channelMultiplierTarget}+ channels for multiplier effect`,
    `**Time horizon**: ${mapping.timeHorizon}-term effects expected`,
    `**Strategic implication**: ${mapping.strategicImplication}`,
    '',
    'Key IPA rules to apply:',
    `- ${IPA_EFFECTIVENESS.brand_activation_split.name}: ${IPA_EFFECTIVENESS.brand_activation_split.finding}`,
    `- ${IPA_EFFECTIVENESS.emotional_over_rational.name}: ${IPA_EFFECTIVENESS.emotional_over_rational.finding}`,
    `- ${IPA_EFFECTIVENESS.fame_driving.name}: ${IPA_EFFECTIVENESS.fame_driving.finding}`,
  ].join('\n');
}

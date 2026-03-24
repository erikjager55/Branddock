/**
 * Goal → Cialdini Mapping — Maps each of the 15 campaign goal types to
 * 2-4 recommended Cialdini persuasion principles with application hints
 * and a persuasion strategy per goal.
 */

import { CIALDINI_PRINCIPLES, type CialdiniPrincipleId } from './cialdini-principles';

// ─── Types ──────────────────────────────────────────────

export interface GoalCialdiniMapping {
  goalType: string;
  primaryPrinciples: Array<{
    id: CialdiniPrincipleId;
    applicationHint: string;
    intensity: 'high' | 'medium' | 'low';
  }>;
  persuasionStrategy: string;
}

// ─── Mapping Data ───────────────────────────────────────

const GOAL_CIALDINI_MAP: Record<string, GoalCialdiniMapping> = {
  // ── Growth & Awareness ─────────────────────────────────

  BRAND_AWARENESS: {
    goalType: 'BRAND_AWARENESS',
    primaryPrinciples: [
      { id: 'social_proof', applicationHint: 'Show that others in the audience\'s peer group already know and engage with the brand', intensity: 'high' },
      { id: 'authority', applicationHint: 'Leverage industry credibility, expert endorsements, or awards to establish trust quickly', intensity: 'high' },
      { id: 'liking', applicationHint: 'Build immediate rapport through relatable brand personality and shared values', intensity: 'medium' },
    ],
    persuasionStrategy: 'Lead with social proof and authority to build rapid credibility. Use liking to create emotional connection and memorability.',
  },

  PRODUCT_LAUNCH: {
    goalType: 'PRODUCT_LAUNCH',
    primaryPrinciples: [
      { id: 'scarcity', applicationHint: 'Create genuine launch-window exclusivity with early access, limited editions, or time-limited pricing', intensity: 'high' },
      { id: 'social_proof', applicationHint: 'Showcase beta tester results, pre-order numbers, or waitlist size to validate demand', intensity: 'high' },
      { id: 'reciprocity', applicationHint: 'Offer exclusive preview content or early access as a gift to build goodwill', intensity: 'medium' },
      { id: 'commitment_consistency', applicationHint: 'Use waitlist signups and pre-registrations as micro-commitments leading to purchase', intensity: 'medium' },
    ],
    persuasionStrategy: 'Drive urgency through genuine scarcity while validating demand with social proof. Use reciprocity and commitment to build a pipeline of engaged prospects.',
  },

  MARKET_EXPANSION: {
    goalType: 'MARKET_EXPANSION',
    primaryPrinciples: [
      { id: 'authority', applicationHint: 'Partner with local experts, institutions, or cultural figures to establish credibility in the new market', intensity: 'high' },
      { id: 'social_proof', applicationHint: 'Feature early adopters and success stories from the new market segment', intensity: 'high' },
      { id: 'unity', applicationHint: 'Position the brand as understanding and belonging to the local culture or community', intensity: 'medium' },
    ],
    persuasionStrategy: 'Build trust through local authority and social proof. Use unity to overcome "outsider" perception and create cultural belonging.',
  },

  REBRANDING: {
    goalType: 'REBRANDING',
    primaryPrinciples: [
      { id: 'commitment_consistency', applicationHint: 'Frame the rebrand as a natural evolution consistent with original brand values', intensity: 'high' },
      { id: 'authority', applicationHint: 'Communicate the strategic rationale and expertise behind the rebrand decision', intensity: 'medium' },
      { id: 'unity', applicationHint: 'Involve loyal customers and employees in the rebrand journey to maintain identity connection', intensity: 'high' },
    ],
    persuasionStrategy: 'Reduce resistance by framing change as consistency with core values. Use unity to make stakeholders feel part of the evolution.',
  },

  // ── Engagement & Loyalty ───────────────────────────────

  CONTENT_MARKETING: {
    goalType: 'CONTENT_MARKETING',
    primaryPrinciples: [
      { id: 'reciprocity', applicationHint: 'Deliver genuinely valuable content that solves problems before asking for anything in return', intensity: 'high' },
      { id: 'authority', applicationHint: 'Demonstrate deep expertise through original research, frameworks, and actionable insights', intensity: 'high' },
      { id: 'commitment_consistency', applicationHint: 'Create content series that build habitual consumption through progressive commitment', intensity: 'medium' },
    ],
    persuasionStrategy: 'Lead with reciprocity through genuinely valuable content. Build authority over time. Use commitment to create habitual engagement.',
  },

  AUDIENCE_ENGAGEMENT: {
    goalType: 'AUDIENCE_ENGAGEMENT',
    primaryPrinciples: [
      { id: 'social_proof', applicationHint: 'Showcase community participation rates and highlight engaged members', intensity: 'high' },
      { id: 'liking', applicationHint: 'Create interactive experiences that make engaging with the brand genuinely enjoyable', intensity: 'high' },
      { id: 'unity', applicationHint: 'Build a shared identity among engaged audience members', intensity: 'medium' },
      { id: 'reciprocity', applicationHint: 'Reward engagement with recognition, exclusive content, or early access', intensity: 'medium' },
    ],
    persuasionStrategy: 'Make engagement visible (social proof) and enjoyable (liking). Build community identity through unity and reward participation through reciprocity.',
  },

  COMMUNITY_BUILDING: {
    goalType: 'COMMUNITY_BUILDING',
    primaryPrinciples: [
      { id: 'unity', applicationHint: 'Create strong shared identity markers, rituals, and language for community members', intensity: 'high' },
      { id: 'social_proof', applicationHint: 'Make community growth and activity visible to attract new members', intensity: 'medium' },
      { id: 'commitment_consistency', applicationHint: 'Design onboarding rituals that create early commitment to the community', intensity: 'medium' },
      { id: 'reciprocity', applicationHint: 'Foster peer-to-peer help and value exchange within the community', intensity: 'medium' },
    ],
    persuasionStrategy: 'Unity is the foundation — create genuine belonging. Use commitment for onboarding stickiness and reciprocity for peer-to-peer engagement.',
  },

  LOYALTY_RETENTION: {
    goalType: 'LOYALTY_RETENTION',
    primaryPrinciples: [
      { id: 'commitment_consistency', applicationHint: 'Remind customers of their history with the brand and the value they\'ve accumulated', intensity: 'high' },
      { id: 'reciprocity', applicationHint: 'Reward loyalty with genuinely valuable perks, not token gestures', intensity: 'high' },
      { id: 'unity', applicationHint: 'Make loyal customers feel like insiders with exclusive access and co-creation opportunities', intensity: 'medium' },
    ],
    persuasionStrategy: 'Leverage sunk investment through commitment/consistency. Reward loyalty genuinely through reciprocity. Deepen bonds through insider unity.',
  },

  // ── Brand & Culture ────────────────────────────────────

  EMPLOYER_BRANDING: {
    goalType: 'EMPLOYER_BRANDING',
    primaryPrinciples: [
      { id: 'social_proof', applicationHint: 'Feature authentic employee stories, Glassdoor ratings, and workplace awards', intensity: 'high' },
      { id: 'liking', applicationHint: 'Show genuine company culture that resonates with target talent personas', intensity: 'high' },
      { id: 'authority', applicationHint: 'Highlight industry leadership, innovation track record, and career growth outcomes', intensity: 'medium' },
    ],
    persuasionStrategy: 'Lead with authentic employee social proof. Build liking through genuine culture showcase. Establish authority through track record.',
  },

  INTERNAL_BRANDING: {
    goalType: 'INTERNAL_BRANDING',
    primaryPrinciples: [
      { id: 'unity', applicationHint: 'Create strong team identity around brand values and shared purpose', intensity: 'high' },
      { id: 'commitment_consistency', applicationHint: 'Use value pledges, onboarding rituals, and public commitments to brand behaviors', intensity: 'high' },
      { id: 'social_proof', applicationHint: 'Celebrate internal brand champions and make brand-aligned behavior visible', intensity: 'medium' },
    ],
    persuasionStrategy: 'Build unity around shared brand identity. Use commitment rituals to embed brand values. Reinforce through internal social proof.',
  },

  THOUGHT_LEADERSHIP: {
    goalType: 'THOUGHT_LEADERSHIP',
    primaryPrinciples: [
      { id: 'authority', applicationHint: 'Publish original research, data-driven insights, and contrarian perspectives backed by evidence', intensity: 'high' },
      { id: 'reciprocity', applicationHint: 'Share valuable frameworks and tools freely, creating intellectual debt', intensity: 'high' },
      { id: 'social_proof', applicationHint: 'Showcase citation counts, media mentions, conference invitations, and industry recognition', intensity: 'medium' },
    ],
    persuasionStrategy: 'Authority is paramount — demonstrate genuine expertise through original thinking. Use reciprocity by giving away valuable knowledge.',
  },

  CSR_IMPACT: {
    goalType: 'CSR_IMPACT',
    primaryPrinciples: [
      { id: 'authority', applicationHint: 'Partner with trusted NGOs, certifications (B Corp), and third-party auditors for credibility', intensity: 'high' },
      { id: 'social_proof', applicationHint: 'Show measurable impact data and feature real beneficiary stories', intensity: 'high' },
      { id: 'unity', applicationHint: 'Invite customers to participate in the impact journey, creating shared purpose', intensity: 'medium' },
      { id: 'commitment_consistency', applicationHint: 'Help people make public sustainability commitments linked to the brand', intensity: 'low' },
    ],
    persuasionStrategy: 'Combat greenwashing skepticism with third-party authority and genuine social proof. Build unity around shared impact goals.',
  },

  // ── Conversion & Activation ────────────────────────────

  LEAD_GENERATION: {
    goalType: 'LEAD_GENERATION',
    primaryPrinciples: [
      { id: 'reciprocity', applicationHint: 'Offer high-value lead magnets (tools, templates, data) that justify the information exchange', intensity: 'high' },
      { id: 'scarcity', applicationHint: 'Create genuine time-limited access to premium content or early-bird opportunities', intensity: 'medium' },
      { id: 'authority', applicationHint: 'Demonstrate expertise through the quality and depth of free resources', intensity: 'medium' },
      { id: 'social_proof', applicationHint: 'Show download counts, subscriber numbers, or customer logos near conversion points', intensity: 'medium' },
    ],
    persuasionStrategy: 'Lead with reciprocity — make the exchange feel like a gift, not a transaction. Support with authority and social proof at conversion points.',
  },

  SALES_ACTIVATION: {
    goalType: 'SALES_ACTIVATION',
    primaryPrinciples: [
      { id: 'scarcity', applicationHint: 'Create genuine urgency through real deadlines, limited quantities, or exclusive pricing windows', intensity: 'high' },
      { id: 'social_proof', applicationHint: 'Show recent purchases, customer count, and satisfaction ratings at point of purchase', intensity: 'high' },
      { id: 'commitment_consistency', applicationHint: 'Use cart additions, wishlists, and free trials as micro-commitments leading to purchase', intensity: 'medium' },
      { id: 'authority', applicationHint: 'Display expert reviews, certifications, and comparison wins at decision points', intensity: 'medium' },
    ],
    persuasionStrategy: 'Drive action through genuine scarcity and social proof at purchase moments. Use commitment/consistency for cart recovery.',
  },

  EVENT_SEASONAL: {
    goalType: 'EVENT_SEASONAL',
    primaryPrinciples: [
      { id: 'scarcity', applicationHint: 'Leverage the natural time boundary of the event for genuine urgency', intensity: 'high' },
      { id: 'social_proof', applicationHint: 'Show participation numbers, ticket sales, and community excitement in real-time', intensity: 'high' },
      { id: 'unity', applicationHint: 'Create a shared experience identity around the event', intensity: 'medium' },
    ],
    persuasionStrategy: 'Events have natural scarcity — amplify it authentically. Build anticipation through visible social proof and shared experience unity.',
  },
};

// Legacy aliases
GOAL_CIALDINI_MAP.BRAND = GOAL_CIALDINI_MAP.BRAND_AWARENESS;
GOAL_CIALDINI_MAP.PRODUCT = GOAL_CIALDINI_MAP.PRODUCT_LAUNCH;
GOAL_CIALDINI_MAP.CONTENT = GOAL_CIALDINI_MAP.CONTENT_MARKETING;
GOAL_CIALDINI_MAP.ENGAGEMENT = GOAL_CIALDINI_MAP.AUDIENCE_ENGAGEMENT;

// ─── Public API ─────────────────────────────────────────

/**
 * Get formatted Cialdini context for injection into AI prompts.
 * Returns an empty string if no mapping exists.
 */
export function getCialdiniContext(goalType: string): string {
  const mapping = GOAL_CIALDINI_MAP[goalType];
  if (!mapping) return '';

  const principleList = mapping.primaryPrinciples
    .map((p) => {
      const principle = CIALDINI_PRINCIPLES[p.id];
      return `- **${principle.name}** (${p.intensity}): ${p.applicationHint}`;
    })
    .join('\n');

  return [
    '### Persuasion Principles (Cialdini)',
    `**Persuasion strategy**: ${mapping.persuasionStrategy}`,
    '',
    'Recommended principles:',
    principleList,
  ].join('\n');
}

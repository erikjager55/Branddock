/**
 * Cialdini's 7 Principles of Persuasion
 *
 * Based on Robert Cialdini's research (Influence: The Psychology of Persuasion, 1984;
 * Pre-Suasion, 2016). Maps the 7 evidence-based persuasion principles to marketing
 * applications with ethical guardrails.
 *
 * Used in campaign strategy generation to select appropriate persuasion tactics.
 */

// ─── Types ──────────────────────────────────────────────

export type CialdiniPrincipleId =
  | 'reciprocity'
  | 'commitment_consistency'
  | 'social_proof'
  | 'authority'
  | 'liking'
  | 'scarcity'
  | 'unity';

export interface CialdiniPrinciple {
  id: CialdiniPrincipleId;
  name: string;
  description: string;
  psychologicalBasis: string;
  marketingApplication: string;
  examples: string[];
  ethicalGuardrails: string;
}

// ─── Principles Catalog ─────────────────────────────────

export const CIALDINI_PRINCIPLES: Record<CialdiniPrincipleId, CialdiniPrinciple> = {
  reciprocity: {
    id: 'reciprocity',
    name: 'Reciprocity',
    description: 'People feel obligated to return favors and give back when they receive something.',
    psychologicalBasis: 'The norm of reciprocity is deeply ingrained across cultures. When someone does something for us, we feel compelled to reciprocate.',
    marketingApplication: 'Provide genuine value upfront (free tools, content, samples) to create a sense of obligation and goodwill before asking for action.',
    examples: [
      'Free valuable content or tools before asking for email signup',
      'Generous free trials with full feature access',
      'Unexpected bonuses or gifts with purchase',
    ],
    ethicalGuardrails: 'The value given must be genuine and useful, not a manipulative token. Avoid creating artificial obligations.',
  },
  commitment_consistency: {
    id: 'commitment_consistency',
    name: 'Commitment & Consistency',
    description: 'Once people commit to something, they are more likely to follow through to remain consistent with their self-image.',
    psychologicalBasis: 'Humans have a deep need to be seen as consistent. Small commitments lead to larger ones (foot-in-the-door technique).',
    marketingApplication: 'Start with small, low-stakes commitments that align with the desired behavior, then gradually escalate.',
    examples: [
      'Free quiz or assessment before product recommendation',
      'Progressive onboarding (small steps → full adoption)',
      'Public goal-setting or pledge mechanisms',
    ],
    ethicalGuardrails: 'Initial commitments must be genuinely voluntary. Never lock people into commitments through hidden obligations.',
  },
  social_proof: {
    id: 'social_proof',
    name: 'Social Proof',
    description: 'People look to others similar to themselves to determine correct behavior, especially in uncertain situations.',
    psychologicalBasis: 'In ambiguous situations, we use others\' behavior as evidence of the right course of action. Stronger when the "others" are similar to us.',
    marketingApplication: 'Show that people like the target audience are already engaging with the brand. Use numbers, testimonials, and peer behavior.',
    examples: [
      'Customer testimonials from relatable personas',
      'Usage statistics ("10,000 teams trust us")',
      'Real-time activity indicators ("Sarah just signed up")',
    ],
    ethicalGuardrails: 'Social proof must be genuine, not fabricated. Never use fake reviews, inflated numbers, or misleading testimonials.',
  },
  authority: {
    id: 'authority',
    name: 'Authority',
    description: 'People follow the lead of credible, knowledgeable experts.',
    psychologicalBasis: 'We use authority as a mental shortcut to determine trustworthiness. Signals of expertise reduce our need for independent evaluation.',
    marketingApplication: 'Establish and communicate genuine expertise through credentials, endorsements, certifications, and thought leadership.',
    examples: [
      'Expert endorsements or partnerships',
      'Industry awards and certifications displayed prominently',
      'Founder/team credentials and track record',
    ],
    ethicalGuardrails: 'Authority claims must be verifiable and relevant. Never fabricate credentials or imply endorsements that don\'t exist.',
  },
  liking: {
    id: 'liking',
    name: 'Liking',
    description: 'People are more easily influenced by people and brands they like, find attractive, or feel similar to.',
    psychologicalBasis: 'Liking is driven by similarity, compliments, familiarity, and association with positive things. We say yes to people we like.',
    marketingApplication: 'Build genuine rapport through relatable brand personality, shared values, and authentic human connection.',
    examples: [
      'Brand personality that mirrors target audience values',
      'Behind-the-scenes content showing real people',
      'Community-building around shared interests',
    ],
    ethicalGuardrails: 'Likeability should come from authentic brand attributes, not manufactured personas or false similarity claims.',
  },
  scarcity: {
    id: 'scarcity',
    name: 'Scarcity',
    description: 'People value things more when they are rare or becoming less available.',
    psychologicalBasis: 'Loss aversion makes potential loss more motivating than potential gain. Scarcity signals value and triggers urgency.',
    marketingApplication: 'Communicate genuine limitations in time, quantity, or access to motivate action. Highlight what people stand to lose.',
    examples: [
      'Limited-time offers with real deadlines',
      'Early access or waitlist exclusivity',
      'Limited edition products or features',
    ],
    ethicalGuardrails: 'Scarcity must be real, not artificial. Never create fake countdown timers, phantom stock limits, or false urgency.',
  },
  unity: {
    id: 'unity',
    name: 'Unity',
    description: 'People are influenced by those they perceive as part of their group — shared identity creates a powerful bond.',
    psychologicalBasis: 'The sense of "we" creates a deeper influence than mere similarity. Shared identity (family, tribe, nation, community) drives cooperation.',
    marketingApplication: 'Position the brand as part of the audience\'s identity group. Create a sense of shared belonging and collective purpose.',
    examples: [
      'Community membership with shared identity markers',
      'Co-creation and involvement in brand decisions',
      '"Us vs. them" framing against the status quo (not competitors)',
    ],
    ethicalGuardrails: 'Unity should include, not exclude. Avoid tribalism that demonizes out-groups or creates harmful us-vs-them dynamics.',
  },
};

// ─── Helpers ────────────────────────────────────────────

export function getCialdiniPrinciple(id: CialdiniPrincipleId): CialdiniPrinciple | undefined {
  return CIALDINI_PRINCIPLES[id];
}

export function formatCialdiniForPrompt(): string {
  const lines = ['## Cialdini\'s 7 Principles of Persuasion', ''];
  for (const p of Object.values(CIALDINI_PRINCIPLES)) {
    lines.push(`### ${p.name}`);
    lines.push(p.description);
    lines.push(`**Psychological basis**: ${p.psychologicalBasis}`);
    lines.push(`**Marketing application**: ${p.marketingApplication}`);
    lines.push(`**Ethical guardrails**: ${p.ethicalGuardrails}`);
    lines.push('');
  }
  return lines.join('\n');
}

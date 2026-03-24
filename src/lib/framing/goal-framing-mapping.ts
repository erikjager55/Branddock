/**
 * Goal → Framing Mapping — Maps each of the 15 campaign goal types to
 * Kahneman System 1/System 2 framing strategies with primary cognitive
 * principles and messaging frame recommendations.
 */

import { FRAMING_PRINCIPLES, type FramingPrincipleId } from './system-framing';

// ─── Types ──────────────────────────────────────────────

export interface GoalFramingMapping {
  goalType: string;
  systemTarget: 1 | 2 | 'mixed';
  framingStrategy: string;
  primaryPrinciples: Array<{
    id: FramingPrincipleId;
    applicationHint: string;
  }>;
  messagingFrame: string;
}

// ─── Mapping Data ───────────────────────────────────────

const GOAL_FRAMING_MAP: Record<string, GoalFramingMapping> = {
  BRAND_AWARENESS: {
    goalType: 'BRAND_AWARENESS',
    systemTarget: 1,
    framingStrategy: 'Maximize System 1 processing — make the brand easy to notice, recognize, and recall through fluent, emotionally positive associations.',
    primaryPrinciples: [
      { id: 'processing_fluency', applicationHint: 'Keep brand messaging simple, clear, and instantly recognizable' },
      { id: 'availability_heuristic', applicationHint: 'Create vivid, memorable brand moments that come to mind easily in buying situations' },
      { id: 'affect_heuristic', applicationHint: 'Associate the brand with positive emotions through imagery, music, and storytelling' },
    ],
    messagingFrame: 'Positive, aspirational framing. Focus on emotional resonance over information. The brand should feel good before it is understood.',
  },

  PRODUCT_LAUNCH: {
    goalType: 'PRODUCT_LAUNCH',
    systemTarget: 'mixed',
    framingStrategy: 'Lead with System 1 excitement and desire, then provide System 2 justification for the decision.',
    primaryPrinciples: [
      { id: 'anchoring', applicationHint: 'Set a high value anchor before revealing pricing or comparison points' },
      { id: 'loss_aversion', applicationHint: 'Frame the launch window as a potential loss: "Don\'t miss the early adopter advantage"' },
      { id: 'framing_effect', applicationHint: 'Present product benefits as gains to be won, not features to be evaluated' },
    ],
    messagingFrame: 'Excitement-first framing. Anchor high, reveal value. Create urgency through genuine scarcity of launch window.',
  },

  MARKET_EXPANSION: {
    goalType: 'MARKET_EXPANSION',
    systemTarget: 1,
    framingStrategy: 'Reduce cognitive effort for new market audiences. Make the brand feel familiar and trustworthy through fluency.',
    primaryPrinciples: [
      { id: 'processing_fluency', applicationHint: 'Adapt messaging for local language fluency — familiar words and cultural references' },
      { id: 'representativeness', applicationHint: 'Match local category prototypes for quality and trust signals' },
      { id: 'affect_heuristic', applicationHint: 'Create positive emotional associations with local culture' },
    ],
    messagingFrame: 'Familiarity framing. Make the brand feel like a natural part of the local landscape, not a foreign import.',
  },

  REBRANDING: {
    goalType: 'REBRANDING',
    systemTarget: 'mixed',
    framingStrategy: 'Maintain System 1 recognition through familiar elements while guiding System 2 through the change narrative.',
    primaryPrinciples: [
      { id: 'status_quo_bias', applicationHint: 'Frame the rebrand as evolution of the familiar, not replacement. Minimize perceived change.' },
      { id: 'endowment_effect', applicationHint: 'Remind stakeholders of their investment in and ownership of the brand story' },
      { id: 'processing_fluency', applicationHint: 'Ensure new brand elements are at least as easy to process as old ones' },
    ],
    messagingFrame: 'Continuity framing. "Same spirit, evolved expression." Acknowledge the old while celebrating the new.',
  },

  CONTENT_MARKETING: {
    goalType: 'CONTENT_MARKETING',
    systemTarget: 2,
    framingStrategy: 'Engage System 2 deliberately with valuable, thought-provoking content. Use System 1 hooks to draw attention.',
    primaryPrinciples: [
      { id: 'processing_fluency', applicationHint: 'Structure content for easy scanning: clear headings, short paragraphs, visual hierarchy' },
      { id: 'anchoring', applicationHint: 'Lead articles with the most surprising or counterintuitive finding to anchor attention' },
      { id: 'availability_heuristic', applicationHint: 'Use vivid case studies and stories that make abstract concepts concrete and memorable' },
    ],
    messagingFrame: 'Value-first framing. Lead with the insight, not the brand. Teach something useful in every piece.',
  },

  AUDIENCE_ENGAGEMENT: {
    goalType: 'AUDIENCE_ENGAGEMENT',
    systemTarget: 1,
    framingStrategy: 'Trigger System 1 emotional responses that drive sharing, commenting, and participation without deliberation.',
    primaryPrinciples: [
      { id: 'affect_heuristic', applicationHint: 'Create content that triggers strong emotions: surprise, joy, outrage, nostalgia' },
      { id: 'peak_end_rule', applicationHint: 'Design engagement sequences with a clear emotional peak and satisfying conclusion' },
      { id: 'framing_effect', applicationHint: 'Frame participation as joining a movement, not consuming content' },
    ],
    messagingFrame: 'Emotional activation framing. Make engagement feel rewarding and identity-affirming, not transactional.',
  },

  COMMUNITY_BUILDING: {
    goalType: 'COMMUNITY_BUILDING',
    systemTarget: 'mixed',
    framingStrategy: 'System 1 for belonging and identity, System 2 for the value proposition of joining.',
    primaryPrinciples: [
      { id: 'endowment_effect', applicationHint: 'Make members feel ownership of the community from day one through customization and contribution' },
      { id: 'sunk_cost', applicationHint: 'Design progressive commitment: profile → first post → first connection → regular contributor' },
      { id: 'peak_end_rule', applicationHint: 'Create peak onboarding moments and regular community highlights' },
    ],
    messagingFrame: 'Belonging framing. "You\'re one of us." Create identity markers and milestones that deepen commitment.',
  },

  LOYALTY_RETENTION: {
    goalType: 'LOYALTY_RETENTION',
    systemTarget: 1,
    framingStrategy: 'Leverage System 1 biases that favor the status quo and accumulated investment.',
    primaryPrinciples: [
      { id: 'status_quo_bias', applicationHint: 'Make staying the default. Reduce friction for renewal, increase friction for cancellation.' },
      { id: 'sunk_cost', applicationHint: 'Remind customers of their accumulated value: history, data, customization, achievements' },
      { id: 'endowment_effect', applicationHint: 'Frame their account as "Your [brand]" — personalization creates ownership' },
      { id: 'loss_aversion', applicationHint: 'Frame churn in terms of what they\'d lose, not what competitors offer' },
    ],
    messagingFrame: 'Investment protection framing. "Look how far you\'ve come with us." Make switching feel like throwing away progress.',
  },

  EMPLOYER_BRANDING: {
    goalType: 'EMPLOYER_BRANDING',
    systemTarget: 'mixed',
    framingStrategy: 'System 1 for emotional appeal of the culture, System 2 for career growth rational evaluation.',
    primaryPrinciples: [
      { id: 'affect_heuristic', applicationHint: 'Show authentic moments of joy, pride, and camaraderie in the workplace' },
      { id: 'representativeness', applicationHint: 'Feature employees who match the prototype of the ideal candidate persona' },
      { id: 'availability_heuristic', applicationHint: 'Create memorable employer brand stories that candidates recall during job searches' },
    ],
    messagingFrame: 'Identity framing. "This is where people like you thrive." Make the company feel like a natural home.',
  },

  INTERNAL_BRANDING: {
    goalType: 'INTERNAL_BRANDING',
    systemTarget: 1,
    framingStrategy: 'Make brand values System 1 — automatic responses, not deliberate choices.',
    primaryPrinciples: [
      { id: 'processing_fluency', applicationHint: 'Keep internal brand messaging simple enough to become automatic behavior' },
      { id: 'availability_heuristic', applicationHint: 'Create vivid internal stories of brand values in action' },
      { id: 'framing_effect', applicationHint: 'Frame brand behaviors as "how we do things" (identity), not "what we should do" (obligation)' },
    ],
    messagingFrame: 'Identity framing. "This is who we are." Not rules, but identity.',
  },

  THOUGHT_LEADERSHIP: {
    goalType: 'THOUGHT_LEADERSHIP',
    systemTarget: 2,
    framingStrategy: 'Deliberately engage System 2 with novel perspectives, then anchor new thinking to the brand.',
    primaryPrinciples: [
      { id: 'anchoring', applicationHint: 'Lead with a provocative claim or data point that reframes the conversation' },
      { id: 'framing_effect', applicationHint: 'Reframe industry problems in novel ways that position the brand as the one who "gets it"' },
      { id: 'representativeness', applicationHint: 'Ensure content matches the prototype of authoritative, rigorous thinking' },
    ],
    messagingFrame: 'Reframing frame. Challenge assumptions, then provide a new lens. "What if everything you knew about X was wrong?"',
  },

  CSR_IMPACT: {
    goalType: 'CSR_IMPACT',
    systemTarget: 'mixed',
    framingStrategy: 'System 1 emotional impact stories combined with System 2 credible evidence to combat greenwashing skepticism.',
    primaryPrinciples: [
      { id: 'affect_heuristic', applicationHint: 'Lead with emotional impact stories — real people, real change' },
      { id: 'framing_effect', applicationHint: 'Frame impact as concrete gains ("10,000 trees planted") not abstract percentages' },
      { id: 'availability_heuristic', applicationHint: 'Create vivid, memorable impact moments that come to mind during purchase decisions' },
    ],
    messagingFrame: 'Impact evidence framing. Make abstract impact tangible and emotional. Show, don\'t tell.',
  },

  LEAD_GENERATION: {
    goalType: 'LEAD_GENERATION',
    systemTarget: 'mixed',
    framingStrategy: 'System 1 desire triggers followed by System 2 value calculation. Minimize friction at conversion.',
    primaryPrinciples: [
      { id: 'loss_aversion', applicationHint: 'Frame the lead magnet as something they\'d be losing by not downloading' },
      { id: 'anchoring', applicationHint: 'Anchor the value high ("This guide is worth €500 in consulting time")' },
      { id: 'choice_overload', applicationHint: 'Offer one clear CTA per page. Don\'t split attention across multiple conversion paths.' },
    ],
    messagingFrame: 'Value exchange framing. Make the exchange feel like receiving a gift, not submitting data.',
  },

  SALES_ACTIVATION: {
    goalType: 'SALES_ACTIVATION',
    systemTarget: 1,
    framingStrategy: 'Maximum System 1 activation — urgency, desire, social validation. Minimize System 2 deliberation.',
    primaryPrinciples: [
      { id: 'loss_aversion', applicationHint: 'Frame the offer in terms of what they\'ll lose by waiting (price increase, stock depletion)' },
      { id: 'anchoring', applicationHint: 'Show original price prominently before discount to anchor high perceived value' },
      { id: 'choice_overload', applicationHint: 'Simplify the purchase decision to one clear option or a curated set of 3' },
      { id: 'endowment_effect', applicationHint: 'Create trial or customization experiences that build psychological ownership before purchase' },
    ],
    messagingFrame: 'Urgency framing. Time-limited, socially validated, friction-free. Make buying the easiest decision.',
  },

  EVENT_SEASONAL: {
    goalType: 'EVENT_SEASONAL',
    systemTarget: 1,
    framingStrategy: 'Leverage the natural System 1 emotional energy of events and seasons. Ride the cultural wave.',
    primaryPrinciples: [
      { id: 'availability_heuristic', applicationHint: 'Make the brand the most memorable part of the event experience' },
      { id: 'peak_end_rule', applicationHint: 'Design the event experience with a clear peak moment and a strong branded ending' },
      { id: 'affect_heuristic', applicationHint: 'Associate the brand with the positive emotions of the event or season' },
    ],
    messagingFrame: 'Celebration framing. The brand is part of the joy, not interrupting it. Integrate, don\'t interrupt.',
  },
};

// Legacy aliases
GOAL_FRAMING_MAP.BRAND = GOAL_FRAMING_MAP.BRAND_AWARENESS;
GOAL_FRAMING_MAP.PRODUCT = GOAL_FRAMING_MAP.PRODUCT_LAUNCH;
GOAL_FRAMING_MAP.CONTENT = GOAL_FRAMING_MAP.CONTENT_MARKETING;
GOAL_FRAMING_MAP.ENGAGEMENT = GOAL_FRAMING_MAP.AUDIENCE_ENGAGEMENT;

// ─── Public API ─────────────────────────────────────────

/**
 * Get formatted framing context for injection into AI prompts.
 * Returns an empty string if no mapping exists.
 */
export function getFramingContext(goalType: string): string {
  const mapping = GOAL_FRAMING_MAP[goalType];
  if (!mapping) return '';

  const principleList = mapping.primaryPrinciples
    .map((p) => {
      const principle = FRAMING_PRINCIPLES[p.id];
      return `- **${principle.name}** (System ${principle.system}): ${p.applicationHint}`;
    })
    .join('\n');

  return [
    '### Cognitive Framing (Kahneman S1/S2)',
    `**System target**: System ${mapping.systemTarget}`,
    `**Framing strategy**: ${mapping.framingStrategy}`,
    `**Messaging frame**: ${mapping.messagingFrame}`,
    '',
    'Cognitive principles to apply:',
    principleList,
  ].join('\n');
}

/**
 * MINDSPACE Influence Factors — 9 Behavioral Levers
 *
 * The MINDSPACE framework (Dolan et al., 2010) identifies 9 influence
 * factors that shape behavior. Used as a creative strategy checklist
 * in Phase 4 (Creative Hooks) and Phase 5 (Hook Validation).
 *
 * @see "MINDSPACE: Influencing behaviour through public policy" — UK Cabinet Office, 2010
 */

import type { MindspaceFactor } from '../campaigns/strategy-blueprint.types';

// ─── Types ────────────────────────────────────────────────

export interface MindspaceFactorDefinition {
  id: MindspaceFactor;
  letter: string;
  name: string;
  description: string;
  psychologicalBasis: string;
  creativeApplicationHint: string;
  campaignExamples: string[];
}

// ─── MINDSPACE Factors ────────────────────────────────────

export const MINDSPACE_CHECKLIST: Record<MindspaceFactor, MindspaceFactorDefinition> = {
  messenger: {
    id: 'messenger',
    letter: 'M',
    name: 'Messenger',
    description: 'We are heavily influenced by who communicates information to us.',
    psychologicalBasis: 'Source credibility, in-group bias, authority heuristic.',
    creativeApplicationHint: 'Choose the right voice: an expert, a peer, a celebrity, or the audience themselves. The messenger IS the message.',
    campaignExamples: [
      'Nike: athletes as messengers (authority + aspiration)',
      'Dove: real women as messengers (in-group trust)',
      'Apple: creative professionals as messengers (identity)',
    ],
  },
  incentives: {
    id: 'incentives',
    letter: 'I',
    name: 'Incentives',
    description: 'Our responses to incentives are shaped by predictable mental shortcuts such as loss aversion.',
    psychologicalBasis: 'Loss aversion, temporal discounting, reference dependence, framing effects.',
    creativeApplicationHint: 'Frame gains as losses avoided. "Don\'t miss out" outperforms "Get this." Make the cost of inaction vivid.',
    campaignExamples: [
      'FOMO-driven launches: limited time/quantity',
      'Free trial with automatic enrollment (endowment effect)',
      'Progress-loss messaging: "You\'re 80% there — don\'t lose your progress"',
    ],
  },
  norms: {
    id: 'norms',
    letter: 'N',
    name: 'Norms',
    description: 'We are strongly influenced by what others do.',
    psychologicalBasis: 'Descriptive norms, injunctive norms, social proof, conformity.',
    creativeApplicationHint: 'Show the behavior as normal. Numbers ("87% of marketers..."), visible peer behavior, and trending signals all work.',
    campaignExamples: [
      '"Most popular" labels (Amazon, Netflix)',
      '"X people are viewing this" (Booking.com)',
      'Industry benchmark reports showing adoption rates',
    ],
  },
  defaults: {
    id: 'defaults',
    letter: 'D',
    name: 'Defaults',
    description: 'We tend to go with the pre-set option or the status quo.',
    psychologicalBasis: 'Status quo bias, effort minimization, implied endorsement.',
    creativeApplicationHint: 'Set the desired behavior as the default. Opt-out is more powerful than opt-in. Pre-fill, pre-select, pre-configure.',
    campaignExamples: [
      'Organ donation opt-out vs opt-in (10x difference)',
      'Pre-selected donation amounts on charity pages',
      'Default plan selection in SaaS pricing pages',
    ],
  },
  salience: {
    id: 'salience',
    letter: 'S',
    name: 'Salience',
    description: 'Our attention is drawn to what is novel and seems relevant to us.',
    psychologicalBasis: 'Attention bias, novelty effect, personal relevance, distinctiveness.',
    creativeApplicationHint: 'Make it impossible to ignore. Surprise, contrast, personalization, and pattern interruption cut through noise.',
    campaignExamples: [
      'Burger King Moldy Whopper (pattern interruption)',
      'Spotify Wrapped (extreme personalization)',
      'Unexpected juxtapositions in OOH advertising',
    ],
  },
  priming: {
    id: 'priming',
    letter: 'P',
    name: 'Priming',
    description: 'Our acts are often influenced by sub-conscious cues.',
    psychologicalBasis: 'Associative activation, conceptual priming, perceptual priming.',
    creativeApplicationHint: 'Set the stage before the ask. Colors, words, images, and environments prime behavior before the conscious decision.',
    campaignExamples: [
      'Warm colors in food branding (appetite priming)',
      'Natural imagery before eco-messaging (environmental priming)',
      'Aspirational lifestyle content before product reveal',
    ],
  },
  affect: {
    id: 'affect',
    letter: 'A',
    name: 'Affect',
    description: 'Our emotional associations can powerfully shape our actions.',
    psychologicalBasis: 'Affect heuristic, mood congruence, emotional tagging, somatic markers.',
    creativeApplicationHint: 'Make them feel something before you ask them to do something. Emotion precedes cognition in decision-making.',
    campaignExamples: [
      'John Lewis Christmas ads (emotional storytelling)',
      'Always #LikeAGirl (anger → empowerment)',
      'Thai Life Insurance (tears → brand warmth)',
    ],
  },
  commitments: {
    id: 'commitments',
    letter: 'C',
    name: 'Commitments',
    description: 'We seek to be consistent with our public promises, and reciprocate acts.',
    psychologicalBasis: 'Consistency principle, foot-in-the-door, public commitment, reciprocity.',
    creativeApplicationHint: 'Start small. A micro-commitment (like, share, sign up) creates consistency pressure for larger behaviors.',
    campaignExamples: [
      'Pledge campaigns ("I commit to...")',
      'Free sample → purchase (reciprocity)',
      'Public brand advocacy programs',
    ],
  },
  ego: {
    id: 'ego',
    letter: 'E',
    name: 'Ego',
    description: 'We act in ways that make us feel better about ourselves.',
    psychologicalBasis: 'Self-enhancement, self-consistency, positive self-regard, cognitive dissonance.',
    creativeApplicationHint: 'Make adoption feel like self-improvement. The brand should enhance their self-image, not challenge it.',
    campaignExamples: [
      '"Think Different" (Apple — identity elevation)',
      'Patagonia (ethical self-image)',
      '"Because you\'re worth it" (L\'Oreal — self-affirmation)',
    ],
  },
} as const satisfies Record<MindspaceFactor, MindspaceFactorDefinition>;

// ─── Helpers ──────────────────────────────────────────────

export function getMindspaceFactor(id: MindspaceFactor): MindspaceFactorDefinition {
  return MINDSPACE_CHECKLIST[id];
}

export function getAllMindspaceFactors(): MindspaceFactorDefinition[] {
  return Object.values(MINDSPACE_CHECKLIST);
}

/**
 * Format all MINDSPACE factors as a markdown prompt section for AI consumption.
 */
export function formatMindspaceForPrompt(): string {
  const lines = ['## MINDSPACE Influence Factors (9 levers)', ''];
  for (const factor of Object.values(MINDSPACE_CHECKLIST)) {
    lines.push(`### ${factor.letter} — ${factor.name}`);
    lines.push(factor.description);
    lines.push(`Psychological basis: ${factor.psychologicalBasis}`);
    lines.push(`Creative hint: ${factor.creativeApplicationHint}`);
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * Kahneman System 1 / System 2 Framing Principles
 *
 * Based on Daniel Kahneman's "Thinking, Fast and Slow" (2011) and related
 * cognitive science research. Maps 12 cognitive biases and heuristics to
 * marketing applications.
 *
 * System 1: Fast, automatic, emotional, intuitive
 * System 2: Slow, deliberate, logical, effortful
 */

// ─── Types ──────────────────────────────────────────────

export type FramingPrincipleId =
  | 'loss_aversion'
  | 'anchoring'
  | 'availability_heuristic'
  | 'framing_effect'
  | 'peak_end_rule'
  | 'processing_fluency'
  | 'choice_overload'
  | 'status_quo_bias'
  | 'endowment_effect'
  | 'affect_heuristic'
  | 'sunk_cost'
  | 'representativeness';

export interface FramingPrinciple {
  id: FramingPrincipleId;
  name: string;
  system: 1 | 2;
  description: string;
  cognitiveProcess: string;
  marketingApplication: string;
}

// ─── Principles Catalog ─────────────────────────────────

export const FRAMING_PRINCIPLES: Record<FramingPrincipleId, FramingPrinciple> = {
  loss_aversion: {
    id: 'loss_aversion',
    name: 'Loss Aversion',
    system: 1,
    description: 'Losses feel approximately 2x more painful than equivalent gains feel good. People are motivated more by avoiding loss than achieving gain.',
    cognitiveProcess: 'Automatic emotional response to potential loss triggers stronger motivation than equivalent potential gain.',
    marketingApplication: 'Frame messages around what the audience stands to lose by not acting, rather than only what they gain. Use "Don\'t miss out" framing alongside positive messaging.',
  },
  anchoring: {
    id: 'anchoring',
    name: 'Anchoring Effect',
    system: 1,
    description: 'The first piece of information encountered heavily influences subsequent judgments, even when that anchor is arbitrary.',
    cognitiveProcess: 'System 1 automatically adjusts from the first number/reference point encountered, typically adjusting insufficiently.',
    marketingApplication: 'Set high anchors before revealing actual prices or metrics. Show "was €199, now €99" or "competitors charge 3x more." Lead with the most impressive number.',
  },
  availability_heuristic: {
    id: 'availability_heuristic',
    name: 'Availability Heuristic',
    system: 1,
    description: 'People judge the likelihood of events based on how easily examples come to mind. Vivid, recent, or emotional examples are overweighted.',
    cognitiveProcess: 'System 1 substitutes the question "How frequent is this?" with "How easily can I think of an example?"',
    marketingApplication: 'Create vivid, memorable brand experiences that come to mind easily in buying situations. Case studies and stories are more effective than statistics.',
  },
  framing_effect: {
    id: 'framing_effect',
    name: 'Framing Effect',
    system: 1,
    description: 'The same information presented differently leads to different decisions. "90% success rate" and "10% failure rate" trigger different responses.',
    cognitiveProcess: 'System 1 reacts to the emotional valence of the frame, not the underlying data.',
    marketingApplication: 'Test positive vs negative frames for your audience. Frame outcomes in terms of gains for brand building, losses for activation. "Join 10,000 happy customers" vs "Don\'t be the last to switch."',
  },
  peak_end_rule: {
    id: 'peak_end_rule',
    name: 'Peak-End Rule',
    system: 1,
    description: 'People judge experiences based on their most intense moment (peak) and the final moment (end), not the average of all moments.',
    cognitiveProcess: 'Memory encodes the peak emotional moment and the ending, discarding most other information about the experience.',
    marketingApplication: 'Design customer journeys with a memorable peak experience and a strong, positive ending. The middle can be merely adequate if peak and end are exceptional.',
  },
  processing_fluency: {
    id: 'processing_fluency',
    name: 'Processing Fluency',
    system: 1,
    description: 'Information that is easy to process feels more true, more familiar, and more trustworthy. Simple = credible.',
    cognitiveProcess: 'System 1 uses ease of processing as a proxy for truth and safety. Disfluency triggers suspicion.',
    marketingApplication: 'Keep messaging simple and clear. Use readable fonts, clean layouts, and familiar language. Complex messaging triggers System 2 scrutiny.',
  },
  choice_overload: {
    id: 'choice_overload',
    name: 'Choice Overload (Paradox of Choice)',
    system: 2,
    description: 'Too many options leads to decision paralysis, lower satisfaction, and higher likelihood of choosing nothing.',
    cognitiveProcess: 'System 2 becomes overwhelmed by comparison effort. Decision quality degrades as options increase beyond 3-5.',
    marketingApplication: 'Limit choices to 3-4 clear options. Use recommendation ("Most popular") to reduce decision effort. Progressive disclosure prevents overwhelm.',
  },
  status_quo_bias: {
    id: 'status_quo_bias',
    name: 'Status Quo Bias',
    system: 1,
    description: 'People prefer the current state of affairs. The default option is disproportionately chosen because change requires effort and risk.',
    cognitiveProcess: 'System 1 treats the current state as the reference point. Any change is evaluated as a potential loss (loss aversion compounds).',
    marketingApplication: 'For new products: make switching as frictionless as possible. For retention: leverage inertia and make staying the default. Frame change as minimal disruption.',
  },
  endowment_effect: {
    id: 'endowment_effect',
    name: 'Endowment Effect',
    system: 1,
    description: 'People value things more highly once they own them. The mere sense of ownership increases perceived value.',
    cognitiveProcess: 'Ownership activates loss aversion — giving up something you "own" feels like a loss.',
    marketingApplication: 'Create psychological ownership before purchase: free trials, customization, "Your plan," "Your workspace." Once they feel ownership, switching costs feel higher.',
  },
  affect_heuristic: {
    id: 'affect_heuristic',
    name: 'Affect Heuristic',
    system: 1,
    description: 'People make judgments based on their current emotions rather than objective analysis. Good mood = positive evaluation of everything.',
    cognitiveProcess: 'System 1 uses current emotional state as data for judgment. "How do I feel about it?" replaces "What do I think about it?"',
    marketingApplication: 'Create positive emotional context before presenting information or CTAs. Music, imagery, humor, and storytelling prime the affect heuristic in your favor.',
  },
  sunk_cost: {
    id: 'sunk_cost',
    name: 'Sunk Cost Effect',
    system: 2,
    description: 'People continue investing in something because of previously invested resources (time, money, effort), even when it\'s irrational to do so.',
    cognitiveProcess: 'System 2 rationalizes continued investment to avoid acknowledging waste. "I\'ve already put so much into this."',
    marketingApplication: 'For retention: remind users of their accumulated investment ("You\'ve created 47 projects"). For acquisition: help prospects frame competitors\' sunk costs as learning, not loss.',
  },
  representativeness: {
    id: 'representativeness',
    name: 'Representativeness Heuristic',
    system: 1,
    description: 'People judge probability by how well something matches their mental prototype, ignoring base rates and sample sizes.',
    cognitiveProcess: 'System 1 asks "How similar is this to my mental model of X?" instead of "What are the actual odds?"',
    marketingApplication: 'Ensure brand touchpoints match the prototype of quality/trust in your category. If the category prototype is "premium," look premium. Violating category codes requires deliberate strategy.',
  },
};

// ─── Helpers ────────────────────────────────────────────

export function getFramingPrinciple(id: FramingPrincipleId): FramingPrinciple | undefined {
  return FRAMING_PRINCIPLES[id];
}

export function formatFramingForPrompt(): string {
  const lines = ['## Cognitive Framing (Kahneman System 1/2)', ''];
  for (const p of Object.values(FRAMING_PRINCIPLES)) {
    lines.push(`### ${p.name} (System ${p.system})`);
    lines.push(p.description);
    lines.push(`**Marketing application**: ${p.marketingApplication}`);
    lines.push('');
  }
  return lines.join('\n');
}

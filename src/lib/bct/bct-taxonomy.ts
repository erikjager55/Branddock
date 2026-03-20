/**
 * BCT Taxonomy v1 — Subset of ~30 techniques most relevant for marketing/branding campaigns.
 *
 * Based on the HBCP Behavior Change Technique Taxonomy v1 (Michie et al., 2013).
 * Each technique includes its taxonomy category, evidence strength, and a
 * marketing-relevant application example.
 *
 * @see https://www.bct-taxonomy.com/
 */

export interface BctTechnique {
  id: string;
  name: string;
  category: string;
  description: string;
  evidenceStrength: 'strong' | 'moderate' | 'emerging';
  example: string;
}

export const BCT_TAXONOMY: Record<string, BctTechnique> = {
  // ── 1. Goals and planning ──────────────────────────────────────────────
  BCT_1_1: {
    id: 'BCT_1_1',
    name: 'Goal setting (behavior)',
    category: 'Goals and planning',
    description:
      'Set or agree on a goal defined in terms of the behavior to be achieved.',
    evidenceStrength: 'strong',
    example:
      'Prompt the audience to commit to a specific brand interaction, such as signing up for a newsletter or attending a product demo.',
  },
  BCT_1_3: {
    id: 'BCT_1_3',
    name: 'Goal setting (outcome)',
    category: 'Goals and planning',
    description:
      'Set or agree on a goal defined in terms of a positive outcome of the wanted behavior.',
    evidenceStrength: 'strong',
    example:
      'Frame campaign goals around the outcome the audience desires, e.g. "Achieve 20% more productive mornings with [product]."',
  },
  BCT_1_4: {
    id: 'BCT_1_4',
    name: 'Action planning',
    category: 'Goals and planning',
    description:
      'Prompt detailed planning of performance of the behavior including context, frequency, duration or intensity.',
    evidenceStrength: 'strong',
    example:
      'Guide customers through a step-by-step onboarding plan: "Day 1: Set up your profile. Day 3: Invite your team. Day 7: Run your first campaign."',
  },
  BCT_1_2: {
    id: 'BCT_1_2',
    name: 'Problem solving',
    category: 'Goals and planning',
    description:
      'Analyze factors influencing the behavior and generate strategies to overcome barriers.',
    evidenceStrength: 'strong',
    example:
      'Address common objections in campaign messaging: "No time to create content? Our AI handles the first draft in 30 seconds."',
  },

  // ── 2. Feedback and monitoring ─────────────────────────────────────────
  BCT_2_3: {
    id: 'BCT_2_3',
    name: 'Self-monitoring of behavior',
    category: 'Feedback and monitoring',
    description:
      'Establish a method for the person to monitor and record their behavior as part of a behavior change strategy.',
    evidenceStrength: 'strong',
    example:
      'Provide a brand engagement dashboard where customers can track their usage streaks, content saved, or loyalty points earned.',
  },
  BCT_2_2: {
    id: 'BCT_2_2',
    name: 'Feedback on behavior',
    category: 'Feedback and monitoring',
    description:
      'Monitor and provide informative or evaluative feedback on performance of the behavior.',
    evidenceStrength: 'strong',
    example:
      'Send weekly "Your brand impact" summaries: "You shared 3 posts this week, reaching 12K people. Keep it up!"',
  },
  BCT_2_7: {
    id: 'BCT_2_7',
    name: 'Feedback on outcome(s) of behavior',
    category: 'Feedback and monitoring',
    description:
      'Monitor and provide feedback on the outcome of performance of the behavior.',
    evidenceStrength: 'moderate',
    example:
      'Show customers the tangible results of their engagement: "Since joining our loyalty program, you have saved EUR 145."',
  },

  // ── 3. Social support ──────────────────────────────────────────────────
  BCT_3_1: {
    id: 'BCT_3_1',
    name: 'Social support (unspecified)',
    category: 'Social support',
    description:
      'Advise on, arrange, or provide social support or non-contingent praise or reward for the behavior.',
    evidenceStrength: 'strong',
    example:
      'Build a brand community where members encourage each other. Feature user spotlights and celebrate milestones publicly.',
  },
  BCT_3_2: {
    id: 'BCT_3_2',
    name: 'Social support (practical)',
    category: 'Social support',
    description:
      'Advise on, arrange, or provide practical help for performance of the behavior.',
    evidenceStrength: 'moderate',
    example:
      'Offer concierge onboarding, live chat support, or community mentorship programs that reduce friction in product adoption.',
  },

  // ── 4. Shaping knowledge ───────────────────────────────────────────────
  BCT_4_1: {
    id: 'BCT_4_1',
    name: 'Instruction on how to perform the behavior',
    category: 'Shaping knowledge',
    description:
      'Advise or agree on how to perform the behavior, including skills training.',
    evidenceStrength: 'strong',
    example:
      'Create tutorial content or how-to guides that show the audience exactly how to use the product or engage with the brand.',
  },

  // ── 5. Natural consequences ────────────────────────────────────────────
  BCT_5_1: {
    id: 'BCT_5_1',
    name: 'Information about health consequences',
    category: 'Natural consequences',
    description:
      'Provide information about consequences of performing the behavior, including benefits and costs.',
    evidenceStrength: 'strong',
    example:
      'Communicate the long-term brand value proposition: "Companies that invest in employer branding reduce cost-per-hire by 43%."',
  },
  BCT_5_3: {
    id: 'BCT_5_3',
    name: 'Information about social and environmental consequences',
    category: 'Natural consequences',
    description:
      'Provide information about social and environmental consequences of performing or not performing the behavior.',
    evidenceStrength: 'moderate',
    example:
      'Highlight the collective impact of customer participation: "Every purchase plants a tree. Together we have planted 50,000 trees."',
  },

  // ── 6. Comparison of behavior ──────────────────────────────────────────
  BCT_6_1: {
    id: 'BCT_6_1',
    name: 'Demonstration of the behavior',
    category: 'Comparison of behavior',
    description:
      'Provide an observable sample of the performance of the behavior directly or indirectly.',
    evidenceStrength: 'strong',
    example:
      'Use customer case studies, video testimonials, or influencer partnerships to demonstrate how others engage with the brand.',
  },
  BCT_6_2: {
    id: 'BCT_6_2',
    name: 'Social comparison',
    category: 'Comparison of behavior',
    description:
      'Draw attention to others\' performance to allow comparison with the person\'s own performance.',
    evidenceStrength: 'moderate',
    example:
      'Show peer benchmarks: "87% of marketers in your industry already use AI-powered brand strategy tools."',
  },

  // ── 7. Associations ────────────────────────────────────────────────────
  BCT_7_1: {
    id: 'BCT_7_1',
    name: 'Prompts/cues',
    category: 'Associations',
    description:
      'Introduce or define environmental or social stimulus with the purpose of prompting or cueing the behavior.',
    evidenceStrength: 'strong',
    example:
      'Use push notifications, email reminders, or in-app nudges at optimal moments to re-engage users with the brand.',
  },

  // ── 8. Repetition and substitution ─────────────────────────────────────
  BCT_8_1: {
    id: 'BCT_8_1',
    name: 'Behavioral practice/rehearsal',
    category: 'Repetition and substitution',
    description:
      'Prompt practice or rehearsal of the performance of the behavior one or more times in a context or at a time when the performance may not be necessary.',
    evidenceStrength: 'moderate',
    example:
      'Offer free trials, sandbox environments, or interactive demos that let prospects rehearse the product experience before committing.',
  },
  BCT_8_3: {
    id: 'BCT_8_3',
    name: 'Habit formation',
    category: 'Repetition and substitution',
    description:
      'Prompt rehearsal and repetition of the behavior in the same context repeatedly so that the context elicits the behavior.',
    evidenceStrength: 'moderate',
    example:
      'Design daily touchpoints like "morning briefings" or "weekly brand health reports" that become part of the user\'s routine.',
  },
  BCT_8_2: {
    id: 'BCT_8_2',
    name: 'Behavior substitution',
    category: 'Repetition and substitution',
    description:
      'Prompt substitution of the unwanted behavior with a wanted behavior.',
    evidenceStrength: 'moderate',
    example:
      'Position your product as the replacement for an outdated practice: "Stop guessing your brand strategy. Start knowing it."',
  },

  // ── 9. Comparison of outcomes ──────────────────────────────────────────
  BCT_9_1: {
    id: 'BCT_9_1',
    name: 'Credible source',
    category: 'Comparison of outcomes',
    description:
      'Present verbal or visual communication from a credible source in favor of or against the behavior.',
    evidenceStrength: 'strong',
    example:
      'Feature endorsements from industry experts, academic researchers, or respected brand leaders to boost campaign credibility.',
  },
  BCT_9_2: {
    id: 'BCT_9_2',
    name: 'Pros and cons',
    category: 'Comparison of outcomes',
    description:
      'Advise the person to identify and compare reasons for wanting and not wanting to change the behavior.',
    evidenceStrength: 'moderate',
    example:
      'Create transparent comparison content: side-by-side feature tables, "Is this right for you?" quizzes, or honest product reviews.',
  },
  BCT_9_3: {
    id: 'BCT_9_3',
    name: 'Comparative imagining of future outcomes',
    category: 'Comparison of outcomes',
    description:
      'Prompt or advise the imagining and comparing of future outcomes of changed versus unchanged behavior.',
    evidenceStrength: 'emerging',
    example:
      'Paint a vivid before-and-after picture: "In 6 months, your brand could reach 3x more qualified leads. Or stay where you are."',
  },

  // ── 10. Reward and threat ──────────────────────────────────────────────
  BCT_10_3: {
    id: 'BCT_10_3',
    name: 'Non-specific reward',
    category: 'Reward and threat',
    description:
      'Arrange delivery of a reward if and only if there has been effort and/or progress in performing the behavior.',
    evidenceStrength: 'strong',
    example:
      'Reward engagement milestones: badges, exclusive content unlocks, or loyalty tier upgrades for consistent brand interactions.',
  },
  BCT_10_4: {
    id: 'BCT_10_4',
    name: 'Social reward',
    category: 'Reward and threat',
    description:
      'Arrange verbal or non-verbal reward if and only if there has been effort and/or progress in performing the behavior.',
    evidenceStrength: 'moderate',
    example:
      'Publicly acknowledge brand champions: "Top contributor of the month", shout-outs on social media, or community leaderboards.',
  },
  BCT_10_1: {
    id: 'BCT_10_1',
    name: 'Material incentive (behavior)',
    category: 'Reward and threat',
    description:
      'Inform that money, vouchers, or other valued objects will be delivered if and only if there has been effort and/or progress in performing the behavior.',
    evidenceStrength: 'strong',
    example:
      'Offer tangible incentives: referral bonuses, early-bird pricing, or exclusive merchandise for early adopters.',
  },

  // ── 11. Regulation ─────────────────────────────────────────────────────
  BCT_11_2: {
    id: 'BCT_11_2',
    name: 'Reduce negative emotions',
    category: 'Regulation',
    description:
      'Advise on ways to reduce negative emotions to facilitate performance of the behavior.',
    evidenceStrength: 'moderate',
    example:
      'Address purchase anxiety with money-back guarantees, no-commitment trials, or calming messaging that normalizes the decision.',
  },

  // ── 12. Antecedents ────────────────────────────────────────────────────
  BCT_12_1: {
    id: 'BCT_12_1',
    name: 'Restructuring the physical environment',
    category: 'Antecedents',
    description:
      'Change or advise to change the physical environment to facilitate performance of the wanted behavior or create barriers to the unwanted behavior.',
    evidenceStrength: 'moderate',
    example:
      'Optimize the digital environment: reduce checkout steps, redesign navigation to guide users toward key brand touchpoints.',
  },
  BCT_12_2: {
    id: 'BCT_12_2',
    name: 'Restructuring the social environment',
    category: 'Antecedents',
    description:
      'Change or advise to change the social environment to facilitate performance of the wanted behavior.',
    evidenceStrength: 'moderate',
    example:
      'Create brand ambassador programs or exclusive communities that reshape the social context around your product.',
  },
  BCT_12_5: {
    id: 'BCT_12_5',
    name: 'Adding objects to the environment',
    category: 'Antecedents',
    description:
      'Add objects to the environment to facilitate performance of the behavior.',
    evidenceStrength: 'moderate',
    example:
      'Provide branded tools, templates, or resources that make it easier for users to interact with the brand (e.g. a planning toolkit).',
  },

  // ── 13. Identity ───────────────────────────────────────────────────────
  BCT_13_5: {
    id: 'BCT_13_5',
    name: 'Identity associated with changed behavior',
    category: 'Identity',
    description:
      'Advise the person to construct a new self-identity as someone who used to engage in the unwanted behavior.',
    evidenceStrength: 'emerging',
    example:
      'Help customers see themselves differently through the brand: "You are not just a user, you are a brand strategist."',
  },
  BCT_13_2: {
    id: 'BCT_13_2',
    name: 'Framing/reframing',
    category: 'Identity',
    description:
      'Suggest the deliberate adoption of a perspective or new perspective on behavior to change cognitions or emotions about it.',
    evidenceStrength: 'emerging',
    example:
      'Reframe the cost narrative: "This is not an expense, it is an investment in your brand\'s future market position."',
  },

  // ── 15. Self-belief ────────────────────────────────────────────────────
  BCT_15_2: {
    id: 'BCT_15_2',
    name: 'Mental rehearsal of successful performance',
    category: 'Self-belief',
    description:
      'Advise to practice imagining performing the behavior successfully in relevant contexts.',
    evidenceStrength: 'emerging',
    example:
      'Use aspirational storytelling: "Imagine presenting a fully validated brand strategy to your board, backed by real data."',
  },
  BCT_15_4: {
    id: 'BCT_15_4',
    name: 'Self-talk',
    category: 'Self-belief',
    description:
      'Prompt positive self-talk before and during the behavior.',
    evidenceStrength: 'emerging',
    example:
      'Embed affirmations in the user experience: progress messages like "You are building something great" at key milestones.',
  },

  // ── 16. Covert learning ────────────────────────────────────────────────
  BCT_16_3: {
    id: 'BCT_16_3',
    name: 'Anticipated regret',
    category: 'Covert learning',
    description:
      'Induce or raise awareness of expectations of future regret about performance of the unwanted behavior.',
    evidenceStrength: 'moderate',
    example:
      'Create urgency through loss aversion: "Companies that delayed their rebrand lost an average of 15% market share."',
  },

  // ── 1 (continued). Commitment ──────────────────────────────────────────
  BCT_1_9: {
    id: 'BCT_1_9',
    name: 'Commitment',
    category: 'Goals and planning',
    description:
      'Ask the person to affirm or reaffirm statements indicating commitment to change the behavior.',
    evidenceStrength: 'moderate',
    example:
      'Use sign-up pledges, brand manifestos, or "I am in" opt-in moments that create a psychological contract with the brand.',
  },

  // ── 8 (continued). Graded tasks ───────────────────────────────────────
  BCT_8_7: {
    id: 'BCT_8_7',
    name: 'Graded tasks',
    category: 'Repetition and substitution',
    description:
      'Set easy-to-perform tasks, making them increasingly difficult but achievable until behavior is performed.',
    evidenceStrength: 'moderate',
    example:
      'Design progressive onboarding: start with a simple brand profile, then unlock advanced features as users build confidence.',
  },
} as const satisfies Record<string, BctTechnique>;

/** All BCT technique IDs */
export type BctTechniqueId = keyof typeof BCT_TAXONOMY;

/** Ordered list of all BCT categories present in the taxonomy subset */
export const BCT_CATEGORIES = [
  'Goals and planning',
  'Feedback and monitoring',
  'Social support',
  'Shaping knowledge',
  'Natural consequences',
  'Comparison of behavior',
  'Associations',
  'Repetition and substitution',
  'Comparison of outcomes',
  'Reward and threat',
  'Regulation',
  'Antecedents',
  'Identity',
  'Self-belief',
  'Covert learning',
] as const;

export type BctCategory = (typeof BCT_CATEGORIES)[number];

/**
 * Look up a BCT technique by its ID string.
 * Returns undefined if the ID is not in the subset.
 */
export function getBctTechnique(id: string): BctTechnique | undefined {
  return BCT_TAXONOMY[id as BctTechniqueId];
}

/**
 * Get all techniques belonging to a given taxonomy category.
 */
export function getBctsByCategory(category: string): BctTechnique[] {
  return Object.values(BCT_TAXONOMY).filter((t) => t.category === category);
}

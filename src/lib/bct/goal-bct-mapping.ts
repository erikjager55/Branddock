// =============================================================================
// Goal → BCT Mapping — Maps each of the 16 campaign goal types to 3-5
// evidence-based Behavior Change Techniques from the HBCP BCT Taxonomy v1
// =============================================================================

import { BCT_TAXONOMY, type BctTechnique } from './bct-taxonomy';

// ─── Types ──────────────────────────────────────────────

export type ComBComponent = 'capability' | 'opportunity' | 'motivation';

export interface GoalBctMapping {
  /** The campaign goal type ID */
  goalType: string;
  /** Primary COM-B component this goal type targets */
  comBTarget: ComBComponent;
  /** The behavioral barrier this campaign must overcome */
  behavioralBarrier: string;
  /** The desired behavior the campaign should drive */
  desiredBehavior: string;
  /** 3-5 recommended BCTs with application hints */
  primaryBCTs: Array<{
    id: string;
    name: string;
    description: string;
    applicationHint: string;
  }>;
}

// ─── Mapping Data ───────────────────────────────────────

const GOAL_BCT_MAP: Record<string, GoalBctMapping> = {
  // ── Growth & Awareness ─────────────────────────────────

  BRAND_AWARENESS: {
    goalType: 'BRAND_AWARENESS',
    comBTarget: 'opportunity',
    behavioralBarrier: 'Low mental availability — brand is not in the consideration set',
    desiredBehavior: 'Include the brand in consideration when need arises',
    primaryBCTs: [
      { id: 'BCT_7_1', name: 'Prompts/cues', description: BCT_TAXONOMY.BCT_7_1.description, applicationHint: 'Place brand cues across high-frequency touchpoints to build mental availability' },
      { id: 'BCT_6_1', name: 'Demonstration of the behavior', description: BCT_TAXONOMY.BCT_6_1.description, applicationHint: 'Show real customers engaging with the brand to normalize adoption' },
      { id: 'BCT_5_1', name: 'Information about health consequences', description: BCT_TAXONOMY.BCT_5_1.description, applicationHint: 'Communicate what the audience gains by knowing and choosing this brand' },
      { id: 'BCT_9_1', name: 'Credible source', description: BCT_TAXONOMY.BCT_9_1.description, applicationHint: 'Feature industry leaders or trusted voices endorsing the brand' },
    ],
  },

  PRODUCT_LAUNCH: {
    goalType: 'PRODUCT_LAUNCH',
    comBTarget: 'motivation',
    behavioralBarrier: 'Inertia and risk aversion — audience sticks with known solutions',
    desiredBehavior: 'Try or purchase the new product within launch window',
    primaryBCTs: [
      { id: 'BCT_9_3', name: 'Comparative imagining of future outcomes', description: BCT_TAXONOMY.BCT_9_3.description, applicationHint: 'Paint before/after scenarios showing life with vs. without the new product' },
      { id: 'BCT_8_1', name: 'Behavioral practice/rehearsal', description: BCT_TAXONOMY.BCT_8_1.description, applicationHint: 'Offer free trials or demos that let prospects experience the product risk-free' },
      { id: 'BCT_16_3', name: 'Anticipated regret', description: BCT_TAXONOMY.BCT_16_3.description, applicationHint: 'Create FOMO: limited-time launch pricing, early-bird access, or waitlist exclusivity' },
      { id: 'BCT_1_4', name: 'Action planning', description: BCT_TAXONOMY.BCT_1_4.description, applicationHint: 'Guide the audience through clear adoption steps: sign up → onboard → first value moment' },
    ],
  },

  MARKET_EXPANSION: {
    goalType: 'MARKET_EXPANSION',
    comBTarget: 'opportunity',
    behavioralBarrier: 'Lack of local trust and cultural relevance',
    desiredBehavior: 'Engage with the brand in the new market context',
    primaryBCTs: [
      { id: 'BCT_6_1', name: 'Demonstration of the behavior', description: BCT_TAXONOMY.BCT_6_1.description, applicationHint: 'Feature local case studies and culturally relevant testimonials' },
      { id: 'BCT_9_1', name: 'Credible source', description: BCT_TAXONOMY.BCT_9_1.description, applicationHint: 'Partner with local industry leaders or cultural figures to build trust' },
      { id: 'BCT_12_2', name: 'Restructuring the social environment', description: BCT_TAXONOMY.BCT_12_2.description, applicationHint: 'Establish local communities, partnerships, and ambassador networks' },
      { id: 'BCT_5_3', name: 'Information about social and environmental consequences', description: BCT_TAXONOMY.BCT_5_3.description, applicationHint: 'Show how the brand contributes positively to the local market ecosystem' },
    ],
  },

  REBRANDING: {
    goalType: 'REBRANDING',
    comBTarget: 'capability',
    behavioralBarrier: 'Confusion and resistance to change — stakeholders are attached to old identity',
    desiredBehavior: 'Adopt and advocate for the new brand identity',
    primaryBCTs: [
      { id: 'BCT_13_2', name: 'Framing/reframing', description: BCT_TAXONOMY.BCT_13_2.description, applicationHint: 'Reframe the rebrand as evolution, not replacement — connect new to familiar' },
      { id: 'BCT_4_1', name: 'Instruction on how to perform the behavior', description: BCT_TAXONOMY.BCT_4_1.description, applicationHint: 'Provide clear brand guidelines and transition toolkits for all stakeholders' },
      { id: 'BCT_1_9', name: 'Commitment', description: BCT_TAXONOMY.BCT_1_9.description, applicationHint: 'Get employees and partners to publicly commit to the new brand identity' },
      { id: 'BCT_11_2', name: 'Reduce negative emotions', description: BCT_TAXONOMY.BCT_11_2.description, applicationHint: 'Address nostalgia and anxiety about change with empathetic transition messaging' },
    ],
  },

  // ── Engagement & Loyalty ───────────────────────────────

  CONTENT_MARKETING: {
    goalType: 'CONTENT_MARKETING',
    comBTarget: 'capability',
    behavioralBarrier: 'Audience does not know how the brand can help them — knowledge gap',
    desiredBehavior: 'Regularly consume and share brand content',
    primaryBCTs: [
      { id: 'BCT_4_1', name: 'Instruction on how to perform the behavior', description: BCT_TAXONOMY.BCT_4_1.description, applicationHint: 'Create valuable how-to content that builds the audience\'s skills using your product or expertise' },
      { id: 'BCT_8_3', name: 'Habit formation', description: BCT_TAXONOMY.BCT_8_3.description, applicationHint: 'Establish predictable content cadences (weekly series, daily tips) that become habitual' },
      { id: 'BCT_2_2', name: 'Feedback on behavior', description: BCT_TAXONOMY.BCT_2_2.description, applicationHint: 'Show readers their progress: "You\'ve read 5 articles this month — here\'s what you\'ve learned"' },
      { id: 'BCT_12_5', name: 'Adding objects to the environment', description: BCT_TAXONOMY.BCT_12_5.description, applicationHint: 'Provide downloadable templates, checklists, and tools that keep the brand in the workflow' },
    ],
  },

  AUDIENCE_ENGAGEMENT: {
    goalType: 'AUDIENCE_ENGAGEMENT',
    comBTarget: 'motivation',
    behavioralBarrier: 'Passive consumption — audience watches but does not participate',
    desiredBehavior: 'Actively interact with the brand through comments, shares, UGC, or community participation',
    primaryBCTs: [
      { id: 'BCT_3_1', name: 'Social support (unspecified)', description: BCT_TAXONOMY.BCT_3_1.description, applicationHint: 'Build a community where members encourage each other\'s participation and celebrate contributions' },
      { id: 'BCT_10_4', name: 'Social reward', description: BCT_TAXONOMY.BCT_10_4.description, applicationHint: 'Publicly recognize engaged audience members with shout-outs, badges, or featured spots' },
      { id: 'BCT_6_2', name: 'Social comparison', description: BCT_TAXONOMY.BCT_6_2.description, applicationHint: 'Show engagement leaderboards or peer participation rates to motivate action' },
      { id: 'BCT_1_1', name: 'Goal setting (behavior)', description: BCT_TAXONOMY.BCT_1_1.description, applicationHint: 'Set participation challenges: "Share your story this week" or "Tag a friend who needs this"' },
    ],
  },

  COMMUNITY_BUILDING: {
    goalType: 'COMMUNITY_BUILDING',
    comBTarget: 'opportunity',
    behavioralBarrier: 'No social infrastructure — audience has nowhere to connect around the brand',
    desiredBehavior: 'Join and actively participate in the brand community',
    primaryBCTs: [
      { id: 'BCT_12_2', name: 'Restructuring the social environment', description: BCT_TAXONOMY.BCT_12_2.description, applicationHint: 'Create dedicated community spaces (Discord, forums) that reshape social context around the brand' },
      { id: 'BCT_3_1', name: 'Social support (unspecified)', description: BCT_TAXONOMY.BCT_3_1.description, applicationHint: 'Foster peer-to-peer support within the community with mentorship and buddy programs' },
      { id: 'BCT_13_5', name: 'Identity associated with changed behavior', description: BCT_TAXONOMY.BCT_13_5.description, applicationHint: 'Help members adopt a shared identity: "We are innovators" or "We are brand builders"' },
      { id: 'BCT_10_4', name: 'Social reward', description: BCT_TAXONOMY.BCT_10_4.description, applicationHint: 'Celebrate member milestones, contributions, and anniversaries publicly within the community' },
    ],
  },

  LOYALTY_RETENTION: {
    goalType: 'LOYALTY_RETENTION',
    comBTarget: 'motivation',
    behavioralBarrier: 'Declining perceived value — customers forget why they chose this brand',
    desiredBehavior: 'Continue using and recommending the brand over alternatives',
    primaryBCTs: [
      { id: 'BCT_2_7', name: 'Feedback on outcome(s) of behavior', description: BCT_TAXONOMY.BCT_2_7.description, applicationHint: 'Show cumulative value: "You\'ve saved €2,400 since joining — here\'s your impact dashboard"' },
      { id: 'BCT_10_3', name: 'Non-specific reward', description: BCT_TAXONOMY.BCT_10_3.description, applicationHint: 'Reward loyalty with exclusive access, early previews, or tier-based perks' },
      { id: 'BCT_8_3', name: 'Habit formation', description: BCT_TAXONOMY.BCT_8_3.description, applicationHint: 'Design daily/weekly touchpoints that keep the brand embedded in the customer routine' },
      { id: 'BCT_1_3', name: 'Goal setting (outcome)', description: BCT_TAXONOMY.BCT_1_3.description, applicationHint: 'Help customers set goals achievable through continued brand engagement' },
    ],
  },

  LINKEDIN_GROWTH: {
    goalType: 'LINKEDIN_GROWTH',
    comBTarget: 'motivation',
    behavioralBarrier: 'Content creation inertia — professionals know they should post but lack confidence, ideas, or a consistent habit',
    desiredBehavior: 'Publish valuable LinkedIn content consistently and engage strategically with target audience',
    primaryBCTs: [
      { id: 'BCT_8_3', name: 'Habit formation', description: BCT_TAXONOMY.BCT_8_3.description, applicationHint: 'Establish a fixed weekly posting schedule (e.g., Tue/Thu/Sat) that builds content creation as a professional routine' },
      { id: 'BCT_1_1', name: 'Goal setting (behavior)', description: BCT_TAXONOMY.BCT_1_1.description, applicationHint: 'Set specific LinkedIn goals: "3 posts per week, 10 meaningful comments, 1 carousel per month"' },
      { id: 'BCT_6_2', name: 'Social comparison', description: BCT_TAXONOMY.BCT_6_2.description, applicationHint: 'Benchmark against peers and competitors — show what successful LinkedIn creators in the niche are doing differently' },
      { id: 'BCT_2_2', name: 'Feedback on behavior', description: BCT_TAXONOMY.BCT_2_2.description, applicationHint: 'Track and visualize engagement metrics over time — impressions, profile views, connection requests, and content performance trends' },
    ],
  },

  // ── Brand & Culture ────────────────────────────────────

  EMPLOYER_BRANDING: {
    goalType: 'EMPLOYER_BRANDING',
    comBTarget: 'motivation',
    behavioralBarrier: 'Low employer brand salience — talent does not consider this company',
    desiredBehavior: 'Apply for positions and recommend the company to peers',
    primaryBCTs: [
      { id: 'BCT_6_1', name: 'Demonstration of the behavior', description: BCT_TAXONOMY.BCT_6_1.description, applicationHint: 'Share authentic employee stories and day-in-the-life content that demonstrates the culture' },
      { id: 'BCT_15_2', name: 'Mental rehearsal of successful performance', description: BCT_TAXONOMY.BCT_15_2.description, applicationHint: 'Help candidates envision themselves thriving at the company through immersive content' },
      { id: 'BCT_5_1', name: 'Information about health consequences', description: BCT_TAXONOMY.BCT_5_1.description, applicationHint: 'Communicate career growth outcomes: "85% of our juniors reach senior level within 3 years"' },
      { id: 'BCT_9_1', name: 'Credible source', description: BCT_TAXONOMY.BCT_9_1.description, applicationHint: 'Feature Glassdoor ratings, industry awards, and employee testimonials as trust signals' },
    ],
  },

  INTERNAL_BRANDING: {
    goalType: 'INTERNAL_BRANDING',
    comBTarget: 'capability',
    behavioralBarrier: 'Employees do not understand or feel connected to the brand purpose',
    desiredBehavior: 'Live the brand values in daily work and become brand ambassadors',
    primaryBCTs: [
      { id: 'BCT_4_1', name: 'Instruction on how to perform the behavior', description: BCT_TAXONOMY.BCT_4_1.description, applicationHint: 'Provide concrete examples of how each department can live the brand values in daily work' },
      { id: 'BCT_13_5', name: 'Identity associated with changed behavior', description: BCT_TAXONOMY.BCT_13_5.description, applicationHint: 'Help employees see themselves as brand ambassadors, not just workers' },
      { id: 'BCT_1_9', name: 'Commitment', description: BCT_TAXONOMY.BCT_1_9.description, applicationHint: 'Use team pledges, value sign-offs, and onboarding rituals to create brand commitment' },
      { id: 'BCT_3_1', name: 'Social support (unspecified)', description: BCT_TAXONOMY.BCT_3_1.description, applicationHint: 'Create peer recognition programs where employees celebrate each other\'s brand-aligned behaviors' },
    ],
  },

  THOUGHT_LEADERSHIP: {
    goalType: 'THOUGHT_LEADERSHIP',
    comBTarget: 'capability',
    behavioralBarrier: 'Audience does not see the brand as a credible authority on the topic',
    desiredBehavior: 'Seek out, cite, and share the brand\'s expert perspectives',
    primaryBCTs: [
      { id: 'BCT_9_1', name: 'Credible source', description: BCT_TAXONOMY.BCT_9_1.description, applicationHint: 'Publish original research, data-driven insights, and expert commentary that cannot be found elsewhere' },
      { id: 'BCT_6_2', name: 'Social comparison', description: BCT_TAXONOMY.BCT_6_2.description, applicationHint: 'Position the brand\'s insights against industry consensus to highlight unique perspectives' },
      { id: 'BCT_4_1', name: 'Instruction on how to perform the behavior', description: BCT_TAXONOMY.BCT_4_1.description, applicationHint: 'Teach the audience actionable frameworks they can apply, building dependency on the brand\'s expertise' },
      { id: 'BCT_13_2', name: 'Framing/reframing', description: BCT_TAXONOMY.BCT_13_2.description, applicationHint: 'Challenge conventional wisdom with fresh perspectives that reframe how the audience thinks about a topic' },
    ],
  },

  CSR_IMPACT: {
    goalType: 'CSR_IMPACT',
    comBTarget: 'motivation',
    behavioralBarrier: 'Skepticism about corporate sustainability claims (greenwashing fatigue)',
    desiredBehavior: 'Trust, support, and advocate for the brand\'s social impact',
    primaryBCTs: [
      { id: 'BCT_5_3', name: 'Information about social and environmental consequences', description: BCT_TAXONOMY.BCT_5_3.description, applicationHint: 'Lead with measurable impact data: "Every purchase diverts 2kg of ocean plastic"' },
      { id: 'BCT_9_1', name: 'Credible source', description: BCT_TAXONOMY.BCT_9_1.description, applicationHint: 'Partner with trusted NGOs, certifications (B Corp), and third-party auditors for credibility' },
      { id: 'BCT_6_1', name: 'Demonstration of the behavior', description: BCT_TAXONOMY.BCT_6_1.description, applicationHint: 'Show the actual impact through documentary-style stories of beneficiaries and communities' },
      { id: 'BCT_1_1', name: 'Goal setting (behavior)', description: BCT_TAXONOMY.BCT_1_1.description, applicationHint: 'Invite customers to participate: "Join our challenge to reduce X by 30% this year"' },
    ],
  },

  // ── Conversion & Activation ────────────────────────────

  LEAD_GENERATION: {
    goalType: 'LEAD_GENERATION',
    comBTarget: 'motivation',
    behavioralBarrier: 'Value exchange skepticism — audience resists providing contact information',
    desiredBehavior: 'Submit contact information in exchange for valuable content or access',
    primaryBCTs: [
      { id: 'BCT_10_1', name: 'Material incentive (behavior)', description: BCT_TAXONOMY.BCT_10_1.description, applicationHint: 'Offer high-value lead magnets (templates, tools, exclusive data) that justify the exchange' },
      { id: 'BCT_11_2', name: 'Reduce negative emotions', description: BCT_TAXONOMY.BCT_11_2.description, applicationHint: 'Minimize form friction, offer clear privacy assurances, and show what happens after sign-up' },
      { id: 'BCT_1_4', name: 'Action planning', description: BCT_TAXONOMY.BCT_1_4.description, applicationHint: 'Map clear next steps after lead capture: "Step 1: Download guide. Step 2: Book a demo. Step 3: Start free trial"' },
      { id: 'BCT_9_2', name: 'Pros and cons', description: BCT_TAXONOMY.BCT_9_2.description, applicationHint: 'Use transparent comparison content and ROI calculators that help prospects self-qualify' },
    ],
  },

  SALES_ACTIVATION: {
    goalType: 'SALES_ACTIVATION',
    comBTarget: 'motivation',
    behavioralBarrier: 'Decision paralysis and price sensitivity at the point of purchase',
    desiredBehavior: 'Complete the purchase within the campaign window',
    primaryBCTs: [
      { id: 'BCT_16_3', name: 'Anticipated regret', description: BCT_TAXONOMY.BCT_16_3.description, applicationHint: 'Create genuine urgency: limited-time offers, countdown timers, stock scarcity indicators' },
      { id: 'BCT_10_1', name: 'Material incentive (behavior)', description: BCT_TAXONOMY.BCT_10_1.description, applicationHint: 'Offer time-limited discounts, bundles, or bonuses that reward immediate action' },
      { id: 'BCT_1_2', name: 'Problem solving', description: BCT_TAXONOMY.BCT_1_2.description, applicationHint: 'Address objections directly in CTAs: "No contract. Cancel anytime. Full refund in 30 days."' },
      { id: 'BCT_6_1', name: 'Demonstration of the behavior', description: BCT_TAXONOMY.BCT_6_1.description, applicationHint: 'Show social proof at point of purchase: recent buyers, star ratings, expert endorsements' },
    ],
  },

  EVENT_SEASONAL: {
    goalType: 'EVENT_SEASONAL',
    comBTarget: 'opportunity',
    behavioralBarrier: 'Seasonal noise — audience is overwhelmed by competing event messages',
    desiredBehavior: 'Engage with the brand during the event window and take the desired action',
    primaryBCTs: [
      { id: 'BCT_7_1', name: 'Prompts/cues', description: BCT_TAXONOMY.BCT_7_1.description, applicationHint: 'Use countdown sequences and event-day reminders to keep the brand top-of-mind' },
      { id: 'BCT_16_3', name: 'Anticipated regret', description: BCT_TAXONOMY.BCT_16_3.description, applicationHint: 'Limited-edition or event-exclusive offers that create FOMO and urgency' },
      { id: 'BCT_8_1', name: 'Behavioral practice/rehearsal', description: BCT_TAXONOMY.BCT_8_1.description, applicationHint: 'Pre-event engagement (wishlists, pre-registration) that rehearses the purchase decision' },
      { id: 'BCT_10_3', name: 'Non-specific reward', description: BCT_TAXONOMY.BCT_10_3.description, applicationHint: 'Reward early engagement with exclusive access, gifts, or loyalty points' },
    ],
  },
};

// Legacy aliases
GOAL_BCT_MAP.BRAND = GOAL_BCT_MAP.BRAND_AWARENESS;
GOAL_BCT_MAP.PRODUCT = GOAL_BCT_MAP.PRODUCT_LAUNCH;
GOAL_BCT_MAP.CONTENT = GOAL_BCT_MAP.CONTENT_MARKETING;
GOAL_BCT_MAP.ENGAGEMENT = GOAL_BCT_MAP.AUDIENCE_ENGAGEMENT;

// ─── Public API ─────────────────────────────────────────

/**
 * Get the BCT mapping for a campaign goal type.
 * Returns null if no mapping exists.
 */
export function getGoalBctMapping(goalType: string): GoalBctMapping | null {
  return GOAL_BCT_MAP[goalType] ?? null;
}

/**
 * Get formatted BCT context for injection into AI prompts.
 * Returns an empty string if no mapping exists.
 */
export function getBctContext(goalType: string): string {
  const mapping = getGoalBctMapping(goalType);
  if (!mapping) return '';

  const bctList = mapping.primaryBCTs
    .map((bct) => `- **${bct.name}**: ${bct.applicationHint}`)
    .join('\n');

  return [
    '### Behavioral Science Foundation',
    `**Target behavior**: ${mapping.desiredBehavior}`,
    `**Primary barrier**: ${mapping.behavioralBarrier} (COM-B: ${mapping.comBTarget})`,
    '',
    'Recommended Behavior Change Techniques (BCT Taxonomy v1):',
    bctList,
  ].join('\n');
}

/**
 * Get the full BCT technique objects for a goal type.
 * Useful for UI display with evidence strength and full descriptions.
 */
export function getGoalBctTechniques(goalType: string): BctTechnique[] {
  const mapping = getGoalBctMapping(goalType);
  if (!mapping) return [];
  return mapping.primaryBCTs
    .map((bct) => BCT_TAXONOMY[bct.id as keyof typeof BCT_TAXONOMY])
    .filter(Boolean);
}

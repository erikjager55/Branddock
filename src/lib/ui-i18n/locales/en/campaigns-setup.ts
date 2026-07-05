// Canonical (source-of-truth) English UI strings — `campaigns-setup` namespace.
// Render-edge catalog for the campaign wizard Setup step: goal categories,
// goal types, and campaign types. Keyed on the registry items' stable
// id/key fields (goal-types.ts, campaign-types.ts) — NOT the mutable labels.
const campaignsSetup = {
  // GOAL_CATEGORIES — keyed on category.key
  categories: {
    growth: 'Growth & Awareness',
    engagement: 'Engagement & Loyalty',
    culture: 'Brand & Culture',
    conversion: 'Conversion & Activation',
  },
  // GOAL_CATEGORIES types — keyed on goal id; `${id}Desc` for the description
  goals: {
    BRAND_AWARENESS: 'Brand Awareness',
    BRAND_AWARENESSDesc:
      "Boost your brand's visibility and recognition among your target audience. Ideal for new brands establishing themselves or existing brands looking to increase share of voice.",
    PRODUCT_LAUNCH: 'Product Launch',
    PRODUCT_LAUNCHDesc:
      'Plan and execute the introduction of a new product or service. Covers the full launch timeline from pre-launch teasers through launch moment to post-launch sustain.',
    MARKET_EXPANSION: 'Market Expansion',
    MARKET_EXPANSIONDesc:
      'Enter a new geographic market, customer segment, or industry vertical. Adapts messaging and channel strategy to resonate with a new audience while building local credibility.',
    REBRANDING: 'Rebranding / Brand Refresh',
    REBRANDINGDesc:
      'Reposition or modernize your brand identity. Guides the phased rollout from internal alignment to external communication, ensuring consistency across all touchpoints.',
    CONTENT_MARKETING: 'Content Marketing',
    CONTENT_MARKETINGDesc:
      'Build a sustainable content engine that attracts and retains customers. Focuses on creating valuable, always-on content across Hero, Hub, and Hygiene formats for organic growth.',
    AUDIENCE_ENGAGEMENT: 'Audience Engagement',
    AUDIENCE_ENGAGEMENTDesc:
      'Deepen the connection between your brand and its audience. Prioritizes two-way interaction through polls, UGC campaigns, community events, and conversational content.',
    COMMUNITY_BUILDING: 'Community Building',
    COMMUNITY_BUILDINGDesc:
      "Create and nurture a community around your brand's shared values. Focuses on long-term member-to-member connections and exclusive content rather than short-term metrics.",
    LOYALTY_RETENTION: 'Loyalty & Retention',
    LOYALTY_RETENTIONDesc:
      'Strengthen relationships with existing customers to increase lifetime value. Designs personalized communication, loyalty programs, and feedback loops to reduce churn.',
    LINKEDIN_GROWTH: 'LinkedIn Growth',
    LINKEDIN_GROWTHDesc:
      'Grow your professional presence and authority on LinkedIn. Combines personal branding, company page strategy, employee advocacy, and LinkedIn-native formats (carousels, polls, articles) to build an engaged B2B audience.',
    EMPLOYER_BRANDING: 'Employer Branding',
    EMPLOYER_BRANDINGDesc:
      'Attract top talent and strengthen your reputation as an employer. Showcases company culture, employee stories, and career opportunities across recruitment channels.',
    INTERNAL_BRANDING: 'Internal Branding',
    INTERNAL_BRANDINGDesc:
      "Align your employees around your brand's purpose, values, and culture. Uses internal channels and ambassador programs to make the brand story personally relevant.",
    THOUGHT_LEADERSHIP: 'Thought Leadership',
    THOUGHT_LEADERSHIPDesc:
      'Position your brand or key leaders as authorities in your industry. Creates opinion pieces, research reports, and expert commentary that prioritize depth over frequency.',
    CSR_IMPACT: 'CSR & Social Impact',
    CSR_IMPACTDesc:
      'Communicate your sustainability and social responsibility efforts authentically. Leads with measurable actions and outcomes, partnering with credible organizations.',
    LEAD_GENERATION: 'Lead Generation',
    LEAD_GENERATIONDesc:
      'Capture qualified leads through targeted content and conversion funnels. Optimizes lead magnets, landing pages, and nurture sequences for cost-per-lead and quality.',
    SALES_ACTIVATION: 'Sales Activation',
    SALES_ACTIVATIONDesc:
      'Drive immediate conversions and revenue through time-limited campaigns. Uses direct response messaging with clear calls-to-action and measurable ROAS.',
    EVENT_SEASONAL: 'Event / Seasonal',
    EVENT_SEASONALDesc:
      'Create campaigns around specific events, holidays, or seasons. Builds anticipation through teaser-to-followup phases with urgency-driven messaging.',
  },
  // CAMPAIGN_TYPES — keyed on type id; `${id}Desc` description, `${id}Approach` creativeApproach
  campaignTypes: {
    brand: 'Brand Campaign',
    brandDesc: 'Build fame, emotion, and distinctiveness through big creative ideas.',
    brandApproach: 'Emotion & Fame',
    content: 'Content Campaign',
    contentDesc: 'Build authority and trust through valuable, expert-driven content.',
    contentApproach: 'Expertise & Value',
    activation: 'Activation Campaign',
    activationDesc: 'Drive immediate action through targeted conversion mechanics.',
    activationApproach: 'Conversion & Urgency',
  },
} as const;

export default campaignsSetup;

/**
 * Goal → Brand Growth Mapping — Maps each of the 16 campaign goal types to
 * Byron Sharp / Ehrenberg-Bass growth principles with specific recommendations
 * for mental/physical availability, CEPs, and DBAs.
 */

// ─── Types ──────────────────────────────────────────────

export interface GoalGrowthMapping {
  goalType: string;
  mentalAvailabilityPriority: 'critical' | 'high' | 'medium' | 'low';
  physicalAvailabilityPriority: 'critical' | 'high' | 'medium' | 'low';
  cepOpportunities: string[];
  dbaRecommendations: string[];
  growthLever: 'penetration' | 'frequency' | 'both';
  strategicImplication: string;
}

// ─── Mapping Data ───────────────────────────────────────

const GOAL_GROWTH_MAP: Record<string, GoalGrowthMapping> = {
  BRAND_AWARENESS: {
    goalType: 'BRAND_AWARENESS',
    mentalAvailabilityPriority: 'critical',
    physicalAvailabilityPriority: 'high',
    cepOpportunities: ['First-time need recognition', 'Category exploration', 'Social recommendation moments', 'Problem awareness triggers'],
    dbaRecommendations: ['Maximize logo and brand color exposure', 'Establish a distinctive sonic or visual device', 'Consistent tagline across all touchpoints'],
    growthLever: 'penetration',
    strategicImplication: 'Maximum mental availability building. Reach all category buyers, not just current prospects. Every touchpoint should reinforce distinctive brand assets.',
  },

  PRODUCT_LAUNCH: {
    goalType: 'PRODUCT_LAUNCH',
    mentalAvailabilityPriority: 'high',
    physicalAvailabilityPriority: 'critical',
    cepOpportunities: ['Unmet need discovery', 'Dissatisfaction with current solution', 'Innovation-seeking moments', 'Peer recommendation triggers'],
    dbaRecommendations: ['Link new product to existing brand assets', 'Create product-specific distinctive element', 'Ensure brand architecture is clear'],
    growthLever: 'penetration',
    strategicImplication: 'Physical availability is critical — the product must be easy to find and try. Link to existing mental availability. Create new CEPs for the product category.',
  },

  MARKET_EXPANSION: {
    goalType: 'MARKET_EXPANSION',
    mentalAvailabilityPriority: 'critical',
    physicalAvailabilityPriority: 'critical',
    cepOpportunities: ['Local need equivalents', 'Cultural moment connections', 'Local recommendation networks', 'Market-specific buying occasions'],
    dbaRecommendations: ['Adapt DBAs for cultural context without losing distinctiveness', 'Test asset recognition in new market', 'Build local fame associations'],
    growthLever: 'penetration',
    strategicImplication: 'Both availability dimensions are critical in new markets. Build from zero mental availability. Map entirely new CEPs for the local context.',
  },

  REBRANDING: {
    goalType: 'REBRANDING',
    mentalAvailabilityPriority: 'critical',
    physicalAvailabilityPriority: 'medium',
    cepOpportunities: ['Existing CEPs must be transferred to new identity', 'Use transition as opportunity to claim new CEPs'],
    dbaRecommendations: ['Transition DBAs gradually — never replace everything at once', 'Keep at least one anchor asset from old brand', 'Establish new distinctive elements alongside familiar ones'],
    growthLever: 'penetration',
    strategicImplication: 'Rebrand risks destroying mental availability. Transition DBAs carefully. The goal is to maintain existing CEP links while adding new ones.',
  },

  CONTENT_MARKETING: {
    goalType: 'CONTENT_MARKETING',
    mentalAvailabilityPriority: 'high',
    physicalAvailabilityPriority: 'medium',
    cepOpportunities: ['Information-seeking moments', 'Skill development needs', 'Problem-solving research', 'Industry trend monitoring'],
    dbaRecommendations: ['Consistent visual branding across all content', 'Distinctive content format or series structure', 'Recognizable author or brand voice'],
    growthLever: 'frequency',
    strategicImplication: 'Content builds mental availability through repeated, valuable exposure. Each piece should reinforce brand distinctiveness. Reach light content consumers.',
  },

  AUDIENCE_ENGAGEMENT: {
    goalType: 'AUDIENCE_ENGAGEMENT',
    mentalAvailabilityPriority: 'high',
    physicalAvailabilityPriority: 'medium',
    cepOpportunities: ['Boredom/entertainment moments', 'Community connection needs', 'Self-expression opportunities', 'Shared experience desires'],
    dbaRecommendations: ['Make brand elements integral to engagement experience', 'Create shareable branded moments', 'Build distinctive interaction patterns'],
    growthLever: 'both',
    strategicImplication: 'Engagement builds mental availability and frequency. Design for broad participation, not just superfan activity. Every interaction should feature DBAs.',
  },

  COMMUNITY_BUILDING: {
    goalType: 'COMMUNITY_BUILDING',
    mentalAvailabilityPriority: 'medium',
    physicalAvailabilityPriority: 'high',
    cepOpportunities: ['Belonging needs', 'Peer connection moments', 'Identity exploration', 'Skill sharing opportunities'],
    dbaRecommendations: ['Community-specific brand elements (badges, language)', 'Physical/digital gathering place with brand presence', 'Member recognition systems using brand assets'],
    growthLever: 'frequency',
    strategicImplication: 'Communities deepen frequency but can over-index on heavy users. Design onboarding for light members. Make the community findable (physical availability).',
  },

  LOYALTY_RETENTION: {
    goalType: 'LOYALTY_RETENTION',
    mentalAvailabilityPriority: 'medium',
    physicalAvailabilityPriority: 'high',
    cepOpportunities: ['Re-purchase decision moments', 'Competitor consideration triggers', 'Usage satisfaction check-ins', 'Life change moments'],
    dbaRecommendations: ['Reinforce DBAs in post-purchase touchpoints', 'Use packaging and product experience as DBA carriers', 'Loyalty program branded distinctively'],
    growthLever: 'frequency',
    strategicImplication: 'Per Sharp, loyalty follows penetration. Don\'t over-invest in retention at the expense of acquisition. But do maintain physical availability and CEP freshness.',
  },

  LINKEDIN_GROWTH: {
    goalType: 'LINKEDIN_GROWTH',
    mentalAvailabilityPriority: 'high',
    physicalAvailabilityPriority: 'medium',
    cepOpportunities: ['Professional knowledge-seeking moments', 'Industry trend discussions', 'Career development reflection', 'Peer recommendation and endorsement moments'],
    dbaRecommendations: ['Consistent visual template for carousels and posts', 'Recognizable author voice and perspective', 'Distinctive content series or framework names', 'Branded hashtag or recurring content format'],
    growthLever: 'both',
    strategicImplication: 'LinkedIn growth requires building mental availability among a professional audience. Reach beyond existing followers through shareable content. Frequency matters — the algorithm rewards consistency. Create distinctive content assets (frameworks, series names) that become associated with the brand.',
  },

  EMPLOYER_BRANDING: {
    goalType: 'EMPLOYER_BRANDING',
    mentalAvailabilityPriority: 'high',
    physicalAvailabilityPriority: 'high',
    cepOpportunities: ['Career transition moments', 'Job dissatisfaction triggers', 'Industry event exposure', 'Peer career conversations'],
    dbaRecommendations: ['Consistent employer brand assets linked to consumer brand', 'Distinctive recruitment experience', 'Recognizable culture markers'],
    growthLever: 'penetration',
    strategicImplication: 'Employer brand follows same rules as consumer brand. Build mental availability among all potential candidates, not just active job seekers.',
  },

  INTERNAL_BRANDING: {
    goalType: 'INTERNAL_BRANDING',
    mentalAvailabilityPriority: 'high',
    physicalAvailabilityPriority: 'high',
    cepOpportunities: ['Daily work decisions', 'Team collaboration moments', 'Customer interaction points', 'Performance review periods'],
    dbaRecommendations: ['Brand values visible in physical workspace', 'Internal tools and templates branded distinctively', 'Recognition programs using brand language'],
    growthLever: 'frequency',
    strategicImplication: 'Internal mental availability = brand values come to mind during daily decisions. Physical availability = brand presence in workspace and tools.',
  },

  THOUGHT_LEADERSHIP: {
    goalType: 'THOUGHT_LEADERSHIP',
    mentalAvailabilityPriority: 'high',
    physicalAvailabilityPriority: 'medium',
    cepOpportunities: ['Industry problem discussions', 'Conference and event contexts', 'Media consumption moments', 'Strategic planning periods'],
    dbaRecommendations: ['Distinctive intellectual property (frameworks, models)', 'Recognizable expert voices or author personas', 'Consistent thought leadership visual identity'],
    growthLever: 'penetration',
    strategicImplication: 'Reach all potential decision-makers, not just existing followers. Create distinctive intellectual assets that are uniquely associated with the brand.',
  },

  CSR_IMPACT: {
    goalType: 'CSR_IMPACT',
    mentalAvailabilityPriority: 'high',
    physicalAvailabilityPriority: 'medium',
    cepOpportunities: ['Ethical consumption decisions', 'Social responsibility conversations', 'Impact reporting seasons', 'Purpose-driven purchase moments'],
    dbaRecommendations: ['Impact-specific brand mark or certification', 'Measurable impact metrics as distinctive elements', 'Cause-linked brand narrative'],
    growthLever: 'penetration',
    strategicImplication: 'CSR builds mental availability among values-aligned buyers. Broad reach maximizes the brand-building benefit. Create distinctive impact markers.',
  },

  LEAD_GENERATION: {
    goalType: 'LEAD_GENERATION',
    mentalAvailabilityPriority: 'medium',
    physicalAvailabilityPriority: 'critical',
    cepOpportunities: ['Active solution search', 'Budget allocation period', 'Problem urgency spike', 'Peer recommendation inquiry'],
    dbaRecommendations: ['Brand assets prominent on all lead capture assets', 'Distinctive lead magnet format or series', 'Consistent brand experience from ad to landing page'],
    growthLever: 'penetration',
    strategicImplication: 'Physical availability is critical — be findable at the moment of need. Maintain brand distinctiveness across all conversion touchpoints.',
  },

  SALES_ACTIVATION: {
    goalType: 'SALES_ACTIVATION',
    mentalAvailabilityPriority: 'medium',
    physicalAvailabilityPriority: 'critical',
    cepOpportunities: ['Purchase decision moment', 'Price comparison trigger', 'Stock-up occasions', 'Gift-giving periods'],
    dbaRecommendations: ['DBAs prominently at point of purchase', 'Distinctive packaging or product design', 'Brand elements in promotional materials'],
    growthLever: 'penetration',
    strategicImplication: 'Maximize physical availability at the point of purchase. Activation works best when mental availability has already been built by brand campaigns.',
  },

  EVENT_SEASONAL: {
    goalType: 'EVENT_SEASONAL',
    mentalAvailabilityPriority: 'high',
    physicalAvailabilityPriority: 'high',
    cepOpportunities: ['Event anticipation period', 'During-event participation', 'Post-event sharing', 'Annual recurrence memory'],
    dbaRecommendations: ['Event-specific brand treatment that links to core DBAs', 'Create collectible or memorable event brand artifacts', 'Photo/social-worthy branded moments'],
    growthLever: 'both',
    strategicImplication: 'Events are penetration opportunities — reach beyond existing customers. Create memorable brand moments that build mental availability for the next season.',
  },
};

// Legacy aliases
GOAL_GROWTH_MAP.BRAND = GOAL_GROWTH_MAP.BRAND_AWARENESS;
GOAL_GROWTH_MAP.PRODUCT = GOAL_GROWTH_MAP.PRODUCT_LAUNCH;
GOAL_GROWTH_MAP.CONTENT = GOAL_GROWTH_MAP.CONTENT_MARKETING;
GOAL_GROWTH_MAP.ENGAGEMENT = GOAL_GROWTH_MAP.AUDIENCE_ENGAGEMENT;

// ─── Public API ─────────────────────────────────────────

/**
 * Get formatted brand growth context for injection into AI prompts.
 * Returns an empty string if no mapping exists.
 */
export function getGrowthContext(goalType: string): string {
  const mapping = GOAL_GROWTH_MAP[goalType];
  if (!mapping) return '';

  const cepList = mapping.cepOpportunities.map((c) => `- ${c}`).join('\n');
  const dbaList = mapping.dbaRecommendations.map((d) => `- ${d}`).join('\n');

  return [
    '### Brand Growth (Byron Sharp / Ehrenberg-Bass)',
    `**Mental availability priority**: ${mapping.mentalAvailabilityPriority}`,
    `**Physical availability priority**: ${mapping.physicalAvailabilityPriority}`,
    `**Growth lever**: ${mapping.growthLever}`,
    `**Strategic implication**: ${mapping.strategicImplication}`,
    '',
    'Category Entry Points (CEPs) to target:',
    cepList,
    '',
    'Distinctive Brand Asset (DBA) recommendations:',
    dbaList,
  ].join('\n');
}

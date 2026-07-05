// Canonical (source-of-truth) English UI strings — `claw-content-registry` namespace.
//
// Render-edge catalog for the data-driven registries that stay UNCHANGED
// (English source-of-truth) in their `.ts` files:
//   • `src/lib/claw/quick-actions.ts`  → `quickActions` (Claw chat suggestion labels)
//   • `src/lib/campaigns/content-types.ts` → `contentTypes` (Quick-Content type names,
//      keyed on the content-type stable `id`; a DISTINCT registry from the campaigns
//      DELIVERABLE_TYPES already covered by `campaigns-content-types`)
//   • `src/features/knowledge-library/constants/library-constants.ts` → `categories`
//      (RESOURCE_CATEGORIES filter/select labels, keyed on the stable category string;
//      the stored value stays English).
const ns = {
  quickActions: {
    // Wizard mode
    fillEmptyFields_one: 'Fill {{count}} empty field',
    fillEmptyFields_other: 'Fill {{count}} empty fields',
    suggestCampaignGoal: 'Suggest a campaign goal',
    writeBriefing: 'Write the briefing',
    reviewWhatIHave: 'Review what I have',
    // Detail-entity (shared)
    fillGaps: 'Fill gaps in {{name}}',
    fillGapsQuoted: 'Fill gaps in "{{name}}"',
    strengthen: "Strengthen what's there",
    checkConsistency: 'Check consistency',
    // Persona
    writeQuote: 'Write a strong quote',
    suggestDecisionCriteria: 'Suggest decision criteria',
    // Product
    writeBenefitCopy: 'Write benefit copy',
    linkToPersonas: 'Link to personas',
    // Competitor
    compareToUs: 'Compare to us',
    spotWeakness: 'Spot their weakness',
    // Brand page
    assessBrandFoundation: 'Assess brand foundation',
    fillEmptyFieldsAll: 'Fill empty fields',
    // Personas page
    analyzePersonaGaps: 'Analyze persona gaps',
    comparePersonas: 'Compare personas',
    suggestBuyingTriggers: 'Suggest buying triggers',
    // Campaigns page
    campaignStatusOverview: 'Campaign status overview',
    suggestNextCampaign: 'Suggest next campaign',
    // Competitors page
    competitivePosition: 'Competitive position',
    findDifferentiators: 'Find differentiators',
    // Trends page
    trendRelevanceCheck: 'Trend relevance check',
    // Strategy page
    strategyHealthCheck: 'Strategy health check',
    // Dashboard
    whatNeedsAttention: 'What needs attention?',
    weeklySummary: 'Weekly summary',
    // Workspace fallback
    reviewPersonas: 'Review personas',
    campaignOverview: 'Campaign overview',
  },
  contentTypes: {
    'blog-post': 'Blog Post',
    whitepaper: 'Whitepaper',
    'press-release': 'Press Release',
    'case-study': 'Case Study',
    'landing-page': 'Landing Page',
    'linkedin-post': 'LinkedIn Post',
    'linkedin-carousel': 'LinkedIn Carousel',
    'linkedin-article': 'LinkedIn Article',
    'linkedin-video': 'LinkedIn Video',
    instagram: 'Instagram Post',
    twitter: 'Twitter/X Thread',
    facebook: 'Facebook Post',
    'social-ad': 'Social Ad',
    infographic: 'Infographic',
    'social-graphic': 'Social Graphic',
    illustration: 'Illustration',
    banner: 'Banner Ad',
    'brand-asset': 'Brand Asset',
    'short-video': 'Short Video',
    explainer: 'Explainer Video',
    'testimonial-video': 'Testimonial',
    'promo-video': 'Promo Video',
    newsletter: 'Newsletter',
    'drip-campaign': 'Drip Campaign',
    announcement: 'Announcement',
    'welcome-email': 'Welcome Email',
  },
  categories: {
    'Brand Strategy': 'Brand Strategy',
    Research: 'Research',
    Content: 'Content',
    Marketing: 'Marketing',
    Design: 'Design',
    Technology: 'Technology',
    Psychology: 'Psychology',
    'User Experience': 'User Experience',
    Trends: 'Trends',
  },
} as const;

export default ns;

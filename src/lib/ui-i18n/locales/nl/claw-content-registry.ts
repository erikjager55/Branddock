// Dutch (nl) UI strings — `claw-content-registry` namespace. Terse, informal "je".
const ns = {
  quickActions: {
    // Wizard mode
    fillEmptyFields_one: 'Vul {{count}} leeg veld',
    fillEmptyFields_other: 'Vul {{count}} lege velden',
    suggestCampaignGoal: 'Stel een campagnedoel voor',
    writeBriefing: 'Schrijf de briefing',
    reviewWhatIHave: 'Beoordeel wat ik heb',
    // Detail-entity (shared)
    fillGaps: 'Vul de gaten in {{name}}',
    fillGapsQuoted: 'Vul de gaten in "{{name}}"',
    strengthen: 'Versterk wat er staat',
    checkConsistency: 'Check consistentie',
    // Persona
    writeQuote: 'Schrijf een sterke quote',
    suggestDecisionCriteria: 'Stel beslissingscriteria voor',
    // Product
    writeBenefitCopy: 'Schrijf benefit-copy',
    linkToPersonas: "Koppel aan persona's",
    // Competitor
    compareToUs: 'Vergelijk met ons',
    spotWeakness: 'Vind hun zwakte',
    // Brand page
    assessBrandFoundation: 'Beoordeel je merkfundament',
    fillEmptyFieldsAll: 'Vul lege velden',
    // Personas page
    analyzePersonaGaps: 'Analyseer persona-gaten',
    comparePersonas: "Vergelijk persona's",
    suggestBuyingTriggers: 'Stel koopmotieven voor',
    // Campaigns page
    campaignStatusOverview: 'Campagnestatus-overzicht',
    suggestNextCampaign: 'Stel volgende campagne voor',
    // Competitors page
    competitivePosition: 'Concurrentiepositie',
    findDifferentiators: 'Vind onderscheiders',
    // Trends page
    trendRelevanceCheck: 'Check trend-relevantie',
    // Strategy page
    strategyHealthCheck: 'Strategie-gezondheidscheck',
    // Dashboard
    whatNeedsAttention: 'Wat heeft aandacht nodig?',
    weeklySummary: 'Weekoverzicht',
    // Workspace fallback
    reviewPersonas: "Beoordeel je persona's",
    campaignOverview: 'Campagne-overzicht',
  },
  contentTypes: {
    'blog-post': 'Blogpost',
    whitepaper: 'Whitepaper',
    'press-release': 'Persbericht',
    'case-study': 'Case study',
    'landing-page': 'Landingspagina',
    'linkedin-post': 'LinkedIn-post',
    'linkedin-carousel': 'LinkedIn-carousel',
    'linkedin-article': 'LinkedIn-artikel',
    'linkedin-video': 'LinkedIn-video',
    instagram: 'Instagram-post',
    twitter: 'Twitter/X-thread',
    facebook: 'Facebook-post',
    'social-ad': 'Social ad',
    infographic: 'Infographic',
    'social-graphic': 'Social graphic',
    illustration: 'Illustratie',
    banner: 'Banneradvertentie',
    'brand-asset': 'Merkelement',
    'short-video': 'Korte video',
    explainer: 'Uitlegvideo',
    'testimonial-video': 'Testimonial',
    'promo-video': 'Promovideo',
    newsletter: 'Nieuwsbrief',
    'drip-campaign': 'Dripcampagne',
    announcement: 'Aankondiging',
    'welcome-email': 'Welkomstmail',
  },
  categories: {
    'Brand Strategy': 'Merkstrategie',
    Research: 'Onderzoek',
    Content: 'Content',
    Marketing: 'Marketing',
    Design: 'Ontwerp',
    Technology: 'Technologie',
    Psychology: 'Psychologie',
    'User Experience': 'Gebruikerservaring',
    Trends: 'Trends',
  },
} as const;

export default ns;

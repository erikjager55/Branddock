// Canonical (source-of-truth) English UI strings — `research` namespace.
const research = {
  hub: {
    title: 'Research Hub',
    subtitle: 'Design and run brand research studies',
  },
  custom: {
    title: 'Custom Validation',
    subtitle: 'Create your own validation criteria',
    newPlan: 'New Plan',
    step1: 'Step 1: Select Assets to Validate',
    step2: 'Step 2: Choose Validation Methods',
  },
  bundles: {
    title: 'Research Bundles',
    subtitle: 'Pre-built research packages',
  },
  stats: {
    activeStudies: 'Active Studies',
    completed: 'Completed',
    pendingReview: 'Pending Review',
    totalInsights: 'Total Insights',
  },
  viewTabs: {
    overview: 'Overview',
    category: 'By Category',
    timeline: 'Timeline',
  },
  splitButton: {
    newPlan: 'New Research Plan',
    customPlan: 'Custom Research Plan',
    browseBundles: 'Browse Research Bundles',
  },
  methodStatus: {
    methods: {
      AI_EXPLORATION: 'AI Exploration',
      WORKSHOP: 'Workshop',
      INTERVIEWS: '1-on-1 Interviews',
      QUESTIONNAIRE: 'Questionnaire',
    },
    active: 'Active',
    done: 'Done',
    unlocked: 'Unlocked',
  },
  activeResearch: {
    heading: 'Active Research',
    resume: 'Resume',
    empty: {
      title: 'No active research',
      description: 'Start a research plan to begin validating your brand strategy.',
    },
  },
  quickInsights: {
    heading: 'Quick Insights',
    empty: {
      title: 'No insights yet',
      description: 'Insights will appear as you complete research studies.',
    },
  },
  recommendedActions: {
    heading: 'Recommended Actions',
    empty: {
      title: 'No recommendations',
      description: 'Complete some research to receive personalized recommendations.',
    },
  },
  validationNeeded: {
    heading: 'Validation Needed',
    validate: 'Validate',
    readyBadge: 'Ready For Validation',
    validateError: 'Failed to validate',
    empty: {
      title: 'No pending validations',
      description: 'All your brand assets are up to date.',
    },
  },
  assetSelector: {
    recommended: 'Recommended',
  },
  confidenceBadge: {
    label: 'Confidence: {{confidence}}',
  },
  methodCard: {
    free: 'FREE',
  },
  pricing: {
    free: 'Free',
    total: 'Total',
  },
  bundleBadge: {
    recommended: 'Recommended',
    popular: 'Popular',
    save: 'Save',
    savePercent: 'Save {{discount}}%',
  },
  bundleCard: {
    methods_one: '{{count}} Method',
    methods_other: '{{count}} Methods',
    learnMore: 'Learn More',
    selectBundle: 'Select Bundle',
  },
  bundleDetail: {
    back: 'Back to Bundles',
    noBundle: 'No bundle selected.',
    save: 'Save ${{amount}}',
    includedAssets: 'Included Assets',
    researchMethods: 'Research Methods',
    selectBundle: 'Select This Bundle',
    learnMore: 'Learn More',
  },
  bundleFilter: {
    all: 'All Bundles',
    recommended: 'Recommended',
    searchPlaceholder: 'Search bundles...',
  },
  bundleStats: {
    timeline: 'Timeline',
    assets: 'Assets',
    methods: 'Methods',
    savings: 'Savings',
    flexible: 'Flexible',
    included: '{{count}} included',
    methodsCount_one: '{{count}} method',
    methodsCount_other: '{{count}} methods',
  },
  foundationPlans: {
    title: 'Foundation Plans',
    subtitle: 'Essential research packages to build your brand foundation',
  },
  specializedPlans: {
    title: 'Specialized Plans',
    subtitle: 'Advanced research for specific brand challenges',
  },
  sidebar: {
    title: 'Your Validation Plan',
    assets: 'Assets',
    noAssets: 'No assets selected',
    methods: 'Methods',
    noMethods: 'No methods selected',
    purchase: 'Purchase Plan →',
    startFree: 'Start Validation →',
    note: 'Free methods start immediately. Paid methods require payment.',
    guarantee: '100% Satisfaction Guarantee',
  },
  valueProps: {
    '0': 'Expert-Led Research',
    '1': 'Data-Driven Insights',
    '2': 'Actionable Results',
  },
} as const;

export default research;

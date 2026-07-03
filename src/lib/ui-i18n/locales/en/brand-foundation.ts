// Canonical (source-of-truth) English UI strings — `brand-foundation` namespace.
const ns = {
  page: {
    title: 'Brand Foundation',
    subtitle: 'Your core brand assets and identity',
  },
  header: {
    title: 'Brand Foundation',
    subtitle: 'Build your strategic foundation with premium brand tools',
    assetCount_one: '{{count}} asset',
    assetCount_other: '{{count}} assets',
  },
  stats: {
    totalAssets: 'Total Assets',
    readyToUse: 'Ready to Use',
    needAttention: 'Need Attention',
  },
  filters: {
    searchPlaceholder: 'Search brand assets...',
    allCategories: 'All Categories',
    allStatuses: 'All Statuses',
    reset: 'Reset',
    category: {
      PURPOSE: 'Purpose',
      COMMUNICATION: 'Communication',
      STRATEGY: 'Strategy',
      NARRATIVE: 'Narrative',
      CORE: 'Core',
      PERSONALITY: 'Personality',
      FOUNDATION: 'Foundation',
      CULTURE: 'Culture',
      ESG: 'ESG',
    },
    status: {
      DRAFT: 'Draft',
      IN_PROGRESS: 'In Progress',
      NEEDS_ATTENTION: 'Needs Attention',
      READY: 'Ready',
    },
  },
  grid: {
    errorTitle: 'Failed to load brand assets',
    errorFallback: 'An unexpected error occurred. Please try again later.',
    emptyTitle: 'No assets found',
    emptyFilteredDescription: 'Try adjusting your filters to find what you are looking for.',
    emptyDescription: 'Your brand foundation is empty. Add your first asset to get started.',
    resetFilters: 'Reset Filters',
  },
  // Render-edge source for the DB-seeded canonical brand assets, keyed by the
  // persisted (stable) `slug`. defaultValue at the render site falls back to the
  // live DB name/description for any non-canonical / custom asset.
  assets: {
    'purpose-statement': {
      name: 'Purpose Statement',
      description: 'The reason your organization exists beyond profit',
    },
    'golden-circle': {
      name: 'Golden Circle',
      description: "Simon Sinek's WHY → HOW → WHAT framework",
    },
    'brand-essence': {
      name: 'Brand Essence',
      description: 'The heart and soul of your brand',
    },
    'brand-promise': {
      name: 'Brand Promise',
      description: 'Core commitment to your customers',
    },
    'mission-statement': {
      name: 'Mission & Vision',
      description: "What you do today and where you're headed",
    },
    'brand-archetype': {
      name: 'Brand Archetype',
      description: 'Universal behavior patterns',
    },
    'transformative-goals': {
      name: 'Transformative Goals',
      description: 'Ambitious goals for lasting impact',
    },
    'brand-personality': {
      name: 'Brand Personality',
      description: 'Human characteristics of your brand',
    },
    'brand-story': {
      name: 'Brand Story',
      description: "Your brand's past, present and future",
    },
    'core-values': {
      name: 'Core Values',
      description: 'Fundamental beliefs that guide your brand',
    },
    'social-relevancy': {
      name: 'Social Relevancy',
      description: "Your brand's societal and environmental impact",
    },
  },
  anchors: {
    title: 'Brand-style anchors',
    countRecommended: '{{n}} (3-10 recommended)',
    countActive: '{{n}} active',
    description:
      '3-10 reference images that represent how the brand should feel visually. Every image generation injects these as style references (Recraft / Nano Banana / FLUX 2) for a consistent brand look across campaigns.',
    checkLogos: 'Check anchors for logos',
    noLogoClean: 'No logo-dominant anchors found.',
    noLogoCleanWithVisible: 'No logo-dominant anchors found ({{visible}} with a small/subtle logo).',
    logoBadge: 'logo',
    logoBadgeTitle: 'This image shows a prominent logo — replace it for clean generations',
    removeAnchor: 'Remove anchor',
    add: 'Add',
    loadingAnchors: 'Loading anchors...',
    emptyHint:
      'No anchors set. Image generation still works without them, but brand consistency requires a curated set of anchors.',
    anchorAlt: 'Anchor',
    pickerTitle: 'Pick a media asset as anchor',
    loadingLibrary: 'Loading library...',
    pickerEmpty: 'No image assets found in the Media Library. Upload some reference images first.',
    assetAlt: 'Asset',
    errors: {
      fetchFailed: 'Fetch failed',
      saveFailed: 'Save failed',
      saveFailedStatus: 'Save failed ({{status}})',
      auditFailed: 'Audit failed',
      auditFailedStatus: 'Audit failed ({{status}})',
      maxAnchors: 'Maximum 10 anchors. Remove one first.',
    },
  },
  heroLogo: {
    title: 'Brand logo on hero image',
    description:
      'Stamps your real logo in the top-right corner of the generated hero image (light/dark variant based on the background). Otherwise AI models invent distorted fake logos; leave this off if you prefer no logo on the photo at all.',
    requiresLogo:
      'Requires at least one uploaded logo in your brand style. No logo? Then this step is skipped automatically.',
    loadError: 'Failed to load',
    saveError: 'Failed to save',
    saveErrorStatus: 'Failed to save ({{status}})',
  },
} as const;

export default ns;

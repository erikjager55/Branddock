// Canonical (source-of-truth) English UI strings — `brand-assets` namespace.
// Brand-asset cards + detail panel rendered on the Brand Foundation grid.
const ns = {
  // Render-edge: AssetStatusBadge STATUS_CONFIG, keyed on the AssetStatus enum.
  status: {
    READY: 'Validated',
    IN_PROGRESS: 'In Progress',
    NEEDS_ATTENTION: 'Needs Attention',
    DRAFT: 'Draft',
  },
  // Render-edge: CategoryBadge CATEGORY_CONFIG, keyed on the AssetCategory enum.
  category: {
    PURPOSE: 'Purpose',
    CORE: 'Core',
    PERSONALITY: 'Personality',
    COMMUNICATION: 'Communication',
    STRATEGY: 'Strategy',
    NARRATIVE: 'Narrative',
    FOUNDATION: 'Foundation',
    CULTURE: 'Culture',
    ESG: 'ESG',
  },
  // Render-edge: ValidationBreakdown METHODS, keyed on the method key.
  validation: {
    heading: 'Research Methods',
    completed: 'Completed',
    notStarted: 'Not started',
    methods: {
      ai: 'AI Exploration',
      workshop: 'Workshop',
      interview: 'Interviews',
      questionnaire: 'Questionnaire',
    },
    methodsShort: {
      ai: 'AI',
      workshop: 'Workshop',
      interview: 'Interview',
      questionnaire: 'Survey',
    },
  },
  card: {
    noDescription: 'No description yet',
    complete: '{{percent}}% complete',
    validationMethods: 'Validation Methods ({{completed}}/{{total}})',
    validated: 'VALIDATED',
    viewResults: 'View Results',
    available: 'AVAILABLE',
    lastUpdated: 'Last updated: {{date}}',
    // Render-edge: BrandAssetCard VALIDATION_METHODS, keyed on the method key.
    methods: {
      ai: {
        label: 'AI Exploration',
        description: 'AI-assisted analysis and ideation for brand strategy',
        priceLabel: 'FREE',
      },
    },
  },
  detail: {
    lock: 'Lock',
    unlock: 'Unlock',
    close: 'Close',
    editAsset: 'Edit Asset',
    locked: 'Locked',
    subtitle: '{{slug}} — Last updated {{date}}',
    sectionDescription: 'Description',
    sectionDetails: 'Details',
    artifacts: 'Artifacts',
    aiExplored: 'AI Explored',
    yes: 'Yes',
    no: 'No',
    updated: 'Updated {{date}}',
    slug: 'Slug: {{slug}}',
  },
} as const;

export default ns;

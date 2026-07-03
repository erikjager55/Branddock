// Canonical (source-of-truth) English UI strings — `campaigns-pipeline` namespace.
// Render-edge catalog for the pipeline-config registry
// (src/features/campaigns/lib/pipeline-config.ts). Keyed on each preset/option's
// stable `value`. Descriptions use a sibling `<value>Desc` key. The registry file
// itself stays unchanged; these strings mirror its English source.
const campaignsPipeline = {
  presetLabels: {
    quick: 'Quick',
    standard: 'Standard',
    'award-grade': 'Award Grade',
  },
  strategyDepth: {
    basic: 'Basic',
    basicDesc: 'Briefing validation only',
    grounded: 'Grounded',
    groundedDesc: 'Briefing + strategy foundation',
    'research-backed': 'Research-backed',
    'research-backedDesc': 'Foundation + external enrichment',
  },
  creativeRange: {
    single: 'Single',
    singleDesc: '1 concept, fastest path',
    'multi-variant': 'Multi-variant',
    'multi-variantDesc': '3 concepts in parallel',
    critiqued: 'Critiqued',
    critiquedDesc: '3 concepts + AI debate rounds',
  },
  modelRigor: {
    fast: 'Fast',
    fastDesc: 'Flash-tier models, no thinking',
    balanced: 'Balanced',
    balancedDesc: 'Pro-tier models, moderate thinking',
    deliberate: 'Deliberate',
    deliberateDesc: 'Top models, deep thinking',
  },
} as const;

export default campaignsPipeline;

// Nederlandse UI-strings — `campaigns-pipeline` namespace. Zelfde key-vorm als
// en/campaigns-pipeline.ts. Gekoppeld aan de stabiele `value` van elke preset/optie
// uit src/features/campaigns/lib/pipeline-config.ts.
const campaignsPipeline = {
  presetLabels: {
    quick: 'Snel',
    standard: 'Standaard',
    'award-grade': 'Award-niveau',
  },
  strategyDepth: {
    basic: 'Basis',
    basicDesc: 'Alleen briefing-validatie',
    grounded: 'Onderbouwd',
    groundedDesc: 'Briefing + strategiefundament',
    'research-backed': 'Research-gedreven',
    'research-backedDesc': 'Fundament + externe verrijking',
  },
  creativeRange: {
    single: 'Enkel',
    singleDesc: '1 concept, snelste route',
    'multi-variant': 'Multi-variant',
    'multi-variantDesc': '3 concepten parallel',
    critiqued: 'Bekritiseerd',
    critiquedDesc: '3 concepten + AI-debatrondes',
  },
  modelRigor: {
    fast: 'Snel',
    fastDesc: 'Flash-modellen, geen nadenken',
    balanced: 'Gebalanceerd',
    balancedDesc: 'Pro-modellen, gematigd nadenken',
    deliberate: 'Grondig',
    deliberateDesc: 'Topmodellen, diep nadenken',
  },
} as const;

export default campaignsPipeline;

// Dutch UI strings — `brand-assets` namespace.
// Brand-asset cards + detail panel rendered on the Brand Foundation grid.
const ns = {
  // Render-edge: AssetStatusBadge STATUS_CONFIG, keyed on the AssetStatus enum.
  status: {
    READY: 'Gevalideerd',
    IN_PROGRESS: 'Bezig',
    NEEDS_ATTENTION: 'Aandacht nodig',
    DRAFT: 'Concept',
  },
  // Render-edge: CategoryBadge CATEGORY_CONFIG, keyed on the AssetCategory enum.
  category: {
    PURPOSE: 'Doel',
    CORE: 'Kern',
    PERSONALITY: 'Persoonlijkheid',
    COMMUNICATION: 'Communicatie',
    STRATEGY: 'Strategie',
    NARRATIVE: 'Verhaal',
    FOUNDATION: 'Fundament',
    CULTURE: 'Cultuur',
    ESG: 'ESG',
  },
  // Render-edge: ValidationBreakdown METHODS, keyed on the method key.
  validation: {
    heading: 'Onderzoeksmethoden',
    completed: 'Voltooid',
    notStarted: 'Niet gestart',
    methods: {
      ai: 'AI-verkenning',
      workshop: 'Workshop',
      interview: 'Interviews',
      questionnaire: 'Vragenlijst',
    },
    methodsShort: {
      ai: 'AI',
      workshop: 'Workshop',
      interview: 'Interview',
      questionnaire: 'Enquête',
    },
  },
  card: {
    noDescription: 'Nog geen omschrijving',
    complete: '{{percent}}% compleet',
    validationMethods: 'Validatiemethoden ({{completed}}/{{total}})',
    validated: 'GEVALIDEERD',
    viewResults: 'Resultaten bekijken',
    available: 'BESCHIKBAAR',
    lastUpdated: 'Laatst bijgewerkt: {{date}}',
    // Render-edge: BrandAssetCard VALIDATION_METHODS, keyed on the method key.
    methods: {
      ai: {
        label: 'AI-verkenning',
        description: 'AI-ondersteunde analyse en ideevorming voor merkstrategie',
        priceLabel: 'GRATIS',
      },
    },
  },
  detail: {
    lock: 'Vergrendelen',
    unlock: 'Ontgrendelen',
    close: 'Sluiten',
    editAsset: 'Asset bewerken',
    locked: 'Vergrendeld',
    subtitle: '{{slug}} — Laatst bijgewerkt {{date}}',
    sectionDescription: 'Omschrijving',
    sectionDetails: 'Details',
    artifacts: 'Artefacten',
    aiExplored: 'AI verkend',
    yes: 'Ja',
    no: 'Nee',
    updated: 'Bijgewerkt {{date}}',
    slug: 'Slug: {{slug}}',
  },
} as const;

export default ns;

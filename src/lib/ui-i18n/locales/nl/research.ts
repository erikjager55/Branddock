// Dutch UI strings — `research` namespace. Same key shape as en/research.ts.
const research = {
  hub: {
    title: 'Onderzoekshub',
    subtitle: 'Ontwerp en voer merkonderzoeken uit',
  },
  custom: {
    title: 'Aangepaste validatie',
    subtitle: 'Stel je eigen validatiecriteria samen',
    newPlan: 'Nieuw plan',
    step1: 'Stap 1: Kies assets om te valideren',
    step2: 'Stap 2: Kies validatiemethoden',
  },
  bundles: {
    title: 'Onderzoeksbundels',
    subtitle: 'Kant-en-klare onderzoekspakketten',
  },
  stats: {
    activeStudies: 'Actieve studies',
    completed: 'Afgerond',
    pendingReview: 'Wacht op review',
    totalInsights: 'Totale inzichten',
  },
  viewTabs: {
    overview: 'Overzicht',
    category: 'Per categorie',
    timeline: 'Tijdlijn',
  },
  splitButton: {
    newPlan: 'Nieuw onderzoeksplan',
    customPlan: 'Aangepast onderzoeksplan',
    browseBundles: 'Bekijk onderzoeksbundels',
  },
  methodStatus: {
    methods: {
      AI_EXPLORATION: 'AI-verkenning',
      WORKSHOP: 'Workshop',
      INTERVIEWS: '1-op-1 interviews',
      QUESTIONNAIRE: 'Vragenlijst',
    },
    active: 'Actief',
    done: 'Klaar',
    unlocked: 'Ontgrendeld',
  },
  activeResearch: {
    heading: 'Actief onderzoek',
    resume: 'Hervatten',
    empty: {
      title: 'Geen actief onderzoek',
      description: 'Start een onderzoeksplan om je merkstrategie te valideren.',
    },
  },
  quickInsights: {
    heading: 'Snelle inzichten',
    empty: {
      title: 'Nog geen inzichten',
      description: 'Inzichten verschijnen zodra je onderzoeken afrondt.',
    },
  },
  recommendedActions: {
    heading: 'Aanbevolen acties',
    empty: {
      title: 'Geen aanbevelingen',
      description: 'Rond onderzoek af om persoonlijke aanbevelingen te krijgen.',
    },
  },
  validationNeeded: {
    heading: 'Validatie nodig',
    validate: 'Valideren',
    readyBadge: 'Klaar voor validatie',
    validateError: 'Valideren mislukt',
    empty: {
      title: 'Geen openstaande validaties',
      description: 'Al je brand assets zijn up-to-date.',
    },
  },
  assetSelector: {
    recommended: 'Aanbevolen',
  },
  confidenceBadge: {
    label: 'Betrouwbaarheid: {{confidence}}',
  },
  methodCard: {
    free: 'GRATIS',
  },
  pricing: {
    free: 'Gratis',
    total: 'Totaal',
  },
  bundleBadge: {
    recommended: 'Aanbevolen',
    popular: 'Populair',
    save: 'Bespaar',
    savePercent: 'Bespaar {{discount}}%',
  },
  bundleCard: {
    methods_one: '{{count}} methode',
    methods_other: '{{count}} methoden',
    learnMore: 'Meer info',
    selectBundle: 'Kies bundel',
  },
  bundleDetail: {
    back: 'Terug naar bundels',
    noBundle: 'Geen bundel geselecteerd.',
    save: 'Bespaar ${{amount}}',
    includedAssets: 'Inbegrepen assets',
    researchMethods: 'Onderzoeksmethoden',
    selectBundle: 'Kies deze bundel',
    learnMore: 'Meer info',
  },
  bundleFilter: {
    all: 'Alle bundels',
    recommended: 'Aanbevolen',
    searchPlaceholder: 'Zoek bundels...',
  },
  bundleStats: {
    timeline: 'Tijdlijn',
    assets: 'Assets',
    methods: 'Methoden',
    savings: 'Besparing',
    flexible: 'Flexibel',
    included: '{{count}} inbegrepen',
    methodsCount_one: '{{count}} methode',
    methodsCount_other: '{{count}} methoden',
  },
  foundationPlans: {
    title: 'Basisplannen',
    subtitle: 'Essentiële onderzoekspakketten om je merkfundament te bouwen',
  },
  specializedPlans: {
    title: 'Gespecialiseerde plannen',
    subtitle: 'Geavanceerd onderzoek voor specifieke merkuitdagingen',
  },
  sidebar: {
    title: 'Jouw validatieplan',
    assets: 'Assets',
    noAssets: 'Geen assets geselecteerd',
    methods: 'Methoden',
    noMethods: 'Geen methoden geselecteerd',
    purchase: 'Plan kopen →',
    startFree: 'Start validatie →',
    note: 'Gratis methoden starten direct. Betaalde methoden vereisen betaling.',
    guarantee: '100% tevredenheidsgarantie',
  },
  valueProps: {
    '0': 'Onderzoek door experts',
    '1': 'Data-gedreven inzichten',
    '2': 'Bruikbare resultaten',
  },
} as const;

export default research;

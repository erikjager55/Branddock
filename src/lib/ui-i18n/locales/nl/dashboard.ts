// Dutch UI strings — `dashboard` namespace.
const dashboard = {
  page: {
    title: 'Dashboard',
    subtitle: 'Je merk in één oogopslag',
  },
  greeting: {
    morning: 'Goedemorgen',
    afternoon: 'Goedemiddag',
    evening: 'Goedenavond',
  },
  common: {
    retry: 'Opnieuw',
  },
  stats: {
    loadError: 'Statistieken laden mislukt',
    brandAssets: 'Merkassets',
    personas: "Persona's",
    products: 'Producten',
    activeCampaigns: 'Actieve campagnes',
    activatedTrends: 'Geactiveerde trends',
    competitors: 'Concurrenten',
  },
  attention: {
    title: 'Wat je aandacht nodig heeft',
    loadError: 'Aandachtspunten laden mislukt',
  },
  readiness: {
    title: 'Beslisgereedheid',
    loadError: 'Gereedheid laden mislukt',
    ready: '{{value}} gereed',
    needAttention: '{{value}} aandacht nodig',
    inProgress: '{{value}} in uitvoering',
    modules: {
      brandAssets: 'Merkassets',
      personas: "Persona's",
      products: 'Producten',
      campaigns: 'Campagnes',
      trends: 'Trends',
    },
  },
  nextActions: {
    title: 'Aanbevolen vervolgstappen',
    loadError: 'Aanbevelingen laden mislukt',
  },
  campaigns: {
    title: 'Actieve campagnes',
    loadError: 'Campagnes laden mislukt',
    viewAll: 'Bekijk alles',
    empty: 'Nog geen actieve campagnes',
    startNew: 'Nieuwe campagne starten',
  },
  recentActivity: {
    title: 'Recente activiteit',
    loadError: 'Activiteit laden mislukt',
  },
  quickStart: {
    title: 'Snel starten',
    progress: '{{completed}}/{{total}} voltooid',
    dismiss: 'Verbergen',
  },
  onboarding: {
    stepOf: 'Stap {{step}} van 3',
    close: 'Onboarding sluiten',
    goToStep: 'Ga naar stap {{step}}',
    dontShowAgain: 'Dit niet meer tonen',
    previous: 'Vorige',
    skipTour: 'Tour overslaan',
    getStarted: 'Aan de slag',
    next: 'Volgende',
    keyboardHint:
      'Tip: gebruik de pijltjestoetsen ← → om te navigeren, of druk op ESC om over te slaan',
    step1: {
      title: 'Welkom bij Branddock',
      subtitle:
        'Transformeer je merk van intuïtie-gedreven naar data-onderbouwde strategie in weken, niet maanden.',
      features: {
        foundation: 'Bouw je merkfundament met bewezen frameworks',
        validate: 'Valideer assets met professioneel onderzoek',
        generate: 'Genereer AI-gedreven strategieën in minuten',
      },
    },
    step2: {
      title: 'Hoe het werkt',
      subtitle: 'Een eenvoudig proces in 3 stappen, van merkassets naar gevalideerde strategieën.',
      process1: {
        title: 'Definieer je merk',
        description: 'Maak strategische assets zoals Golden Circle, Visie en Missie',
      },
      process2: {
        title: 'Onderzoek & valideer',
        description: 'Gebruik 4 methoden: workshops, enquêtes, interviews of AI-verkenning',
      },
      process3: {
        title: 'Genereer strategie',
        description: 'AI maakt campagnes, GTM-plannen en customer journeys op basis van je data',
      },
    },
    step3: {
      title: 'Aan de slag!',
      subtitle: 'Volg de Snel starten-checklist om alle mogelijkheden van het platform te ontgrendelen.',
      completeLabel: 'Je gaat dit doen:',
      checklist: {
        brandAsset: 'Maak je eerste merkasset (Golden Circle)',
        persona: 'Definieer je doelpersona',
        research: 'Plan je eerste onderzoekssessie',
        campaign: 'Genereer je eerste campagnestrategie',
      },
    },
    scan: {
      title: 'Heb je een website?',
      description: 'Scan hem en vul je merkprofiel automatisch in binnen enkele minuten.',
      cta: 'Scan starten',
    },
  },
} as const;

export default dashboard;

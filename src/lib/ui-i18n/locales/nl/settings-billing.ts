// Dutch UI strings — `settings-billing` namespace. Same key shape as en/.
const ns = {
  header: {
    title: 'Facturatie & abonnement',
    subtitle: 'Beheer je abonnement, verbruik en betaalgegevens',
  },
  common: {
    manage: 'Beheren',
    upgrade: 'Upgraden',
    current: 'Huidig',
    unlimited: 'Onbeperkt',
    loading: 'Laden...',
    perMonth: '/maand',
  },
  currentPlan: {
    freeBetaName: 'Gratis beta',
    freeBetaSubtitle: 'Alle functies ontgrendeld tijdens de beta',
    aiTokens: 'AI Tokens',
    tokenLimitReached: 'Tokenlimiet bereikt',
    approachingTokenLimit: 'Tokenlimiet bijna bereikt',
  },
  usage: {
    title: 'Verbruiksoverzicht',
    labels: {
      teamMembers: 'Teamleden',
      aiTokens: 'AI Tokens',
      personas: 'Personas',
      campaigns: 'Campagnes',
      brandAssets: 'Merkassets',
      products: 'Producten',
      knowledge: 'Kennis',
      storage: 'Opslag',
    },
  },
  comparison: {
    title: 'Abonnementen vergelijken',
    monthly: 'Maandelijks',
    yearly: 'Jaarlijks',
    feature: 'Functie',
    popular: 'Populair',
    perMonthShort: 'mnd',
    perYearShort: 'jr',
    free: 'Gratis',
    beta: 'Beta',
    support: 'Support',
    rows: {
      workspaces: 'Workspaces',
      teamMembers: 'Teamleden',
      aiTokens: 'AI Tokens / maand',
      personas: 'Personas',
      campaigns: 'Campagnes',
      brandAssets: 'Merkassets',
      products: 'Producten',
      marketInsights: 'Marktinzichten',
      knowledgeResources: 'Kennisbronnen',
    },
    export: {
      label: 'Export',
      all: 'Alle formaten',
    },
  },
  payment: {
    title: 'Betaalmethode',
    freeBetaNote: 'Geen betaalmethode nodig tijdens de beta',
    expires: 'Verloopt {{month}}/{{year}}',
    default: 'Standaard',
    none: 'Geen betaalmethode ingesteld',
    add: 'Betaalmethode toevoegen',
    more_one: '+{{count}} extra betaalmethode',
    more_other: '+{{count}} extra betaalmethodes',
  },
  invoices: {
    title: 'Facturatiegeschiedenis',
    empty: 'Nog geen facturen',
    columns: {
      invoice: 'Factuur',
      date: 'Datum',
      amount: 'Bedrag',
      status: 'Status',
    },
  },
} as const;

export default ns;

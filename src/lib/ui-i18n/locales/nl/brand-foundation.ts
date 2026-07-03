// Dutch UI strings — `brand-foundation` namespace.
const ns = {
  page: {
    title: 'Merkfundament',
    subtitle: 'Je belangrijkste merkassets en identiteit',
  },
  header: {
    title: 'Merkfundament',
    subtitle: 'Bouw je strategische fundament met premium merktools',
    assetCount_one: '{{count}} asset',
    assetCount_other: '{{count}} assets',
  },
  stats: {
    totalAssets: 'Totaal assets',
    readyToUse: 'Klaar voor gebruik',
    needAttention: 'Aandacht nodig',
  },
  filters: {
    searchPlaceholder: 'Zoek merkassets...',
    allCategories: 'Alle categorieën',
    allStatuses: 'Alle statussen',
    reset: 'Reset',
    category: {
      PURPOSE: 'Doel',
      COMMUNICATION: 'Communicatie',
      STRATEGY: 'Strategie',
      NARRATIVE: 'Narratief',
      CORE: 'Kern',
      PERSONALITY: 'Persoonlijkheid',
      FOUNDATION: 'Fundament',
      CULTURE: 'Cultuur',
      ESG: 'ESG',
    },
    status: {
      DRAFT: 'Concept',
      IN_PROGRESS: 'Bezig',
      NEEDS_ATTENTION: 'Aandacht nodig',
      READY: 'Klaar',
    },
  },
  grid: {
    errorTitle: 'Merkassets laden mislukt',
    errorFallback: 'Er is een onverwachte fout opgetreden. Probeer het later opnieuw.',
    emptyTitle: 'Geen assets gevonden',
    emptyFilteredDescription: 'Pas je filters aan om te vinden wat je zoekt.',
    emptyDescription: 'Je merkfundament is leeg. Voeg je eerste asset toe om te beginnen.',
    resetFilters: 'Filters resetten',
  },
  assets: {
    'purpose-statement': {
      name: 'Purpose-statement',
      description: 'De reden waarom je organisatie bestaat, los van winst',
    },
    'golden-circle': {
      name: 'Golden Circle',
      description: 'Simon Sineks WHY → HOW → WHAT-framework',
    },
    'brand-essence': {
      name: 'Merkessentie',
      description: 'Het hart en de ziel van je merk',
    },
    'brand-promise': {
      name: 'Merkbelofte',
      description: 'Kernbelofte aan je klanten',
    },
    'mission-statement': {
      name: 'Missie & Visie',
      description: 'Wat je vandaag doet en waar je naartoe gaat',
    },
    'brand-archetype': {
      name: 'Merkarchetype',
      description: 'Universele gedragspatronen',
    },
    'transformative-goals': {
      name: 'Transformatieve doelen',
      description: 'Ambitieuze doelen voor blijvende impact',
    },
    'brand-personality': {
      name: 'Merkpersoonlijkheid',
      description: 'Menselijke eigenschappen van je merk',
    },
    'brand-story': {
      name: 'Merkverhaal',
      description: 'Het verleden, heden en de toekomst van je merk',
    },
    'core-values': {
      name: 'Kernwaarden',
      description: 'Fundamentele overtuigingen die je merk sturen',
    },
    'social-relevancy': {
      name: 'Maatschappelijke relevantie',
      description: 'De maatschappelijke en ecologische impact van je merk',
    },
  },
  anchors: {
    title: 'Merkstijl-ankers',
    countRecommended: '{{n}} (3-10 aanbevolen)',
    countActive: '{{n}} actief',
    description:
      "3-10 referentiebeelden die laten zien hoe het merk visueel moet aanvoelen. Elke beeldgeneratie injecteert deze als stijlreferenties (Recraft / Nano Banana / FLUX 2) voor een consistente merklook over campagnes heen.",
    checkLogos: "Controleer ankers op logo's",
    noLogoClean: 'Geen logo-dominante ankers gevonden.',
    noLogoCleanWithVisible: 'Geen logo-dominante ankers gevonden ({{visible}} met een klein/subtiel logo).',
    logoBadge: 'logo',
    logoBadgeTitle: 'Dit beeld toont een prominent logo — vervang het voor schone generaties',
    removeAnchor: 'Anker verwijderen',
    add: 'Toevoegen',
    loadingAnchors: 'Ankers laden...',
    emptyHint:
      'Geen ankers ingesteld. Beeldgeneratie werkt ook zonder, maar merkconsistentie vereist een samengestelde set ankers.',
    anchorAlt: 'Anker',
    pickerTitle: 'Kies een media-asset als anker',
    loadingLibrary: 'Bibliotheek laden...',
    pickerEmpty: 'Geen beeld-assets gevonden in de Media Library. Upload eerst wat referentiebeelden.',
    assetAlt: 'Asset',
    errors: {
      fetchFailed: 'Ophalen mislukt',
      saveFailed: 'Opslaan mislukt',
      saveFailedStatus: 'Opslaan mislukt ({{status}})',
      auditFailed: 'Controle mislukt',
      auditFailedStatus: 'Controle mislukt ({{status}})',
      maxAnchors: 'Maximaal 10 ankers. Verwijder er eerst één.',
    },
  },
  heroLogo: {
    title: 'Merklogo op hero-afbeelding',
    description:
      "Stempelt je échte logo rechtsboven op de gegenereerde hero-afbeelding (licht/donker-variant op basis van de achtergrond). Anders verzinnen AI-modellen vervormde nep-logo's; laat dit uit als je liever helemaal geen logo op de foto hebt.",
    requiresLogo:
      'Vereist minstens één geüpload logo in je merkstijl. Geen logo? Dan wordt deze stap automatisch overgeslagen.',
    loadError: 'Laden mislukt',
    saveError: 'Opslaan mislukt',
    saveErrorStatus: 'Opslaan mislukt ({{status}})',
  },
} as const;

export default ns;

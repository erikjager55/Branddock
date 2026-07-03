// Nederlandse UI-strings — `website-scanner` namespace (informeel 'je').
const websiteScanner = {
  page: {
    back: 'Terug naar Dashboard',
    title: 'Website Scanner',
    subtitle: 'Scan je website om je merkprofiel automatisch te vullen',
  },
  applied: {
    title: 'Resultaten toegepast!',
    description:
      'Je merkprofiel is gevuld met de scanresultaten. Verken je merkfundament om te bekijken en te verfijnen.',
    goToBrand: 'Ga naar Merkfundament',
  },
  urlInput: {
    title: 'Voer je website-URL in',
    subtitle:
      'We scannen je website en halen automatisch merkinformatie, producten, doelgroepinzichten en meer op.',
    placeholder: 'www.jouw-bedrijf.nl',
    starting: 'Scan starten...',
    start: 'Start scan',
    extractHeading: 'Wat we ophalen',
    extract: {
      brandIdentity: 'Merkidentiteit',
      productsServices: 'Producten & diensten',
      targetAudience: 'Doelgroep',
      competitiveSignals: 'Concurrentiesignalen',
    },
    errorInvalidUrl: 'Voer een geldige website-URL in',
    errorStartFailed: 'Scan starten mislukt',
  },
  progress: {
    failed: 'Scan mislukt',
    cancelled: 'Scan geannuleerd',
    scanning: 'Scannen...',
    pagesCrawled: "{{crawled}}/{{discovered}} pagina's gecrawld",
    currently: 'Nu bezig met: {{page}}',
    areasAnalyzed: '{{done}}/{{total}} gebieden geanalyseerd',
    completedWithWarning: 'Voltooid met waarschuwing: {{error}}',
    errorsTitle: 'Scan liep tegen fouten aan',
    cancelledTitle: 'Scan is geannuleerd',
    cancel: 'Scan annuleren',
    tryAgain: 'Opnieuw proberen',
  },
  phases: {
    CRAWLING: {
      label: 'Website scannen',
      description: "Pagina's ontdekken en crawlen",
    },
    EXTRACTING: {
      label: 'Informatie extraheren',
      description: 'Pagina-inhoud analyseren met AI',
    },
    ANALYZING: {
      label: 'AI-analyse',
      description: 'Strategische analyse over 4 kennisgebieden',
    },
    MAPPING: {
      label: 'Koppelen aan je merk',
      description: 'Omzetten naar merkdatastructuren',
    },
    STYLING: {
      label: 'Merkstijl analyseren',
      description: 'Kleuren, typografie & tone of voice',
    },
  },
  results: {
    none: 'Geen resultaten beschikbaar',
    complete: 'Scan voltooid',
    summary:
      '{{items}} items gevonden in {{categories}} categorieën met {{confidence}}% gemiddelde zekerheid',
    applyAll: 'Alle resultaten toepassen',
    strategyHints: 'Strategiehints',
    trendSignals: 'Trendsignalen',
  },
  categories: {
    brandAssets: 'Merkfundament',
    personas: "Persona's",
    products: 'Producten & diensten',
    competitors: 'Concurrenten',
  },
  categoryDescription: {
    brandAssets_one: '{{count}} merk-assetveld gevuld',
    brandAssets_other: '{{count}} merk-assetvelden gevuld',
    personas_one: '{{count}} persona geïdentificeerd',
    personas_other: "{{count}} persona's geïdentificeerd",
    products_one: '{{count}} product gevonden',
    products_other: '{{count}} producten gevonden',
    competitors_one: '{{count}} concurrent gedetecteerd',
    competitors_other: '{{count}} concurrenten gedetecteerd',
  },
  card: {
    noData: 'Geen gegevens gevonden',
    confident: '{{confidence}}% zeker',
    itemFallback: 'Item {{number}}',
    confidence: {
      high: 'Hoog',
      medium: 'Gemiddeld',
      low: 'Laag',
    },
  },
  applyModal: {
    title: 'Scanresultaten toepassen',
    description:
      'Selecteer welke categorieën je wilt toepassen op je Workspace. Dit vult je merkprofiel met de gescande gegevens.',
    itemCount_one: '{{count}} item',
    itemCount_other: '{{count}} items',
    summarySuffix_one: 'item wordt toegepast op je Workspace',
    summarySuffix_other: 'items worden toegepast op je Workspace',
    applyError: 'Resultaten toepassen mislukt. Probeer het opnieuw.',
    cancel: 'Annuleren',
    applying: 'Toepassen...',
    apply: 'Resultaten toepassen',
  },
} as const;

export default websiteScanner;

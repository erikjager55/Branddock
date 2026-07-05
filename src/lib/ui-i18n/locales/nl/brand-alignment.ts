// Dutch UI strings — `brand-alignment` namespace. Same key shape as en/brand-alignment.ts.
const ns = {
  // Shared plural — reused across Content Review + Insights.
  findings_one: '{{count}} finding',
  findings_other: '{{count}} findings',

  page: {
    title: 'Merkconsistentie',
    subtitle: 'Zorg voor consistentie op alle merk-touchpoints',
    loading: 'Consistentiegegevens laden...',
    loadError: 'Kan consistentiegegevens niet laden',
    exportPdf: 'Exporteer PDF',
    exportJson: 'Exporteer JSON',
    scanning: 'Scannen...',
    runCheck: 'Consistentiecheck uitvoeren',
    noScanTitle: 'Nog geen consistentiescan',
    noScanDescription:
      'Voer je eerste scan uit om de consistentie over alle merkmodules te checken en afwijkingen te vinden.',
    startFirstScan: 'Eerste scan starten',
  },

  tabs: {
    alignment: 'Merkconsistentie',
    audit: 'Merkaudit',
    review: 'Contentreview',
    insights: 'Inzichten',
    brandclaw: 'Strategie-analist',
  },

  stats: {
    aligned: 'Consistent',
    needsReview: 'Te reviewen',
    misaligned: 'Inconsistent',
  },

  issues: {
    heading: 'Consistentie-issues',
    itemsNeedReview_one: '{{count}} item te reviewen',
    itemsNeedReview_other: '{{count}} items te reviewen',
    emptyFilteredTitle: 'Geen issues voldoen aan filters',
    emptyTitle: 'Geen issues gevonden',
    emptyFilteredDescription: 'Pas je filters aan om meer issues te zien.',
    emptyDescription: 'Je brand assets zijn volledig consistent!',
    resetFilters: 'Filters resetten',
  },

  scanModal: {
    title: 'Merkconsistentie analyseren',
    subtitle: 'Consistentie over alle modules checken',
    progress: 'Voortgang',
    footer: 'Analyseert 18 kennisitems over 6 modules. Dit kan tot 30 seconden duren.',
    cancel: 'Annuleren',
  },

  scanComplete: {
    title: 'Consistentiescan voltooid',
    scoreLine: 'Score: {{score}}% · {{count}} issues gevonden',
    viewResults: 'Resultaten bekijken',
  },

  scanProgress: {
    completeTitle: 'Scan voltooid',
    failedTitle: 'Scan mislukt',
    runningTitle: 'Consistentiescan draait',
    completeSubtitle: 'Je merkconsistentie-rapport is klaar.',
    failedSubtitle: 'Er ging iets mis. Probeer het opnieuw.',
    runningSubtitle: 'Consistentie over alle merkmodules checken...',
    progress: 'Voortgang',
  },

  scanSteps: {
    foundation: 'Merkfundament analyseren...',
    strategy: 'Bedrijfsstrategie-consistentie checken...',
    brandstyle: 'Brandstyle-consistentie verifiëren...',
    personas: 'Persona-data scannen...',
    products: 'Producten & diensten reviewen...',
    market: 'Marktinzichten kruisverwijzen...',
    report: 'Consistentierapport genereren...',
  },

  moduleGrid: {
    heading: 'Modulescores',
  },

  moduleCard: {
    alignment: 'consistentie',
    alignedCount: '{{count}} consistent',
    reviewCount: '{{count}} te reviewen',
    issuesCount: '{{count}} issues',
    lastChecked: 'Laatst gecheckt: {{time}}',
    view: 'Bekijken →',
  },

  auditView: {
    loading: 'Auditgegevens laden...',
    loadError: 'Kan auditgegevens niet laden',
    emptyTitle: 'Nog geen merkaudit',
    emptyDescription:
      'Voer je eerste merkaudit uit voor een uitgebreide analyse van je merkkracht met concrete verbeterpunten.',
    analyzing: 'Analyseren...',
    runAudit: 'Merkaudit uitvoeren',
    lastAudit: 'Laatste audit: {{date}}',
    rerunAudit: 'Audit opnieuw uitvoeren',
  },

  auditScore: {
    title: 'Merkkracht-score',
    strong: 'Je merkfundament is sterk. Focus op differentiatie en activatie.',
    good: 'Goede voortgang. Pak de zwakkere dimensies aan om je merk te versterken.',
    weak: 'Je merk heeft aandacht nodig. Begin met het compleet maken van je brand assets.',
  },

  auditTable: {
    title: 'Beoordeling per asset',
    subtitle: 'Gesorteerd op zwakste eerst — pak de bovenste items aan voor maximale impact.',
    complete: 'Compleet',
    quality: 'Kwaliteit',
  },

  auditImprovements: {
    title: 'Belangrijkste verbeteringen',
    subtitle: 'Geprioriteerde acties om je merk te versterken.',
    impact: {
      HIGH: 'Hoge impact',
      MEDIUM: 'Gemiddelde impact',
      LOW: 'Lage impact',
    },
    effort: {
      LOW: 'Quick win',
      MEDIUM: 'Gemiddelde inspanning',
      HIGH: 'Aanzienlijke inspanning',
    },
  },

  contentReview: {
    title: 'Contentreview',
    subtitle: 'Plak een tekst of URL voor F-VAL fidelity-scoring met findings.',
    newReview: 'Nieuwe review',
    pasteTab: 'Tekst plakken',
    urlTab: 'URL',
    pastePlaceholder: 'Plak hier je content (min {{min}} tekens)...',
    charsUnit: 'tekens',
    charMin: ' — minimaal {{min}}',
    charTooLong: ' — te lang',
    urlPlaceholder: 'https://example.com/blog-post',
    urlNote: "Alleen publieke URL — privé-IP's en niet-http(s)-schema's worden server-side geweigerd.",
    reviewing: 'Reviewen...',
    reviewContent: 'Content reviewen',
  },

  result: {
    noMatch: 'Geen findings voldoen aan de huidige filters.',
    fvalScore: 'F-VAL-score',
    thresholdMet: 'Drempel gehaald',
    belowThreshold: 'Onder drempel',
    runTook: ' · run duurde {{seconds}}s',
    scorerPrefix: ' · scorer ',
    severityLabel: 'Ernst:',
    categoryLabel: 'Categorie:',
    colSeverity: 'Ernst',
    colCategory: 'Categorie',
    colLocation: 'Locatie',
    colDescription: 'Omschrijving',
    suggestion: 'Suggestie:',
    before: 'Voor',
    after: 'Na',
    loadingFindings: 'Findings laden...',
    loadFindingsError: 'Kan findings niet laden: {{message}}',
    noFindingsTitle: 'Geen findings',
    noFindingsDescription: 'Content is zonder issues door de F-VAL-evaluatie gekomen.',
  },

  categoryLabels: {
    VOICE: 'Voice',
    TERMINOLOGY: 'Terminologie',
    CLAIMS: 'Claims',
    STYLE: 'Stijl',
    BUSINESS: 'Business',
    AI_TELL: 'AI-tell',
  },

  feedback: {
    loadError: 'Kan feedback-loop-metrics niet laden',
    autoIterateTitle: 'Auto-iterate (30 dagen)',
    autoIterateEmpty: 'Nog geen auto-iterate-runs. Zet FEATURE_AUTO_ITERATE=true om te starten.',
    totalRuns: 'Totaal runs',
    successRate: 'Slagingspercentage',
    avgIterations: 'Gem. iteraties',
    avgScoreDelta: 'Gem. score-delta',
    templatesTitle: 'Top hint-templates (effectiviteit)',
    templatesEmpty: 'Nog geen template-toepassingen. Verschijnt na de eerste auto-iterate-run.',
    scoreSuffix: 'score',
    editsTitle: 'Inline edits per componenttype ({{count}} totaal)',
    editsEmpty: 'Nog geen content.edited-events geregistreerd.',
    colComponentType: 'Componenttype',
    colEdits: 'Edits',
    colSignificant: 'Significant (>20%)',
    colAvgDistance: 'Gem. afstand',
  },

  fixModal: {
    title: 'Consistentie-issue oplossen',
    loadingOptions: 'Oplossingsopties laden...',
    dismiss: 'Negeren',
    editManually: 'Handmatig bewerken',
    applyFix: 'Oplossing toepassen',
    loadError: 'Kan oplossingsopties niet laden',
  },

  fixOption: {
    optionLabel: 'Optie {{key}}: {{title}}',
  },

  fixOptions: {
    aiSuggestedFix: 'AI-voorgestelde oplossing',
    chooseApproach: 'Kies een aanpak:',
  },

  issueCard: {
    viewSource: 'Bron bekijken',
    dismiss: 'Negeren',
    fix: 'Oplossen',
  },

  filters: {
    statusOpen: 'Open',
    statusDismissed: 'Genegeerd',
    statusFixed: 'Opgelost',
    severityCritical: 'Kritiek',
    severityWarning: 'Waarschuwing',
    severitySuggestion: 'Suggestie',
    allIssues: 'Alle issues',
    allModules: 'Alle modules',
    allSeverity: 'Alle ernst',
    reset: 'Resetten',
  },

  recommendation: {
    aiRecommendation: 'AI-aanbeveling',
  },

  issueSummary: {
    title: 'Issue-samenvatting',
  },

  insights: {
    loading: 'Inzichten laden...',
    wsUnavailableTitle: 'Workspace-context niet beschikbaar',
    wsUnavailableBody:
      'Inzichten worden per workspace berekend, maar er is geen actieve workspace gevonden. Log opnieuw in of schakel via de header naar een andere workspace.',
    loadErrorTitle: 'Kan inzichten niet laden',
    unknownError: 'Onbekende fout',
    emptyTitle: 'Geen reviews in de afgelopen 30 dagen',
    emptyBodyPre: 'Voer een review uit via het tabblad ',
    emptyBodyStrong: 'Content Review',
    emptyBodyPost:
      ', vraag de Brand Assistant om feedback of genereer content via Canvas — inzichten verschijnen hier zodra er data is.',
    title: 'Inzichten',
    subtitle:
      'Samengevat over de afgelopen 30 dagen — extern (paste/url) + intern (canvas) gecombineerd, per workspace.',
    partialTitle: 'Gedeeltelijke aggregatie',
    partialBody:
      ' — er zijn meer dan 5000 reviews in 30 dagen; de getoonde percentages worden berekend over de 5000 meest recente reviews. Oudere records tellen niet mee, dus zowel absolute aantallen als de 7d-trend kunnen voor minder recente dagen onderschat zijn.',
    reviews30d: 'Reviews 30d',
    reviewsBreakdown: '{{external}} extern · {{internal}} intern',
    thresholdPassRate: 'Drempel-slagingspercentage',
    reviewsLast7d_one: '{{count}} review in laatste 7d',
    reviewsLast7d_other: '{{count}} reviews in laatste 7d',
    findings30d: 'Findings 30d',
    perReviewAvg: '{{value}} per review gemiddeld',
    perReviewZero: '0 per review',
    belowThresholdPublished: 'Onder drempel gepubliceerd',
    belowThresholdScores_one: '{{count}} interne score onder drempel',
    belowThresholdScores_other: '{{count}} interne scores onder drempel',
    noBelowThreshold: 'Geen scores onder drempel',
    passRateTrend: 'Slagingspercentage-trend (7d)',
    trendStable: 'stabiel',
    reviewsCount_one: '{{count}} review',
    reviewsCount_other: '{{count}} reviews',
    inSevenDays: 'in 7 dagen',
    noReviews7d: 'Geen reviews in de afgelopen 7 dagen.',
    topCategories: 'Top finding-categorieën',
    noFindings: 'Geen findings.',
    recentReviews: 'Recente reviews',
    noReviews: 'Geen reviews.',
    feedbackLoop: 'Feedback-loop',
    sourceLabels: {
      paste: 'Plakken',
      url: 'URL',
      canvas: 'Canvas',
    },
  },

  brandclaw: {
    title: 'Strategie-analist',
    subtitle:
      'Brandclaw-observaties over consistentie / fidelity / review / voice drift. Alleen-lezen suggesties — geen autonomie. Jij bepaalt op welke je actie onderneemt.',
    lastRun: 'Laatste run',
    running: 'Bezig…',
    runAnalyst: 'Analist uitvoeren',
    runFailed: 'Analist-run mislukt: {{message}}',
    includeDismissed: 'Genegeerde meenemen',
    groupTooltip: 'Groeperen per dimensie',
    group: 'Groep',
    severityTooltip: 'Sorteren op ernst',
    severity: 'Ernst',
    total: '{{count}} totaal',
    emptyTitle: 'Nog geen observaties',
    emptyBody: 'Klik bovenaan op "Analist uitvoeren" om de eerste run te starten.',
    loadError: 'Kan observaties niet laden: {{message}}',
    unknownError: 'onbekende fout',
    severityOptions: {
      all: 'Alle ernst',
      HIGH: 'Alleen hoog',
      MEDIUM: 'Gemiddeld+',
      LOW: 'Laag+',
    },
    dimensionOptions: {
      all: 'Alle dimensies',
      voice_drift: 'Voice drift',
      fidelity_decline: 'Fidelity-daling',
      review_pattern: 'Reviewpatroon',
      alignment_gap: 'Consistentie-gat',
      publish_quality_trend: 'Publicatiekwaliteit-trend',
    },
  },

  evidence: {
    close: 'Sluiten',
    title: 'Bewijsspoor',
    summary: 'Samenvatting',
    agentVersion: 'Agent-versie',
    promptVersion: 'Prompt-versie',
    snapshotEvidence: 'DataSnapshot-bewijs ({{count}})',
    noSnapshot: 'Geen snapshot-bewijs gekoppeld.',
    phaseBNote:
      'Phase B-uitbreiding: klik op een snapshot-id om de gepersisteerde DataSnapshot.payload JSON in te zien (alignment-scan / fidelity-score / review-log content op snapshot-moment).',
    toolCallsReferenced: 'Tool-calls waarnaar verwezen ({{count}})',
  },

  observation: {
    severity: {
      HIGH: 'Hoog',
      MEDIUM: 'Gemiddeld',
      LOW: 'Laag',
    },
    confidence: {
      HIGH: 'Hoge zekerheid',
      MEDIUM: 'Gemiddelde zekerheid',
      LOW: 'Lage zekerheid',
    },
    dimension: {
      voice_drift: 'Voice drift',
      fidelity_decline: 'Fidelity-daling',
      review_pattern: 'Reviewpatroon',
      alignment_gap: 'Consistentie-gat',
      publish_quality_trend: 'Publicatiekwaliteit-trend',
    },
    undoTitle: 'Alle vlaggen ongedaan maken',
    undo: 'Ongedaan',
    evidencePoints_one: '{{count}} bewijspunt',
    evidencePoints_other: '{{count}} bewijspunten',
    read: 'Gelezen',
    acted: 'Actie ondernomen',
    dismissed: 'Genegeerd',
    markRead: 'Markeer gelezen',
    markActed: 'Markeer als actie',
    dismiss: 'Negeren',
    confirm: 'Bevestigen',
    reasonPlaceholder: 'Reden (optioneel)',
  },

  voiceBaseline: {
    title: 'Brand Voice-baseline',
    subtitle: '(zoals F-VAL + Strategie-analist de baseline lezen)',
    toneAttributes: 'Toon-attributen',
    axesDefined: '{{count}}/4 assen gedefinieerd',
    terms: 'Termen',
    preferredTop10: 'Voorkeur (top 10)',
    avoidTop10: 'Vermijden (top 10)',
    styleRules: 'Stijlregels',
    completeAntiPatterns: 'Maak BV-anti-patronen compleet',
    notYetDefined: 'Nog niet gedefinieerd',
    emptyTitle: 'Voice-baseline nog niet gedefinieerd',
    emptyBody:
      'De F-VAL-judge en Strategie-analist (binnenkort) hebben de Brand Voiceguide als baseline nodig. Maak de secties Voice DNA + Vocabulaire + Anti-patronen compleet om het framework hier te zien.',
  },
} as const;

export default ns;

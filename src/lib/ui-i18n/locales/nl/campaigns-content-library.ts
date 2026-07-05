// Dutch UI strings — `campaigns-content-library` namespace.
const ns = {
  common: {
    untitled: 'Naamloos',
    prev: 'Vorige',
    next: 'Volgende',
    showLess: 'Minder tonen',
    more: '+{{n}} meer',
    allContent: 'Alle content',
  },
  selectedCount: '{{n}} geselecteerd',

  chips: {
    label: 'Filters:',
    campaign: 'Campagne: {{name}}',
    qualityMin: 'Kwaliteit ≥ {{min}}',
    scheduledRange: 'Ingepland {{from}} → {{to}}',
    scheduledFrom: 'Ingepland vanaf {{from}}',
    scheduledUntil: 'Ingepland tot {{to}}',
    scheduled: 'Ingepland',
    remove: '{{label}} verwijderen',
    campaignType: {
      STRATEGIC: 'Strategisch',
      QUICK: 'Snel',
      CONTENT: 'Content',
    },
    readinessHint: {
      'no-content': 'Geen content',
      'not-reviewed': 'Niet beoordeeld',
      'pipeline-incomplete': 'Pijplijn onvolledig',
    },
    phase: {
      awareness: 'Awareness',
      consideration: 'Overweging',
      conversion: 'Conversie',
      retention: 'Retentie',
    },
  },

  filterBar: {
    content: 'Content',
    strategy: 'Strategie',
    searchPlaceholder: 'Zoek content...',
    timeline: 'Tijdlijn',
    sort: {
      newest: 'Nieuwste eerst',
      oldest: 'Oudste eerst',
      recentlyCreated: 'Recent aangemaakt',
      nameAsc: 'Naam A→Z',
      nameDesc: 'Naam Z→A',
      qualityHigh: 'Hoogste kwaliteit',
      qualityLow: 'Laagste kwaliteit',
      scheduledEarliest: 'Vroegst ingepland',
      scheduledLatest: 'Laatst ingepland',
    },
  },

  filters: {
    regionLabel: 'Contentfilters',
    clearAll: 'Alle filters wissen',
    contentType: {
      heading: 'Contenttype',
      all: 'Alle types',
    },
    status: {
      heading: 'Status',
      all: 'Alle',
      favorites: 'Favorieten',
      favoritesOnly: 'Alleen favorieten',
      options: {
        red: 'Niet gestart',
        amber: 'Bezig',
        green: 'Klaar',
      },
    },
    phase: {
      heading: 'Journey-fase',
      selectCampaign: 'Kies een campagne',
      all: 'Alle fases',
      disabledTitle: 'Filter op één campagne om de journey-fases te kiezen',
      options: {
        awareness: 'Awareness',
        consideration: 'Overweging',
        conversion: 'Conversie',
        retention: 'Retentie',
      },
    },
    readinessGap: {
      heading: 'Wat ontbreekt',
      any: 'Alle',
      options: {
        'no-content': 'Geen content gegenereerd',
        'not-reviewed': 'Niet beoordeeld',
        'pipeline-incomplete': 'Pijplijn onvolledig',
      },
    },
    campaign: {
      heading: 'Campagne',
      all: 'Alle campagnes',
      searchPlaceholder: 'Zoek campagnes...',
      none: 'Geen campagnes gevonden',
    },
    category: {
      selectAll: 'Selecteer alle types in {{label}}',
      deselectAll: 'Deselecteer alle types in {{label}}',
    },
  },

  stats: {
    totalContent: 'Totaal content',
    complete: 'Klaar',
    inProgress: 'Bezig',
    avgQuality: 'Gem. kwaliteit',
  },

  groupHeader: {
    strategic: 'Strategisch',
    quick: 'Snel',
    item_one: '{{count}} item',
    item_other: '{{count}} items',
  },

  groupToggle: {
    grouped: 'Gegroepeerd',
    group: 'Groeperen',
    ungroupTitle: 'Groepering opheffen',
    groupTitle: 'Groepeer per campagne',
  },

  favorites: {
    showAll: 'Alle content tonen',
    showFavorites: 'Alleen favorieten tonen',
  },

  card: {
    untitledPlaceholder: 'Naamloze {{type}}',
    toggleFavorite: 'Favoriet wisselen',
    duplicate: 'Dupliceren',
    delete: 'Verwijderen',
    openInCanvas: 'Openen in Canvas',
    canvas: 'Canvas',
  },

  list: {
    title: 'Titel',
    type: 'Type',
    campaign: 'Campagne',
    scheduled: 'Ingepland',
    readiness: 'Gereedheid',
    phase: 'Fase',
    actions: 'Acties',
  },

  bulk: {
    title: 'Meer content genereren',
    cancel: 'Annuleren',
    generateN: 'Genereer {{n}}',
    contentType: 'Contenttype',
    pickType: 'Kies een contenttype…',
    quantity: 'Aantal',
    maxHint: '(max {{max}})',
    basedOn: 'Gebaseerd op',
    optional: '(optioneel)',
    noSource: 'Geen bron (nieuwe briefing)',
    inheritSameType:
      'Briefing, mediumconfiguratie en type-specifieke input worden overgenomen.',
    inheritDiffType:
      'Briefing + persona worden overgenomen. Mediumconfiguratie wordt overgeslagen (ander type).',
    noCompleted:
      'Nog geen afgeronde deliverables in deze campagne — nieuwe items beginnen leeg.',
    optionalGuidance: 'Optionele sturing',
    guidancePlaceholder:
      'bijv. Focus op de lancering van onze nieuwe AI-functie. Richt je op mid-funnel gebruikers die de teasercampagne al hebben gezien.',
    somethingWrong: 'Er ging iets mis',
  },

  calendar: {
    prevMonth: 'Vorige maand',
    nextMonth: 'Volgende maand',
    today: 'Vandaag',
    noContentThisMonth: 'Geen content deze maand',
    overdue: '{{n}} te laat',
    scheduled: '{{n}} ingepland',
    published: '{{n}} gepubliceerd',
    unscheduled: '{{n}} niet ingepland',
    unscheduledHeading: 'Niet ingepland ({{n}})',
    dragHint: 'Sleep naar een datum of gebruik de datumkiezer',
    emptyTitle: 'Nog geen content',
    emptyDescription: 'Maak je eerste stuk om het in de kalender te zien.',
    helperNote:
      'Sleep een kaart naar een datum of beweeg over de kaart en klik op het datumicoon om een exacte dag te kiezen. Standaardtijd volgt de best practice per kanaal (LinkedIn 14:00, Instagram 11:00, anders 10:00). Een ingepland item behoudt zijn tijd bij verplaatsen.',
  },

  timeline: {
    title: 'Tijdlijn',
    groupByLabel: 'Groeperen op',
    groupByAria: 'Tijdlijn groeperen op',
    groupBy: {
      phase: 'Journey-fase',
      campaign: 'Campagne',
      channel: 'Contenttype',
      none: 'Geen groepering',
    },
    zoom: {
      day: 'Dag',
      week: 'Week',
      month: 'Maand',
    },
    zoomTitle: '{{label}}-zoom ({{key}})',
    jumpToday: 'Naar vandaag (T)',
    today: 'Vandaag',
    showEmptyTitle: 'Lege rijen tonen (H)',
    showEmpty: '{{n}} lege tonen',
    hideEmptyTitle: 'Rijen zonder ingeplande items verbergen (H)',
    hideEmpty: 'Lege verbergen',
    acceptAllTitle: 'Alle AI-voorgestelde datums vastleggen als ingepland',
    acceptSuggestions_one: '{{count}} suggestie accepteren',
    acceptSuggestions_other: '{{count}} suggesties accepteren',
    weeks: '{{n}} weken',
    committedTitle: 'Door gebruiker vastgelegde datums',
    committedScheduled: '{{n}} ingepland',
    suggestedTitle: 'AI-voorgestelde datums (nog niet geaccepteerd)',
    suggested: '{{n}} voorgesteld',
    unscheduled: '{{n}} niet ingepland',
    unscheduledHeading: 'Niet ingepland',
    filterPlaceholder: 'Filter niet-ingepland...',
    dragWeekHint: 'Sleep naar een week of gebruik de datumkiezer',
    noMatches: 'Geen resultaten voor "{{query}}".',
    beatTitle_one: '{{label}}\n{{count}} item',
    beatTitle_other: '{{label}}\n{{count}} items',
    suggestedCardTitle:
      'AI-voorgestelde datum — sleep om te verplaatsen of klik op Accepteren om vast te leggen',
    groupValue: {
      noPhase: 'Geen fase',
      noChannel: 'Geen kanaal',
      allContent: 'Alle content',
      untitledCampaign: 'Naamloze campagne',
      noScheduled: 'Nog geen ingeplande items',
    },
  },

  page: {
    title: 'Content',
    subtitle: 'Blader door en beheer al je gegenereerde content',
    viewCampaigns: 'Campagnes bekijken',
    createContent: 'Content maken',
    emptyTitle: 'Geen content gevonden',
    emptyDescription: 'Maak content met de wizard of pas je filters aan.',
    prompts: {
      linkedin: 'Schrijf een LinkedIn-post over onze nieuwste productlancering',
      socialPosts: 'Genereer 5 social posts voor deze campagne',
      blogPosts: 'Zet onze whitepaper om in 3 blogposts',
    },
  },

  campaignMode: {
    allContent: 'Alle content',
    notFound: 'Campagne niet gevonden.',
    strategic: 'Strategisch',
    quick: 'Snel',
    descriptionPlaceholder: 'Voeg een beschrijving toe...',
    save: 'Opslaan',
    cancel: 'Annuleren',
    personas: 'Personas',
    channels: 'Kanalen',
    addDeliverable: 'Deliverable toevoegen',
    generateDrafts: 'Concepten genereren ({{n}})',
    generatingDrafts: 'Concepten genereren...',
    draftComplete: 'Conceptgeneratie voltooid',
    generatedFailed: '{{generated}} gegenereerd, {{failed}} mislukt',
    journeyPhases: 'Journey-fases',
    touchpoints: 'Touchpoints',
    deliverables: 'Deliverables',
    campaignStrategy: 'Campagnestrategie',
    exportPdf: 'Exporteer PDF',
    exportJson: 'Exporteer JSON',
    generateBrief: 'Briefing genereren',
    strategyEmptyTitle: 'Strategie nog niet beschikbaar',
    strategyEmptyDescription:
      'Genereer een campagnestrategie om de strategische aanpak te zien.',
    campaignFallback: 'Campagne',
  },

  quickPublish: {
    trigger: 'Snel publiceren',
    approveNow: 'Nu goedkeuren',
    approveSchedule: 'Goedkeuren + inplannen…',
    sameAsLast: 'Zelfde als vorige inplannen',
    schedulePublish: 'Publicatie inplannen',
    back: 'Terug',
    approveScheduleShort: 'Goedkeuren + inplannen',
  },

  repeat: {
    repeatLast: 'Laatste herhalen',
    duplicateTitle: '{{type}} dupliceren met dezelfde instellingen',
    specificType: 'Herhaal een specifiek contenttype',
    repeatByType: 'Herhalen per type',
  },
} as const;

export default ns;

// Dutch UI strings — `campaigns-overview` namespace. Zelfde key-shape als en/.
const ns = {
  page: {
    title: 'Campagnes',
    subtitle: 'Plan, maak en beheer je campagnes',
  },
  actions: {
    createContent: 'Content maken',
    newCampaign: 'Nieuwe campagne',
  },
  filters: {
    all: 'Alles',
    strategic: 'Strategisch',
    quick: 'Snel',
    completed: 'Voltooid',
    searchPlaceholder: 'Zoek campagnes...',
  },
  empty: {
    title: 'Geen campagnes gevonden',
    description: 'Maak je eerste campagne of snelle content om te beginnen.',
  },
  list: {
    columns: {
      campaign: 'Campagne',
      type: 'Type',
      readiness: 'Gereedheid',
      progress: 'Voortgang',
      content: 'Content',
      scheduled: 'Gepland',
    },
  },
  menu: {
    edit: 'Bewerken',
    duplicate: 'Dupliceren',
    archive: 'Archiveren',
    unarchive: 'Uit archief halen',
    delete: 'Verwijderen',
  },
  stats: {
    activeCampaigns: 'Actieve campagnes',
    quickContent: 'Snelle content',
    completed: 'Voltooid',
    totalContent: 'Totale content',
  },
  status: {
    active: 'Actief',
    completed: 'Voltooid',
    archived: 'Gearchiveerd',
  },
  type: {
    strategic: 'Strategisch',
    quick: 'Snel',
  },
  calendar: {
    prevMonth: 'Vorige maand',
    nextMonth: 'Volgende maand',
    today: 'Vandaag',
    campaignsThisView_one: '{{count}} campagne in deze weergave',
    campaignsThisView_other: '{{count}} campagnes in deze weergave',
    showUndated: 'Zonder datum tonen ({{count}})',
    hideUndated: 'Zonder datum verbergen ({{count}})',
    barTooltip_one:
      '{{title}} — {{type}}, {{count}} dag (sleep om opnieuw in te plannen, sleep de randen om de duur aan te passen)',
    barTooltip_other:
      '{{title}} — {{type}}, {{count}} dagen (sleep om opnieuw in te plannen, sleep de randen om de duur aan te passen)',
    dragStartDate: 'Sleep om de startdatum te wijzigen',
    dragEndDate: 'Sleep om de einddatum te wijzigen',
    undatedHeading: 'Campagnes zonder datum',
    undatedHelpNone: 'Nog geen enkele campagne heeft een startdatum — open er een om in te plannen',
    undatedHelpSome: 'Deze campagnes hebben geen startdatum — open er een om in te plannen',
    undatedTooltip: '{{title}} — {{type}}, {{status}}',
    helperNote:
      'Klik op een balk om de campagne te openen. Sleep een balk om opnieuw in te plannen (behoudt de duur). Beweeg over de randen van de balk en sleep de gekleurde handvatten om de start- of einddatum aan te passen.',
  },
  draft: {
    heading: 'Concepten in bewerking',
    countOf: '{{count}} van {{limit}}',
    stepProgress: 'Stap {{step}} van {{total}} ({{label}}) · opgeslagen {{time}}',
    stepFallback: 'Stap {{step}}',
    archive: 'Archiveren',
    archiveTooltip: 'Naar archief verplaatsen — kan later hersteld worden',
    continue: 'Doorgaan',
  },
  steps: {
    setup: 'Setup',
    knowledge: 'Kennis',
    strategy: 'Strategie',
    concept: 'Concept',
    deliverables: 'Deliverables',
    review: 'Review',
    content: 'Content',
  },
  picker: {
    title: 'Doorgaan met een concept of nieuw beginnen?',
    titleAtLimit: 'Maximaal aantal concepten bereikt',
    subtitleAtLimit:
      'Je hebt {{limit}} concepten in bewerking (het maximum). Hervat of archiveer er een voordat je een nieuwe campagne start.',
    subtitle_one:
      'Je hebt {{count}} concept in bewerking. Hervat het of start een nieuwe campagne.',
    subtitle_other:
      'Je hebt {{count}} concepten in bewerking. Hervat er een of start een nieuwe campagne.',
    archivedNote: 'Gearchiveerde concepten kun je herstellen vanuit de weergave met gearchiveerde campagnes.',
    startNew: 'Nieuwe campagne starten',
  },
  quick: {
    badge: 'Snel',
    done: 'Klaar',
    quality: 'Kwaliteit',
    open: 'Openen →',
  },
  card: {
    assets_one: '{{count}} asset',
    assets_other: '{{count}} assets',
    deliverables_one: '{{count}} deliverable',
    deliverables_other: '{{count}} deliverables',
    updated: 'Bijgewerkt {{date}}',
    viewCampaign: 'Campagne bekijken →',
  },
} as const;

export default ns;

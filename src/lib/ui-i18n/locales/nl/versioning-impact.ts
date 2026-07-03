// Dutch UI strings — `versioning-impact` namespace.
const ns = {
  versioning: {
    pill: {
      versions_one: '{{count}} versie',
      versions_other: '{{count}} versies',
    },
    panel: {
      title: 'Versiegeschiedenis',
      empty: 'Nog geen versies',
      emptyHint: 'Versies worden aangemaakt als je opslaat, vergrendelt of AI-functies gebruikt.',
      current: 'Huidig',
      fieldsChanged_one: '{{count}} veld gewijzigd',
      fieldsChanged_other: '{{count}} velden gewijzigd',
      restorePrompt: 'Terugzetten naar deze versie?',
      restoring: 'Terugzetten...',
      confirm: 'Bevestigen',
      cancel: 'Annuleren',
      restore: 'Terugzetten',
    },
    changeType: {
      MANUAL_SAVE: 'Opgeslagen',
      AUTO_SAVE: 'Automatisch opgeslagen',
      LOCK_BASELINE: 'Vergrendeld',
      AI_GENERATED: 'AI-gegenereerd',
      RESTORE: 'Teruggezet',
      IMPORT: 'Geïmporteerd',
    },
  },
  impact: {
    notification: {
      title: 'Nieuwere strategische input beschikbaar',
      singleAsset:
        'Het asset <b>{{name}}</b> is bijgewerkt met nieuw onderzoek sinds deze campagne is ingesteld.',
      multipleAssets_one:
        '{{count}} asset is bijgewerkt met nieuw onderzoek sinds deze campagne is ingesteld.',
      multipleAssets_other:
        '{{count}} assets zijn bijgewerkt met nieuw onderzoek sinds deze campagne is ingesteld.',
      moreChanges_one: '+{{count}} extra wijziging',
      moreChanges_other: '+{{count}} extra wijzigingen',
      recalculate: 'Herbereken met nieuwe input',
      reviewLater: 'Later bekijken',
    },
    compact: {
      summary_one: '{{count}} asset heeft nieuwe strategische input',
      summary_other: '{{count}} assets hebben nieuwe strategische input',
      viewDetails: 'Details bekijken',
    },
    decision: {
      title: 'Recente wijzigingen',
      newBadge: '{{count}} nieuw',
      empty: 'Geen recente wijzigingen met impact op beslissingen',
    },
    summary: {
      heading: 'Wat betekent deze wijziging?',
      showMore_one: 'Nog {{count}} wijziging tonen',
      showMore_other: 'Nog {{count}} wijzigingen tonen',
      showLess: 'Toon minder',
    },
  },
} as const;

export default ns;

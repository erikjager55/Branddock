// Dutch UI strings — `workshop` namespace (mirrors en/workshop.ts key shape).
const workshop = {
  common: {
    backToAsset: 'Terug naar asset',
    notFound: 'Workshop niet gevonden.',
    previous: 'Vorige',
    next: 'Volgende',
    cancel: 'Annuleren',
    defaultTitle: 'Canvas Workshop',
    facilitator: 'Facilitator',
    na: 'n.v.t.',
    minutesShort: '{{minutes}} min',
  },
  purchase: {
    pageTitle: 'Canvas Workshop kopen',
    pageSubtitle: 'Kies een bundel of losse assets voor je workshop',
    selectAssets: 'Assets selecteren',
    toggle: {
      bundles: 'Bundels',
      individual: 'Individueel',
    },
    bundle: {
      save: 'Bespaar €{{amount}}',
    },
    package: {
      title: 'Canvas Workshop',
      subtitle:
        'Een begeleide merkstrategie-workshop die bewezen frameworks combineert met AI-analyse om de kernidentiteit van je merk bloot te leggen.',
      includedTitle: 'Wat is inbegrepen',
      included: {
        workshop: 'Begeleide merkstrategie-workshop in 6 stappen',
        summary: 'AI-gegenereerde managementsamenvatting & bevindingen',
        canvas: 'Golden Circle canvas-output',
        capture: 'Vastleggen van deelnemersreacties per stap',
        recommendations: 'Rapport met concrete aanbevelingen',
        documentation: "Documentatie met foto's & notities",
      },
      specs: {
        durationLabel: 'Duur',
        durationValue: '~90 minuten',
        participantsLabel: 'Deelnemers',
        participantsValue: 'Tot 12',
        formatLabel: 'Vorm',
        formatValue: 'Fysiek of online',
      },
    },
    options: {
      numberOfWorkshops: 'Aantal workshops',
      addFacilitator: 'Professionele facilitator toevoegen',
      facilitatorHelp:
        'Deskundige facilitator die je team door de workshop begeleidt (+€{{price}} per sessie)',
    },
    summary: {
      title: 'Besteloverzicht',
      total: 'Totaal',
      purchase: 'Workshop kopen',
      previewImpact: 'Dashboard-impact bekijken',
      paymentNotice:
        'Betalingsverwerking is nog niet actief. Dit maakt een workshop-record aan voor de planning.',
    },
    lineItem: {
      bundle: '{{name}} x{{workshops}}',
      workshopBase: 'Workshop basis x{{workshops}}',
      facilitator: 'Facilitator x{{workshops}}',
      assetsIncluded_one: '{{count}} asset inbegrepen',
      assetsIncluded_other: '{{count}} assets inbegrepen',
    },
    impact: {
      title: 'Voorbeeld dashboard-impact',
      calculating: 'Impact berekenen...',
      summary_one: 'Bij aankoop van deze workshop wordt {{count}} asset op je dashboard bijgewerkt.',
      summary_other:
        'Bij aankoop van deze workshop worden {{count}} assets op je dashboard bijgewerkt.',
      status: {
        available: 'Beschikbaar',
        inProgress: 'Bezig',
        completed: 'Voltooid',
        validated: 'Gevalideerd',
      },
    },
  },
  results: {
    banner: {
      subtitle: 'Workshop succesvol voltooid. Bekijk hieronder je resultaten.',
      completed: 'Voltooid',
      rawData: 'Ruwe data',
      date: 'Datum',
      participants: 'Deelnemers',
      duration: 'Duur',
      facilitator: 'Facilitator',
      selfGuided: 'Zelfstandig',
    },
    tabs: {
      overview: 'Overzicht',
      canvas: 'Canvas',
      workshop: 'Workshop',
      notes: 'Notities',
      gallery: 'Galerij',
    },
    overview: {
      generateTitle: 'AI-rapport genereren',
      generateDesc:
        'Analyseer de workshopreacties en genereer een managementsamenvatting met belangrijkste bevindingen en aanbevelingen.',
      generateButton: 'Rapport genereren',
    },
    aiReport: {
      notGenerated:
        'AI-rapport nog niet gegenereerd. Voltooi de workshop om inzichten te genereren.',
      title: 'Managementsamenvatting',
    },
    findings: {
      title: 'Belangrijkste bevindingen',
    },
    recommendations: {
      title: 'Aanbevelingen',
    },
    canvasTab: {
      title: 'Golden Circle-framework',
      locked: 'Vergrendeld',
      unlocked: 'Ontgrendeld',
      done: 'Klaar',
      edit: 'Bewerken',
    },
    canvas: {
      noData: 'Nog geen canvas-data beschikbaar.',
      sections: {
        why: 'WAAROM',
        how: 'HOE',
        what: 'WAT',
      },
    },
    details: {
      objectives: 'Doelen',
    },
    participants: {
      title: 'Deelnemers',
    },
    agenda: {
      title: 'Agenda',
    },
    notes: {
      title: 'Deelnemersnotities',
      add: 'Notitie toevoegen',
      namePlaceholder: 'Je naam',
      rolePlaceholder: 'Rol (optioneel)',
      contentPlaceholder: 'Schrijf je notitie...',
      save: 'Notitie opslaan',
    },
    gallery: {
      emptyTitle: "Nog geen foto's",
      emptyDesc: "Foto's van de workshopsessie verschijnen hier.",
    },
  },
  session: {
    header: {
      inProgress: 'Bezig',
    },
    toolbar: {
      videoGuide: 'Videogids',
      complete: 'Voltooien',
    },
    card: {
      scheduled: 'Gepland',
      purchased: 'Gekocht',
      assetCount_one: '{{count}} asset',
      assetCount_other: '{{count}} assets',
    },
    list: {
      title: 'Beschikbare workshops',
      emptyTitle: 'Geen workshops beschikbaar',
      emptyDesc: 'Koop eerst een workshop om een sessie te starten.',
    },
    step: {
      stepLabel: 'Stap {{number}}',
      videoPlaceholder: 'Placeholder videogids',
    },
    response: {
      placeholder: 'Leg hier de reactie van het team vast...',
      saveNext: 'Opslaan & volgende',
      save: 'Opslaan',
    },
    progress: {
      label: 'Totale voortgang',
    },
    tips: {
      title: 'Facilitator-tips',
      items: {
        diversity:
          'Moedig alle deelnemers aan hun perspectief te delen — diversiteit aan denken leidt tot sterkere uitkomsten.',
        summarize: "Vat na elke stap de belangrijkste thema's samen voordat je verdergaat.",
        validate: 'Gebruik "Wat ik je hoor zeggen is..." om bijdragen te bevestigen.',
        focusWhy:
          'Als de tijd dringt, focus dan op het vastleggen van de WAAROM — dat is de basis voor al het andere.',
        actionItems:
          'Sluit af met duidelijke, meetbare actiepunten waar je op kunt terugkomen.',
      },
    },
  },
} as const;

export default workshop;

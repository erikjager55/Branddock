// Dutch UI strings — `claw` namespace.
// Glossary-termen (Branddock, Brandclaw, Canvas, Persona, Workspace, AI,
// Anthropic, OpenAI, Gemini, Claude) blijven Engels/verbatim.
const claw = {
  assistantName: 'Merkassistent',

  cta: {
    defaultTitle: 'Vraag het de Merkassistent',
    defaultSubtitle: 'Beschrijf in gewone taal wat je wilt — Claw doet de rest.',
    quickTip: 'Snelle tip — je kunt het ook aan de Merkassistent vragen:',
  },

  tooltip: {
    ariaLabel: 'Tip van de Merkassistent',
    dismiss: 'Sluiten',
    title: 'Wist je dat?',
    body: 'Je kunt content maken via de Merkassistent. Probeer:',
    example: '"Schrijf een LinkedIn-post over [jouw onderwerp]"',
    tryPrompt: 'Schrijf een LinkedIn-post over onze nieuwste productlancering',
    tryItNow: 'Probeer het nu',
    notNow: 'Niet nu',
  },

  canvasHelp: {
    thisDeliverable: 'deze deliverable',
    header: 'Vraag iets over deze deliverable',
    close: 'Sluiten',
    footer: 'Of typ je eigen vraag in de assistent.',
    triggerAriaLabel: 'Vraag de Merkassistent iets over deze deliverable',
    triggerTitle: 'Vraag het de Merkassistent',
    formalLabel: 'Herschrijf in een formelere toon',
    formalPrompt:
      'Herschrijf de geselecteerde variant van {{subject}} in een formelere, professionele toon. Houd de kernboodschap intact.',
    shortenLabel: 'Maak het korter',
    shortenPrompt:
      'Kort de geselecteerde variant van {{subject}} met ongeveer 30% in. Behoud de hook en de call to action — schrap ondersteunende details.',
    directLabel: 'Maak het directer',
    directPrompt:
      'Herschrijf de geselecteerde variant van {{subject}} zodat die directer en krachtiger is. Begin met het voordeel, laat vulwoorden weg.',
  },

  overlay: {
    hideSidebar: 'Zijbalk verbergen',
    showSidebar: 'Zijbalk tonen',
    conversationHistory: 'Gespreksgeschiedenis',
    newConversationAria: 'Nieuw gesprek starten',
    newConversationTitle: 'Nieuw gesprek',
    exportConversation: 'Gesprek exporteren',
    expandFullScreen: 'Volledig scherm',
    collapseToPanel: 'Inklappen naar paneel',
    close: 'Sluiten',
    watching: 'Bekijkt:',
    agentBadge: 'Agent',
    history: 'Geschiedenis',
    closeHistory: 'Geschiedenis sluiten',
    exportYou: 'Jij',
  },

  chat: {
    thinking: 'Aan het nadenken',
    dataRetrieved: 'Gegevens succesvol opgehaald',
    error: 'Fout',
    entity: {
      brand_asset: 'merkasset',
      persona: 'persona',
      product: 'product',
      competitor: 'concurrent',
    },
    greeting: {
      wizardNeedHelpTitle: 'Hulp nodig met je {{name}}?',
      wizardNeedHelpSubtitle_one:
        'Ik zie {{count}} leeg veld. Ik kan het voor je invullen — jij bevestigt alleen.',
      wizardNeedHelpSubtitle_other:
        'Ik zie {{count}} lege velden. Ik kan ze voor je invullen — jij bevestigt alleen.',
      wizardWorkingTitle: 'Bezig met je {{name}}',
      wizardWorkingSubtitle:
        'Vraag me om een veld aan te scherpen, of ik bekijk wat je tot nu toe hebt.',
      entityTitle: 'Over {{name}}',
      entitySubtitle:
        'Ik houd deze {{kind}} in de gaten. Vraag me om lege velden in te vullen, te versterken wat er is, of het te vergelijken met de rest van je merk.',
      defaultSubtitle:
        'Je AI-merkstrateeg. Stel vragen, krijg advies, of laat me je merkdata bijwerken.',
    },
    defaultActions: {
      assessLabel: 'Beoordeel mijn merkfundament',
      assessPrompt:
        'Beoordeel mijn merkfundament — welke assets zijn goed ingevuld en waar is werk nodig?',
      compareLabel: "Vergelijk mijn persona's",
      comparePrompt:
        "Vergelijk mijn persona's op consistentie met mijn brand personality en archetype.",
      strategyLabel: 'Stel campagnestrategie voor',
      strategyPrompt:
        'Stel een campagnestrategie voor op basis van mijn huidige merk-data en trends.',
      attentionLabel: 'Wat heeft aandacht nodig?',
      attentionPrompt: 'Wat heeft het meest urgent aandacht nodig in mijn workspace?',
    },
  },

  bug: {
    title: 'Bug melden',
    pageLabel: 'Pagina / sectie',
    severityLabel: 'Ernst',
    descriptionLabel: 'Omschrijving',
    descriptionPlaceholder: 'Wat gebeurde er? Wat verwachtte je?',
    screenshotLabel: 'Screenshot (optioneel)',
    screenshotAlt: 'Voorbeeld van screenshot',
    uploadImage: 'Afbeelding uploaden',
    uploading: 'Uploaden...',
    urlPlaceholder: 'of plak een URL...',
    submit: 'Bugmelding versturen',
    submitting: 'Versturen...',
    cancel: 'Annuleren',
    descriptionRequired: 'Omschrijving is verplicht',
    submitFailed: 'Versturen mislukt. Probeer het opnieuw.',
    uploadFailed: 'Uploaden mislukt',
    submitted: 'Bugmelding verstuurd voor **{{page}}** ({{severity}}).',
    severities: {
      low: 'Laag',
      medium: 'Gemiddeld',
      high: 'Hoog',
      critical: 'Kritiek',
    },
  },

  feature: {
    title: 'Feature aanvragen',
    pageLabel: 'Pagina / sectie',
    titleLabel: 'Titel',
    titlePlaceholder: 'Een korte samenvatting van de feature',
    impactLabel: 'Impact',
    descriptionLabel: 'Omschrijving',
    descriptionPlaceholder: 'Wat zou je willen kunnen doen? Welk probleem lost het op?',
    referenceLabel: 'Referentielink (optioneel)',
    referencePlaceholder: 'Plak een URL naar een mockup of voorbeeld...',
    submit: 'Feature-aanvraag versturen',
    submitting: 'Versturen...',
    cancel: 'Annuleren',
    required: 'Titel en omschrijving zijn verplicht',
    submitFailed: 'Versturen mislukt. Probeer het opnieuw.',
    submitted:
      'Feature-aanvraag verstuurd: **{{title}}** ({{impact}}). Bedankt — we bekijken het.',
    impacts: {
      'nice-to-have': 'Nice to have',
      useful: 'Nuttig',
      important: 'Belangrijk',
      critical: 'Kritiek',
    },
  },

  feedback: {
    title: 'Feedback delen',
    close: 'Feedbackformulier sluiten',
    aboutResponse: 'Over dit antwoord',
    generalFeedback: 'Algemene feedback',
    noReply: 'Geen antwoord van de assistent om aan te koppelen — dit wordt als algemene feedback opgeslagen.',
    sentimentLabel: 'Hoe voelde dit antwoord?',
    tagsLabel: 'Wat voor soort probleem?',
    optional: '(optioneel)',
    commentLabel: 'Wat had dit beter gemaakt?',
    commentPlaceholder: 'Wees specifiek — wat werkte, wat niet, wat ontbrak...',
    submit: 'Feedback versturen',
    submitting: 'Versturen...',
    cancel: 'Annuleren',
    commentRequired: 'Deel even een korte opmerking.',
    submitFailed: 'Versturen mislukt.',
    requestFailed: 'Verzoek mislukt ({{status}})',
    logged: 'Bedankt — feedback opgeslagen ({{sentiment}}). Zo maken we Branddock beter.',
    sentiments: {
      positive: 'Positief',
      neutral: 'Neutraal',
      negative: 'Negatief',
    },
    tags: {
      inaccurate: 'Onjuist',
      'off-brand': 'Off-brand',
      'too-verbose': 'Te uitgebreid',
      'too-generic': 'Te generiek',
      unhelpful: 'Niet nuttig',
      other: 'Anders',
    },
  },

  input: {
    placeholder: 'Vraag van alles over je merk, persona’s, campagnes...',
    send: 'Versturen',
    sendAria: 'Bericht versturen',
    contextAction: 'Context',
    textAction: 'Tekst',
    fileAction: 'Bestand',
    urlAction: 'URL',
    removeAttachment: '{{label}} verwijderen',
    pasteTextPrompt: 'Plak tekst om als context toe te voegen:',
    pastedTextLabel: 'Geplakte tekst',
    enterUrlPrompt: 'Voer een URL in om te scrapen:',
    scrapingUrl: '{{url}} scrapen...',
    parsingFile: '{{name}} verwerken...',
    keyboardHint: 'Enter om te versturen · Shift + Enter voor een nieuwe regel',
    editContext: 'Bewerken',
    sourcesInContext_one: '{{count}} bron in context',
    sourcesInContext_other: '{{count}} bronnen in context',
    errors: {
      credits:
        '**Anthropic API-credits zijn op.** De Merkassistent kan niet reageren totdat er credits zijn bijgevuld. Ga naar [console.anthropic.com](https://console.anthropic.com/settings/billing) → Plans & Billing om credits toe te voegen. Andere AI-flows (OpenAI / Gemini) blijven werken — alleen Anthropic-calls falen totdat je bijvult.',
      rateLimit:
        '**Even pauze.** De Merkassistent kreeg te veel verzoeken in korte tijd. Wacht 30 seconden en probeer het opnieuw. Blijft dit gebeuren, verhoog dan de rate limit op het API-account.',
      auth:
        '**API-sleutel ongeldig.** Controleer `ANTHROPIC_API_KEY` in de omgevingsconfiguratie. De Merkassistent blijft onbeschikbaar totdat dit is opgelost.',
      generic:
        '**Fout in de Merkassistent**\n\n{{detail}}\n\nProbeer het opnieuw. Blijft de fout terugkomen, controleer dan de serverlogs.',
      unknown: 'onbekende fout',
    },
  },

  context: {
    title: 'Contextbronnen',
    subtitle: 'Kies welke merkdata de assistent mag gebruiken',
    done: 'Klaar',
    tokensSummary: '~{{tokens}} tokens ({{sources}} bronnen)',
    selectedCount: '({{n}} geselecteerd)',
    allIncluded: 'Geen selectie = alles inbegrepen',
    modules: {
      brand_assets: {
        label: 'Merkassets',
        description: 'Alle 12 merkfundament-assets met framework-data',
      },
      brandstyle: {
        label: 'Brandstyle',
        description: 'Kleuren, typografie, tone of voice, visuele taal',
      },
      personas: {
        label: "Persona's",
        description: 'Doelgroepprofielen met demografie en psychografie',
      },
      products: {
        label: 'Producten & diensten',
        description: 'Productcatalogus met kenmerken en prijzen',
      },
      competitors: {
        label: 'Concurrenten',
        description: 'Concurrentieanalyse met positionering en scores',
      },
      trends: {
        label: 'Trends',
        description: 'Gedetecteerde markttrends en relevantiescores',
      },
      strategies: {
        label: 'Businessstrategieën',
        description: 'OKR-strategieën met doelen en voortgang',
      },
      campaigns: {
        label: 'Campagnes',
        description: 'Actieve campagnes met strategie en deliverables',
      },
      alignment: {
        label: 'Brand Alignment',
        description: 'Consistentieproblemen tussen merkelementen',
      },
      knowledge: {
        label: 'Kennisbibliotheek',
        description: "Artikelen, case studies en bronnen",
      },
      dashboard: {
        label: 'Dashboard-statistieken',
        description: 'Workspace-gezondheidsmetrics en gereedheid',
      },
      observations: {
        label: 'Merkobservaties',
        description:
          'AI-gegenereerde merksignalen uit Brandclaw-analyse (drift, fidelity, alignment)',
      },
    },
  },

  sidebar: {
    newConversation: 'Nieuw gesprek',
    searchPlaceholder: 'Gesprekken zoeken…',
    clearSearch: 'Zoekopdracht wissen',
    rename: 'Hernoemen',
    renameTitle: 'Hernoemen (of dubbelklik)',
    delete: 'Verwijderen',
    saveRename: 'Naam opslaan',
    untitled: 'Naamloos',
    empty: 'Nog geen gesprekken',
    noMatches: 'Geen resultaten voor "{{query}}"',
    deleted: '"{{title}}" verwijderd',
    undo: 'Ongedaan maken',
    renameFailed: 'Gesprek hernoemen mislukt',
    groups: {
      today: 'Vandaag',
      yesterday: 'Gisteren',
      thisWeek: 'Deze week',
      older: 'Ouder',
    },
  },

  mutation: {
    proposedChange: 'Voorgestelde wijziging',
    moreChangesAfter_one: '+{{count}} wijziging hierna',
    moreChangesAfter_other: '+{{count}} wijzigingen hierna',
    updateFormFields:
      'Dit werkt de formuliervelden op deze pagina bij. Sla handmatig op om te bewaren.',
    updateData: 'Dit werkt de data bij en maakt een versie-snapshot.',
    skip: 'Overslaan',
    edit: 'Bewerken',
    editing: 'Bezig met bewerken',
    applyWithEdits: 'Toepassen met bewerkingen',
    applyChange: 'Wijziging toepassen',
    applying: 'Toepassen…',
    doneMessage: 'Klaar — {{description}}.',
    changeSkipped: 'Wijziging overgeslagen.',
  },

  toast: {
    filledWizardFields_one: '{{count}} wizard-veld ingevuld',
    filledWizardFields_other: '{{count}} wizard-velden ingevuld',
    filledFields_one: '{{count}} veld ingevuld',
    filledFields_other: '{{count}} velden ingevuld',
    couldNotFillFields_one: 'Kon {{count}} veld niet invullen: {{fields}}',
    couldNotFillFields_other: 'Kon {{count}} velden niet invullen: {{fields}}',
    openingCanvas: 'Canvas openen voor "{{name}}"',
    openingCampaign: 'Campagne "{{name}}" openen',
    created: '"{{name}}" aangemaakt',
    view: 'Bekijk →',
  },

  quick: {
    title: 'Snelle content',
    close: 'Sluiten',
    contentTypeLabel: 'Contenttype',
    pickType: 'Kies een type…',
    campaignLabel: 'Campagne',
    loadingCampaigns: 'Campagnes laden…',
    noCampaignsTitle: 'Nog geen campagnes in deze workspace.',
    noCampaignsBody:
      'Snelle content voegt een deliverable toe aan een bestaande campagne. Maak eerst een campagne om strategie, doelgroep en timing te bepalen.',
    openCampaigns: 'Campagnes openen',
    pickCampaign: 'Kies een campagne…',
    titleLabel: 'Titel',
    optional: '(optioneel)',
    titlePlaceholder: 'Standaard het label van het contenttype',
    briefingLabel: 'Briefing',
    briefingOptional: '(optioneel maar aanbevolen)',
    objectiveLabel: 'Doel',
    objectivePlaceholder: 'Wat deze content moet bereiken',
    keyMessageLabel: 'Kernboodschap',
    keyMessagePlaceholder: 'Het ene ding dat de doelgroep moet onthouden',
    toneLabel: 'Toonrichting',
    tonePlaceholder: 'bijv. gezaghebbend, speels, urgent',
    ctaLabel: 'Call to action',
    ctaPlaceholder: 'Wat moet de doelgroep hierna doen?',
    create: 'Aanmaken & Canvas openen',
    creating: 'Aanmaken…',
    cancel: 'Annuleren',
    pickContentType: 'Kies een contenttype',
    pickCampaignError: 'Kies een campagne',
    createFailed: 'Aanmaken mislukt',
    createDeliverableFailed: 'Deliverable aanmaken mislukt',
    created: '**{{title}}** aangemaakt — Canvas wordt nu geopend.',
    untitled: 'Naamloos',
  },

  slash: {
    ariaLabel: 'Slash-commando’s',
    commands: 'Commando’s',
    navigate: 'navigeren',
    select: 'selecteren',
    dismiss: 'sluiten',
  },

  review: {
    thresholdMet: 'Drempel gehaald',
    belowThreshold: 'Onder drempel',
    findingCount_one: '{{count}} bevinding',
    findingCount_other: '{{count}} bevindingen',
    topOf: 'Top {{shown}} van {{total}}',
    viewAll: 'Bekijk alle {{total}} bevindingen',
    couldNotReview: 'Kon content niet beoordelen',
    categories: {
      VOICE: 'Voice',
      TERMINOLOGY: 'Terminologie',
      CLAIMS: 'Claims',
      STYLE: 'Stijl',
      BUSINESS: 'Business',
      AI_TELL: 'AI-tell',
    },
  },
} as const;

export default claw;

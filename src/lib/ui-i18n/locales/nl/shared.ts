// Dutch UI strings — `shared` namespace.
// Covers the shared primitives in src/components/shared/.
const ns = {
  modal: {
    closeLabel: 'Sluiten',
  },
  comingSoon: {
    defaultTitle: 'Binnenkort beschikbaar',
    defaultDescription: 'Deze functie is momenteel in ontwikkeling.',
    plannedFeatures: 'Geplande functies',
    goBack: 'Terug',
    modules: {
      'business-strategy': {
        title: 'Business Strategy',
        description:
          'Bepaal je businessmodel, strategische doelen, concurrentiepositie en groeiplan om je merk af te stemmen op je langetermijndoelen.',
        features: {
          '0': 'Business model canvas',
          '1': 'Strategische doelen',
          '2': 'Concurrentiepositie',
          '3': 'Groeiplan',
        },
      },
      personas: {
        title: 'Personas',
        description:
          'Maak gedetailleerde Personas met AI-analyse, chat met je Personas en valideer ze via meerdere onderzoeksmethodes.',
        features: {
          '0': 'AI-gestuurde Persona-creatie',
          '1': 'Chat met je Personas',
          '2': 'AI-beeldgeneratie',
          '3': 'Impact-badges & strategische implicaties',
        },
      },
      products: {
        title: 'Producten & diensten',
        description:
          'Leg je producten en diensten vast met feature-matrices, prijsniveaus, concurrentiepositie en brand-alignmentscores.',
        features: {
          '0': 'Productcatalogusbeheer',
          '1': 'Feature-matrices',
          '2': 'Concurrentiepositie',
          '3': 'Brand-alignmentscores',
        },
      },
      trends: {
        title: 'Marktinzichten',
        description:
          'AI-marktanalyse met concurrentmonitoring, trendmonitoring en het signaleren van strategische kansen.',
        features: {
          '0': 'Concurrentmonitoring',
          '1': 'Trendmonitoring',
          '2': 'AI-marktanalyse',
          '3': 'Strategische kansen',
        },
      },
      knowledge: {
        title: 'Kennisbibliotheek',
        description:
          'Een doorzoekbare bibliotheek met al je merkkennis: documenten, onderzoeksresultaten, merkrichtlijnen en AI-inzichten.',
        features: {
          '0': 'Documentbeheer',
          '1': 'Slim importeren',
          '2': 'AI-zoeken',
          '3': 'Archief met onderzoeksresultaten',
        },
      },
      'brand-alignment': {
        title: 'Brand Alignment',
        description:
          'Automatische merkconsistentiecheck die afwijkingen in je brand assets opspoort en AI-suggesties geeft om ze op te lossen.',
        features: {
          '0': 'Consistentiescan over alle assets',
          '1': 'AI-fixsuggesties',
          '2': 'Alignmentscore volgen',
          '3': 'Prioritering van issues',
        },
      },
      research: {
        title: 'Research Hub',
        description:
          'Je onderzoekscentrum: plan studies, beheer deelnemers, analyseer resultaten en volg de validatievoortgang.',
      },
      'research-bundles': {
        title: 'Onderzoeksbundels',
        description:
          'Koop kant-en-klare onderzoeksbundels die meerdere validatiemethodes combineren voor complete merkinzichten.',
      },
      'custom-validation': {
        title: 'Eigen validaties',
        description:
          'Ontwerp eigen validatie-workflows op maat van je specifieke onderzoeksbehoeften en merkdoelen.',
      },
      'active-campaigns': {
        title: 'Actieve campagnes',
        description:
          'Maak, beheer en volg je marketingcampagnes met AI-contentgeneratie en performance-analytics.',
        features: {
          '0': 'Campagne-wizard',
          '1': 'AI-contentgeneratie',
          '2': 'Performance volgen',
          '3': 'Multi-channel publiceren',
        },
      },
      'content-library': {
        title: 'Contentbibliotheek',
        description:
          'Je centrale bibliotheek voor alle AI-gegenereerde en handmatig gemaakte content, geordend per campagne en type.',
      },
      settings: {
        title: 'Instellingen',
        description:
          'Beheer je accountinstellingen, teamleden, facturering, meldingen en weergavevoorkeuren.',
      },
      help: {
        title: 'Help & support',
        description:
          'Blader door helpartikelen, bekijk tutorials en neem contact op met ons supportteam.',
      },
    },
  },
  styleGuidelines: {
    title: 'Stijlrichtlijnen',
    description: 'Beschrijf wat de gegenereerde beelden wel en niet moeten bevatten.',
    dos: "Do's",
    donts: "Don'ts",
    dosPlaceholder:
      'bijv. Natuurlijk licht, warme tinten, oogcontact met camera, professionele kleding...',
    dontsPlaceholder:
      'bijv. Geen zonnebrillen, geen hoeden, geen drukke achtergronden, geen tekstoverlays...',
  },
  brandContextTags: {
    title: 'Brand-context-tags',
    description:
      'Kies de merkwoorden die je in de generatie-prompts wilt meenemen. Deselecteer tags die je output niet mogen beïnvloeden.',
    loading: 'Brand-context laden…',
    empty: 'Geen brand-context beschikbaar. Beelden worden met standaardprompts gegenereerd.',
    addPlaceholder: 'Woord toevoegen...',
    add: 'Toevoegen',
  },
  itemKnowledge: {
    title: 'Kennisbronnen',
    add: 'Toevoegen',
    cancel: 'Annuleren',
    emptyTitle: 'Geen kennisbronnen',
    emptyDescription: "Voeg documenten, URL's of tekst toe als extra context voor AI-sessies.",
    notProcessed: 'Niet verwerkt',
    deleteConfirm: 'Weet je zeker dat je "{{title}}" wilt verwijderen?',
    deleted: '"{{title}}" verwijderd',
    deleteFailed: 'Verwijderen mislukt',
    modalTitle: 'Kennisbron toevoegen',
    modalSubtitle: 'Voeg extra context toe voor AI-sessies',
    titleRequired: 'Titel is verplicht',
    contentRequired: 'Inhoud is verplicht',
    urlRequired: 'URL is verplicht',
    selectFile: 'Kies een bestand',
    added: 'Kennisbron toegevoegd',
    addFailed: 'Toevoegen mislukt',
    fieldTitle: 'Titel',
    fieldDescription: 'Beschrijving',
    fieldContent: 'Inhoud',
    fieldUrl: 'URL',
    fieldFile: 'Bestand',
    titlePlaceholder: 'bijv. Marktonderzoek Q1 2026',
    descriptionPlaceholder: 'Korte beschrijving (optioneel)',
    contentPlaceholder: 'Plak hier je tekst, notities of kennisbron...',
    clickToSelect: 'Klik om een bestand te kiezen',
    maxSize: 'Max. 50MB',
    sourceTypes: {
      file: 'Bestand',
      url: 'URL',
      text: 'Tekst',
    },
  },
  contextSelector: {
    title: 'Kenniscontext kiezen',
    itemsAvailable_one: '{{count}} item beschikbaar',
    itemsAvailable_other: '{{count}} items beschikbaar',
    selectedCount_one: '{{count}} item geselecteerd',
    selectedCount_other: '{{count}} items geselecteerd',
    cancel: 'Annuleren',
    apply: 'Selectie toepassen',
    applying: 'Toepassen...',
    all: 'Alles',
    addKnowledge: 'Kennis toevoegen (link of bestand)',
    link: 'Link',
    file: 'Bestand',
    titlePlaceholder: 'Titel',
    linkDescPlaceholder: 'Waar dit over gaat (optionele context voor de AI)',
    addToLibrary: 'Aan bibliotheek toevoegen',
    adding: 'Toevoegen…',
    chooseFile: 'Klik om een bestand te kiezen',
    uploading: 'Uploaden…',
    fileHint: 'Max. {{max}}MB · {{extensions}} · PDF en tekst worden in de AI-context gelezen',
    searchPlaceholder: 'Zoek kennisitems...',
    loadingContext: 'Beschikbare context laden...',
    noSearchMatch: 'Geen items komen overeen met je zoekopdracht',
    loadGroupFailed: '{{group}} kon niet worden geladen. Probeer het later opnieuw.',
    groupEmpty: 'Nog geen items in {{group}}.',
    addHintGroup: 'Gebruik Kennis toevoegen hierboven om een link of bestand toe te voegen.',
    someSourcesFailed: 'Sommige bronnen konden niet laden. We tonen wat beschikbaar is.',
    workspaceEmpty: 'Nog geen contextitems in deze Workspace.',
    addHintFirst: 'Gebruik Kennis toevoegen hierboven om je eerste item toe te voegen.',
    useAs: 'Gebruik als:',
    sourceMaterial: 'Bronmateriaal',
    reference: 'Referentie',
    guidancePlaceholder:
      'Aanwijzing voor de AI over deze bron — bijv. benadruk deze visie, speel dit contrast uit (optioneel)',
    titleUrlRequired: 'Titel en URL zijn verplicht',
    invalidUrl: 'Voer een geldige URL in (bijv. https://example.com)',
    addLinkFailed: 'De link kon niet worden toegevoegd',
    uploadFailed: 'Het bestand kon niet worden geüpload',
    fileTooLarge: 'Bestand te groot (max. {{max}}MB)',
  },
  workspaceSwitch: {
    title: 'Workspace gewijzigd in een ander tabblad',
    nowNamed: 'De actieve Workspace is nu “{{name}}”.',
    changedGeneric: 'De actieve Workspace of organisatie is gewijzigd.',
    warning:
      'Dit tabblad keek naar een andere Workspace en kan niet veilig doorgaan — wijzigingen zouden ongemerkt verloren gaan.',
    reload: 'Dit tabblad herladen',
  },
} as const;

export default ns;

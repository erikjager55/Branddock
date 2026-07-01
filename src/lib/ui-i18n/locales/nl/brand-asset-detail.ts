// Dutch UI strings — `brand-asset-detail` namespace.
const brandAssetDetail = {
  shared: {
    add: 'Toevoegen',
    addItem: 'Item toevoegen',
    notSet: 'Niet ingevuld',
    notYetFilledIn: 'Nog niet ingevuld',
    notYetDefined: 'Nog niet gedefinieerd',
    noItemsYet: 'Nog geen items',
    cancel: 'Annuleren',
  },
  page: {
    noAssetSelected: 'Geen asset geselecteerd',
    notFound: 'Asset niet gevonden',
    backToBrand: 'Terug naar Your Brand',
    saved: 'Brand asset opgeslagen',
  },
  header: {
    save: 'Opslaan',
    cancel: 'Annuleren',
    edit: 'Bewerken',
    whatIs: 'Wat is {{name}}?',
    fallbackDescription:
      '{{name}} is een {{category}} brand asset die een kernonderdeel van je merkidentiteit vastlegt.',
    categoryLabel: 'Categorie:',
    researchLabel: 'Onderzoek:',
    researchValue: 'AI Exploration beschikbaar voor strategische analyse',
    versionLabel: 'Versiebeheer:',
    versionValue: 'Volledige wijzigingshistorie met lock/unlock-bescherming',
    categories: {
      PURPOSE: 'Purpose',
      FOUNDATION: 'Fundament',
      STRATEGY: 'Strategie',
      COMMUNICATION: 'Communicatie',
      PERSONALITY: 'Persoonlijkheid',
      CORE: 'Kern',
      NARRATIVE: 'Narratief',
      CULTURE: 'Cultuur',
    },
  },
  quickActions: {
    title: 'Snelle acties',
    exportPdf: 'PDF exporteren',
  },
  completeness: {
    title: 'Volledigheid asset',
    sectionsFilled: '{{filled}}/{{total}} secties ingevuld',
  },
  research: {
    title: 'Onderzoek',
    free: 'GRATIS',
    aiExploration: {
      label: 'AI Exploration',
      description:
        'AI-ondersteunde analyse en ideevorming voor merkstrategie en positionering',
      start: 'Exploration starten',
      continue: 'Doorgaan',
      view: 'Rapport bekijken',
    },
  },
  aiExploration: {
    pageTitle: 'AI Brand Asset Exploration',
    pageDescription:
      'Beantwoord vragen om deze brand asset te valideren en te versterken',
    backLabel: 'Terug naar brand asset',
  },
  proofPointsGuidance: {
    essence:
      'Noem bewijs dat je merkidentiteit echt is (bijv. oprichtingsprincipes, historie, consistent gedrag). Voor klantgericht bewijs, zie Brand Promise.',
    promise:
      'Noem verifieerbaar bewijs dat je je belofte waarmaakt (bijv. garanties, certificeringen, cijfers). Voor identiteitsbewijs, zie Brand Essence.',
    story:
      'Noem mijlpalen en prestaties die je merkverhaal ondersteunen (bijv. awards, kantelmomenten, groeicijfers).',
    socialRelevancy:
      'Noem bewijs van je maatschappelijke/milieu-impact (bijv. certificeringen, impactrapporten, partnerschappen). Voor breder merkbewijs, zie Brand Promise.',
  },
  companionValues: {
    identityLabel:
      'Dit beschrijft wie je merk in de kern IS. Vergelijk met {{companion}} (wat je levert).',
    commitmentLabel:
      'Dit verwoordt wat je aan klanten levert. Vergelijk met {{companion}} (wie je bent).',
    notDefined: 'Nog niet gedefinieerd — vul eerst {{companion}} in.',
    fields: {
      functional: 'Functioneel',
      emotional: 'Emotioneel',
      selfExpressive: 'Zelfexpressief',
    },
  },
  swot: {
    strengths: 'Sterktes',
    weaknesses: 'Zwaktes',
    opportunities: 'Kansen',
    threats: 'Bedreigingen',
  },
  esg: {
    environmental: 'Milieu',
    social: 'Sociaal',
    governance: 'Bestuur',
    impact: '{{level}} impact',
  },
  purposeKompas: {
    impact: '{{level}} impact',
    people: {
      label: 'Mens',
      description: 'Gezonde leefstijl, zelfontwikkeling en persoonlijke groei',
    },
    environment: {
      label: 'Milieu',
      description: 'Duurzaamheid, CO₂-reductie en circulaire productie',
    },
    society: {
      label: 'Maatschappij',
      description: 'Ongelijkheid bestrijden, community en maatschappelijke impact',
    },
  },
  purposeStatement: {
    title: 'Purpose Statement',
    subtitle: 'De reden waarom je organisatie bestaat',
    editPlaceholder: "Beschrijf de '{{layer}}'...",
    layers: {
      why: {
        label: 'Waarom',
        description: 'Beschrijf waarom je organisatie bestaat. Dit gaat verder dan winst.',
      },
      how: {
        label: 'Hoe',
        description: 'Beschrijf hoe je dit op je eigen unieke manier doet.',
      },
      impact: {
        label: 'Impact',
        description:
          'Beschrijf de impact van je purpose op mens, milieu en maatschappij.',
      },
    },
  },
  purposeWheel: {
    startWithWhy: 'Start With Why',
    statement: {
      title: 'Purpose Statement',
      subtitle: 'De kernreden waarom je organisatie bestaat',
      placeholder: 'Definieer je purpose statement...',
    },
    impact: {
      title: 'Impacttype',
      subtitle:
        'Hoe je organisatie het verschil maakt in de wereld (IDEO Inner Wheel)',
      descLabel: 'Hoe ziet deze impact eruit voor je organisatie?',
      descPlaceholder:
        'Beschrijf hoe deze impact er in de praktijk uitziet voor je organisatie...',
    },
    impactTypes: {
      enablePotential:
        'Mensen en gemeenschappen helpen mogelijkheden aan te boren die ze niet wisten te hebben',
      reduceFriction:
        'Barrières wegnemen en dingen makkelijker, simpeler en toegankelijker maken',
      fosterProsperity:
        'Economische kansen en duurzame groei creëren voor alle stakeholders',
      encourageExploration:
        'Nieuwsgierigheid, ontdekking en nieuwe manieren van denken over de wereld inspireren',
      kindleHappiness:
        'Vreugde, verbinding en betekenisvolle momenten in het leven van mensen creëren',
    },
    mechanism: {
      title: 'Mechanisme',
      subtitle: 'Hoe je je purpose waarmaakt (IDEO Outer Wheel)',
      selectLabel: 'Kies je mechanisme-categorie',
      descLabel: 'Beschrijf hoe dit mechanisme werkt voor je organisatie',
      descPlaceholder:
        'Beschrijf met welke unieke middelen je je impact bereikt...',
    },
    pressureTest: {
      title: 'Pressure Test',
      subtitle: 'Je purpose toetsen aan de werkelijkheid',
      considerLabel: 'Denk na over deze vragen',
      placeholder: 'Beantwoord de pressure test-vragen hierboven...',
    },
    questions: {
      q1: 'Wat zou de wereld verliezen als je organisatie zou ophouden te bestaan?',
      q2: 'Wat zou deze purpose ontsluiten voor je medewerkers?',
      q3: 'Welke beslissingen zouden anders zijn als iedereen deze purpose echt zou leven?',
    },
  },
  goldenCircle: {
    startWithWhy: 'Start With Why',
    ariaLabel: 'Golden Circle: WHY (binnenste), HOW (midden), WHAT (buitenste ring)',
    rings: {
      what: {
        subtitle: 'Bewijs & aanbod',
        helper: 'Producten en diensten als tastbaar bewijs van je WHY',
      },
      how: {
        subtitle: 'Onderscheidende aanpak',
        helper: 'Principes en waarden die je WHY tot leven brengen',
      },
      why: {
        subtitle: 'Kernovertuiging',
        helper: 'Je purpose, overtuiging, drive — nooit over producten',
      },
    },
    coherence: {
      strong: 'Sterke samenhang',
      partial: 'Deels ingevuld',
      weak: 'Onvolledig',
      strongDetail: 'WHY, HOW en WHAT zijn volledig ingevuld en op elkaar afgestemd.',
      partialDetail:
        'Niet alle ringen zijn volledig ingevuld. Vul alle drie in voor een sterke Golden Circle.',
      weakDetail: 'De Golden Circle is nog grotendeels leeg. Begin met je WHY.',
    },
    panel: {
      statement: 'Statement',
      details: 'Details',
      statementPlaceholder: 'Voer je {{ring}}-statement in...',
      detailsPlaceholder: 'Werk je {{ring}} verder uit...',
      notFilled: 'Nog niet ingevuld',
    },
  },
  brandEssence: {
    companion: 'Brand Promise',
    examples: 'Voorbeelden',
    core: {
      title: 'Brand Essence',
      subtitle:
        'De ene meest bepalende gedachte over je merk — tijdloos, in 1-3 woorden',
      statementLabel: 'Essence statement (bijv.-bijv.-znw-formaat)',
      statementPlaceholder: 'bijv. Authentic Athletic Performance',
      narrativePlaceholder:
        'Leg in 2-3 zinnen uit wat deze essence betekent voor je merk...',
      empty: 'Definieer je brand essence...',
    },
    benefits: {
      title: 'Voordelen',
      subtitle: 'Wat je merk levert over drie dimensies',
      functional: {
        label: 'Functioneel voordeel',
        description: 'Welke tastbare kwaliteit is onlosmakelijk verbonden met je merkidentiteit?',
        placeholder: 'Beschrijf de tastbare waarde die je merk levert...',
      },
      emotional: {
        label: 'Emotioneel voordeel',
        description: 'Welk gevoel is intrinsiek onderdeel van wie je bent?',
        placeholder: 'Beschrijf het gevoel dat je merk oproept...',
      },
      selfExpressive: {
        label: 'Zelfexpressief voordeel',
        description: 'Wat stelt je merk mensen in staat over zichzelf uit te drukken?',
        placeholder:
          'Beschrijf hoe klanten hun identiteit uitdrukken via je merk...',
      },
    },
    discriminator: {
      title: 'Discriminator',
      subtitle: 'De ene meest overtuigende reden om voor jouw merk te kiezen',
      formula: '“Alleen [jouw merk] kan _____ omdat _____.”',
      placeholder: 'Alleen [merk] kan... omdat...',
      empty: 'Bepaal wat jouw merk de enige keuze maakt...',
    },
    audience: {
      title: 'Audience insight',
      subtitle: 'De diepe menselijke waarheid die je merk verbindt met je publiek',
      hint: 'Niet wie ze zijn, maar waarom ze het nodig hebben — de onderliggende spanning, wens of onvervulde behoefte.',
      placeholder:
        'Beschrijf de diepe menselijke waarheid die je merk verbindt met je publiek...',
      empty: 'Beschrijf de diepe menselijke waarheid...',
    },
    evidence: {
      title: 'Bewijs',
      subtitle: 'Concreet bewijs dat je brand essence echt is',
      proofPoints: 'Proof points',
      proofPlaceholder: 'Proof point toevoegen...',
      proofEmpty: 'Nog geen proof points gedefinieerd',
      attributes: 'Merkattributen',
      attrPlaceholder: 'Merkattribuut toevoegen...',
      attrEmpty: 'Nog geen attributen gedefinieerd',
    },
    validation: {
      title: 'Validatiescore',
      subtitle: 'Beoordeel je brand essence op 6 kerncriteria',
      criteria: {
        unique: {
          label: 'Uniek',
          description: 'Is het claimbaar en onderscheidend voor je merk?',
        },
        intangible: {
          label: 'Ontastbaar',
          description: 'Gaat het verder dan een productkenmerk of functionele claim?',
        },
        meaningful: {
          label: 'Betekenisvol',
          description: 'Resoneert het diep met je publiek?',
        },
        authentic: {
          label: 'Authentiek',
          description: 'Weerspiegelt het de echte werkelijkheid van je merk?',
        },
        enduring: {
          label: 'Duurzaam',
          description: 'Blijft het 10+ jaar relevant?',
        },
        scalable: {
          label: 'Schaalbaar',
          description: 'Werkt het over markten en categorieën heen?',
        },
      },
    },
  },
  brandPromise: {
    companion: 'Brand Essence',
    examples: 'Voorbeelden',
    statement: {
      title: 'Brand Promise',
      subtitle: 'De belofte die je merk elke klant elke keer doet',
      label: 'Promise statement',
      placeholder: 'De kernbelofte die je merk doet...',
      oneLinerLabel: 'One-liner',
      oneLinerPlaceholder: 'Vat samen tot één tagline...',
      empty: 'Definieer je brand promise...',
    },
    value: {
      title: 'Waarde-architectuur',
      subtitle: 'Drie lagen waarde die je belofte levert (Aaker-model)',
      functional: {
        label: 'Functionele waarde',
        description: 'Welke tastbare waarde garandeer je te leveren?',
        placeholder: 'Beschrijf het tastbare, meetbare voordeel...',
      },
      emotional: {
        label: 'Emotionele waarde',
        description: 'Welk gevoel beloof je te creëren voor klanten?',
        placeholder: 'Beschrijf het gevoel dat je belofte creëert...',
      },
      selfExpressive: {
        label: 'Zelfexpressieve waarde',
        description: 'Hoe help je klanten hun gewenste identiteit uit te drukken?',
        placeholder: 'Beschrijf hoe klanten hun identiteit uitdrukken...',
      },
    },
    audience: {
      title: 'Publiek & behoefte',
      subtitle: 'Wie je bedient en de diepe behoefte die je belofte adresseert',
      targetLabel: 'Doelgroep',
      targetDescription: 'Voor wie is deze belofte?',
      targetPlaceholder: 'Beschrijf je primaire doelgroep...',
      hint: 'Ga verder dan demografie — wat is de diepere, onvervulde behoefte die je belofte vervult?',
      needPlaceholder: 'De diepe onderliggende behoefte die je belofte adresseert...',
      needEmpty: 'Bepaal de kernbehoefte van de klant...',
    },
    differentiator: {
      title: 'Differentiator',
      subtitle: 'Wat je belofte uniek maakt — Neumeiers Onlyness-test',
      label: 'Differentiator',
      description: 'Wat onderscheidt je belofte van concurrenten?',
      placeholder: 'Beschrijf wat je belofte uniek maakt...',
      formula: '“Alleen [jouw merk] kan _____ omdat _____.”',
      onlynessPlaceholder: 'Alleen [merk] kan... omdat...',
      onlynessEmpty: 'Maak de Onlyness-statement af...',
    },
    evidence: {
      title: 'Bewijs',
      subtitle: 'Concreet bewijs dat je belofte echt en meetbaar is',
      proofPoints: 'Proof points',
      proofPlaceholder: 'Proof point toevoegen...',
      proofEmpty: 'Nog geen proof points gedefinieerd',
      outcomes: 'Meetbare resultaten',
      outcomesHint: 'Specifieke, kwantificeerbare resultaten die je belofte aantonen',
      outcomesPlaceholder: 'Meetbaar resultaat toevoegen...',
      outcomesEmpty: 'Nog geen meetbare resultaten gedefinieerd',
    },
  },
  missionVision: {
    addIndicator: 'Indicator toevoegen',
    mission: {
      title: 'Mission statement',
      subtitle: 'Waarom je organisatie bestaat en wat ze doet',
      label: 'Mission statement',
      placeholder: 'Je volledige mission statement (1-3 zinnen)...',
      oneLinerLabel: 'One-liner',
      oneLinerPlaceholder: 'Past op een T-shirt...',
      empty: 'Definieer je missie...',
      druckerQuote: '“Peter Drucker: een missie moet op een T-shirt passen.”',
      examplesToggle: 'Voorbeelden missie',
    },
    components: {
      title: 'Missiecomponenten',
      subtitle: 'De bouwstenen: voor wie, wat en hoe anders',
      forWhom: {
        label: 'Voor wie',
        description: 'Wie bedien je?',
        placeholder: 'Beschrijf je primaire publiek...',
      },
      whatWeDo: {
        label: 'Wat we doen',
        description: 'Wat doe je?',
        placeholder: 'Beschrijf je kernactiviteit...',
      },
      howWeDoIt: {
        label: 'Hoe we het doen',
        description: 'Hoe doe je het anders?',
        placeholder: 'Beschrijf je unieke aanpak...',
      },
      hint: 'Een sterke missie beantwoordt drie vragen: voor wie? wat? hoe anders?',
    },
    vision: {
      title: 'Vision statement',
      subtitle: 'De bestemming: waar je naartoe werkt',
      label: 'Vision statement',
      placeholder: 'Je ambitieuze toekomstbeeld (1-3 zinnen)...',
      timeHorizonLabel: 'Tijdshorizon',
      timeHorizonSelect: 'Kies een tijdshorizon...',
      bhagLabel: 'Bold Aspiration (BHAG)',
      bhagPlaceholder: 'Big Hairy Audacious Goal (Collins & Porras)...',
      empty: 'Definieer je visie...',
      timeHorizonView: 'Tijdshorizon:',
      bhagView: 'BHAG',
      examplesToggle: 'Voorbeelden visie',
    },
    future: {
      title: 'Beoogde toekomst',
      subtitle: 'Collins & Porras: een levendige beschrijving van succes',
      desiredLabel: 'Gewenste toekomststaat',
      desiredDescription: 'Een levendige beschrijving van hoe succes eruitziet',
      desiredPlaceholder:
        'Schets een levendig beeld van de toekomst wanneer je organisatie volledig geslaagd is...',
      indicatorsLabel: 'Succesindicatoren',
      indicatorsHint: 'Concrete, meetbare signalen dat je visie werkelijkheid wordt',
      indicatorsPlaceholder: 'Succesindicator toevoegen...',
      indicatorsEmpty: 'Nog geen succesindicatoren gedefinieerd',
      stakeholderLabel: 'Voordeel voor stakeholders',
      stakeholderDescription: 'Wie profiteert en hoe?',
      stakeholderPlaceholder: 'Beschrijf wie profiteert van je visie en hoe...',
    },
    impact: {
      title: 'Impact & afstemming',
      subtitle: 'De brug tussen vandaag en morgen',
      goalLabel: 'Impactdoel',
      goalDescription: 'Meetbare impact vandaag',
      goalPlaceholder: 'Welke meetbare impact maak je nu?',
      valuesLabel: 'Waarde-afstemming',
      valuesDescription: 'Hoe missie/visie de kernwaarden versterken',
      valuesPlaceholder: 'Hoe versterken je missie en visie je kernwaarden?',
      tensionLabel: 'Missie-visie-spanning',
      tensionDescription: 'Creatieve spanning tussen heden en toekomst',
      tensionPlaceholder:
        'Wat is de creatieve spanning tussen wat je vandaag doet en waar je naartoe gaat?',
    },
  },
  brandHouse: {
    intro: {
      title: 'BrandHouse-waardenmodel',
      body: 'Elk merk heeft minstens vijf kernwaarden nodig, verdeeld over drie categorieën. Begin met het inventariseren van waarden met je team (4-6 mensen), clusteer en selecteer daarna via consensus. Vraag je bij elke waarde af: is het een randvoorwaarde (basisverwachting) of echt onderscheidend? Alleen onderscheidende waarden horen hier thuis.',
    },
    roots: {
      title: 'Roots',
      badge: 'Anchor Values',
      subtitle:
        'Het fundament waarop je organisatie is gebouwd — waarden die al bewezen zijn in dagelijks handelen',
      info: 'Roots zijn de fundamentele principes van je organisatie. Ze zitten al verankerd in hoe je vandaag werkt. Denk aan wat je team zou zeggen op de vraag: “Waar staan we voor, wat er ook gebeurt?”',
      value1Label: 'Root-waarde 1',
      value1NamePlaceholder: 'bijv. Integriteit, Betrouwbaarheid, Kwaliteit...',
      value2Label: 'Root-waarde 2',
      value2NamePlaceholder: 'bijv. Transparantie, Vakmanschap, Zorg...',
      descriptionPlaceholder:
        'Hoe is deze waarde zichtbaar in dagelijks handelen? Geef concrete voorbeelden...',
    },
    wings: {
      title: 'Wings',
      badge: 'Aspiration Values',
      subtitle: 'Waarden die richting geven aan de beweging die je merk wil maken',
      info: 'Wings staan voor je richting en ambitie. Ze vragen actieve inzet en bewuste investering. Dit zijn de waarden die je vooruittrekken — waar je wilt groeien, niet alleen waar je vandaag staat.',
      value1Label: 'Wing-waarde 1',
      value1NamePlaceholder: 'bijv. Innovatie, Lef, Duurzaamheid...',
      value2Label: 'Wing-waarde 2',
      value2NamePlaceholder: 'bijv. Inclusiviteit, Thought Leadership...',
      descriptionPlaceholder:
        'Welke concrete stappen zet je om in deze waarde te groeien?...',
    },
    fire: {
      title: 'Fire',
      badge: 'Own Value',
      subtitle:
        'De ene waarde die het meest onderscheidend beschrijft hoe je organisatie de dingen doet',
      info: 'Fire is je meest onderscheidende kenmerk — de waarde die je merk onmiskenbaar van jou maakt. Als een concurrent al je andere waarden zou overnemen, is dit de enige die ze nooit authentiek kunnen kopiëren.',
      ownLabel: 'Own Value',
      ownNamePlaceholder: 'bijv. Speelsheid, Precisie, Empowerment...',
      ownDescriptionPlaceholder:
        'Waarom is dit de ene waarde die geen concurrent authentiek kan kopiëren?...',
      ownEmpty: 'Definieer je eigen waarde...',
    },
    tension: {
      label: 'Waardenspanning',
      hint: 'Sterke waardensets hebben productieve spanning. Hoe houden je roots, wings en fire elkaar in balans? Waar creëren ze een gezonde trek in verschillende richtingen?',
      placeholder:
        'bijv. Onze root Betrouwbaarheid houdt onze wing Innovatie geaard — we gaan snel maar leveren nooit iets waar we niet trots op zijn...',
      empty: 'Beschrijf de spanning tussen je waarden...',
    },
  },
  brandArchetype: {
    selection: {
      title: 'Brand Archetype',
      subtitle: 'De narratieve identiteit van je merk op basis van de 12 Jungiaanse archetypen',
      hideGuide: 'Gids verbergen',
      whatAre: 'Wat zijn archetypen?',
      subLabel: 'Sub-archetype-variant',
      subSelect: 'Kies variant...',
      variant: 'Variant: {{variant}}',
    },
    callout: {
      title: 'Kies een archetype om je merkprofiel te ontgrendelen',
      body: 'Kies hierboven een archetype om je merkprofiel te zien. Elk archetype komt met vooraf ingevulde psychologie- en positioneringsdata die je kunt aanpassen.',
    },
    psychology: {
      title: 'Kernpsychologie',
      subtitle: 'De fundamentele verlangens, angsten en strategieën van je archetype',
      coreDesire: {
        label: 'Kernverlangen',
        description: 'De fundamentele menselijke behoefte die je merk vervult',
        placeholder: 'Welk diep menselijk verlangen vervult je merk?',
      },
      coreFear: {
        label: 'Kernangst',
        description: 'Waar je merk tegen strijdt en tegen beschermt',
        placeholder: 'Welke angst helpt je merk mensen overwinnen?',
      },
      brandGoal: {
        label: 'Merkdoel',
        description: 'Het ultieme doel vanuit het perspectief van dit archetype',
        placeholder: 'Wat is het ultieme doel van je merk?',
      },
      strategy: {
        label: 'Strategie',
        description: 'Hoe je merk zijn doel bereikt',
        placeholder: 'Hoe bereikt je merk zijn doel?',
      },
      giftTalent: {
        label: 'Gave / talent',
        description: 'De unieke gave die je merk aan de wereld brengt',
        placeholder: 'Welk uniek talent biedt je merk?',
      },
      shadowWeakness: {
        label: 'Schaduw / zwakte',
        description: 'De valkuil wanneer het archetype wordt overdreven',
        placeholder:
          'Welke risico\'s ontstaan als je merkpersoonlijkheid te ver wordt doorgevoerd?',
      },
    },
    action: {
      title: 'Archetype in actie',
      subtitle: 'Hoe het archetype marketing, CX, content en storytelling stuurt',
      fieldsDefined: '{{count}} van 4 velden ingevuld',
      marketingExpression: {
        label: 'Marketingexpressie',
        description: 'Hoe het archetype zich manifesteert in campagnes en reclame',
        placeholder: 'Hoe komt het archetype terug in je marketing?',
      },
      customerExperience: {
        label: 'Klantervaring',
        description: 'Hoe het archetype klantinteracties vormgeeft',
        placeholder: 'Hoe beïnvloedt het archetype de klantervaring?',
      },
      contentStrategy: {
        label: 'Contentstrategie',
        description: 'Welke soorten content dit archetype creëert',
        placeholder: 'Welke content past bij je archetype?',
      },
      storytellingApproach: {
        label: 'Storytelling-aanpak',
        description: 'De narratieve rol en terugkerende thema\'s',
        placeholder: 'Hoe vormt je archetype de verhalen die je vertelt?',
      },
    },
    reference: {
      title: 'Referentie & positionering',
      subtitle: 'Concurrentielandschap en merkvoorbeelden met jouw archetype',
      examplesLabel: 'Merkvoorbeelden',
      examplesPlaceholder: 'Referentiemerk toevoegen...',
      examplesEmpty: 'Nog geen referentiemerken toegevoegd',
      positioningLabel: 'Positioneringsaanpak',
      positioningSelect: 'Kies aanpak...',
      positioningEmpty: 'Kies een positioneringsaanpak...',
      competitiveLabel: 'Concurrentielandschap',
      competitiveDescription:
        'Welke archetypen gebruiken je concurrenten en hoe onderscheid je je?',
      competitivePlaceholder: 'Beschrijf de archetype-posities van je concurrenten...',
    },
    modal: {
      title: 'Archetype wisselen?',
      body1:
        'Het wisselen van archetype werkt alle velden bij met nieuwe referentiedata. Eigen bewerkingen worden overschreven.',
      body2:
        'Het veld Archetype in actie en Concurrentielandschap blijven behouden, omdat ze merkspecifiek zijn.',
      cancel: 'Annuleren',
      confirm: 'Wisselen & velden bijwerken',
    },
  },
  brandPersonality: {
    dimensions: {
      title: 'Merkpersoonlijkheidsdimensies',
      subtitle:
        "Scoor elk van Aakers 5 persoonlijkheidsdimensies (1-5) om het karakter van je merk te bepalen",
      dominant: 'Dominante persoonlijkheid',
      collapseInfo: 'Info {{label}} inklappen',
      expandInfo: 'Info {{label}} uitklappen',
    },
    traits: {
      title: 'Kernpersoonlijkheidstrekken',
      subtitle: '3-5 bepalende trekken met "Wij zijn / Maar nooit"-vangrails',
      namePlaceholder: 'Naam trek...',
      descriptionPlaceholder: 'Beschrijf deze trek...',
      weAreThis: 'Wij zijn dit',
      weArePlaceholder: 'Concrete voorbeelden...',
      butNever: 'Maar nooit dat',
      butNeverPlaceholder: 'Vangrails...',
      add: 'Trek toevoegen',
      empty: 'Definieer 3-5 kernpersoonlijkheidstrekken...',
    },
    spectrum: {
      title: 'Persoonlijkheidsspectrum',
      subtitle: 'Positioneer je merk op 7 persoonlijkheidsdimensies (sleep de schuiven)',
    },
    visual: {
      title: 'Visuele persoonlijkheidsexpressie',
      subtitle: 'Hoe persoonlijkheid zich vertaalt naar visuele designkeuzes',
      guidanceFor: 'Visuele richtlijnen voor {{label}}-merken',
      color: 'Kleur',
      typography: 'Typografie',
      imagery: 'Beeld',
      colorLabel: 'Kleurrichting',
      colorPlaceholder: 'Beschrijf de kleurpersoonlijkheidsrichting van je merk...',
      typographyLabel: 'Typografierichting',
      typographyPlaceholder: 'Beschrijf de typografiepersoonlijkheid van je merk...',
      imageryLabel: 'Beeldrichting',
      imageryPlaceholder: 'Beschrijf de beeldstijl van je merk...',
    },
  },
  brandStory: {
    guide: {
      hide: 'Storytelling-gids verbergen',
      show: 'Storytelling-frameworks',
      corePrinciple: 'Kernprincipe',
      corePrincipleBody:
        'De klant is de held, niet het merk. Het merk is de gids/mentor die de held helpt transformatie te bereiken.',
    },
    cards: {
      c1: { title: 'Oorsprong & overtuiging', subtitle: 'Het fundament — waarom het merk bestaat' },
      c2: {
        title: 'De wereld die wij zien',
        subtitle: 'De spanning — welk probleem lost het merk op?',
      },
      c3: {
        title: 'Het merk als gids',
        subtitle: 'De rol — hoe het merk zich positioneert in het verhaal van de klant',
      },
      c4: {
        title: 'Transformatie & ontknoping',
        subtitle: 'De belofte — het leven na het merk',
      },
      c5: {
        title: 'Narratieve toolkit',
        subtitle: 'De instrumenten — hoe het merk zijn verhaal vertelt',
      },
      c6: {
        title: 'Bewijs & mijlpalen',
        subtitle: 'Het bewijs — waarom het verhaal geloofwaardig is',
      },
      c7: {
        title: 'Verhaalexpressies',
        subtitle: 'De output — hoe het verhaal wordt gecommuniceerd',
      },
    },
    summary: {
      notStarted: 'Nog niet gestart',
      problemLayers: '{{count}}/3 probleemlagen gedefinieerd',
      role: 'Rol: {{role}}',
      themes: '{{count}} thema\'s',
      messages: '{{count}} boodschappen',
      evidenceItems: '{{count}} bewijsitems',
      elevatorDefined: 'Elevator pitch gedefinieerd',
    },
    fields: {
      originStory: {
        label: 'Oorsprongsverhaal',
        placeholder:
          'Vertel het oprichtingsverhaal — welk moment, probleem of overtuiging bracht dit merk tot leven?',
      },
      founderMotivation: {
        label: 'Motivatie oprichter',
        placeholder:
          'Welke persoonlijke drive dreef de oprichter(s) om hieraan te beginnen? (Simmons\' "Why I Am Here")',
      },
      coreBelief: {
        label: 'Kernovertuiging-statement',
        placeholder: 'De fundamentele overtuiging over de wereld waarop dit merk is gebouwd',
      },
      worldContext: {
        label: 'Wereldcontext',
        placeholder:
          'Welke externe krachten (politiek, economisch, sociaal, technologisch) maken dit merk nú relevant?',
      },
      threeLayer: 'StoryBrand drie-lagen-probleemframework',
      externalProblem: {
        label: 'Extern probleem',
        placeholder: 'Het zichtbare, tastbare probleem waar je klant mee zit',
      },
      internalProblem: {
        label: 'Intern probleem',
        placeholder: 'De emotionele ervaring — frustratie, twijfel, angst, overweldiging',
      },
      philosophicalProblem: {
        label: 'Filosofisch probleem',
        placeholder:
          'Waarom dit ertoe doet op menselijk of maatschappelijk niveau — het grotere onrecht',
      },
      stakes: {
        label: 'Inzet — kosten van niets doen',
        placeholder:
          'Wat gebeurt er als het probleem NIET wordt opgelost? Wat zijn de gevolgen van niets doen?',
      },
      brandRoleLabel: 'Merkrol',
      empathy: {
        label: 'Empathie-statement',
        placeholder: 'Hoe toont het merk begrip voor de worsteling van de klant?',
      },
      authority: {
        label: 'Autoriteitsreferenties',
        placeholder:
          'Wat geeft het merk geloofwaardigheid om te helpen — trackrecord, aanpak, certificeringen?',
      },
      transformation: {
        label: 'Transformatiebelofte',
        placeholder:
          'Welke specifieke verandering ervaart de klant? Beschrijf het voor vs. na.',
      },
      successVision: {
        label: 'Visie op klantsucces',
        placeholder:
          'Schets een levendig, zintuiglijk beeld van het leven van de klant na transformatie — het "nieuwe normaal".',
      },
      abt: {
        label: 'ABT-statement',
        placeholder:
          '[Context] AND [setup]. BUT [probleem/spanning]. THEREFORE [rol en impact van het merk].',
      },
      narrativeArcLabel: 'Narratieve boog',
      themes: {
        label: 'Merkthema\'s',
        hint: '(2-4 thematische gebieden)',
        placeholder: 'Voeg een thema toe en druk op Enter...',
      },
      emotional: {
        label: 'Emotioneel territorium',
        hint: '(emoties die het verhaal oproept)',
        placeholder: 'Voeg een emotie toe en druk op Enter...',
      },
      keyMessages: {
        label: 'Kernboodschappen',
        hint: '(3-5 terugkerende boodschappen)',
        placeholder: 'Voeg een kernboodschap toe en druk op Enter...',
      },
      proofPoints: {
        label: 'Proof points',
        hint: '(testimonials, data, awards)',
        placeholder: 'Proof point toevoegen...',
      },
      valuesInAction: {
        label: 'Waarden in actie',
        hint: '(verhalen waarin waarden werden getoond)',
        placeholder:
          'Beschrijf een moment waarop je waarden door handelen werden bewezen...',
      },
      milestones: {
        label: 'Merkmijlpalen',
        hint: '(sleutelmomenten in de merkreis)',
        placeholder: 'Een mijlpaal — lancering, pivot, prestatie, overwonnen uitdaging...',
      },
      elevator: {
        label: 'Elevator pitch',
        placeholder:
          'De 30-seconden-versie van je merkverhaal — helder, memorabel, actiegericht.',
      },
      manifesto: {
        label: 'Merkmanifest',
        placeholder:
          'De uitgebreide, emotioneel geladen versie — het merkmanifest dat zowel medewerkers als klanten kan inspireren.',
      },
      audienceAdaptations: {
        label: 'Aanpassingen per publiek',
        hint: 'Notities over hoe het verhaal zich aanpast aan verschillende doelgroepen',
        placeholder: 'Hoe het verhaal resoneert met {{audience}}...',
      },
    },
  },
  transformativeGoals: {
    mtp: {
      title: 'Massive Transformative Purpose',
      subtitle: 'De overkoepelende ambitie die alles stuurt wat je merk doet',
      statementLabel: 'MTP-statement',
      statementPlaceholder:
        "bijv. Accelerate the world's transition to sustainable energy",
      characters: '{{count}}/150 tekens',
      narrativeLabel: 'Narratief',
      narrativePlaceholder:
        'Waarom deze purpose ertoe doet, wie ze dient en welke wereld je bouwt...',
      empty: 'Definieer je Massive Transformative Purpose...',
      examples: 'MTP-voorbeelden',
    },
    goals: {
      title: 'Transformative Goals',
      subtitle: 'Concrete, meetbare commitments die je MTP operationaliseren',
      addGoal: 'Doel toevoegen',
    },
    authenticity: {
      title: 'Authenticiteitsbeoordeling',
      subtitle:
        'Beoordeel hoe goed je doelen aansluiten bij je merk (Collins + Ismail)',
      criteria: {
        ambition: { label: 'Ambitie', question: 'Is het gedurfd genoeg om te inspireren?' },
        authenticity: { label: 'Authenticiteit', question: 'Past het bij het merk-DNA?' },
        clarity: { label: 'Helderheid', question: 'Kan iedereen het begrijpen?' },
        measurability: { label: 'Meetbaarheid', question: 'Is voortgang te volgen?' },
        integration: { label: 'Integratie', question: 'Stuurt het de strategie?' },
        longevity: { label: 'Duurzaamheid', question: 'Houdt het 10+ jaar stand?' },
      },
    },
    stakeholder: {
      title: 'Stakeholder-impact',
      subtitle:
        'Breng in kaart hoe elke stakeholdergroep bijdraagt aan en profiteert van transformatie',
      roleLabel: 'Rol',
      rolePlaceholder: 'bijv. Ambassadeurs & uitvoerders',
      impactLabel: 'Verwachte impact',
      impactPlaceholder: 'bijv. Cultuur, motivatie, retentie',
      roleView: 'Rol',
      impactView: 'Impact',
      empty: 'Bepaal rol en verwachte impact...',
    },
    integration: {
      title: 'Brand Integration',
      subtitle:
        'Hoe transformative goals positionering, campagnes en interne cultuur sturen',
      positioningLabel: 'Positioneringslink',
      positioningDescription: 'Hoe versterken deze doelen je marktpositionering?',
      positioningPlaceholder: 'Beschrijf hoe doelen de positionering versterken...',
      internalLabel: 'Interne activatie',
      internalDescription: 'Hoe worden medewerkers ambassadeurs van transformatie?',
      internalPlaceholder: 'Beschrijf de interne activatiestrategie...',
      commThemesLabel: 'Communicatiethema\'s',
      commThemesPlaceholder: 'Communicatiethema toevoegen...',
      commThemesEmpty: 'Nog geen communicatiethema\'s gedefinieerd',
      campaignLabel: 'Campagnerichtingen',
      campaignPlaceholder: 'Campagnerichting toevoegen...',
      campaignEmpty: 'Nog geen campagnerichtingen gedefinieerd',
    },
    about: {
      title: 'Over Transformative Goals',
      body: "Transformative Goals overbruggen de kloof tussen merk-purpose en uitvoerbare strategie. Gebaseerd op Jim Collins' BHAG-framework, Salim Ismails Massive Transformative Purpose en Jim Stengels Brand Ideal-onderzoek. Merken met een heldere transformatieve purpose groeien 2-4x sneller (Stengel 50-studie), en 72% van de consumenten verwacht dat bedrijven positieve maatschappelijke en milieu-uitkomsten stimuleren (EY).",
      frameworksLabel: 'Belangrijkste frameworks',
      frameworksValue:
        'BHAG (Collins), MTP (Ismail), Brand Ideal (Stengel), Moonshot Thinking (Google X)',
      connectionsLabel: 'Verbinding met andere assets',
      connectionsValue:
        'Purpose Statement (fundament), Missie/Visie (expressie), Brand Values (afstemming)',
    },
    domains: {
      PEOPLE: 'Mens',
      PLANET: 'Planeet',
      PROSPERITY: 'Welvaart',
    },
    timeframes: {
      SHORT: { label: 'Korte termijn', description: '1-3 jaar' },
      MEDIUM: { label: 'Middellange termijn', description: '3-10 jaar' },
      LONG: { label: 'Lange termijn', description: '10-25 jaar' },
      ASPIRATIONAL: { label: 'Ambitieus', description: 'Doorlopende horizon' },
    },
    goalCard: {
      goalNumber: 'Doel {{number}}',
      titleLabel: 'Titel',
      titlePlaceholder: 'bijv. Zero Waste Production',
      descriptionLabel: 'Beschrijving',
      descriptionPlaceholder: 'Wat dit doel inhoudt...',
      impactDomainLabel: 'Impactdomein',
      timeframeLabel: 'Tijdsbestek',
      timeframeYearPlaceholder: '2030',
      commitmentLabel: 'Meetbare commitment',
      commitmentPlaceholder: 'bijv. 99% van afval gerecycled tegen 2030',
      theoryLabel: 'Theory of Change',
      theoryPlaceholder: 'Hoe merkactiviteit deze impact creëert...',
      progressLabel: 'Huidige voortgang ({{progress}}%)',
      milestonesLabel: 'Mijlpalen',
      milestoneTargetPlaceholder: 'Mijlpaaldoel...',
      sdgLabel: 'UN SDG-afstemming',
      sdgCrossRef:
        'SDG-afstemming hier koppelt doelen aan mondiale impact. Voor onderbouwde SDG-commitments, zie Social Relevancy.',
      removeGoal: 'Dit doel verwijderen',
      markAchieved: 'Mijlpaal als behaald markeren',
      markNotAchieved: 'Mijlpaal als niet-behaald markeren',
      commitmentView: 'Meetbare commitment',
      theoryView: 'Theory of Change',
      progressView: 'Voortgang',
      milestonesView: 'Mijlpalen',
      sdgsView: 'SDGs:',
      sdgTag: 'SDG {{number}}',
    },
  },
  socialRelevancy: {
    grandTotal: {
      title: 'Social Relevancy-score',
      total: 'Totaal',
    },
    foundation: {
      title: 'Fundament maatschappelijke impact',
      subtitle: 'Waarom geeft dit merk om maatschappelijke impact?',
      impactStatementLabel: 'Impact-statement',
      impactStatementPlaceholder:
        'Eén krachtige zin: waarom geeft dit merk om maatschappelijke impact?',
      impactNarrativeLabel: 'Impact-narratief',
      impactNarrativePlaceholder:
        'Het achtergrondverhaal: wat was de trigger, het oprichtingsmoment of de evolutie die tot deze commitment leidde?',
      activismLabel: 'Merk-activismeniveau',
      activismHint: '(Kotler & Sarkar)',
      activismEmpty: 'Nog niet geselecteerd',
      referenceShow: 'Referentieframeworks tonen',
      referenceHide: 'Referentieframeworks verbergen',
    },
    pillar: {
      scoreLabel: 'Score:',
      evidenceLabel: 'Bewijs',
      evidencePlaceholder: 'Concreet bewijs dat deze score ondersteunt...',
      noEvidence: 'Geen bewijs opgegeven',
      targetLabel: 'Verbeterdoel',
      targetPlaceholder: 'Specifiek doel...',
      timelineLabel: 'Tijdlijn',
      timelinePlaceholder: 'bijv. Q4 2026',
      reflectionLabel: 'Pijlerreflectie',
      reflectionPlaceholder: 'Vrije reflectie op je {{pillar}}-impact als geheel...',
      noReflection: 'Nog geen reflectie',
    },
    authenticity: {
      title: 'Authenticiteit & bewijs',
      subtitle: 'Zijn de claims geloofwaardig?',
      scoreSummary: 'Authenticiteitsscore: {{score}}%',
      walkTheTalk: 'Walk-the-Talk-beoordeling',
      overall: 'Algehele authenticiteit:',
      proofLabel: 'Proof points',
      proofPlaceholder: 'Concreet proof point toevoegen...',
      proofEmpty: 'Nog geen proof points',
      certLabel: 'Certificeringen',
      certPlaceholder: 'Typ een certificering en druk op Enter (bijv. B Corp, ISO 14001)',
      antiGreenLabel: 'Anti-greenwashing-statement',
      antiGreenHint: '(eerlijke erkenning van tekortkomingen)',
      antiGreenPlaceholder:
        'Waar schiet het merk tekort? Waar ben je eerlijk over?',
    },
    activation: {
      title: 'Activatie & communicatie',
      subtitle: 'Hoe wordt impact gecommuniceerd en verankerd?',
      sdgCrossRef:
        'Voor hoe je transformative goals aansluiten op SDGs, zie Transformative Goals.',
      sdgLabel: 'UN Sustainable Development Goals',
      sdgHint: '(max. 3 aanbevolen)',
      sdgWarning:
        'Overweeg te focussen op max. 3 SDGs voor helderdere impact (SDG Compass)',
      commLabel: 'Communicatieprincipes',
      commPlaceholder: 'Communicatieprincipe toevoegen...',
      commEmpty: 'Nog geen communicatieprincipes gedefinieerd',
      stakeholdersLabel: 'Belangrijkste stakeholders',
      stakeholdersPlaceholder: 'Typ een stakeholder en druk op Enter',
      channelsLabel: 'Activatiekanalen',
      channelsPlaceholder: 'Typ een kanaal en druk op Enter',
      annualLabel: 'Jaarlijkse commitment',
      annualPlaceholder: 'Concrete, meetbare commitment voor dit jaar...',
    },
    scoreAria: 'Score {{n}}',
  },
} as const;

export default brandAssetDetail;

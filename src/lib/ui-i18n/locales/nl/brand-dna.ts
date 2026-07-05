// Dutch UI strings — `brand-dna` namespace.
// Zelfde key-shape als en/brand-dna.ts. Render-edge catalog voor de
// brand-DNA constant registries; de constant-bestanden blijven de Engelse bron.
const ns = {
  // ─── Archetypes (ARCHETYPES, keyed by id) ──────────────────
  archetypes: {
    innocent: { name: 'De Onschuldige', motto: 'Vrij om jezelf te zijn' },
    sage: { name: 'De Wijze', motto: 'De waarheid maakt je vrij' },
    explorer: { name: 'De Ontdekkingsreiziger', motto: 'Je hebt maar één leven — maak het bijzonder' },
    outlaw: { name: 'De Rebel', motto: 'Regels zijn er om te breken' },
    magician: { name: 'De Magiër', motto: 'Alles kan — ik maak het waar' },
    hero: { name: 'De Held', motto: 'Waar een wil is, is een weg' },
    lover: { name: 'De Minnaar', motto: 'Jij bent de enige' },
    jester: { name: 'De Nar', motto: 'Als ik niet mag dansen, doe ik niet mee aan je revolutie' },
    everyman: { name: 'De Gewone Man', motto: 'Iedereen is gelijk' },
    caregiver: { name: 'De Verzorger', motto: 'Heb je naaste lief als jezelf' },
    ruler: { name: 'De Heerser', motto: 'Macht is niet alles — het is het enige' },
    creator: { name: 'De Schepper', motto: 'Wat je kunt bedenken, kun je maken' },
  },

  // ─── Archetype quadrants (keyed by quadrant enum) ──────────
  quadrants: {
    freedom: 'Onafhankelijkheid & vervulling',
    mastery: 'Risico & meesterschap',
    belonging: 'Verbondenheid & plezier',
    stability: 'Stabiliteit & controle',
  },

  // ─── Positioning approaches (POSITIONING_OPTIONS, by value) ─
  positioning: {
    similarity: { label: 'Gelijkwaardigheid', description: '"Wij zijn net als jij"' },
    aspiration: { label: 'Aspiratie', description: '"Wij zijn wie je wilt worden"' },
    guidance: { label: 'Begeleiding', description: '"Wij zijn je baken"' },
    inspiration: { label: 'Inspiratie', description: '"Wij inspireren je om te geloven"' },
  },

  // ─── Social relevancy pillars (PILLAR_CONFIGS, by key) ─────
  pillars: {
    milieu: {
      label: 'Milieu',
      subtitle: 'Hoe groot is je ecologische voetafdruk?',
      statements: [
        'We hebben duidelijke en verifieerbare milieucriteria opgenomen in ons inkoopbeleid.',
        'We zetten onze omzet actief in om positief bij te dragen aan milieuverbetering.',
        'We stimuleren actief alle vormen van milieuverbeterende activiteiten binnen onze organisatie (intern en extern).',
      ],
    },
    mens: {
      label: 'Mens',
      subtitle: 'Stimuleert je merk het welzijn van individuen?',
      statements: [
        'We stimuleren een positieve leefstijl door het gebruik van onze producten en diensten.',
        'We stimuleren persoonlijk welzijn door het gebruik van onze producten en diensten.',
        'We stimuleren een positieve leefstijl en welzijn voor onze medewerkers.',
      ],
    },
    maatschappij: {
      label: 'Maatschappij',
      subtitle: 'Draagt je merk bij aan een betere maatschappij?',
      statements: [
        'We stimuleren positieve interactie in de maatschappij door het gebruik van onze producten en diensten.',
        'We stimuleren maatschappelijke harmonie en cohesie door het gebruik van onze producten en diensten.',
        'We stimuleren positieve interactie, maatschappelijke harmonie en cohesie onder medewerkers binnen de organisatie.',
      ],
    },
  },

  // ─── Brand activism levels (ACTIVISM_LEVELS, by value) ─────
  activism: {
    Silent: { label: 'Stil', description: 'Handelt, maar communiceert niet actief' },
    Vocal: { label: 'Uitgesproken', description: 'Communiceert impactinspanningen openlijk' },
    Leader: { label: 'Leider', description: 'Zet de industrienorm voor impact' },
    Activist: { label: 'Activist', description: 'Zet actief aan tot systemische verandering' },
  },

  // ─── Authenticity criteria (AUTHENTICITY_CRITERIA, by key) ─
  authenticity: {
    walkTheTalk: { label: 'Walk-the-Talk', question: 'Doen we wat we zeggen?' },
    transparency: { label: 'Transparantie', question: 'Zijn we open over voortgang en missers?' },
    consistency: { label: 'Consistentie', question: 'Zit dit verweven in alle touchpoints?' },
    stakeholderTrust: { label: 'Vertrouwen van stakeholders', question: 'Geloven stakeholders onze claims?' },
    measurability: { label: 'Meetbaarheid', question: 'Zijn onze claims onafhankelijk te verifiëren?' },
    longTermCommitment: { label: 'Langetermijncommitment', question: 'Is dit kernstrategie of een campagne?' },
  },

  // ─── UN Sustainable Development Goals (UN_SDGS, by number) ──
  sdg: {
    '1': 'Geen armoede',
    '2': 'Geen honger',
    '3': 'Goede gezondheid en welzijn',
    '4': 'Kwaliteitsonderwijs',
    '5': 'Gendergelijkheid',
    '6': 'Schoon water en sanitair',
    '7': 'Betaalbare en schone energie',
    '8': 'Fatsoenlijk werk en economische groei',
    '9': 'Industrie, innovatie en infrastructuur',
    '10': 'Ongelijkheid verminderen',
    '11': 'Duurzame steden en gemeenschappen',
    '12': 'Verantwoorde consumptie en productie',
    '13': 'Klimaatactie',
    '14': 'Leven in het water',
    '15': 'Leven op het land',
    '16': 'Vrede, justitie en sterke publieke diensten',
    '17': 'Partnerschap om doelen te bereiken',
  },

  // ─── Score threshold labels (keyed by threshold color) ─────
  scoreThresholds: {
    red: 'Vraagt aandacht',
    amber: 'In ontwikkeling',
    emerald: 'Goed',
    teal: 'Uitstekend',
  },

  // ─── Reference frameworks (REFERENCE_FRAMEWORKS, by slug) ───
  referenceFrameworks: {
    tripleBottomLine: {
      name: 'Triple Bottom Line',
      description: 'Organisaties zouden succes moeten meten langs drie dimensies, verder dan financiële winst.',
      keyPoints: [
        'People: sociale gelijkheid, arbeidsomstandigheden, impact op de gemeenschap',
        'Planet: milieurentmeesterschap, behoud van grondstoffen, minder vervuiling',
        'Profit: economische levensvatbaarheid, duurzame verdienmodellen',
      ],
    },
    bCorp: {
      name: 'B Corp Impact Assessment',
      description: 'Grondige beoordeling van een bedrijf over 5 impactgebieden, gescoord op 200 punten.',
      keyPoints: [
        '5 gebieden: bestuur, medewerkers, gemeenschap, milieu, klanten',
        '80+ punten nodig voor certificering',
        'Kernprincipe: uitkomsten boven beleid',
      ],
    },
    brandActivism: {
      name: 'Brand Activism Spectrum',
      description: 'Vier niveaus van merkactivisme, van stil tot aanjager van systemische verandering.',
      keyPoints: [
        'Stil: handelt, maar communiceert niet actief',
        'Uitgesproken: communiceert impactinspanningen openlijk',
        'Leider: zet de industrienorm voor impact',
        'Activist: zet actief aan tot systemische verandering',
      ],
    },
  },

  // ─── Aaker personality dimensions (AAKER_DIMENSIONS, by key) ─
  aaker: {
    sincerity: {
      label: 'Oprechtheid',
      description: 'Eerlijk, warm en oprecht — merken die echt en nuchter aanvoelen.',
      colorAssociation: 'Warme tinten (oranje, warm geel), aardetinten, zachte groenen — lage verzadiging, warme tint',
      typographyAssociation: 'Ronde schreefloze letters, humanistische lettertypes — toegankelijk, leesbaar, vriendelijk',
      imageryAssociation: 'Authentieke, natuurlijke, spontane fotografie — echte menselijke connectie, alledaagse momenten',
    },
    excitement: {
      label: 'Opwinding',
      description: 'Gedurfd, bezield en fantasierijk — merken die energie en innovatie brengen.',
      colorAssociation: 'Rood, feloranje, elektrisch blauw, levendige kleuren — hoge verzadiging, hoog contrast',
      typographyAssociation: 'Display-letters, vette schreefloze letters, speelse lettertypes — dynamisch, groot, asymmetrisch',
      imageryAssociation: 'Actiegericht, dynamisch, energiek — beweging, trendcultuur, gedurfde beelden',
    },
    competence: {
      label: 'Competentie',
      description: 'Betrouwbaar, intelligent en succesvol — merken die met expertise leveren.',
      colorAssociation: 'Blauw, marineblauw, donkergrijs, professionele neutralen — gemiddelde verzadiging, koele tint',
      typographyAssociation: 'Strakke schreefloze letters, geometrische lettertypes — modern, efficiënt, neutraal',
      imageryAssociation: 'Professioneel, gestructureerd, strak — capaciteit tonen, precisie, data',
    },
    sophistication: {
      label: 'Verfijning',
      description: 'Elegant, charmant en verfijnd — merken die klasse en exclusiviteit uitstralen.',
      colorAssociation: 'Zwart, goud, dieppaars, zilver — lage verzadiging of metallic, verfijnd',
      typographyAssociation: 'Elegante schreefletters, dunne schreefletters, script — verfijnd, hoog contrast, klassiek',
      imageryAssociation: 'Minimalistisch, samengesteld, artistiek — verfijnde esthetiek, veel witruimte, luxe details',
    },
    ruggedness: {
      label: 'Robuustheid',
      description: 'Stoer, avontuurlijk en stevig — merken gebouwd voor avontuur en veerkracht.',
      colorAssociation: 'Aardetinten (bruin, bosgroen, olijf, roest) — lage tot gemiddelde verzadiging, donkere waarde',
      typographyAssociation: 'Slab-schreefletters, vette schreefletters, zwaar gewicht — sterk, stevig, getextureerd',
      imageryAssociation: 'Avontuurlijke landschappen, ruige texturen — natuur, terrein, uitdagingen, buiten',
    },
  },

  // ─── Personality spectrum sliders (SPECTRUM_SLIDERS, by key) ─
  spectrum: {
    friendlyFormal: {
      leftLabel: 'Vriendelijk / Toegankelijk',
      rightLabel: 'Zakelijk / Formeel',
      leftDescription: 'Informeel, warm, conversationeel',
      rightDescription: 'Professioneel, gestructureerd, gezaghebbend',
    },
    energeticThoughtful: {
      leftLabel: 'Energiek / Enthousiast',
      rightLabel: 'Weloverwogen / Zorgvuldig',
      leftDescription: 'Snel, actiegericht, gedurfd',
      rightDescription: 'Afgewogen, doordacht, reflectief',
    },
    modernTraditional: {
      leftLabel: 'Modern / Eigentijds',
      rightLabel: 'Traditioneel / Klassiek',
      leftDescription: 'Vooruitkijkend, progressief, nieuw',
      rightDescription: 'Beproefd, erfgoed, gevestigd',
    },
    innovativeProven: {
      leftLabel: 'Vernieuwend / Innovatief',
      rightLabel: 'Gevestigd / Bewezen',
      leftDescription: 'Disruptief, experimenteel, baanbrekend',
      rightDescription: 'Betrouwbaar, vertrouwd, beproefd',
    },
    playfulSerious: {
      leftLabel: 'Speels / Luchtig',
      rightLabel: 'Serieus / Professioneel',
      leftDescription: 'Luchtig, gevat, vermakelijk',
      rightDescription: 'Gefocust, no-nonsense, zakelijk',
    },
    inclusiveExclusive: {
      leftLabel: 'Inclusief / Uitnodigend',
      rightLabel: 'Exclusief / Selectief',
      leftDescription: 'Open voor iedereen, gedemocratiseerd, breed',
      rightDescription: 'Samengesteld, elitair, beperkt toegankelijk',
    },
    boldReserved: {
      leftLabel: 'Gedurfd / Uitgesproken',
      rightLabel: 'Ingetogen / Bescheiden',
      leftDescription: 'Luid, provocerend, opvallend',
      rightDescription: 'Rustig, subtiel, laat kwaliteit spreken',
    },
  },

  // ─── Narrative arc types (NARRATIVE_ARC_TYPES, by id) ───────
  narrativeArc: {
    'heros-journey': {
      label: 'Heldenreis',
      description: 'Klassieke heldenqueeste: roeping, beproevingen, mentor, transformatie, terugkeer. Ideaal voor merken die klanten helpen grote uitdagingen te overwinnen.',
    },
    sparkline: {
      label: 'Sparkline',
      description: 'Pendelen tussen "wat is" (huidige realiteit) en "wat zou kunnen zijn" (gewenste toekomst). Effectief voor verandernarratieven en innovatiemerken.',
    },
    'rags-to-riches': {
      label: 'Van arm naar rijk',
      description: 'Van bescheiden begin naar succes. Krachtig voor startups en merken met een underdog-oorsprong.',
    },
    'overcoming-the-monster': {
      label: 'Het monster verslaan',
      description: 'Een grote vijand of systemische uitdaging verslaan. Ideaal voor disruptors en merken die de status quo uitdagen.',
    },
    quest: {
      label: 'Queeste',
      description: 'Een groep op reis naar een gedeeld doel. Perfect voor community-gedreven en purpose-gedreven merken.',
    },
  },

  // ─── Brand role options (BRAND_ROLE_OPTIONS, by id) ────────
  brandRole: {
    guide: {
      label: 'Gids',
      description: 'Wijze mentor die de weg wijst — denk aan Yoda of Gandalf. De meest voorkomende en krachtigste merkpositie.',
    },
    mentor: {
      label: 'Mentor',
      description: 'Ervaren leraar die kennis overdraagt en de klant bekwamer maakt.',
    },
    enabler: {
      label: 'Aanjager',
      description: 'Levert de tools, het platform of de middelen die het eigen potentieel van de klant ontsluiten.',
    },
    partner: {
      label: 'Partner',
      description: 'Loopt als gelijke naast de klant — gedeelde reis, gedeeld succes.',
    },
  },

  // ─── Storytelling frameworks (STORYTELLING_FRAMEWORKS, by id) ─
  storyFrameworks: {
    storybrand: {
      name: 'StoryBrand SB7',
      principle: 'De klant is de held, niet het merk',
      elements: [
        'Personage (klant met een verlangen)',
        'Probleem (extern + intern + filosofisch)',
        'Gids (merk met empathie + autoriteit)',
      ],
    },
    abt: {
      name: 'ABT Framework',
      principle: 'And/But/Therefore — de simpelste driedelige verhaalstructuur',
      elements: [
        'AND — context en opzet',
        'BUT — het probleem of de spanning',
        'THEREFORE — de rol en oplossing van het merk',
      ],
    },
    'heros-journey': {
      name: 'Heldenreis',
      principle: 'De klant maakt een transformatieve reis door, met het merk als mentor',
      elements: [
        'Gewone wereld → roeping',
        'Beproevingen & uitdagingen',
        'Ontmoeting met de mentor (merk)',
      ],
    },
    sparkline: {
      name: 'Sparkline',
      principle: 'Pendelen tussen "wat is" en "wat zou kunnen zijn" wekt emotionele betrokkenheid',
      elements: [
        'Wat is — de huidige, onbevredigende realiteit',
        'Wat zou kunnen zijn — de aanlokkelijke toekomst',
        'Herhaald contrast bouwt spanning op',
      ],
    },
    merit: {
      name: 'MERIT Framework',
      principle: 'Sterke merkverhalen scoren hoog op vijf kwaliteiten',
      elements: [
        'Memorable — blijft hangen',
        'Emotional — raakt gevoel',
        'Relatable — publiek herkent zichzelf',
      ],
    },
  },

  // ─── Vision time horizons (TIME_HORIZON_OPTIONS, by value) ──
  timeHorizon: {
    '3 years': { label: '3 jaar', description: 'Kort termijn, operationeel gericht' },
    '5 years': { label: '5 jaar', description: 'Middellange strategische planningshorizon' },
    '10 years': { label: '10 jaar', description: 'Langetermijn transformatieve visie' },
    '15+ years': { label: '15+ jaar', description: 'Generatie-overstijgende, legacy-bepalende ambitie' },
    Aspirational: { label: 'Aspiratie', description: 'Tijdloze noordster zonder vaste deadline' },
  },

  // ─── Mission examples (MISSION_EXAMPLES, by brand) ─────────
  missionExamples: {
    Tesla: {
      statement: 'De transitie van de wereld naar duurzame energie versnellen.',
      analysis: 'Actiegericht, meetbaar, verder dan winst',
    },
    Patagonia: {
      statement: 'We zijn er om onze thuisplaneet te redden.',
      analysis: 'Gedurfd, emotioneel, past op een T-shirt',
    },
    TED: {
      statement: 'Ideeën verspreiden.',
      analysis: 'Twee woorden, glashelder, oneindig schaalbaar',
    },
    IKEA: {
      statement: 'Een beter dagelijks leven creëren voor zoveel mogelijk mensen.',
      analysis: 'Inclusief, tastbaar voordeel, democratische waarden',
    },
    Google: {
      statement: 'De informatie van de wereld organiseren en universeel toegankelijk maken.',
      analysis: 'Specifiek én enorm, helder mechanisme',
    },
  },

  // ─── Vision examples (VISION_EXAMPLES, by brand) ───────────
  visionExamples: {
    Nike: {
      statement: 'Inspiratie en innovatie brengen naar elke atleet ter wereld.',
      analysis: 'Aspiratief, inclusief ("als je een lichaam hebt, ben je een atleet")',
    },
    Microsoft: {
      statement: 'Iedereen en elke organisatie op de planeet in staat stellen om meer te bereiken.',
      analysis: 'Universeel, versterkend, technologie-onafhankelijk',
    },
    SpaceX: {
      statement: 'Het leven multiplanetair maken.',
      analysis: 'Gedurfde BHAG, levendig toekomstbeeld',
    },
    Oxfam: {
      statement: 'Een rechtvaardige wereld zonder armoede.',
      analysis: 'Bondig, waardegedreven, helder einddoel',
    },
    "Alzheimer's Association": {
      statement: 'Een wereld zonder Alzheimer en alle andere vormen van dementie.',
      analysis: 'Definitief eindpunt, emotioneel resonant',
    },
  },
} as const;

export default ns;

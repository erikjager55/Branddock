// Nederlandse UI-strings — `consistent-models-registry` namespace.
// Render-edge vertalingen voor de data-gedreven constant-registries in
// `src/features/consistent-models/constants/model-constants.ts`. Keys spiegelen
// de STABIELE enum / slug identifiers per render-site.
const ns = {
  type: {
    PERSON: {
      label: 'Model',
      description: 'Train op gezichten en mensen voor consistente portretten',
    },
    PRODUCT: {
      label: 'Product',
      description: "Train op productfoto's voor consistente productbeelden",
    },
    OBJECT: {
      label: 'Object',
      description: 'Train op specifieke objecten voor een consistente weergave',
    },
    PHOTOGRAPHY: {
      label: 'Fotografie',
      description: 'Train op fotografiestijlen voor een consistente fotolook',
    },
    ILLUSTRATION: {
      label: 'Illustratie',
      description: 'Train op illustratiestijlen voor een consistente beeldtaal',
    },
  },
  status: {
    DRAFT: 'Concept',
    UPLOADING: 'Uploaden',
    TRAINING: 'Trainen',
    TRAINING_FAILED: 'Mislukt',
    READY: 'Klaar',
    ARCHIVED: 'Gearchiveerd',
  },
  statusFilter: {
    all: 'Alle statussen',
    DRAFT: 'Concept',
    TRAINING: 'Trainen',
    READY: 'Klaar',
    ARCHIVED: 'Gearchiveerd',
  },
  preset: {
    square: 'Vierkant (1:1)',
    portrait: 'Portret (3:4)',
    landscape: 'Liggend (4:3)',
    wide: 'Breed (3:2)',
  },
  wizardStep: {
    upload: 'Uploaden',
    trainingShowcase: 'Training & showcase',
    generateReferences: 'Referenties genereren',
    uploadCurate: 'Uploaden & cureren',
    aiStyleAnalysis: 'AI-stijlanalyse',
  },
  field: {
    PERSON: {
      gender: {
        label: 'Geslacht',
        placeholder: 'Kies geslacht',
        options: { male: 'Man', female: 'Vrouw', 'non-binary': 'Non-binair' },
      },
      age: {
        label: 'Leeftijdscategorie',
        placeholder: 'Kies leeftijdscategorie',
        options: { '20s': '20-29', '30s': '30-39', '40s': '40-49', '50s': '50-59', '60s': '60+' },
      },
      ethnicity: {
        label: 'Etniciteit',
        placeholder: 'Kies etniciteit',
        options: {
          caucasian: 'Kaukasisch',
          black: 'Zwart',
          asian: 'Aziatisch',
          hispanic: 'Hispanic / Latino',
          'middle-eastern': 'Midden-Oosters',
          'south-asian': 'Zuid-Aziatisch',
          mixed: 'Gemengd',
        },
      },
      hairColor: {
        label: 'Haarkleur',
        placeholder: 'Kies haarkleur',
        options: {
          black: 'Zwart',
          'dark-brown': 'Donkerbruin',
          'light-brown': 'Lichtbruin',
          blonde: 'Blond',
          red: 'Rood / Kastanje',
          gray: 'Grijs / Zilver',
          bald: 'Kaal / Geschoren',
        },
      },
      hairStyle: {
        label: 'Kapsel',
        placeholder: 'Kies kapsel',
        options: {
          short: 'Kort',
          medium: 'Halflang',
          long: 'Lang',
          curly: 'Krullend',
          wavy: 'Golvend',
          straight: 'Steil',
          'buzz-cut': 'Millimeter',
          ponytail: 'Paardenstaart / Opgestoken',
        },
      },
      build: {
        label: 'Postuur',
        placeholder: 'Kies postuur',
        options: { slim: 'Slank', average: 'Gemiddeld', athletic: 'Atletisch', stocky: 'Stevig / Breed' },
      },
      clothing: {
        label: 'Kledingstijl',
        placeholder: 'bijv. maatpak, casual shirt, coltrui',
      },
      distinctiveFeatures: {
        label: 'Opvallende kenmerken',
        placeholder: 'bijv. bril, baard, sproeten, kuiltjes, litteken op linkerwang',
      },
      expression: {
        label: 'Standaarduitdrukking',
        placeholder: 'Kies uitdrukking',
        options: {
          neutral: 'Neutraal',
          'friendly-smile': 'Vriendelijke glimlach',
          confident: 'Zelfverzekerd / Serieus',
          approachable: 'Toegankelijk / Warm',
          professional: 'Professioneel / Beheerst',
        },
      },
      skinDetails: {
        label: 'Huid & teint',
        placeholder: 'bijv. lichte huid, warme ondertoon, lichtgebruind, donkere teint',
      },
      avoid: {
        label: 'Niet doen',
        placeholder: 'Wat niet getoond mag worden (bijv. tatoeages, piercings, hoeden)',
      },
    },
    PRODUCT: {
      productDescription: {
        label: 'Productomschrijving',
        placeholder: 'Beschrijf het product (vorm, materiaal, kleur, afmetingen)',
      },
      textAndLabels: {
        label: 'Tekst & labels op product',
        placeholder:
          "Exacte tekst, merknaam of labels die op het product moeten staan (bijv. 'ACME Co' op de voorkant, voedingslabel op de achterkant)",
      },
      logoPlacement: {
        label: 'Logoplaatsing',
        placeholder: 'Waar het logo staat (bijv. gecentreerd op de voorkant, linksboven, gereliëfd op het deksel)',
      },
      materialTexture: {
        label: 'Materiaal & textuur',
        placeholder: 'bijv. mat zwart aluminium, glanzend glas, kraftpapier, geborsteld staal',
      },
      colorAccuracy: {
        label: 'Kritische kleuren',
        placeholder: 'Kleuren die exact moeten kloppen (bijv. Pantone 2925 C blauwe dop, witte body)',
      },
      setting: {
        label: 'Setting',
        placeholder: 'Kies een setting',
        options: {
          'white-background': 'Witte achtergrond',
          lifestyle: 'Lifestyle',
          'in-use': 'In gebruik',
          flatlay: 'Flatlay',
        },
      },
      angles: {
        label: 'Hoeken',
        placeholder: 'Kies een hoek',
        options: {
          front: 'Vooraanzicht',
          '45-degree': '45°',
          'top-down': 'Bovenaanzicht',
          'detail-closeup': 'Detailclose-up',
        },
      },
      scaleReference: {
        label: 'Schaalreferentie',
        placeholder: 'Formaatcontext (bijv. past in één hand, 30 cm hoog, bureauformaat)',
      },
      avoid: {
        label: 'Niet doen',
        placeholder: "Wat niet zichtbaar mag zijn (bijv. geen concurrentlogo's, geen verkeerde kleurvarianten)",
      },
    },
    OBJECT: {
      objectDescription: {
        label: 'Objectomschrijving',
        placeholder: 'Beschrijf het object (vorm, materiaal, formaat, gewicht)',
      },
      surfaceDetails: {
        label: 'Oppervlaktedetails',
        placeholder: 'bijv. gegraveerde tekst, gedrukt logo, gereliëfd patroon, serienummer',
      },
      materialFinish: {
        label: 'Materiaal & afwerking',
        placeholder: 'bijv. gepolijst chroom, ruw hout, matte keramiek, transparant glas',
      },
      setting: {
        label: 'Setting',
        placeholder: 'Kies een setting',
        options: {
          'white-background': 'Witte achtergrond',
          'in-context': 'In context',
          isolated: 'Geïsoleerd',
          'scale-reference': 'Schaalreferentie',
        },
      },
      lighting: {
        label: 'Belichting',
        placeholder: 'Kies belichting',
        options: { studio: 'Studio', natural: 'Natuurlijk', dramatic: 'Dramatisch', soft: 'Zacht' },
      },
      scaleContext: {
        label: 'Schaalcontext',
        placeholder: 'bijv. handpalmformaat, bureauformaat, mensgrootte, kamervullend',
      },
      avoid: { label: 'Niet doen', placeholder: 'Wat niet getoond mag worden' },
    },
    PHOTOGRAPHY: {
      subject: { label: 'Onderwerp', placeholder: "Onderwerp van de foto's" },
      photoStyle: {
        label: 'Fotostijl',
        placeholder: 'Kies een stijl',
        options: {
          portrait: 'Portret',
          landscape: 'Landschap',
          macro: 'Macro',
          street: 'Straat',
          product: 'Productfotografie',
        },
      },
      lighting: {
        label: 'Belichting',
        placeholder: 'Kies belichting',
        options: {
          natural: 'Natuurlijk',
          studio: 'Studio',
          'golden-hour': 'Gouden uur',
          'high-key': 'High-key',
          'low-key': 'Low-key',
        },
      },
      colorGrading: {
        label: 'Kleurgrading',
        placeholder: 'bijv. warme tinten, ontzadigd, hoog contrast, filmemulatie (Portra 400)',
      },
      postProcessing: {
        label: 'Nabewerkingsstijl',
        placeholder: 'bijv. korrel, vignet, split-toning, schone retouche',
      },
      depthOfField: {
        label: 'Scherptediepte',
        placeholder: 'Kies scherptediepte',
        options: {
          shallow: 'Klein (onscherpe achtergrond)',
          medium: 'Gemiddeld',
          deep: 'Groot (alles scherp)',
        },
      },
      avoid: {
        label: 'Niet doen',
        placeholder: 'Wat te vermijden (bijv. geen HDR-look, geen oververzadigde kleuren)',
      },
    },
  },
} as const;

export default ns;

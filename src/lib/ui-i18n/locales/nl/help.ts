// Nederlandse UI-strings — `help` namespace. Zelfde sleutelvorm als en/help.ts.
const help = {
  page: {
    title: 'Help & Support',
    subtitle: 'Vind antwoorden, tutorials en neem contact op',
  },
  header: {
    title: 'Waarmee kunnen we je helpen?',
    subtitle: 'Doorzoek ons helpcentrum of blader hieronder door onderwerpen',
  },
  search: {
    placeholder: 'Zoek naar artikelen, tutorials en meer...',
    articles: 'Artikelen',
    faq: 'FAQ',
  },
  quickActions: {
    gettingStarted: {
      title: 'Aan de slag',
      description: 'Leer de basis en richt je Workspace in',
    },
    documentation: {
      title: 'Documentatie',
      description: 'Blader door onze uitgebreide documentatie',
    },
    liveChat: {
      title: 'Live chat',
      description: 'Chat live met ons supportteam',
      badge: 'Beschikbaar',
    },
    contactSupport: {
      title: 'Contact support',
      description: 'Stuur ons een bericht en we nemen contact met je op',
    },
  },
  topics: {
    title: 'Blader per onderwerp',
    articleCount_one: '{{count}} artikel',
    articleCount_other: '{{count}} artikelen',
    fallback: {
      'getting-started': 'Aan de slag',
      features: 'Functies',
      'knowledge-base': 'Kennisbank',
      'account-profile': 'Account & profiel',
      'billing-plans': 'Facturering & abonnementen',
      troubleshooting: 'Problemen oplossen',
    },
  },
  videos: {
    title: 'Videotutorials',
    empty: 'Nog geen videotutorials beschikbaar.',
  },
  faq: {
    title: 'Veelgestelde vragen',
    empty: 'Geen FAQ-items beschikbaar.',
    feedback: {
      thanks: 'Bedankt voor je feedback!',
      prompt: 'Was dit nuttig?',
    },
  },
  contact: {
    title: 'Contact support',
    methods: {
      'live-chat': {
        title: 'Live chat',
        responseTime: '~1 min reactietijd',
        badge: 'Online',
      },
      email: {
        title: 'E-mailsupport',
        responseTime: '~4 uur reactietijd',
      },
      call: {
        title: 'Plan een gesprek',
        responseTime: 'Reserveer een tijdslot',
      },
    },
  },
  form: {
    submitted: {
      title: 'Verzoek verstuurd',
      description: 'We nemen zo snel mogelijk contact met je op.',
      another: 'Nog een verzoek versturen',
    },
    subject: {
      label: 'Onderwerp',
      placeholder: 'Korte omschrijving van je probleem',
    },
    category: {
      label: 'Categorie',
      placeholder: 'Kies een categorie...',
      options: {
        GENERAL: 'Algemeen',
        TECHNICAL: 'Technisch',
        BILLING: 'Facturering',
        FEATURE_REQUEST: 'Functieverzoek',
        BUG_REPORT: 'Bugmelding',
      },
    },
    description: {
      label: 'Omschrijving',
      placeholder: 'Beschrijf je probleem in detail...',
    },
    priority: {
      label: 'Prioriteit',
      options: {
        LOW: 'Laag',
        MEDIUM: 'Gemiddeld',
        HIGH: 'Hoog',
      },
    },
    submit: 'Verzoek versturen',
  },
  systemStatus: {
    title: 'Systeemstatus',
    overall: {
      operational: 'Alle systemen operationeel',
      degraded: 'Verminderde prestaties',
      outage: 'Systeemstoring',
    },
    service: {
      operational: 'Operationeel',
      degraded: 'Verminderd',
      outage: 'Storing',
    },
    updated: 'Bijgewerkt {{date}}',
  },
  featureRequests: {
    title: 'Functieverzoeken',
    request: 'Functie aanvragen',
    empty: 'Nog geen functieverzoeken.',
    modal: {
      title: 'Functie aanvragen',
      subtitle: 'Vertel ons wat je graag in Branddock zou willen zien',
      titleField: {
        label: 'Titel',
        placeholder: 'Welke functie zou je willen?',
      },
      descriptionField: {
        label: 'Omschrijving',
        placeholder: 'Beschrijf de functie in meer detail (optioneel)...',
      },
      cancel: 'Annuleren',
      submit: 'Verzoek versturen',
    },
    status: {
      REQUESTED: 'Aangevraagd',
      PLANNED: 'Gepland',
      IN_PROGRESS: 'In behandeling',
      COMPLETED: 'Voltooid',
    },
    userAlt: 'Gebruiker',
    anonymous: 'Anoniem',
  },
  rating: {
    title: 'Beoordeel je ervaring',
    thanks: 'Bedankt voor je feedback!',
    result: 'Je gaf ons {{rating}} van de 5 sterren.',
    placeholder: 'Vertel ons meer over je ervaring (optioneel)...',
    submit: 'Versturen',
  },
  resources: {
    title: 'Bronnen',
    links: {
      apiDocs: 'API-documentatie',
      developerBlog: 'Ontwikkelaarsblog',
      communityForum: 'Communityforum',
      changelog: 'Product-changelog',
      statusPage: 'Systeemstatuspagina',
      brandGuidelines: 'Merkrichtlijnen',
    },
  },
  chat: {
    title: 'Supportchat',
    comingSoon: 'Chat komt binnenkort',
    comingSoonDetail: 'We werken aan live chat-support.',
    open: 'Chat openen',
    close: 'Chat sluiten',
  },
} as const;

export default help;

// Dutch UI strings — `campaigns-canvas-page` namespace.
const campaignsCanvasPage = {
  canvasPage: {
    status: {
      draft: 'Concept',
      inReview: 'In review',
      ready: 'Klaar',
      changesRequested: 'Wijzigingen gevraagd',
      scheduled: 'Ingepland',
      published: 'Gepubliceerd',
    },
    header: {
      title: 'Content Canvas',
      backAria: 'Terug naar campagnedetail',
    },
    generation: {
      generating: 'Genereren...',
      completeBelowThreshold: 'Generatie klaar · fidelity onder de drempel',
      complete: 'Generatie klaar',
      failed: 'Generatie mislukt',
    },
  },
  fidelity: {
    title: 'Brand fidelity-score',
    measuring: 'meten…',
    subtitle: 'Hoe goed past deze tekst bij je merk?',
    axisLeft: '← Klinkt als AI',
    axisRight: 'Klinkt menselijk + merk-fit →',
    verdictSuffix: ' — meet AI-patronen. ',
    verdictExplain: 'De score bovenaan combineert dit met merkstijl + strategie.',
    measuredIn: ' · gemeten in {{seconds}}s',
    pillarsToggle: 'Zie hoe deze score is opgebouwd',
  },
  verdict: {
    topTier: 'Klinkt heel menselijk',
    humanBaseline: 'Klinkt menselijk',
    aiLeaning: 'Voelt AI-achtig',
    pureAi: 'Klinkt als AI',
  },
  skipped: {
    detailNotAvailable: '{{verdict}} — gedetailleerde score niet beschikbaar.',
    notCalculated: 'Score kon niet worden berekend.',
    reason: 'Reden: {{reason}}',
  },
  discrepancy: {
    title: 'Klinkt menselijk, maar past nog niet bij het merk.',
    body: 'De detector ziet weinig AI-patronen (pin links), maar merkstijl + strategie zijn lager dan ideaal. Bekijk de pijler-breakdown hieronder voor waar je kunt verbeteren.',
  },
  strictRunning: {
    title: 'Branddock verbetert de output…',
    body: 'De tekst klinkt nog AI-achtig — we maken hem menselijker. ~15-30s.',
  },
  autoIterate: {
    running: {
      title: 'Auto-iterate verbetert de score…',
      body: 'Start {{initial}} / drempel {{threshold}} — feedback-gedreven herschrijving.',
    },
    attempts_one: '{{count}} poging',
    attempts_other: '{{count}} pogingen',
    result: {
      improvedReady: 'Verbeterd van {{initial}} naar {{final}} — klaar om te publiceren',
      improvedStagnation: 'Verbeterd van {{initial}} naar {{final}} — verdere iteraties leveren weinig op',
      improvedMaxIterations:
        'Verbeterd van {{initial}} naar {{final}} in {{attempts}} — pas de brief aan voor verdere verbetering',
      improved: 'Verbeterd van {{initial}} naar {{final}}',
      dropped:
        'Score daalde van {{initial}} naar {{final}} in {{attempts}} — originele content behouden (auto-iterate leverde geen winst op)',
      stayed: 'Score bleef op {{initial}} over {{attempts}} — originele content behouden',
    },
    scoreLabel: 'Score:',
    pointsDelta: '({{signedDelta}} punten in {{attempts}})',
    applied: 'Toegepast: {{templates}}',
    applyingButton: 'Toepassen…',
    useImproved: 'Gebruik verbeterde versie',
    tip: 'Tip: maak de brief specifieker (concrete CTA, scherpere kernboodschap) of pas de voiceguide aan voor dit contenttype.',
    appliedLoaded: 'Toegepast — verbeterde tekst is geladen',
    cta: {
      title: 'Score onder de drempel — wil je dat Branddock het automatisch verbetert?',
      body: 'Branddock herschrijft de tekst tot 5× en stopt zodra de score boven de drempel komt of niet meer verbetert. Duurt ~30-90 seconden.',
      improving: 'Verbeteren…',
      improvingProgress: ' (poging {{attempt}}, score {{score}})',
      improveAutomatically: 'Automatisch verbeteren',
    },
    errors: {
      startFailed: 'Kon iteratie niet starten ({{status}})',
      iterationFailed: 'Iteratie mislukt',
      applyFailedStatus: 'Toepassen mislukt: {{status}}',
      applyFailed: 'Toepassen mislukt',
    },
  },
  strict: {
    improvedTitle: 'Branddock maakte de tekst menselijker',
    was: 'Was:',
    now: 'Nu:',
    hidePreview: 'Verberg de menselijkere versie',
    viewPreview: 'Bekijk de menselijkere versie',
    applyingButton: 'Toepassen…',
    useThisVersion: 'Gebruik deze versie',
    appliedRefresh: 'Toegepast — ververs de pagina om de nieuwe tekst te zien',
  },
  positionBar: {
    scoreAria: 'Score {{score}} van 100',
  },
  threshold: {
    above: 'boven de drempel ({{threshold}})',
    below: 'onder de drempel ({{threshold}})',
  },
  pillar: {
    na: 'N.v.t.',
    style: { label: 'Merkstijl', sublabel: 'Gebruikt jouw woorden' },
    strategy: { label: 'Strategie', sublabel: 'AI-beoordeling' },
    human: { label: 'Menselijk', sublabel: 'Geen AI-patronen' },
  },
} as const;

export default campaignsCanvasPage;

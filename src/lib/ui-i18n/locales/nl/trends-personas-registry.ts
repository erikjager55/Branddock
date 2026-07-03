// Nederlandse UI-strings — `trends-personas-registry` namespace.
// Data-gedreven constant-registry labels van de Trend Radar- en Concurrenten-features.
const ns = {
  category: {
    CONSUMER_BEHAVIOR: 'Consumentengedrag',
    TECHNOLOGY: 'Technologie',
    MARKET_DYNAMICS: 'Marktdynamiek',
    COMPETITIVE: 'Concurrentie',
    REGULATORY: 'Regelgeving',
  },
  impact: {
    LOW: 'Laag',
    MEDIUM: 'Gemiddeld',
    HIGH: 'Hoog',
    CRITICAL: 'Kritiek',
  },
  detectionSource: {
    MANUAL: 'Handmatig',
    AI_RESEARCH: 'AI-onderzoek',
  },
  scope: {
    MICRO: 'Micro',
    MESO: 'Meso',
    MACRO: 'Macro',
  },
  timeframe: {
    SHORT_TERM: '0-6 maanden',
    MEDIUM_TERM: '6-18 maanden',
    LONG_TERM: '18+ maanden',
  },
  direction: {
    rising: 'Stijgend',
    declining: 'Dalend',
    stable: 'Stabiel',
  },
  competitorTier: {
    DIRECT: 'Direct',
    INDIRECT: 'Indirect',
    ASPIRATIONAL: 'Aspiratie',
  },
  competitorStatus: {
    ANALYZED: 'Geanalyseerd',
    DRAFT: 'Concept',
    ARCHIVED: 'Gearchiveerd',
  },
  competitorScore: {
    notScored: 'Niet gescoord',
    highThreat: 'Grote dreiging',
    moderate: 'Gemiddeld',
    lowThreat: 'Lage dreiging',
  },
  competitorAnalyzeStep: {
    step0: 'Verbinden met website',
    step1: 'Pagina-inhoud scrapen',
    step2: 'Merksignalen extraheren',
    step3: 'Positionering analyseren',
    step4: 'Aanbod identificeren',
    step5: 'Sterktes & zwaktes beoordelen',
    step6: 'Concurrentiescore berekenen',
    step7: 'Analyse afronden',
  },
} as const;

export default ns;

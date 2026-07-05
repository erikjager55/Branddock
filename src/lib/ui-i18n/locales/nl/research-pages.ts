// Nederlandse UI-strings — `research-pages` namespace.
// Dekt ResearchDashboard + ResearchValidationPage chrome.
const ns = {
  header: {
    backToAsset: 'Terug naar asset',
  },
  canvasView: {
    sessionOutcomeFallback: 'Sessieresultaat',
    downloadingReport: 'PDF-rapport downloaden...',
    shareCopied: 'Deellink gekopieerd naar klembord',
    keyInsights: 'Belangrijkste sessie-inzichten',
    alignmentMetrics: 'Afstemmingsmetrics',
  },
  aiAgent: {
    complete: {
      title: 'AI-merkanalyse voltooid',
      generatedFrom:
        'Je merkframework is succesvol gegenereerd uit {{dataPoints}} datapunten en {{sources}} bronnen.',
      completedOn: 'Voltooid: {{date}}',
      lastUpdated: 'Laatst bijgewerkt: {{date}}',
      locked: 'Vergrendeld',
      unlocked: 'Ontgrendeld',
      pdfDownload: 'PDF downloaden',
      downloadRawData: 'Ruwe data downloaden',
      returnToQuestionnaire: 'Terug naar vragenlijst',
      done: 'Klaar',
    },
    header: {
      title: 'AI-merkanalyse',
      subtitle: 'Beantwoord de vragen om je merkframework te genereren',
    },
    status: {
      inProgress: 'Bezig',
      result: 'Resultaat',
    },
    chat: {
      welcome:
        'Hallo! Ik help je graag je merkframework te ontwikkelen. Laten we beginnen met een paar vragen over je bedrijf.',
    },
    questions: {
      q1: 'Wat doet je bedrijf en wat maakt het uniek?',
      q2: 'Wat is het diepere doel achter wat je doet?',
      q3: 'Hoe lever je deze waarde en wat is je unieke aanpak?',
      q4: 'Wie is je doelgroep en welke uitdagingen los je op?',
    },
    progress: 'Voortgang',
    answerPlaceholder: 'Typ hier je antwoord...',
    previous: 'Vorige',
    analyzing: 'AI analyseert...',
    completeStep: 'Voltooien',
    next: 'Volgende',
    allAnswered: 'Alle vragen beantwoord!',
    overwriteConfirm:
      'Je hebt eerder een rapport gegenereerd. Een nieuw rapport overschrijft het bestaande. Wil je doorgaan?',
    generateReport: 'Merkrapport genereren',
  },
  noResult: {
    title: 'Onderzoeksinterface',
    description: 'Begin met deze validatiemethode',
    ready: 'Klaar om te starten',
    readyDescription: 'Deze validatiemethode-interface staat klaar zodat je aan de slag kunt.',
    beginResearch: 'Onderzoek starten',
  },
  resultView: {
    completedBadge: 'Voltooid',
    completedOn: 'Voltooid: {{date}}',
    updatedOn: 'Bijgewerkt: {{date}}',
    confidenceScore: 'Betrouwbaarheidsscore',
    downloadReport: 'Rapport downloaden',
    keyInsights: {
      title: 'Belangrijkste inzichten',
      description: 'Belangrijkste bevindingen uit de onderzoeksanalyse',
    },
    metrics: {
      title: 'Prestatiemetrics',
      description: 'Kwantitatieve analyseresultaten',
    },
    recommendations: {
      title: 'Aanbevelingen',
      description: 'Concrete vervolgstappen op basis van de bevindingen',
      details: 'Details',
    },
    quickActions: {
      title: 'Snelle acties',
      downloadFull: 'Volledig rapport downloaden',
      scheduleFollowUp: 'Vervolg inplannen',
      updateAnalysis: 'Analyse bijwerken',
    },
  },
  validation: {
    header: {
      title: 'Validatieonderzoek',
      subtitle: 'Toets je strategieën met marktvalidatie',
    },
    startValidation: 'Start validatie',
    method: {
      interview: {
        shortName: 'Interview',
        description: 'Diepgaande kwalitatieve inzichten via 1-op-1 gesprekken',
      },
      survey: {
        shortName: 'Enquête',
        description: 'Kwantitatieve dataverzameling op schaal',
      },
      workshop: {
        shortName: 'Workshop',
        description: 'Gezamenlijke ideevorming en validatiesessies',
      },
    },
    activeProjects: 'Actieve onderzoeksprojecten',
    activeBadge_one: '{{count}} actief',
    activeBadge_other: '{{count}} actief',
    project: {
      started: 'Gestart {{date}}',
      participants: '{{current}}/{{target}} deelnemers',
      viewDetails: 'Details bekijken',
      linkedAssets: 'Gekoppelde assets',
      traceHint_one:
        'Multi-asset-validatie • Inzichten traceren terug naar alle {{count}} gekoppelde asset',
      traceHint_other:
        'Multi-asset-validatie • Inzichten traceren terug naar alle {{count}} gekoppelde assets',
    },
    assetType: {
      brand: 'Merk',
      persona: 'Persona',
      product: 'Product',
      trend: 'Trend',
    },
    multiAssetCard: {
      title: 'Multi-asset-onderzoek',
      description:
        'Koppel meerdere kennis-assets aan één onderzoeksproject voor complete validatie. Inzichten traceren automatisch terug naar alle gekoppelde assets en vormen zo een samenhangende kennisgraaf die je strategische beslissingen voedt.',
    },
  },
} as const;

export default ns;

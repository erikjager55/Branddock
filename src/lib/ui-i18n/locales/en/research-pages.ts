// Canonical (source-of-truth) English UI strings — `research-pages` namespace.
// Covers ResearchDashboard + ResearchValidationPage chrome.
const ns = {
  header: {
    backToAsset: 'Back to Asset',
  },
  canvasView: {
    sessionOutcomeFallback: 'Session Outcome',
    downloadingReport: 'Downloading PDF report...',
    shareCopied: 'Share link copied to clipboard',
    keyInsights: 'Key Session Insights',
    alignmentMetrics: 'Alignment Metrics',
  },
  aiAgent: {
    complete: {
      title: 'AI Brand Analysis Complete',
      generatedFrom:
        'Your brand framework has been successfully generated from {{dataPoints}} data points across {{sources}} sources.',
      completedOn: 'Completed: {{date}}',
      lastUpdated: 'Last updated: {{date}}',
      locked: 'Locked',
      unlocked: 'Unlocked',
      pdfDownload: 'PDF download',
      downloadRawData: 'Download raw data',
      returnToQuestionnaire: 'Return to Questionnaire',
      done: 'Done',
    },
    header: {
      title: 'AI Brand Analysis',
      subtitle: 'Answer the questions to generate your brand framework',
    },
    status: {
      inProgress: 'In Progress',
      result: 'Result',
    },
    chat: {
      welcome:
        'Hello! I would love to help you develop your brand framework. Let us start with a few questions about your business.',
    },
    questions: {
      q1: 'What does your company do and what makes it unique?',
      q2: 'What is the deeper purpose behind what you do?',
      q3: 'How do you deliver this value and what is your unique approach?',
      q4: 'Who is your target audience and what challenges do you solve?',
    },
    progress: 'Progress',
    answerPlaceholder: 'Type your answer here...',
    previous: 'Previous',
    analyzing: 'AI analyzing...',
    completeStep: 'Complete',
    next: 'Next',
    allAnswered: 'All questions answered!',
    overwriteConfirm:
      'You have previously generated a report. Generating a new one will overwrite the existing report. Do you want to continue?',
    generateReport: 'Generate Brand Report',
  },
  noResult: {
    title: 'Research Interface',
    description: 'Start working on this validation method',
    ready: 'Ready to Start',
    readyDescription: 'This validation method interface is ready for you to begin your work.',
    beginResearch: 'Begin Research',
  },
  resultView: {
    completedBadge: 'Completed',
    completedOn: 'Completed: {{date}}',
    updatedOn: 'Updated: {{date}}',
    confidenceScore: 'Confidence Score',
    downloadReport: 'Download Report',
    keyInsights: {
      title: 'Key Insights',
      description: 'Main findings from the research analysis',
    },
    metrics: {
      title: 'Performance Metrics',
      description: 'Quantitative analysis results',
    },
    recommendations: {
      title: 'Recommendations',
      description: 'Actionable next steps based on the findings',
      details: 'Details',
    },
    quickActions: {
      title: 'Quick Actions',
      downloadFull: 'Download Full Report',
      scheduleFollowUp: 'Schedule Follow-up',
      updateAnalysis: 'Update Analysis',
    },
  },
  validation: {
    header: {
      title: 'Validation Research',
      subtitle: 'Test your strategies with market validation',
    },
    startValidation: 'Start Validation',
    method: {
      interview: {
        shortName: 'Interview',
        description: 'Deep qualitative insights through 1-on-1 conversations',
      },
      survey: {
        shortName: 'Survey',
        description: 'Quantitative data collection at scale',
      },
      workshop: {
        shortName: 'Workshop',
        description: 'Collaborative ideation and validation sessions',
      },
    },
    activeProjects: 'Active Research Projects',
    activeBadge_one: '{{count}} Active',
    activeBadge_other: '{{count}} Active',
    project: {
      started: 'Started {{date}}',
      participants: '{{current}}/{{target}} participants',
      viewDetails: 'View Details',
      linkedAssets: 'Linked Assets',
      traceHint_one:
        'Multi-asset validation • Insights will trace back to all {{count}} linked asset',
      traceHint_other:
        'Multi-asset validation • Insights will trace back to all {{count}} linked assets',
    },
    assetType: {
      brand: 'Brand',
      persona: 'Persona',
      product: 'Product',
      trend: 'Trend',
    },
    multiAssetCard: {
      title: 'Multi-Asset Research',
      description:
        'Link multiple knowledge assets to a single research project for comprehensive validation. Insights automatically trace back to all connected assets, creating a unified knowledge graph that powers your strategic decisions.',
    },
  },
} as const;

export default ns;

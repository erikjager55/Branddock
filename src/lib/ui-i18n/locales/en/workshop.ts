// Canonical (source-of-truth) English UI strings — `workshop` namespace.
const workshop = {
  common: {
    backToAsset: 'Back to Asset',
    notFound: 'Workshop not found.',
    previous: 'Previous',
    next: 'Next',
    cancel: 'Cancel',
    defaultTitle: 'Canvas Workshop',
    facilitator: 'Facilitator',
    na: 'N/A',
    minutesShort: '{{minutes}} min',
  },
  purchase: {
    pageTitle: 'Purchase Canvas Workshop',
    pageSubtitle: 'Select a bundle or individual assets for your workshop',
    selectAssets: 'Select Assets',
    toggle: {
      bundles: 'Bundles',
      individual: 'Individual',
    },
    bundle: {
      save: 'Save €{{amount}}',
    },
    package: {
      title: 'Canvas Workshop',
      subtitle:
        "A facilitated brand strategy workshop combining proven frameworks with AI-powered analysis to uncover your brand's core identity.",
      includedTitle: "What's Included",
      included: {
        workshop: '6-step guided brand strategy workshop',
        summary: 'AI-generated executive summary & findings',
        canvas: 'Golden Circle canvas output',
        capture: 'Participant response capture per step',
        recommendations: 'Actionable recommendations report',
        documentation: 'Photo & notes documentation',
      },
      specs: {
        durationLabel: 'Duration',
        durationValue: '~90 minutes',
        participantsLabel: 'Participants',
        participantsValue: 'Up to 12',
        formatLabel: 'Format',
        formatValue: 'In-person or virtual',
      },
    },
    options: {
      numberOfWorkshops: 'Number of Workshops',
      addFacilitator: 'Add Professional Facilitator',
      facilitatorHelp:
        'Expert facilitator to guide your team through the workshop (+€{{price}} per session)',
    },
    summary: {
      title: 'Order Summary',
      total: 'Total',
      purchase: 'Purchase Workshop',
      previewImpact: 'Preview Dashboard Impact',
      paymentNotice:
        'Payment processing is not yet active. This creates a workshop record for scheduling.',
    },
    lineItem: {
      bundle: '{{name}} x{{workshops}}',
      workshopBase: 'Workshop base x{{workshops}}',
      facilitator: 'Facilitator x{{workshops}}',
      assetsIncluded_one: '{{count}} asset included',
      assetsIncluded_other: '{{count}} assets included',
    },
    impact: {
      title: 'Dashboard Impact Preview',
      calculating: 'Calculating impact...',
      summary_one: 'Purchasing this workshop will update {{count}} asset on your dashboard.',
      summary_other: 'Purchasing this workshop will update {{count}} assets on your dashboard.',
      status: {
        available: 'Available',
        inProgress: 'In Progress',
        completed: 'Completed',
        validated: 'Validated',
      },
    },
  },
  results: {
    banner: {
      subtitle: 'Workshop completed successfully. Review your results below.',
      completed: 'Completed',
      rawData: 'Raw Data',
      date: 'Date',
      participants: 'Participants',
      duration: 'Duration',
      facilitator: 'Facilitator',
      selfGuided: 'Self-guided',
    },
    tabs: {
      overview: 'Overview',
      canvas: 'Canvas',
      workshop: 'Workshop',
      notes: 'Notes',
      gallery: 'Gallery',
    },
    overview: {
      generateTitle: 'Generate AI Report',
      generateDesc:
        'Analyze workshop responses and generate an executive summary with key findings and recommendations.',
      generateButton: 'Generate Report',
    },
    aiReport: {
      notGenerated:
        'AI report not yet generated. Complete the workshop to generate insights.',
      title: 'Executive Summary',
    },
    findings: {
      title: 'Key Findings',
    },
    recommendations: {
      title: 'Recommendations',
    },
    canvasTab: {
      title: 'Golden Circle Framework',
      locked: 'Locked',
      unlocked: 'Unlocked',
      done: 'Done',
      edit: 'Edit',
    },
    canvas: {
      noData: 'No canvas data available yet.',
      sections: {
        why: 'WHY',
        how: 'HOW',
        what: 'WHAT',
      },
    },
    details: {
      objectives: 'Objectives',
    },
    participants: {
      title: 'Participants',
    },
    agenda: {
      title: 'Agenda',
    },
    notes: {
      title: 'Participant Notes',
      add: 'Add Note',
      namePlaceholder: 'Your name',
      rolePlaceholder: 'Role (optional)',
      contentPlaceholder: 'Write your note...',
      save: 'Save Note',
    },
    gallery: {
      emptyTitle: 'No photos yet',
      emptyDesc: 'Photos from the workshop session will appear here.',
    },
  },
  session: {
    header: {
      inProgress: 'In Progress',
    },
    toolbar: {
      videoGuide: 'Video Guide',
      complete: 'Complete',
    },
    card: {
      scheduled: 'Scheduled',
      purchased: 'Purchased',
      assetCount_one: '{{count}} asset',
      assetCount_other: '{{count}} assets',
    },
    list: {
      title: 'Available Workshops',
      emptyTitle: 'No workshops available',
      emptyDesc: 'Purchase a workshop first to start a session.',
    },
    step: {
      stepLabel: 'Step {{number}}',
      videoPlaceholder: 'Video guide placeholder',
    },
    response: {
      placeholder: "Capture the team's response here...",
      saveNext: 'Save & Next',
      save: 'Save',
    },
    progress: {
      label: 'Overall Progress',
    },
    tips: {
      title: 'Facilitator Tips',
      items: {
        diversity:
          'Encourage all participants to share their perspective — diversity of thought leads to stronger outcomes.',
        summarize: 'Summarize key themes after each step before moving on to the next.',
        validate: 'Use "What I hear you saying is..." to validate contributions.',
        focusWhy:
          "If time is running short, focus on capturing the WHY — it's the foundation for everything else.",
        actionItems:
          'End with clear, measurable action items that can be followed up on.',
      },
    },
  },
} as const;

export default workshop;

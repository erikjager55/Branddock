// Canonical (source-of-truth) English UI strings — `claw` namespace.
// Covers the Brand Assistant (Claw) overlay, chat, forms and surfacing CTAs.
const claw = {
  assistantName: 'Brand Assistant',

  cta: {
    defaultTitle: 'Ask the Brand Assistant',
    defaultSubtitle: 'Describe what you want in plain language — Claw handles the rest.',
    quickTip: 'Quick tip — you can also ask the Brand Assistant:',
  },

  tooltip: {
    ariaLabel: 'Brand Assistant tip',
    dismiss: 'Dismiss',
    title: 'Did you know?',
    body: 'You can create content via the Brand Assistant. Try:',
    example: '"Write a LinkedIn post about [your topic]"',
    tryPrompt: 'Write a LinkedIn post about our latest product launch',
    tryItNow: 'Try it now',
    notNow: 'Not now',
  },

  canvasHelp: {
    thisDeliverable: 'this deliverable',
    header: 'Ask about this deliverable',
    close: 'Close',
    footer: 'Or type your own question in the assistant.',
    triggerAriaLabel: 'Ask the Brand Assistant about this deliverable',
    triggerTitle: 'Ask the Brand Assistant',
    formalLabel: 'Rewrite in a more formal tone',
    formalPrompt:
      'Rewrite the selected variant of {{subject}} in a more formal, professional tone. Keep the core message intact.',
    shortenLabel: 'Shorten it',
    shortenPrompt:
      'Shorten the selected variant of {{subject}} by about 30%. Keep the hook and the call to action — cut supporting detail.',
    directLabel: 'Make it more direct',
    directPrompt:
      'Rewrite the selected variant of {{subject}} to be more direct and punchy. Lead with the benefit, drop filler words.',
  },

  overlay: {
    hideSidebar: 'Hide sidebar',
    showSidebar: 'Show sidebar',
    conversationHistory: 'Conversation history',
    newConversationAria: 'Start new conversation',
    newConversationTitle: 'New conversation',
    exportConversation: 'Export conversation',
    expandFullScreen: 'Expand to full screen',
    collapseToPanel: 'Collapse to panel',
    close: 'Close',
    watching: 'Watching:',
    agentBadge: 'Agent',
    history: 'History',
    closeHistory: 'Close history',
    exportYou: 'You',
  },

  chat: {
    thinking: 'Thinking',
    dataRetrieved: 'Data retrieved successfully',
    error: 'Error',
    entity: {
      brand_asset: 'brand asset',
      persona: 'persona',
      product: 'product',
      competitor: 'competitor',
    },
    greeting: {
      wizardNeedHelpTitle: 'Need help with your {{name}}?',
      wizardNeedHelpSubtitle_one:
        'I can see {{count}} empty field. I can fill it in for you — you just confirm.',
      wizardNeedHelpSubtitle_other:
        'I can see {{count}} empty fields. I can fill them in for you — you just confirm.',
      wizardWorkingTitle: 'Working on your {{name}}',
      wizardWorkingSubtitle: 'Ask me to refine any field, or I can review what you have so far.',
      entityTitle: 'About {{name}}',
      entitySubtitle:
        "I'm watching this {{kind}}. Ask me to fill empty fields, strengthen what's there, or compare it to the rest of your brand.",
      defaultSubtitle:
        'Your AI brand strategist. Ask questions, get advice, or let me update your brand data.',
    },
    defaultActions: {
      assessLabel: 'Assess my brand foundation',
      assessPrompt:
        'Assess my brand foundation — which assets are well filled in and where is work needed?',
      compareLabel: 'Compare my personas',
      comparePrompt:
        'Compare my personas for consistency with my brand personality and archetype.',
      strategyLabel: 'Suggest campaign strategy',
      strategyPrompt: 'Suggest a campaign strategy based on my current brand data and trends.',
      attentionLabel: 'What needs attention?',
      attentionPrompt: 'What needs the most urgent attention in my workspace?',
    },
  },

  bug: {
    title: 'Report a Bug',
    pageLabel: 'Page / Section',
    severityLabel: 'Severity',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'What happened? What did you expect?',
    screenshotLabel: 'Screenshot (optional)',
    screenshotAlt: 'Screenshot preview',
    uploadImage: 'Upload image',
    uploading: 'Uploading...',
    urlPlaceholder: 'or paste a URL...',
    submit: 'Submit Bug Report',
    submitting: 'Submitting...',
    cancel: 'Cancel',
    descriptionRequired: 'Description is required',
    submitFailed: 'Failed to submit. Please try again.',
    uploadFailed: 'Upload failed',
    submitted: 'Bug report submitted for **{{page}}** ({{severity}}).',
    severities: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Critical',
    },
  },

  feature: {
    title: 'Request a Feature',
    pageLabel: 'Page / Section',
    titleLabel: 'Title',
    titlePlaceholder: 'A short summary of the feature',
    impactLabel: 'Impact',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'What would you like to be able to do? What problem does it solve?',
    referenceLabel: 'Reference link (optional)',
    referencePlaceholder: 'Paste a URL to a mockup or example...',
    submit: 'Submit Feature Request',
    submitting: 'Submitting...',
    cancel: 'Cancel',
    required: 'Title and description are required',
    submitFailed: 'Failed to submit. Please try again.',
    submitted:
      "Feature request submitted: **{{title}}** ({{impact}}). Thanks — we'll review it.",
    impacts: {
      'nice-to-have': 'Nice to have',
      useful: 'Useful',
      important: 'Important',
      critical: 'Critical',
    },
  },

  feedback: {
    title: 'Share feedback',
    close: 'Close feedback form',
    aboutResponse: 'About this response',
    generalFeedback: 'General feedback',
    noReply: 'No assistant reply to anchor to — this will be logged as general feedback.',
    sentimentLabel: 'How did this response feel?',
    tagsLabel: 'What kind of issue?',
    optional: '(optional)',
    commentLabel: 'What would have made this better?',
    commentPlaceholder: "Be specific — what worked, what didn't, what was missing...",
    submit: 'Submit feedback',
    submitting: 'Submitting...',
    cancel: 'Cancel',
    commentRequired: 'Please share a short comment.',
    submitFailed: 'Failed to submit.',
    requestFailed: 'Request failed ({{status}})',
    logged: 'Thanks — feedback logged ({{sentiment}}). This helps us improve Branddock.',
    sentiments: {
      positive: 'Positive',
      neutral: 'Neutral',
      negative: 'Negative',
    },
    tags: {
      inaccurate: 'Inaccurate',
      'off-brand': 'Off-brand',
      'too-verbose': 'Too verbose',
      'too-generic': 'Too generic',
      unhelpful: 'Unhelpful',
      other: 'Other',
    },
  },

  input: {
    placeholder: 'Ask anything about your brand, personas, campaigns...',
    send: 'Send',
    sendAria: 'Send message',
    contextAction: 'Context',
    textAction: 'Text',
    fileAction: 'File',
    urlAction: 'URL',
    removeAttachment: 'Remove {{label}}',
    pasteTextPrompt: 'Paste text to include as context:',
    pastedTextLabel: 'Pasted text',
    enterUrlPrompt: 'Enter URL to scrape:',
    scrapingUrl: 'Scraping {{url}}...',
    parsingFile: 'Parsing {{name}}...',
    keyboardHint: 'Enter to send · Shift + Enter for new line',
    editContext: 'Edit',
    sourcesInContext_one: '{{count}} source in context',
    sourcesInContext_other: '{{count}} sources in context',
    errors: {
      credits:
        "**Anthropic API credits are exhausted.** The AI assistant can't respond until credits are topped up. Go to [console.anthropic.com](https://console.anthropic.com/settings/billing) → Plans & Billing to add credits. Other AI flows (OpenAI / Gemini) keep working — only Anthropic calls fail until you top up.",
      rateLimit:
        '**Quick pause.** The AI assistant received too many requests in a short time. Wait 30 seconds and try again. If this keeps happening, raise the rate limit on the API account.',
      auth:
        "**API key invalid.** Check `ANTHROPIC_API_KEY` in the environment config. The AI assistant stays unavailable until that's fixed.",
      generic:
        '**AI assistant error**\n\n{{detail}}\n\nTry again. If the error persists, check the server logs.',
      unknown: 'unknown error',
    },
  },

  context: {
    title: 'Context Sources',
    subtitle: 'Select which brand data the assistant can access',
    done: 'Done',
    tokensSummary: '~{{tokens}} tokens ({{sources}} sources)',
    selectedCount: '({{n}} selected)',
    allIncluded: 'No selection = all included',
    modules: {
      brand_assets: {
        label: 'Brand Assets',
        description: 'All 12 brand foundation assets with framework data',
      },
      brandstyle: {
        label: 'Brandstyle',
        description: 'Colors, typography, tone of voice, visual language',
      },
      personas: {
        label: 'Personas',
        description: 'Target audience profiles with demographics and psychographics',
      },
      products: {
        label: 'Products & Services',
        description: 'Product catalog with features and pricing',
      },
      competitors: {
        label: 'Competitors',
        description: 'Competitor analysis with positioning and scores',
      },
      trends: {
        label: 'Trends',
        description: 'Detected market trends and relevance scores',
      },
      strategies: {
        label: 'Business Strategies',
        description: 'OKR strategies with objectives and progress',
      },
      campaigns: {
        label: 'Campaigns',
        description: 'Active campaigns with strategy and deliverables',
      },
      alignment: {
        label: 'Brand Alignment',
        description: 'Consistency issues between brand elements',
      },
      knowledge: {
        label: 'Knowledge Library',
        description: 'Articles, case studies, and resources',
      },
      dashboard: {
        label: 'Dashboard Stats',
        description: 'Workspace health metrics and readiness',
      },
      observations: {
        label: 'Brand Observations',
        description:
          'AI-generated brand signals from Brandclaw analysis (drift, fidelity, alignment)',
      },
    },
  },

  sidebar: {
    newConversation: 'New conversation',
    searchPlaceholder: 'Search conversations…',
    clearSearch: 'Clear search',
    rename: 'Rename',
    renameTitle: 'Rename (or double-click)',
    delete: 'Delete',
    saveRename: 'Save rename',
    untitled: 'Untitled',
    empty: 'No conversations yet',
    noMatches: 'No matches for "{{query}}"',
    deleted: 'Deleted "{{title}}"',
    undo: 'Undo',
    renameFailed: 'Could not rename conversation',
    groups: {
      today: 'Today',
      yesterday: 'Yesterday',
      thisWeek: 'This Week',
      older: 'Older',
    },
  },

  mutation: {
    proposedChange: 'Proposed Change',
    moreChangesAfter_one: '+{{count}} more change after',
    moreChangesAfter_other: '+{{count}} more changes after',
    updateFormFields: 'This will update the form fields on this page. Save manually to persist.',
    updateData: 'This will update the data and create a version snapshot.',
    skip: 'Skip',
    edit: 'Edit',
    editing: 'Editing',
    applyWithEdits: 'Apply with edits',
    applyChange: 'Apply change',
    applying: 'Applying…',
    doneMessage: 'Done — {{description}}.',
    changeSkipped: 'Change skipped.',
  },

  toast: {
    filledWizardFields_one: 'Filled {{count}} wizard field',
    filledWizardFields_other: 'Filled {{count}} wizard fields',
    filledFields_one: 'Filled {{count}} field',
    filledFields_other: 'Filled {{count}} fields',
    couldNotFillFields_one: "Couldn't fill {{count}} field: {{fields}}",
    couldNotFillFields_other: "Couldn't fill {{count}} fields: {{fields}}",
    openingCanvas: 'Opening Canvas for "{{name}}"',
    openingCampaign: 'Opening campaign "{{name}}"',
    created: 'Created "{{name}}"',
    view: 'View →',
  },

  quick: {
    title: 'Quick Content',
    close: 'Close',
    contentTypeLabel: 'Content type',
    pickType: 'Pick a type…',
    campaignLabel: 'Campaign',
    loadingCampaigns: 'Loading campaigns…',
    noCampaignsTitle: 'No campaigns in this workspace yet.',
    noCampaignsBody:
      'Quick Content adds a deliverable to an existing campaign. Create a campaign first to set its strategy, audience and timing.',
    openCampaigns: 'Open Campaigns',
    pickCampaign: 'Pick a campaign…',
    titleLabel: 'Title',
    optional: '(optional)',
    titlePlaceholder: 'Defaults to the content type label',
    briefingLabel: 'Briefing',
    briefingOptional: '(optional but recommended)',
    objectiveLabel: 'Objective',
    objectivePlaceholder: 'What this content should achieve',
    keyMessageLabel: 'Key message',
    keyMessagePlaceholder: 'The single thing the audience should take away',
    toneLabel: 'Tone direction',
    tonePlaceholder: 'e.g. authoritative, playful, urgent',
    ctaLabel: 'Call to action',
    ctaPlaceholder: 'What should the audience do next?',
    create: 'Create & Open Canvas',
    creating: 'Creating…',
    cancel: 'Cancel',
    pickContentType: 'Pick a content type',
    pickCampaignError: 'Pick a campaign',
    createFailed: 'Failed to create',
    createDeliverableFailed: 'Failed to create deliverable',
    created: 'Created **{{title}}** — opening the Canvas now.',
    untitled: 'Untitled',
  },

  slash: {
    ariaLabel: 'Slash commands',
    commands: 'Commands',
    navigate: 'navigate',
    select: 'select',
    dismiss: 'dismiss',
  },

  review: {
    thresholdMet: 'Threshold met',
    belowThreshold: 'Below threshold',
    findingCount_one: '{{count}} finding',
    findingCount_other: '{{count}} findings',
    topOf: 'Top {{shown}} of {{total}}',
    viewAll: 'View all {{total}} findings',
    couldNotReview: 'Could not review content',
    categories: {
      VOICE: 'Voice',
      TERMINOLOGY: 'Terminology',
      CLAIMS: 'Claims',
      STYLE: 'Style',
      BUSINESS: 'Business',
      AI_TELL: 'AI tell',
    },
  },
} as const;

export default claw;

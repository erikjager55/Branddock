// Canonical (source-of-truth) English UI strings — `shared` namespace.
// Covers the shared primitives in src/components/shared/.
const ns = {
  modal: {
    closeLabel: 'Close',
  },
  comingSoon: {
    defaultTitle: 'Coming Soon',
    defaultDescription: 'This feature is currently under development.',
    plannedFeatures: 'Planned Features',
    goBack: 'Go Back',
    // Render-edge translations for the MODULE_INFO registry, keyed by sectionId.
    // The English source stays in the component; these provide localized copy.
    modules: {
      'business-strategy': {
        title: 'Business Strategy',
        description:
          'Define your business model, strategic objectives, competitive positioning, and growth roadmap to align your brand with long-term goals.',
        features: {
          '0': 'Business model canvas',
          '1': 'Strategic objectives',
          '2': 'Competitive positioning',
          '3': 'Growth roadmap',
        },
      },
      personas: {
        title: 'Personas',
        description:
          'Create detailed personas with AI-powered analysis, chat with your personas, and validate them through multiple research methods.',
        features: {
          '0': 'AI-powered persona creation',
          '1': 'Chat with your personas',
          '2': 'AI image generation',
          '3': 'Impact badges & strategic implications',
        },
      },
      products: {
        title: 'Products & Services',
        description:
          'Document your products and services with feature matrices, pricing tiers, competitive positioning, and brand alignment scores.',
        features: {
          '0': 'Product catalog management',
          '1': 'Feature matrices',
          '2': 'Competitive positioning',
          '3': 'Brand alignment scores',
        },
      },
      trends: {
        title: 'Market Insights',
        description:
          'AI-powered market analysis with competitor tracking, trend monitoring, and strategic opportunity identification.',
        features: {
          '0': 'Competitor tracking',
          '1': 'Trend monitoring',
          '2': 'AI market analysis',
          '3': 'Strategic opportunities',
        },
      },
      knowledge: {
        title: 'Knowledge Library',
        description:
          'A searchable library of all your brand knowledge: documents, research findings, brand guidelines, and AI-generated insights.',
        features: {
          '0': 'Document management',
          '1': 'Smart import',
          '2': 'AI-powered search',
          '3': 'Research findings archive',
        },
      },
      'brand-alignment': {
        title: 'Brand Alignment',
        description:
          'Automated brand consistency checker that identifies misalignments across your brand assets and provides AI-powered fix suggestions.',
        features: {
          '0': 'Cross-asset consistency scan',
          '1': 'AI fix suggestions',
          '2': 'Alignment score tracking',
          '3': 'Issue prioritization',
        },
      },
      research: {
        title: 'Research Hub',
        description:
          'Your research command center: plan studies, manage participants, analyze results, and track validation progress.',
      },
      'research-bundles': {
        title: 'Research Bundles',
        description:
          'Purchase pre-configured research bundles that combine multiple validation methods for comprehensive brand insights.',
      },
      'custom-validation': {
        title: 'Custom Validations',
        description:
          'Design custom validation workflows tailored to your specific research needs and brand objectives.',
      },
      'active-campaigns': {
        title: 'Active Campaigns',
        description:
          'Create, manage, and track your marketing campaigns with AI-powered content generation and performance analytics.',
        features: {
          '0': 'Campaign wizard',
          '1': 'AI content generation',
          '2': 'Performance tracking',
          '3': 'Multi-channel publishing',
        },
      },
      'content-library': {
        title: 'Content Library',
        description:
          'Your centralized library for all AI-generated and manually created content assets, organized by campaign and type.',
      },
      settings: {
        title: 'Settings',
        description:
          'Manage your account settings, team members, billing, notifications, and appearance preferences.',
      },
      help: {
        title: 'Help & Support',
        description:
          'Browse help articles, watch tutorials, and contact our support team for assistance.',
      },
    },
  },
  styleGuidelines: {
    title: 'Style Guidelines',
    description: 'Describe what the generated images should and should not include.',
    dos: "Do's",
    donts: "Don'ts",
    dosPlaceholder:
      'e.g. Natural lighting, warm tones, eye contact with camera, professional attire...',
    dontsPlaceholder:
      'e.g. No sunglasses, no hats, no busy backgrounds, no text overlays...',
  },
  brandContextTags: {
    title: 'Brand Context Tags',
    description:
      "Select the brand keywords to include in the generation prompts. Deselect tags you don't want to influence the output.",
    loading: 'Loading brand context…',
    empty: 'No brand context available. Images will be generated with default prompts.',
    addPlaceholder: 'Add keyword...',
    add: 'Add',
  },
  itemKnowledge: {
    title: 'Knowledge Sources',
    add: 'Add',
    cancel: 'Cancel',
    emptyTitle: 'No knowledge sources',
    emptyDescription: 'Add documents, URLs or text as additional context for AI sessions.',
    notProcessed: 'Not processed',
    deleteConfirm: 'Are you sure you want to delete "{{title}}"?',
    deleted: '"{{title}}" deleted',
    deleteFailed: 'Failed to delete',
    modalTitle: 'Add Knowledge Source',
    modalSubtitle: 'Add additional context for AI sessions',
    titleRequired: 'Title is required',
    contentRequired: 'Content is required',
    urlRequired: 'URL is required',
    selectFile: 'Select a file',
    added: 'Knowledge source added',
    addFailed: 'Failed to add',
    fieldTitle: 'Title',
    fieldDescription: 'Description',
    fieldContent: 'Content',
    fieldUrl: 'URL',
    fieldFile: 'File',
    titlePlaceholder: 'e.g. Market Research Q1 2026',
    descriptionPlaceholder: 'Short description (optional)',
    contentPlaceholder: 'Paste your text, notes, or knowledge source here...',
    clickToSelect: 'Click to select a file',
    maxSize: 'Max 50MB',
    // Render-edge for the SOURCE_TYPE_LABELS registry, keyed by sourceType.
    sourceTypes: {
      file: 'File',
      url: 'URL',
      text: 'Text',
    },
  },
  contextSelector: {
    title: 'Select Knowledge Context',
    itemsAvailable_one: '{{count}} item available',
    itemsAvailable_other: '{{count}} items available',
    selectedCount_one: '{{count}} item selected',
    selectedCount_other: '{{count}} items selected',
    cancel: 'Cancel',
    apply: 'Apply Selection',
    applying: 'Applying...',
    all: 'All',
    addKnowledge: 'Add knowledge (link or file)',
    link: 'Link',
    file: 'File',
    titlePlaceholder: 'Title',
    linkDescPlaceholder: 'What this is about (optional context for the AI)',
    addToLibrary: 'Add to library',
    adding: 'Adding…',
    chooseFile: 'Click to choose a file',
    uploading: 'Uploading…',
    fileHint: 'Max {{max}}MB · {{extensions}} · PDF and text are read into the AI context',
    searchPlaceholder: 'Search knowledge items...',
    loadingContext: 'Loading available context...',
    noSearchMatch: 'No items match your search',
    loadGroupFailed: 'Could not load {{group}}. Try again later.',
    groupEmpty: 'No items in {{group}} yet.',
    addHintGroup: 'Use Add knowledge above to add a link or file.',
    someSourcesFailed: 'Some sources could not load. Showing what is available.',
    workspaceEmpty: 'No context items in this workspace yet.',
    addHintFirst: 'Use Add knowledge above to add your first item.',
    useAs: 'Use as:',
    sourceMaterial: 'Source material',
    reference: 'Reference',
    guidancePlaceholder:
      'Guidance for the AI on this source — e.g. emphasize this vision, play up this contrast (optional)',
    titleUrlRequired: 'Title and URL are required',
    invalidUrl: 'Enter a valid URL (e.g. https://example.com)',
    addLinkFailed: 'Could not add the link',
    uploadFailed: 'Could not upload the file',
    fileTooLarge: 'File too large (max {{max}}MB)',
  },
  workspaceSwitch: {
    title: 'Workspace changed in another tab',
    nowNamed: 'The active workspace is now “{{name}}”.',
    changedGeneric: 'The active workspace or organization has changed.',
    warning:
      'This tab was looking at a different workspace and cannot safely continue — changes would be silently lost.',
    reload: 'Reload this tab',
  },
} as const;

export default ns;

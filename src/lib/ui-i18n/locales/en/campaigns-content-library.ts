// Canonical (source-of-truth) English UI strings — `campaigns-content-library` namespace.
const ns = {
  common: {
    untitled: 'Untitled',
    prev: 'Prev',
    next: 'Next',
    showLess: 'Show less',
    more: '+{{n}} more',
    allContent: 'All content',
  },
  selectedCount: '{{n}} selected',

  chips: {
    label: 'Filters:',
    campaign: 'Campaign: {{name}}',
    qualityMin: 'Quality ≥ {{min}}',
    scheduledRange: 'Scheduled {{from}} → {{to}}',
    scheduledFrom: 'Scheduled from {{from}}',
    scheduledUntil: 'Scheduled until {{to}}',
    scheduled: 'Scheduled',
    remove: 'Remove {{label}}',
    campaignType: {
      STRATEGIC: 'Strategic',
      QUICK: 'Quick',
      CONTENT: 'Content',
    },
    readinessHint: {
      'no-content': 'No content',
      'not-reviewed': 'Not reviewed',
      'pipeline-incomplete': 'Pipeline incomplete',
    },
    phase: {
      awareness: 'Awareness',
      consideration: 'Consideration',
      conversion: 'Conversion',
      retention: 'Retention',
    },
  },

  filterBar: {
    content: 'Content',
    strategy: 'Strategy',
    searchPlaceholder: 'Search content...',
    timeline: 'Timeline',
    sort: {
      newest: 'Newest first',
      oldest: 'Oldest first',
      recentlyCreated: 'Recently created',
      nameAsc: 'Name A→Z',
      nameDesc: 'Name Z→A',
      qualityHigh: 'Highest quality',
      qualityLow: 'Lowest quality',
      scheduledEarliest: 'Earliest scheduled',
      scheduledLatest: 'Latest scheduled',
    },
  },

  filters: {
    regionLabel: 'Content filters',
    clearAll: 'Clear all filters',
    contentType: {
      heading: 'Content Type',
      all: 'All types',
    },
    status: {
      heading: 'Status',
      all: 'All',
      favorites: 'Favorites',
      favoritesOnly: 'Favorites only',
      options: {
        red: 'Not started',
        amber: 'In progress',
        green: 'Ready',
      },
    },
    phase: {
      heading: 'Journey Phase',
      selectCampaign: 'Select a campaign',
      all: 'All phases',
      disabledTitle: 'Filter a single campaign to pick its journey phases',
      options: {
        awareness: 'Awareness',
        consideration: 'Consideration',
        conversion: 'Conversion',
        retention: 'Retention',
      },
    },
    readinessGap: {
      heading: 'Readiness Gap',
      any: 'Any',
      options: {
        'no-content': 'No content generated',
        'not-reviewed': 'Not reviewed',
        'pipeline-incomplete': 'Pipeline incomplete',
      },
    },
    campaign: {
      heading: 'Campaign',
      all: 'All campaigns',
      searchPlaceholder: 'Search campaigns...',
      none: 'No campaigns found',
    },
    category: {
      selectAll: 'Select all types in {{label}}',
      deselectAll: 'Deselect all types in {{label}}',
    },
  },

  stats: {
    totalContent: 'Total Content',
    complete: 'Complete',
    inProgress: 'In Progress',
    avgQuality: 'Avg Quality',
  },

  groupHeader: {
    strategic: 'Strategic',
    quick: 'Quick',
    item_one: '{{count}} item',
    item_other: '{{count}} items',
  },

  groupToggle: {
    grouped: 'Grouped',
    group: 'Group',
    ungroupTitle: 'Ungroup items',
    groupTitle: 'Group by campaign',
  },

  favorites: {
    showAll: 'Show all content',
    showFavorites: 'Show favorites only',
  },

  card: {
    untitledPlaceholder: 'Untitled {{type}}',
    toggleFavorite: 'Toggle favorite',
    duplicate: 'Duplicate',
    delete: 'Delete',
    openInCanvas: 'Open in Canvas',
    canvas: 'Canvas',
  },

  list: {
    title: 'Title',
    type: 'Type',
    campaign: 'Campaign',
    scheduled: 'Scheduled',
    readiness: 'Readiness',
    phase: 'Phase',
    actions: 'Actions',
  },

  bulk: {
    title: 'Generate more content',
    cancel: 'Cancel',
    generateN: 'Generate {{n}}',
    contentType: 'Content Type',
    pickType: 'Pick a content type…',
    quantity: 'Quantity',
    maxHint: '(max {{max}})',
    basedOn: 'Based on',
    optional: '(optional)',
    noSource: 'No source (fresh brief)',
    inheritSameType:
      'Briefing, medium config, and type-specific inputs will be inherited.',
    inheritDiffType:
      'Briefing + persona will be inherited. Medium config is skipped (different type).',
    noCompleted:
      'No completed deliverables in this campaign yet — new items will start fresh.',
    optionalGuidance: 'Optional guidance',
    guidancePlaceholder:
      "e.g. Focus on our new AI feature launch. Target mid-funnel users who've already seen the teaser campaign.",
    somethingWrong: 'Something went wrong',
  },

  calendar: {
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    today: 'Today',
    noContentThisMonth: 'No content this month',
    overdue: '{{n}} overdue',
    scheduled: '{{n}} scheduled',
    published: '{{n}} published',
    unscheduled: '{{n}} unscheduled',
    unscheduledHeading: 'Unscheduled ({{n}})',
    dragHint: 'Drag onto a date or use the date picker',
    emptyTitle: 'No content yet',
    emptyDescription: 'Create your first piece to see it on the calendar.',
    helperNote:
      'Drag a card onto a date or hover the card and click the date icon to pick an exact day. Default time follows channel best-practice (LinkedIn 14:00, Instagram 11:00, else 10:00). Moving a scheduled item preserves its time.',
  },

  timeline: {
    title: 'Timeline',
    groupByLabel: 'Group by',
    groupByAria: 'Group timeline by',
    groupBy: {
      phase: 'Journey Phase',
      campaign: 'Campaign',
      channel: 'Content Type',
      none: 'No grouping',
    },
    zoom: {
      day: 'Day',
      week: 'Week',
      month: 'Month',
    },
    zoomTitle: '{{label}} zoom ({{key}})',
    jumpToday: 'Jump to today (T)',
    today: 'Today',
    showEmptyTitle: 'Show empty lanes (H)',
    showEmpty: 'Show {{n}} empty',
    hideEmptyTitle: 'Hide lanes with no scheduled items (H)',
    hideEmpty: 'Hide empty',
    acceptAllTitle: 'Commit all AI-suggested dates as scheduled',
    acceptSuggestions_one: 'Accept {{count}} suggestion',
    acceptSuggestions_other: 'Accept {{count}} suggestions',
    weeks: '{{n}} weeks',
    committedTitle: 'User-committed dates',
    committedScheduled: '{{n}} scheduled',
    suggestedTitle: 'AI-suggested dates (not yet accepted)',
    suggested: '{{n}} suggested',
    unscheduled: '{{n}} unscheduled',
    unscheduledHeading: 'Unscheduled',
    filterPlaceholder: 'Filter unscheduled...',
    dragWeekHint: 'Drag onto a week or use the date picker',
    noMatches: 'No matches for "{{query}}".',
    beatTitle_one: '{{label}}\n{{count}} item',
    beatTitle_other: '{{label}}\n{{count}} items',
    suggestedCardTitle:
      'AI-suggested date — drag to reschedule or click Accept to commit',
    groupValue: {
      noPhase: 'No phase',
      noChannel: 'No channel',
      allContent: 'All content',
      untitledCampaign: 'Untitled campaign',
      noScheduled: 'No scheduled items yet',
    },
  },

  page: {
    title: 'Content',
    subtitle: 'Browse and manage all your generated content',
    viewCampaigns: 'View Campaigns',
    createContent: 'Create Content',
    emptyTitle: 'No content found',
    emptyDescription: 'Create content with the wizard, or adjust your filters.',
    prompts: {
      linkedin: 'Write a LinkedIn post about our latest product launch',
      socialPosts: 'Generate 5 social posts for this campaign',
      blogPosts: 'Turn our whitepaper into 3 blog posts',
    },
  },

  campaignMode: {
    agentStrategyTitle: 'Agent strategy',
    agentStrategySubtitle: 'Strategy direction from the Strategist agent — run the campaign wizard for a full blueprint',
    allContent: 'All content',
    notFound: 'Campaign not found.',
    strategic: 'Strategic',
    quick: 'Quick',
    descriptionPlaceholder: 'Add a description...',
    save: 'Save',
    cancel: 'Cancel',
    personas: 'Personas',
    channels: 'Channels',
    addDeliverable: 'Add Deliverable',
    generateDrafts: 'Generate Drafts ({{n}})',
    generatingDrafts: 'Generating drafts...',
    draftComplete: 'Draft generation complete',
    generatedFailed: '{{generated}} generated, {{failed}} failed',
    journeyPhases: 'Journey Phases',
    touchpoints: 'Touchpoints',
    deliverables: 'Deliverables',
    campaignStrategy: 'Campaign Strategy',
    exportPdf: 'Export PDF',
    exportJson: 'Export JSON',
    generateBrief: 'Generate brief',
    strategyEmptyTitle: 'Strategy not available yet',
    strategyEmptyDescription:
      'Generate a campaign strategy to see the strategic approach.',
    campaignFallback: 'Campaign',
  },

  quickPublish: {
    trigger: 'Quick publish',
    approveNow: 'Approve now',
    approveSchedule: 'Approve + Schedule…',
    sameAsLast: 'Schedule same as last',
    schedulePublish: 'Schedule publish',
    back: 'Back',
    approveScheduleShort: 'Approve + Schedule',
  },

  repeat: {
    repeatLast: 'Repeat last',
    duplicateTitle: 'Duplicate {{type}} with the same settings',
    specificType: 'Repeat a specific content type',
    repeatByType: 'Repeat by type',
  },
} as const;

export default ns;

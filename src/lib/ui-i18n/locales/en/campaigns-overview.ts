// Canonical (source-of-truth) English UI strings — `campaigns-overview` namespace.
const ns = {
  page: {
    title: 'Campaigns',
    subtitle: 'Plan, create, and manage your campaigns',
  },
  actions: {
    createContent: 'Create Content',
    newCampaign: 'New Campaign',
  },
  filters: {
    all: 'All',
    strategic: 'Strategic',
    quick: 'Quick',
    completed: 'Completed',
    searchPlaceholder: 'Search campaigns...',
  },
  empty: {
    title: 'No campaigns found',
    description: 'Create your first campaign or quick content to get started.',
  },
  list: {
    columns: {
      campaign: 'Campaign',
      type: 'Type',
      readiness: 'Readiness',
      progress: 'Progress',
      content: 'Content',
      scheduled: 'Scheduled',
    },
  },
  menu: {
    edit: 'Edit',
    duplicate: 'Duplicate',
    archive: 'Archive',
    unarchive: 'Unarchive',
    delete: 'Delete',
  },
  stats: {
    activeCampaigns: 'Active Campaigns',
    quickContent: 'Quick Content',
    completed: 'Completed',
    totalContent: 'Total Content',
  },
  status: {
    active: 'Active',
    completed: 'Completed',
    archived: 'Archived',
  },
  type: {
    strategic: 'Strategic',
    quick: 'Quick',
  },
  calendar: {
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    today: 'Today',
    campaignsThisView_one: '{{count}} campaign this view',
    campaignsThisView_other: '{{count}} campaigns this view',
    showUndated: 'Show undated ({{count}})',
    hideUndated: 'Hide undated ({{count}})',
    barTooltip_one:
      '{{title}} — {{type}}, {{count}} day (drag to reschedule, drag edges to resize)',
    barTooltip_other:
      '{{title}} — {{type}}, {{count}} days (drag to reschedule, drag edges to resize)',
    dragStartDate: 'Drag to change start date',
    dragEndDate: 'Drag to change end date',
    undatedHeading: 'Undated campaigns',
    undatedHelpNone: 'No campaigns have a start date yet — open one to schedule',
    undatedHelpSome: 'These campaigns have no start date — open one to schedule',
    undatedTooltip: '{{title}} — {{type}}, {{status}}',
    helperNote:
      'Click a bar to open the campaign. Drag a bar to reschedule (preserves duration). Hover the bar edges and drag the colored handles to resize the start or end date.',
  },
  draft: {
    heading: 'Drafts in progress',
    countOf: '{{count}} of {{limit}}',
    stepProgress: 'Step {{step}} of {{total}} ({{label}}) · saved {{time}}',
    stepFallback: 'Step {{step}}',
    archive: 'Archive',
    archiveTooltip: 'Move to archive — can be restored later',
    continue: 'Continue',
  },
  steps: {
    setup: 'Setup',
    knowledge: 'Knowledge',
    strategy: 'Strategy',
    concept: 'Concept',
    deliverables: 'Deliverables',
    review: 'Review',
    content: 'Content',
  },
  picker: {
    title: 'Continue a draft or start new?',
    titleAtLimit: 'Maximum drafts reached',
    subtitleAtLimit:
      'You have {{limit}} drafts in progress (the maximum). Resume or archive one before starting a new campaign.',
    subtitle_one:
      'You have {{count}} draft in progress. Resume one or start a new campaign.',
    subtitle_other:
      'You have {{count}} drafts in progress. Resume one or start a new campaign.',
    archivedNote: 'Archived drafts can be restored from the archived campaigns view.',
    startNew: 'Start new campaign',
  },
  quick: {
    badge: 'Quick',
    done: 'Done',
    quality: 'Quality',
    open: 'Open →',
  },
  card: {
    assets_one: '{{count}} asset',
    assets_other: '{{count}} assets',
    deliverables_one: '{{count}} deliverable',
    deliverables_other: '{{count}} deliverables',
    updated: 'Updated {{date}}',
    viewCampaign: 'View Campaign →',
  },
} as const;

export default ns;

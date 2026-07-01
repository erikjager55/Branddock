// Canonical (source-of-truth) English UI strings — `brand-alignment` namespace.
const ns = {
  // Shared plural — reused across Content Review + Insights.
  findings_one: '{{count}} finding',
  findings_other: '{{count}} findings',

  page: {
    title: 'Brand Alignment',
    subtitle: 'Ensure consistency across all brand touchpoints',
    loading: 'Loading alignment data...',
    loadError: 'Failed to load alignment data',
    exportPdf: 'Export PDF',
    exportJson: 'Export JSON',
    scanning: 'Scanning...',
    runCheck: 'Run Alignment Check',
    noScanTitle: 'No alignment scan yet',
    noScanDescription:
      'Run your first scan to check consistency across all brand modules and identify misalignments.',
    startFirstScan: 'Start First Scan',
  },

  tabs: {
    alignment: 'Brand Alignment',
    audit: 'Brand Audit',
    review: 'Content Review',
    insights: 'Insights',
    brandclaw: 'Strategy Analyst',
  },

  stats: {
    aligned: 'Aligned',
    needsReview: 'Needs Review',
    misaligned: 'Misaligned',
  },

  issues: {
    heading: 'Alignment Issues',
    itemsNeedReview_one: '{{count}} item needs review',
    itemsNeedReview_other: '{{count}} items need review',
    emptyFilteredTitle: 'No issues match filters',
    emptyTitle: 'No issues found',
    emptyFilteredDescription: 'Try adjusting your filters to see more issues.',
    emptyDescription: 'Your brand assets are fully aligned!',
    resetFilters: 'Reset Filters',
  },

  scanModal: {
    title: 'Analyzing Brand Alignment',
    subtitle: 'Checking consistency across all modules',
    progress: 'Progress',
    footer: 'Analyzing 18 knowledge items across 6 modules. This may take up to 30 seconds.',
    cancel: 'Cancel',
  },

  scanComplete: {
    title: 'Alignment Scan Complete',
    scoreLine: 'Score: {{score}}% · {{count}} issues found',
    viewResults: 'View Results',
  },

  scanProgress: {
    completeTitle: 'Scan Complete',
    failedTitle: 'Scan Failed',
    runningTitle: 'Running Alignment Scan',
    completeSubtitle: 'Your brand alignment report is ready.',
    failedSubtitle: 'Something went wrong. Please try again.',
    runningSubtitle: 'Checking consistency across all brand modules...',
    progress: 'Progress',
  },

  scanSteps: {
    foundation: 'Analysing Brand Foundation...',
    strategy: 'Checking Business Strategy alignment...',
    brandstyle: 'Verifying Brandstyle consistency...',
    personas: 'Scanning Personas data...',
    products: 'Reviewing Products & Services...',
    market: 'Cross-referencing Market Insights...',
    report: 'Generating alignment report...',
  },

  moduleGrid: {
    heading: 'Module Scores',
  },

  moduleCard: {
    alignment: 'alignment',
    alignedCount: '{{count}} aligned',
    reviewCount: '{{count}} review',
    issuesCount: '{{count}} issues',
    lastChecked: 'Last checked: {{time}}',
    view: 'View →',
  },

  auditView: {
    loading: 'Loading audit data...',
    loadError: 'Failed to load audit data',
    emptyTitle: 'No brand audit yet',
    emptyDescription:
      'Run your first brand audit to get a comprehensive analysis of your brand strength with concrete improvement points.',
    analyzing: 'Analyzing...',
    runAudit: 'Run Brand Audit',
    lastAudit: 'Last audit: {{date}}',
    rerunAudit: 'Re-run Audit',
  },

  auditScore: {
    title: 'Brand Strength Score',
    strong: 'Your brand foundation is strong. Focus on differentiation and activation.',
    good: 'Good progress. Address the weaker dimensions to strengthen your brand.',
    weak: 'Your brand needs attention. Start by completing your brand assets.',
  },

  auditTable: {
    title: 'Per-Asset Assessment',
    subtitle: 'Sorted by weakest first — address top items for maximum impact.',
    complete: 'Complete',
    quality: 'Quality',
  },

  auditImprovements: {
    title: 'Top Improvements',
    subtitle: 'Prioritized actions to strengthen your brand.',
    impact: {
      HIGH: 'High Impact',
      MEDIUM: 'Medium Impact',
      LOW: 'Low Impact',
    },
    effort: {
      LOW: 'Quick win',
      MEDIUM: 'Moderate effort',
      HIGH: 'Significant effort',
    },
  },

  contentReview: {
    title: 'Content review',
    subtitle: 'Paste a text or URL for F-VAL fidelity scoring with findings.',
    newReview: 'New review',
    pasteTab: 'Paste text',
    urlTab: 'URL',
    pastePlaceholder: 'Paste content here (min {{min}} chars)...',
    charsUnit: 'chars',
    charMin: ' — minimum {{min}}',
    charTooLong: ' — too long',
    urlPlaceholder: 'https://example.com/blog-post',
    urlNote: 'Public URL only — private IPs and non-http(s) schemes are rejected server-side.',
    reviewing: 'Reviewing...',
    reviewContent: 'Review content',
  },

  result: {
    noMatch: 'No findings match the current filters.',
    fvalScore: 'F-VAL score',
    thresholdMet: 'Threshold met',
    belowThreshold: 'Below threshold',
    runTook: ' · run took {{seconds}}s',
    scorerPrefix: ' · scorer ',
    severityLabel: 'Severity:',
    categoryLabel: 'Category:',
    colSeverity: 'Severity',
    colCategory: 'Category',
    colLocation: 'Location',
    colDescription: 'Description',
    suggestion: 'Suggestion:',
    before: 'Before',
    after: 'After',
    loadingFindings: 'Loading findings...',
    loadFindingsError: 'Failed to load findings: {{message}}',
    noFindingsTitle: 'No findings',
    noFindingsDescription: 'Content passed F-VAL evaluation without issues.',
  },

  categoryLabels: {
    VOICE: 'Voice',
    TERMINOLOGY: 'Terminology',
    CLAIMS: 'Claims',
    STYLE: 'Style',
    BUSINESS: 'Business',
    AI_TELL: 'AI tell',
  },

  feedback: {
    loadError: 'Failed to load feedback-loop metrics',
    autoIterateTitle: 'Auto-iterate (30 days)',
    autoIterateEmpty: 'No auto-iterate runs yet. Set FEATURE_AUTO_ITERATE=true to get started.',
    totalRuns: 'Total runs',
    successRate: 'Success rate',
    avgIterations: 'Avg. iterations',
    avgScoreDelta: 'Avg. score delta',
    templatesTitle: 'Top hint templates (effectiveness)',
    templatesEmpty: 'No template applications recorded. Appears after the first auto-iterate run.',
    scoreSuffix: 'score',
    editsTitle: 'Inline edits per component type ({{count}} total)',
    editsEmpty: 'No content.edited events recorded yet.',
    colComponentType: 'Component type',
    colEdits: 'Edits',
    colSignificant: 'Significant (>20%)',
    colAvgDistance: 'Avg. distance',
  },

  fixModal: {
    title: 'Fix Alignment Issue',
    loadingOptions: 'Loading fix options...',
    dismiss: 'Dismiss',
    editManually: 'Edit Manually',
    applyFix: 'Apply Fix',
    loadError: 'Failed to load fix options',
  },

  fixOption: {
    optionLabel: 'Option {{key}}: {{title}}',
  },

  fixOptions: {
    aiSuggestedFix: 'AI Suggested Fix',
    chooseApproach: 'Choose an approach:',
  },

  issueCard: {
    viewSource: 'View Source',
    dismiss: 'Dismiss',
    fix: 'Fix',
  },

  filters: {
    statusOpen: 'Open',
    statusDismissed: 'Dismissed',
    statusFixed: 'Fixed',
    severityCritical: 'Critical',
    severityWarning: 'Warning',
    severitySuggestion: 'Suggestion',
    allIssues: 'All Issues',
    allModules: 'All Modules',
    allSeverity: 'All Severity',
    reset: 'Reset',
  },

  recommendation: {
    aiRecommendation: 'AI Recommendation',
  },

  issueSummary: {
    title: 'Issue Summary',
  },

  insights: {
    loading: 'Loading insights...',
    wsUnavailableTitle: 'Workspace context unavailable',
    wsUnavailableBody:
      'Insights are calculated per workspace, but no active workspace could be found. Try signing in again or switch to a different workspace via the header.',
    loadErrorTitle: 'Could not load insights',
    unknownError: 'Unknown error',
    emptyTitle: 'No reviews in the past 30 days',
    emptyBodyPre: 'Run a review via the ',
    emptyBodyStrong: 'Content Review',
    emptyBodyPost:
      ' tab, ask the Brand Assistant for feedback, or generate content via Canvas — insights appear here as soon as there is data.',
    title: 'Insights',
    subtitle:
      'Aggregates over the past 30 days — external (paste/url) + internal (canvas) combined, per workspace.',
    partialTitle: 'Partial aggregation',
    partialBody:
      ' — there are more than 5000 reviews in 30 days; the percentages shown are calculated over the 5000 most recent reviews. Older records are not included, so both absolute counts and the 7d trend may be underestimated for less recent days.',
    reviews30d: 'Reviews 30d',
    reviewsBreakdown: '{{external}} external · {{internal}} internal',
    thresholdPassRate: 'Threshold pass-rate',
    reviewsLast7d_one: '{{count}} review in last 7d',
    reviewsLast7d_other: '{{count}} reviews in last 7d',
    findings30d: 'Findings 30d',
    perReviewAvg: '{{value}} per review on average',
    perReviewZero: '0 per review',
    belowThresholdPublished: 'Below-threshold published',
    belowThresholdScores_one: '{{count}} below-threshold internal score',
    belowThresholdScores_other: '{{count}} below-threshold internal scores',
    noBelowThreshold: 'No below-threshold scores',
    passRateTrend: 'Pass-rate trend (7d)',
    reviewsCount_one: '{{count}} review',
    reviewsCount_other: '{{count}} reviews',
    inSevenDays: 'in 7 days',
    noReviews7d: 'No reviews in the past 7 days.',
    topCategories: 'Top finding categories',
    noFindings: 'No findings.',
    recentReviews: 'Recent reviews',
    noReviews: 'No reviews.',
    sourceLabels: {
      paste: 'Paste',
      url: 'URL',
      canvas: 'Canvas',
    },
  },

  brandclaw: {
    title: 'Strategy Analyst',
    subtitle:
      'Brandclaw observations on alignment / fidelity / review / voice drift. Read-only suggestions — no autonomy. You decide which ones to act on.',
    lastRun: 'Last run',
    running: 'Running…',
    runAnalyst: 'Run Analyst',
    runFailed: 'Analyst run failed: {{message}}',
    includeDismissed: 'Include dismissed',
    groupTooltip: 'Group per dimension',
    group: 'Group',
    severityTooltip: 'Sort by severity',
    severity: 'Severity',
    total: '{{count}} total',
    emptyTitle: 'No observations yet',
    emptyBody: 'Click "Run Analyst" at the top to start the first run.',
    loadError: 'Failed to load observations: {{message}}',
    unknownError: 'unknown error',
    severityOptions: {
      all: 'All severities',
      HIGH: 'High only',
      MEDIUM: 'Medium+',
      LOW: 'Low+',
    },
    dimensionOptions: {
      all: 'All dimensions',
      voice_drift: 'Voice drift',
      fidelity_decline: 'Fidelity decline',
      review_pattern: 'Review pattern',
      alignment_gap: 'Alignment gap',
      publish_quality_trend: 'Publish quality trend',
    },
  },

  evidence: {
    close: 'Close',
    title: 'Evidence-trail',
    summary: 'Summary',
    agentVersion: 'Agent version',
    promptVersion: 'Prompt version',
    snapshotEvidence: 'DataSnapshot evidence ({{count}})',
    noSnapshot: 'No snapshot evidence linked.',
    phaseBNote:
      'Phase B extension: click a snapshot id to view the persisted DataSnapshot.payload JSON (alignment-scan / fidelity-score / review-log content at snapshot time).',
    toolCallsReferenced: 'Tool-calls referenced ({{count}})',
  },

  observation: {
    severity: {
      HIGH: 'High',
      MEDIUM: 'Medium',
      LOW: 'Low',
    },
    confidence: {
      HIGH: 'High confidence',
      MEDIUM: 'Medium confidence',
      LOW: 'Low confidence',
    },
    dimension: {
      voice_drift: 'Voice drift',
      fidelity_decline: 'Fidelity decline',
      review_pattern: 'Review pattern',
      alignment_gap: 'Alignment gap',
      publish_quality_trend: 'Publish quality trend',
    },
    undoTitle: 'Undo all flags',
    undo: 'Undo',
    evidencePoints_one: '{{count}} evidence point',
    evidencePoints_other: '{{count}} evidence points',
    read: 'Read',
    acted: 'Acted',
    dismissed: 'Dismissed',
    markRead: 'Mark Read',
    markActed: 'Mark Acted',
    dismiss: 'Dismiss',
    confirm: 'Confirm',
    reasonPlaceholder: 'Reason (optional)',
  },

  voiceBaseline: {
    title: 'Brand Voice Baseline',
    subtitle: '(as F-VAL + Strategy Analyst read the baseline)',
    toneAttributes: 'Tone-attributes',
    axesDefined: '{{count}}/4 axes defined',
    terms: 'Terms',
    preferredTop10: 'Preferred (top 10)',
    avoidTop10: 'Avoid (top 10)',
    styleRules: 'Style rules',
    completeAntiPatterns: 'Complete BV anti-patterns',
    notYetDefined: 'Not yet defined',
    emptyTitle: 'Voice baseline not yet defined',
    emptyBody:
      'The F-VAL judge and Strategy Analyst (upcoming) need the Brand Voiceguide as a baseline. Complete the Voice DNA + Vocabulary + Anti-patterns sections to see the framework here.',
  },
} as const;

export default ns;

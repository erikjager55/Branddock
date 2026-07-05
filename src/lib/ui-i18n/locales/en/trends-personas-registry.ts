// Canonical (source-of-truth) English UI strings — `trends-personas-registry` namespace.
// Data-driven constant-registry labels rendered by the Trend Radar and Competitors
// features. Keyed on the stable enum/value from the source constant files (which stay
// English). Render sites bridge via t('trends-personas-registry:group.key', { defaultValue }).
const ns = {
  // Trend Radar — InsightCategory (CATEGORY_COLORS)
  category: {
    CONSUMER_BEHAVIOR: 'Consumer Behavior',
    TECHNOLOGY: 'Technology',
    MARKET_DYNAMICS: 'Market Dynamics',
    COMPETITIVE: 'Competitive',
    REGULATORY: 'Regulatory',
  },
  // Trend Radar — ImpactLevel (IMPACT_COLORS)
  impact: {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    CRITICAL: 'Critical',
  },
  // Trend Radar — TrendDetectionSource (DETECTION_SOURCE_CONFIG)
  detectionSource: {
    MANUAL: 'Manual',
    AI_RESEARCH: 'AI Research',
  },
  // Trend Radar — InsightScope (SCOPE_LABELS)
  scope: {
    MICRO: 'Micro',
    MESO: 'Meso',
    MACRO: 'Macro',
  },
  // Trend Radar — InsightTimeframe (TIMEFRAME_LABELS)
  timeframe: {
    SHORT_TERM: '0-6 months',
    MEDIUM_TERM: '6-18 months',
    LONG_TERM: '18+ months',
  },
  // Trend Radar — trend direction (DIRECTION_CONFIG)
  direction: {
    rising: 'Rising',
    declining: 'Declining',
    stable: 'Stable',
  },
  // Competitors — tier (TIER_OPTIONS / TIER_BADGES)
  competitorTier: {
    DIRECT: 'Direct',
    INDIRECT: 'Indirect',
    ASPIRATIONAL: 'Aspirational',
  },
  // Competitors — status (STATUS_BADGES)
  competitorStatus: {
    ANALYZED: 'Analyzed',
    DRAFT: 'Draft',
    ARCHIVED: 'Archived',
  },
  // Competitors — score bucket (getScoreLabel)
  competitorScore: {
    notScored: 'Not scored',
    highThreat: 'High threat',
    moderate: 'Moderate',
    lowThreat: 'Low threat',
  },
  // Competitors — AI analysis animation steps (COMPETITOR_ANALYZE_STEPS)
  competitorAnalyzeStep: {
    step0: 'Connecting to website',
    step1: 'Scraping page content',
    step2: 'Extracting brand signals',
    step3: 'Analyzing positioning',
    step4: 'Identifying offerings',
    step5: 'Assessing strengths & weaknesses',
    step6: 'Calculating competitive score',
    step7: 'Finalizing analysis',
  },
} as const;

export default ns;

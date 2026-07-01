// Canonical (source-of-truth) English UI strings — `campaigns-canvas-page` namespace.
const campaignsCanvasPage = {
  canvasPage: {
    status: {
      draft: 'Draft',
      inReview: 'In Review',
      ready: 'Ready',
      changesRequested: 'Changes Requested',
      scheduled: 'Scheduled',
      published: 'Published',
    },
    header: {
      title: 'Content Canvas',
      backAria: 'Back to campaign detail',
    },
    generation: {
      generating: 'Generating...',
      completeBelowThreshold: 'Generation complete · fidelity below threshold',
      complete: 'Generation complete',
      failed: 'Generation failed',
    },
  },
  fidelity: {
    title: 'Brand fidelity score',
    measuring: 'measuring…',
    subtitle: 'How well does this text fit your brand?',
    axisLeft: '← Sounds like AI',
    axisRight: 'Sounds human + brand-fit →',
    verdictSuffix: ' — measures AI patterns. ',
    verdictExplain: 'The score at the top combines this with brand style + strategy.',
    measuredIn: ' · measured in {{seconds}}s',
    pillarsToggle: 'See how this score is built up',
  },
  verdict: {
    topTier: 'Sounds very human',
    humanBaseline: 'Sounds human',
    aiLeaning: 'Feels AI-like',
    pureAi: 'Sounds like AI',
  },
  skipped: {
    detailNotAvailable: '{{verdict}} — detailed score not available.',
    notCalculated: 'Score could not be calculated.',
    reason: 'Reason: {{reason}}',
  },
  discrepancy: {
    title: "Sounds human, but doesn't fit the brand yet.",
    body: 'The detector sees few AI patterns (pin on the left), but brand style + strategy are lower than ideal. See the pillar breakdown below for where to improve.',
  },
  strictRunning: {
    title: 'Branddock is improving the output…',
    body: "The text still sounds AI-like — we're making it more human. ~15-30s.",
  },
  autoIterate: {
    running: {
      title: 'Auto-iterate is improving the score…',
      body: 'Initial {{initial}} / threshold {{threshold}} — feedback-driven rewrite.',
    },
    attempts_one: '{{count}} attempt',
    attempts_other: '{{count}} attempts',
    result: {
      improvedReady: 'Improved from {{initial}} to {{final}} — ready to publish',
      improvedStagnation: 'Improved from {{initial}} to {{final}} — further iterations yield little',
      improvedMaxIterations:
        'Improved from {{initial}} to {{final}} in {{attempts}} — adjust the brief for further improvement',
      improved: 'Improved from {{initial}} to {{final}}',
      dropped:
        'Score dropped from {{initial}} to {{final}} in {{attempts}} — kept original content (auto-iterate yielded no gain)',
      stayed: 'Score stayed at {{initial}} across {{attempts}} — kept original content',
    },
    scoreLabel: 'Score:',
    pointsDelta: '({{signedDelta}} points in {{attempts}})',
    applied: 'Applied: {{templates}}',
    applyingButton: 'Applying…',
    useImproved: 'Use improved version',
    tip: 'Tip: make the brief more specific (concrete CTA, sharper keyMessage) or adjust the voiceguide for this content type.',
    appliedLoaded: 'Applied — improved text is loaded',
    cta: {
      title: 'Score below threshold — want Branddock to improve it automatically?',
      body: 'Branddock rewrites the text up to 5× and stops as soon as the score rises above the threshold or no longer improves. Takes ~30-90 seconds.',
      improving: 'Improving…',
      improvingProgress: ' (attempt {{attempt}}, score {{score}})',
      improveAutomatically: 'Improve automatically',
    },
    errors: {
      startFailed: 'Failed to start iteration ({{status}})',
      iterationFailed: 'Iteration failed',
      applyFailedStatus: 'Apply failed: {{status}}',
      applyFailed: 'Apply failed',
    },
  },
  strict: {
    improvedTitle: 'Branddock made the text more human',
    was: 'Was:',
    now: 'Now:',
    hidePreview: 'Hide the more human version',
    viewPreview: 'View the more human version',
    applyingButton: 'Applying…',
    useThisVersion: 'Use this version',
    appliedRefresh: 'Applied — refresh the page to see the new text',
  },
  positionBar: {
    scoreAria: 'Score {{score}} of 100',
  },
  threshold: {
    above: 'above threshold ({{threshold}})',
    below: 'below threshold ({{threshold}})',
  },
  pillar: {
    na: 'N/A',
    style: { label: 'Brand style', sublabel: 'Uses your words' },
    strategy: { label: 'Strategy', sublabel: 'AI assessment' },
    human: { label: 'Human', sublabel: 'No AI patterns' },
  },
} as const;

export default campaignsCanvasPage;

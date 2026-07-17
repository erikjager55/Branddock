// Canonical (source-of-truth) English UI strings — `lock-billing` namespace.
// Covers the gating/paywall primitives in src/components/lock/ and src/components/billing/.
const ns = {
  cardIndicator: {
    locked: 'Locked',
  },
  lockBanner: {
    title: 'This item is locked',
    lockedBy: 'Locked by {{name}}',
    unlock: 'Unlock',
  },
  pill: {
    locked: 'Locked',
    editable: 'Editable',
    tooltip: 'Locked by {{name}} — {{time}}',
    time: {
      justNow: 'just now',
      minAgo: '{{minutes}} min ago',
      hoursAgo: '{{hours}}h ago',
      daysAgo_one: '{{count}} day ago',
      daysAgo_other: '{{count}} days ago',
    },
  },
  shield: {
    lockAria: 'Lock this item',
    unlockAria: 'Unlock this item',
  },
  confirmDialog: {
    header: {
      lockTitle: 'Lock item',
      unlockTitle: 'Unlock item',
      lockAria: 'Lock {{name}}',
      unlockAria: 'Unlock {{name}}',
    },
    sections: {
      willBeBlocked: 'Will be blocked',
      willBeEnabled: 'Will be enabled',
      willBeHidden: 'Will be hidden',
      willBeVisible: 'Will be visible',
      alwaysAvailable: 'Always available',
    },
    blocked: {
      editContent: 'Edit content',
      deleteTrend: 'Delete trend',
      activateDismissTrend: 'Activate or dismiss trend',
      deleteItem: 'Delete item',
      aiGeneration: 'AI generation & regeneration',
      startAiExploration: 'Start AI Exploration',
      startNewConversation: 'Start new conversation',
      startResearchMethods: 'Start research methods',
    },
    hidden: {
      emptySections: 'Empty/incomplete sections',
      aiTools: 'AI tools & generation buttons',
    },
    alwaysAvailableItems: {
      duplicate: 'Duplicate (creates unlocked copy)',
      export: 'Export (PDF, JSON)',
      viewSections: 'View completed sections',
    },
    cancel: 'Cancel',
    lock: 'Lock',
    unlock: 'Unlock',
  },
  billingBanner: {
    freeBetaTitle: 'Free Beta — All features unlocked',
    freeBetaSubtitle: 'Enjoy full access during the beta period',
    limitReachedTitle: 'AI token limit reached',
    percentUsedTitle: '{{percent}}% of AI tokens used',
    limitReachedSubtitle: 'Upgrade your plan to continue using AI features',
    warningSubtitle: 'Consider upgrading to avoid interruptions',
    upgrade: 'Upgrade',
  },
  planBadge: {
    beta: 'BETA',
  },
  // planName/planFeatures were deleted here — they went stale against
  // PLAN_CONFIGS (src/lib/constants/plan-limits.ts) the moment it changed
  // (e.g. AGENCY showed "10 workspaces"/"25 team members" vs the real 15/10).
  // t('planName.*', { defaultValue }) / t('planFeatures.*', { defaultValue })
  // already fall back to the live PLAN_CONFIGS values when no key exists —
  // that fallback is now what always renders, so it can't drift again.
  upgradeModal: {
    title: 'Choose Your Plan',
    subtitle: 'Select the plan that fits your needs',
    monthly: 'Monthly',
    yearly: 'Yearly',
    save: 'Save 20%',
    popular: 'Popular',
    current: 'Current',
    perMonthShort: 'mo',
    perYearShort: 'yr',
    currentPlan: 'Current Plan',
    free: 'Free',
    redirecting: 'Redirecting...',
    upgrade: 'Upgrade',
    trialNote: 'Start with a {{days}}-day free trial — {{credits}} credits included, no card required.',
  },
  usageMeter: {
    title: 'AI Tokens',
    compact: '{{used}} / {{limit}} AI tokens',
    used: '{{used}} / {{limit}} used',
  },
} as const;

export default ns;

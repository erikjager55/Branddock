// Canonical (source-of-truth) English UI strings — `settings-billing` namespace.
const ns = {
  header: {
    title: 'Billing & Subscription',
    subtitle: 'Manage your plan, usage, and payment details',
  },
  common: {
    manage: 'Manage',
    upgrade: 'Upgrade',
    current: 'Current',
    unlimited: 'Unlimited',
    loading: 'Loading...',
    perMonth: '/month',
  },
  currentPlan: {
    freeBetaName: 'Free Beta',
    freeBetaSubtitle: 'All features unlocked during beta',
    aiTokens: 'AI Tokens',
    tokenLimitReached: 'Token limit reached',
    approachingTokenLimit: 'Approaching token limit',
  },
  usage: {
    title: 'Usage Overview',
    labels: {
      teamMembers: 'Team Members',
      aiTokens: 'AI Tokens',
      personas: 'Personas',
      campaigns: 'Campaigns',
      brandAssets: 'Brand Assets',
      products: 'Products',
      knowledge: 'Knowledge',
      storage: 'Storage',
    },
  },
  comparison: {
    title: 'Compare Plans',
    monthly: 'Monthly',
    yearly: 'Yearly',
    feature: 'Feature',
    popular: 'Popular',
    perMonthShort: 'mo',
    perYearShort: 'yr',
    free: 'Free',
    beta: 'Beta',
    support: 'Support',
    rows: {
      workspaces: 'Workspaces',
      teamMembers: 'Team Members',
      aiTokens: 'AI Tokens / month',
      personas: 'Personas',
      campaigns: 'Campaigns',
      brandAssets: 'Brand Assets',
      products: 'Products',
      marketInsights: 'Market Insights',
      knowledgeResources: 'Knowledge Resources',
    },
    export: {
      label: 'Export',
      all: 'All formats',
    },
  },
  payment: {
    title: 'Payment Method',
    freeBetaNote: 'No payment method required during beta',
    expires: 'Expires {{month}}/{{year}}',
    default: 'Default',
    none: 'Manage your payment methods securely via Stripe',
    add: 'Manage Payment Method',
    more_one: '+{{count}} more payment method',
    more_other: '+{{count}} more payment methods',
  },
  invoices: {
    title: 'Billing History',
    empty: 'No invoices yet',
    columns: {
      invoice: 'Invoice',
      date: 'Date',
      amount: 'Amount',
      status: 'Status',
    },
  },
} as const;

export default ns;

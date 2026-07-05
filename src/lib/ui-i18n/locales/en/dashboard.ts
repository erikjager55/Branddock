// Canonical (source-of-truth) English UI strings — `dashboard` namespace.
const dashboard = {
  page: {
    title: 'Dashboard',
    subtitle: 'Your brand at a glance',
  },
  greeting: {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
  },
  common: {
    retry: 'Retry',
  },
  stats: {
    loadError: 'Failed to load stats',
    brandAssets: 'Brand Assets',
    personas: 'Personas',
    products: 'Products',
    activeCampaigns: 'Active Campaigns',
    activatedTrends: 'Activated Trends',
    competitors: 'Competitors',
  },
  attention: {
    title: 'What Needs Your Attention',
    loadError: 'Failed to load attention items',
  },
  readiness: {
    title: 'Decision Readiness',
    loadError: 'Failed to load readiness',
    ready: '{{value}} ready',
    needAttention: '{{value}} need attention',
    inProgress: '{{value}} in progress',
    modules: {
      brandAssets: 'Brand Assets',
      personas: 'Personas',
      products: 'Products',
      campaigns: 'Campaigns',
      trends: 'Trends',
    },
  },
  nextActions: {
    title: 'Recommended Next Steps',
    loadError: 'Failed to load recommendations',
  },
  campaigns: {
    title: 'Active Campaigns',
    loadError: 'Failed to load campaigns',
    viewAll: 'View All',
    empty: 'No active campaigns yet',
    startNew: 'Start New Campaign',
  },
  recentActivity: {
    title: 'Recent Activity',
    loadError: 'Failed to load activity',
  },
  quickStart: {
    title: 'Quick Start',
    progress: '{{completed}}/{{total}} complete',
    dismiss: 'Dismiss',
  },
  onboarding: {
    stepOf: 'Step {{step}} of 3',
    close: 'Close onboarding',
    goToStep: 'Go to step {{step}}',
    dontShowAgain: "Don't show this again",
    previous: 'Previous',
    skipTour: 'Skip Tour',
    getStarted: 'Get Started',
    next: 'Next',
    keyboardHint: 'Tip: Use arrow keys ← → to navigate, or press ESC to skip',
    step1: {
      title: 'Welcome to Branddock',
      subtitle:
        'Transform your brand from intuition-driven to data-backed strategy in weeks, not months.',
      features: {
        foundation: 'Build your brand foundation with proven frameworks',
        validate: 'Validate assets through professional research',
        generate: 'Generate AI-powered strategies in minutes',
      },
    },
    step2: {
      title: 'How It Works',
      subtitle: 'A simple 3-step process to go from brand assets to validated strategies.',
      process1: {
        title: 'Define Your Brand',
        description: 'Create strategic assets like Golden Circle, Vision, and Mission',
      },
      process2: {
        title: 'Research & Validate',
        description: 'Use 4 methods: Workshops, Surveys, Interviews, or AI Exploration',
      },
      process3: {
        title: 'Generate Strategy',
        description: 'AI creates campaigns, GTM plans, and customer journeys from your data',
      },
    },
    step3: {
      title: "Let's Get Started!",
      subtitle: 'Follow our Quick Start checklist to unlock the full power of the platform.',
      completeLabel: "You'll complete:",
      checklist: {
        brandAsset: 'Create your first brand asset (Golden Circle)',
        persona: 'Define your target persona',
        research: 'Plan your first research session',
        campaign: 'Generate your first campaign strategy',
      },
    },
    scan: {
      title: 'Have a website?',
      description: 'Scan it to auto-populate your brand profile in minutes.',
      cta: 'Start Scan',
    },
  },
} as const;

export default dashboard;

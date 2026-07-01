// Canonical (source-of-truth) English UI strings — `website-scanner` namespace.
const websiteScanner = {
  page: {
    back: 'Back to Dashboard',
    title: 'Website Scanner',
    subtitle: 'Scan your website to auto-populate your brand profile',
  },
  applied: {
    title: 'Results Applied!',
    description:
      'Your brand profile has been populated with the scan results. Explore your brand foundation to review and refine.',
    goToBrand: 'Go to Brand Foundation',
  },
  urlInput: {
    title: 'Enter your website URL',
    subtitle:
      "We'll scan your website and automatically extract brand information, products, audience insights, and more.",
    placeholder: 'www.your-company.com',
    starting: 'Starting scan...',
    start: 'Start Scan',
    extractHeading: 'What we extract',
    extract: {
      brandIdentity: 'Brand Identity',
      productsServices: 'Products & Services',
      targetAudience: 'Target Audience',
      competitiveSignals: 'Competitive Signals',
    },
    errorInvalidUrl: 'Please enter a valid website URL',
    errorStartFailed: 'Failed to start scan',
  },
  progress: {
    failed: 'Scan Failed',
    cancelled: 'Scan Cancelled',
    scanning: 'Scanning...',
    pagesCrawled: '{{crawled}}/{{discovered}} pages crawled',
    currently: 'Currently: {{page}}',
    areasAnalyzed: '{{done}}/{{total}} areas analyzed',
    completedWithWarning: 'Completed with warning: {{error}}',
    errorsTitle: 'Scan encountered errors',
    cancelledTitle: 'Scan was cancelled',
    cancel: 'Cancel Scan',
    tryAgain: 'Try Again',
  },
  phases: {
    CRAWLING: {
      label: 'Scanning website',
      description: 'Discovering and crawling pages',
    },
    EXTRACTING: {
      label: 'Extracting information',
      description: 'Analyzing page content with AI',
    },
    ANALYZING: {
      label: 'AI analysis',
      description: 'Strategic analysis across 4 knowledge areas',
    },
    MAPPING: {
      label: 'Mapping to your brand',
      description: 'Converting to brand data structures',
    },
    STYLING: {
      label: 'Analyzing brand style',
      description: 'Colors, typography & tone of voice',
    },
  },
  results: {
    none: 'No results available',
    complete: 'Scan Complete',
    summary:
      'Found {{items}} items across {{categories}} categories with {{confidence}}% average confidence',
    applyAll: 'Apply All Results',
    strategyHints: 'Strategy Hints',
    trendSignals: 'Trend Signals',
  },
  categories: {
    brandAssets: 'Brand Foundation',
    personas: 'Personas',
    products: 'Products & Services',
    competitors: 'Competitors',
  },
  categoryDescription: {
    brandAssets_one: '{{count}} brand asset field populated',
    brandAssets_other: '{{count}} brand asset fields populated',
    personas_one: '{{count}} persona identified',
    personas_other: '{{count}} personas identified',
    products_one: '{{count}} product found',
    products_other: '{{count}} products found',
    competitors_one: '{{count}} competitor detected',
    competitors_other: '{{count}} competitors detected',
  },
  card: {
    noData: 'No data found',
    confident: '{{confidence}}% confident',
    itemFallback: 'Item {{number}}',
    confidence: {
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    },
  },
  applyModal: {
    title: 'Apply Scan Results',
    description:
      'Select which categories to apply to your workspace. This will populate your brand profile with the scanned data.',
    itemCount_one: '{{count}} item',
    itemCount_other: '{{count}} items',
    summarySuffix_one: 'item will be applied to your workspace',
    summarySuffix_other: 'items will be applied to your workspace',
    applyError: 'Failed to apply results. Please try again.',
    cancel: 'Cancel',
    applying: 'Applying...',
    apply: 'Apply Results',
  },
} as const;

export default websiteScanner;

// Canonical (source-of-truth) English UI strings — `products-registry` namespace.
// Data-driven labels for the product constant registries
// (src/features/products/constants/product-constants.ts). Keyed on each item's
// stable slug/value so the English source doubles as the render fallback.
const ns = {
  // Category option labels — keyed on option `value` slug.
  category: {
    'food-beverage': 'Food & Beverage',
    'fashion-apparel': 'Fashion & Apparel',
    'beauty-personal-care': 'Beauty & Personal Care',
    'home-living': 'Home & Living',
    'consumer-electronics': 'Consumer Electronics',
    'health-pharma': 'Health & Pharma',
    'industrial-manufacturing': 'Industrial & Manufacturing',
    'automotive-mobility': 'Automotive & Mobility',
    'software-saas': 'Software & SaaS',
    'mobile-apps': 'Mobile Apps',
    'digital-content': 'Digital Content & Media',
    'technology-hardware': 'Technology & Hardware',
    'consulting-advisory': 'Consulting & Advisory',
    'creative-agency': 'Creative & Agency Services',
    'financial-services': 'Financial Services',
    'education-training': 'Education & Training',
    'healthcare-services': 'Healthcare Services',
    'real-estate-property': 'Real Estate & Property',
    'hospitality-travel': 'Hospitality & Travel',
    'sports-recreation': 'Sports & Recreation',
    'media-entertainment': 'Media & Entertainment',
    other: 'Other',
  },
  // Category group headers — keyed on a slug of the English group label.
  categoryGroup: {
    'physical-products': 'Physical Products',
    'digital-products': 'Digital Products',
    services: 'Services',
    'experience-lifestyle': 'Experience & Lifestyle',
    general: 'General',
  },
  // Product source badge labels — keyed on Product.source enum value.
  source: {
    MANUAL: 'Manual Entry',
    WEBSITE_URL: 'Website URL',
    PDF_UPLOAD: 'PDF Upload',
  },
  // Product status badge labels — keyed on Product.status enum value.
  status: {
    ANALYZED: 'Analyzed',
    DRAFT: 'Draft',
    ARCHIVED: 'Archived',
  },
  // Image category labels — keyed on ProductImageCategory enum value.
  imageCategory: {
    HERO: 'Hero Image',
    LIFESTYLE: 'Lifestyle',
    DETAIL: 'Detail Shot',
    SCREENSHOT: 'Screenshot',
    FEATURE: 'Feature Highlight',
    MOCKUP: 'Mockup',
    PACKAGING: 'Packaging',
    VARIANT: 'Variant',
    GROUP: 'Group Shot',
    DIAGRAM: 'Diagram',
    PROCESS: 'Process',
    TEAM: 'Team',
    OTHER: 'Other',
  },
} as const;

export default ns;

// Nederlandse UI-strings — `products-registry` namespace.
// Data-gedreven labels voor de product-constant-registries. Zelfde stabiele
// sleutels als de Engelse bron.
const ns = {
  category: {
    'food-beverage': 'Eten & drinken',
    'fashion-apparel': 'Mode & kleding',
    'beauty-personal-care': 'Beauty & persoonlijke verzorging',
    'home-living': 'Wonen & interieur',
    'consumer-electronics': 'Consumentenelektronica',
    'health-pharma': 'Gezondheid & farma',
    'industrial-manufacturing': 'Industrie & productie',
    'automotive-mobility': 'Automotive & mobiliteit',
    'software-saas': 'Software & SaaS',
    'mobile-apps': 'Mobiele apps',
    'digital-content': 'Digitale content & media',
    'technology-hardware': 'Technologie & hardware',
    'consulting-advisory': 'Consulting & advies',
    'creative-agency': 'Creatieve & bureaudiensten',
    'financial-services': 'Financiële diensten',
    'education-training': 'Onderwijs & training',
    'healthcare-services': 'Zorgdiensten',
    'real-estate-property': 'Vastgoed',
    'hospitality-travel': 'Horeca & reizen',
    'sports-recreation': 'Sport & recreatie',
    'media-entertainment': 'Media & entertainment',
    other: 'Overig',
  },
  categoryGroup: {
    'physical-products': 'Fysieke producten',
    'digital-products': 'Digitale producten',
    services: 'Diensten',
    'experience-lifestyle': 'Experience & lifestyle',
    general: 'Algemeen',
  },
  source: {
    MANUAL: 'Handmatige invoer',
    WEBSITE_URL: 'Website-URL',
    PDF_UPLOAD: 'PDF-upload',
  },
  status: {
    ANALYZED: 'Geanalyseerd',
    DRAFT: 'Concept',
    ARCHIVED: 'Gearchiveerd',
  },
  imageCategory: {
    HERO: 'Hero-afbeelding',
    LIFESTYLE: 'Lifestyle',
    DETAIL: 'Detailfoto',
    SCREENSHOT: 'Screenshot',
    FEATURE: 'Feature-highlight',
    MOCKUP: 'Mockup',
    PACKAGING: 'Verpakking',
    VARIANT: 'Variant',
    GROUP: 'Groepsfoto',
    DIAGRAM: 'Diagram',
    PROCESS: 'Proces',
    TEAM: 'Team',
    OTHER: 'Overig',
  },
} as const;

export default ns;

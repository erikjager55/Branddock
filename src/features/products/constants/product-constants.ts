// =============================================================
// Product feature constants
// =============================================================

// ─── Category Groups & Options ────────────────────────────────

export interface CategoryGroup {
  label: string;
  options: { value: string; label: string }[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: "Physical Products",
    options: [
      { value: "food-beverage", label: "Food & Beverage" },
      { value: "fashion-apparel", label: "Fashion & Apparel" },
      { value: "beauty-personal-care", label: "Beauty & Personal Care" },
      { value: "home-living", label: "Home & Living" },
      { value: "consumer-electronics", label: "Consumer Electronics" },
      { value: "health-pharma", label: "Health & Pharma" },
      { value: "industrial-manufacturing", label: "Industrial & Manufacturing" },
      { value: "automotive-mobility", label: "Automotive & Mobility" },
    ],
  },
  {
    label: "Digital Products",
    options: [
      { value: "software-saas", label: "Software & SaaS" },
      { value: "mobile-apps", label: "Mobile Apps" },
      { value: "digital-content", label: "Digital Content & Media" },
      { value: "technology-hardware", label: "Technology & Hardware" },
    ],
  },
  {
    label: "Services",
    options: [
      { value: "consulting-advisory", label: "Consulting & Advisory" },
      { value: "creative-agency", label: "Creative & Agency Services" },
      { value: "financial-services", label: "Financial Services" },
      { value: "education-training", label: "Education & Training" },
      { value: "healthcare-services", label: "Healthcare Services" },
      { value: "real-estate-property", label: "Real Estate & Property" },
    ],
  },
  {
    label: "Experience & Lifestyle",
    options: [
      { value: "hospitality-travel", label: "Hospitality & Travel" },
      { value: "sports-recreation", label: "Sports & Recreation" },
      { value: "media-entertainment", label: "Media & Entertainment" },
    ],
  },
  {
    label: "General",
    options: [
      { value: "other", label: "Other" },
    ],
  },
];

/** Flat options list for backward-compatible usage */
export const CATEGORY_OPTIONS = CATEGORY_GROUPS.flatMap((g) => g.options);

export const CATEGORY_ICONS: Record<string, string> = {
  // Physical Products
  "food-beverage": "UtensilsCrossed",
  "fashion-apparel": "Shirt",
  "beauty-personal-care": "Sparkles",
  "home-living": "Home",
  "consumer-electronics": "Smartphone",
  "health-pharma": "HeartPulse",
  "industrial-manufacturing": "Factory",
  "automotive-mobility": "Car",
  // Digital Products
  "software-saas": "Globe",
  "mobile-apps": "TabletSmartphone",
  "digital-content": "Play",
  "technology-hardware": "Cpu",
  // Services
  "consulting-advisory": "BriefcaseBusiness",
  "creative-agency": "Palette",
  "financial-services": "Landmark",
  "education-training": "GraduationCap",
  "healthcare-services": "Stethoscope",
  "real-estate-property": "Building2",
  // Experience & Lifestyle
  "hospitality-travel": "Plane",
  "sports-recreation": "Dumbbell",
  "media-entertainment": "Clapperboard",
  // General
  other: "Package",
  // Legacy fallbacks (old categories → new icons)
  software: "Globe",
  consulting: "BriefcaseBusiness",
  mobile: "TabletSmartphone",
  hardware: "Cpu",
  service: "Package",
  default: "Package",
};

/** All valid category slugs for AI validation */
export const VALID_CATEGORIES = CATEGORY_OPTIONS.map((o) => o.value);

// ─── Analyze Steps ────────────────────────────────────────────

export const ANALYZE_STEPS = [
  "Connecting to website",
  "Scanning product information",
  "Extracting features & specifications",
  "Scanning product images",
  "Analyzing pricing model",
  "Identifying use cases",
  "Detecting target audience",
  "Generating product profile",
];

export const ANALYZER_TABS = [
  { id: "url" as const, icon: "Globe", label: "Website URL" },
  { id: "pdf" as const, icon: "FileText", label: "PDF Upload" },
  { id: "manual" as const, icon: "Pencil", label: "Manual Entry" },
];

export const SOURCE_BADGES: Record<string, { label: string; color: string }> = {
  MANUAL: { label: "Manual Entry", color: "text-gray-600" },
  WEBSITE_URL: { label: "Website URL", color: "text-blue-600" },
  PDF_UPLOAD: { label: "PDF Upload", color: "text-purple-600" },
};

export const STATUS_BADGES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  ANALYZED: { bg: "bg-green-100", text: "text-green-700", label: "Analyzed" },
  DRAFT: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  ARCHIVED: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    label: "Archived",
  },
};

// ─── Image Category Options ──────────────────────────────────

export const IMAGE_CATEGORY_OPTIONS = [
  { value: "HERO", label: "Hero Image", description: "Main product image, shown in overviews" },
  { value: "LIFESTYLE", label: "Lifestyle", description: "Product in real-world context" },
  { value: "DETAIL", label: "Detail Shot", description: "Close-up of materials, textures, or quality" },
  { value: "SCREENSHOT", label: "Screenshot", description: "App or software UI screenshots" },
  { value: "FEATURE", label: "Feature Highlight", description: "Showcasing a specific feature" },
  { value: "MOCKUP", label: "Mockup", description: "Product mockups or renders" },
  { value: "PACKAGING", label: "Packaging", description: "Product packaging or unboxing" },
  { value: "VARIANT", label: "Variant", description: "Color, size, or style variations" },
  { value: "GROUP", label: "Group Shot", description: "Multiple products together" },
  { value: "DIAGRAM", label: "Diagram", description: "Technical diagrams or infographics" },
  { value: "PROCESS", label: "Process", description: "Manufacturing or service process" },
  { value: "TEAM", label: "Team", description: "Team or people behind the product" },
  { value: "OTHER", label: "Other", description: "Uncategorized image" },
] as const;

/** Pre-computed Select options for image categories (avoids DRY violation across components) */
export const IMAGE_CATEGORY_SELECT_OPTIONS = IMAGE_CATEGORY_OPTIONS.map((c) => ({
  value: c.value,
  label: c.label,
}));

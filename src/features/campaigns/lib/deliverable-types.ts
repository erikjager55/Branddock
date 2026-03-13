export type FunnelStage = "awareness" | "consideration" | "conversion" | "retention";

export interface DeliverableTypeDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  funnelStage: FunnelStage;
  outputFormats: string[];
  icon: string;
}

export const DELIVERABLE_TYPES: DeliverableTypeDefinition[] = [
  // ─── Long-Form Content (7) ──────────────────────────────
  {
    id: "blog-post",
    name: "Blog Post",
    description: "SEO-optimized blog article with keyword targeting",
    category: "Long-Form Content",
    funnelStage: "awareness",
    outputFormats: ["Text", "HTML"],
    icon: "FileText",
  },
  {
    id: "pillar-page",
    name: "Pillar Page",
    description: "Comprehensive topic hub page (2000+ words)",
    category: "Long-Form Content",
    funnelStage: "awareness",
    outputFormats: ["Text", "HTML"],
    icon: "Layers",
  },
  {
    id: "whitepaper",
    name: "Whitepaper",
    description: "Research-backed thought leadership document",
    category: "Long-Form Content",
    funnelStage: "consideration",
    outputFormats: ["Text", "PDF"],
    icon: "BookOpen",
  },
  {
    id: "case-study",
    name: "Case Study",
    description: "Customer success story with metrics and quotes",
    category: "Long-Form Content",
    funnelStage: "consideration",
    outputFormats: ["Text", "PDF"],
    icon: "Award",
  },
  {
    id: "ebook",
    name: "E-book",
    description: "Multi-chapter downloadable guide (lead magnet)",
    category: "Long-Form Content",
    funnelStage: "consideration",
    outputFormats: ["Text", "PDF"],
    icon: "BookMarked",
  },
  {
    id: "article",
    name: "Feature Article",
    description: "In-depth journalistic-style feature piece",
    category: "Long-Form Content",
    funnelStage: "awareness",
    outputFormats: ["Text", "HTML"],
    icon: "Newspaper",
  },
  {
    id: "thought-leadership",
    name: "Thought Leadership",
    description: "Executive-bylined opinion or industry analysis",
    category: "Long-Form Content",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Lightbulb",
  },

  // ─── Social Media (7) ───────────────────────────────────
  {
    id: "linkedin-post",
    name: "LinkedIn Post",
    description: "Professional network post with text and image",
    category: "Social Media",
    funnelStage: "awareness",
    outputFormats: ["Text", "Image"],
    icon: "Linkedin",
  },
  {
    id: "linkedin-article",
    name: "LinkedIn Article",
    description: "Long-form LinkedIn native article",
    category: "Social Media",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Linkedin",
  },
  {
    id: "instagram-post",
    name: "Instagram Post",
    description: "Visual-first post with caption and hashtags",
    category: "Social Media",
    funnelStage: "awareness",
    outputFormats: ["Image", "Carousel"],
    icon: "Instagram",
  },
  {
    id: "twitter-thread",
    name: "X / Twitter Thread",
    description: "Multi-tweet narrative thread",
    category: "Social Media",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Twitter",
  },
  {
    id: "facebook-post",
    name: "Facebook Post",
    description: "Engaging social media post for Facebook/Meta",
    category: "Social Media",
    funnelStage: "awareness",
    outputFormats: ["Text", "Image"],
    icon: "Facebook",
  },
  {
    id: "tiktok-script",
    name: "TikTok / Reels Script",
    description: "Short-form video script (15-60s) with hook and CTA",
    category: "Social Media",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Clapperboard",
  },
  {
    id: "social-carousel",
    name: "Social Carousel",
    description: "Multi-slide educational or storytelling carousel",
    category: "Social Media",
    funnelStage: "awareness",
    outputFormats: ["Carousel"],
    icon: "GalleryHorizontalEnd",
  },

  // ─── Advertising & Paid (6) ─────────────────────────────
  {
    id: "search-ad",
    name: "Search Ad",
    description: "Google/Bing responsive search ad copy",
    category: "Advertising & Paid",
    funnelStage: "conversion",
    outputFormats: ["Text"],
    icon: "Search",
  },
  {
    id: "social-ad",
    name: "Social Ad",
    description: "Paid social ad copy (Meta, LinkedIn, TikTok)",
    category: "Advertising & Paid",
    funnelStage: "awareness",
    outputFormats: ["Text", "Image"],
    icon: "BadgeDollarSign",
  },
  {
    id: "display-ad",
    name: "Display Ad",
    description: "Banner/display ad copy and creative brief",
    category: "Advertising & Paid",
    funnelStage: "awareness",
    outputFormats: ["Text", "Image"],
    icon: "MonitorSmartphone",
  },
  {
    id: "retargeting-ad",
    name: "Retargeting Ad",
    description: "Remarketing ad for previous visitors/engagers",
    category: "Advertising & Paid",
    funnelStage: "conversion",
    outputFormats: ["Text", "Image"],
    icon: "RotateCcw",
  },
  {
    id: "video-ad",
    name: "Video Ad Script",
    description: "Script for pre-roll, in-feed, or CTV ad (15-30s)",
    category: "Advertising & Paid",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Play",
  },
  {
    id: "native-ad",
    name: "Native Ad / Sponsored",
    description: "Sponsored article or in-feed native placement brief",
    category: "Advertising & Paid",
    funnelStage: "consideration",
    outputFormats: ["Text"],
    icon: "PanelTop",
  },

  // ─── Email & Automation (5) ─────────────────────────────
  {
    id: "newsletter",
    name: "Newsletter",
    description: "Regular email newsletter to subscribers",
    category: "Email & Automation",
    funnelStage: "retention",
    outputFormats: ["HTML", "Text"],
    icon: "Mail",
  },
  {
    id: "welcome-sequence",
    name: "Welcome Sequence",
    description: "Multi-email onboarding series (3-5 emails)",
    category: "Email & Automation",
    funnelStage: "retention",
    outputFormats: ["HTML", "Text"],
    icon: "MailPlus",
  },
  {
    id: "promotional-email",
    name: "Promotional Email",
    description: "Campaign or offer announcement email",
    category: "Email & Automation",
    funnelStage: "conversion",
    outputFormats: ["HTML", "Text"],
    icon: "Megaphone",
  },
  {
    id: "nurture-sequence",
    name: "Nurture Sequence",
    description: "Lead nurturing drip campaign (5-7 emails)",
    category: "Email & Automation",
    funnelStage: "consideration",
    outputFormats: ["HTML", "Text"],
    icon: "Timer",
  },
  {
    id: "re-engagement-email",
    name: "Re-engagement Email",
    description: "Win-back email for inactive subscribers",
    category: "Email & Automation",
    funnelStage: "retention",
    outputFormats: ["HTML", "Text"],
    icon: "MailWarning",
  },

  // ─── Website & Landing Pages (5) ────────────────────────
  {
    id: "landing-page",
    name: "Landing Page",
    description: "Conversion-focused page with hero, benefits, CTA",
    category: "Website & Landing Pages",
    funnelStage: "conversion",
    outputFormats: ["Text", "HTML"],
    icon: "PanelTop",
  },
  {
    id: "product-page",
    name: "Product / Service Page",
    description: "Feature/benefit copy for a product or service",
    category: "Website & Landing Pages",
    funnelStage: "consideration",
    outputFormats: ["Text", "HTML"],
    icon: "ShoppingBag",
  },
  {
    id: "faq-page",
    name: "FAQ Page",
    description: "Frequently asked questions with SEO answers",
    category: "Website & Landing Pages",
    funnelStage: "consideration",
    outputFormats: ["Text", "HTML"],
    icon: "HelpCircle",
  },
  {
    id: "comparison-page",
    name: "Comparison Page",
    description: "Us vs. them or feature comparison matrix copy",
    category: "Website & Landing Pages",
    funnelStage: "consideration",
    outputFormats: ["Text", "HTML"],
    icon: "GitCompareArrows",
  },
  {
    id: "microsite",
    name: "Campaign Microsite",
    description: "Dedicated multi-page campaign site brief and copy",
    category: "Website & Landing Pages",
    funnelStage: "awareness",
    outputFormats: ["Text", "HTML"],
    icon: "Globe",
  },

  // ─── Video & Audio (5) ──────────────────────────────────
  {
    id: "explainer-video",
    name: "Explainer Video Script",
    description: "Product/service explainer script (60-120s)",
    category: "Video & Audio",
    funnelStage: "consideration",
    outputFormats: ["Text"],
    icon: "Video",
  },
  {
    id: "testimonial-video",
    name: "Testimonial Video Brief",
    description: "Customer testimonial interview guide and script",
    category: "Video & Audio",
    funnelStage: "consideration",
    outputFormats: ["Text"],
    icon: "MessageSquareQuote",
  },
  {
    id: "promo-video",
    name: "Promo Video Script",
    description: "Promotional campaign video script (15-60s)",
    category: "Video & Audio",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Film",
  },
  {
    id: "webinar-outline",
    name: "Webinar / Live Session",
    description: "Slide-by-slide outline with talking points",
    category: "Video & Audio",
    funnelStage: "consideration",
    outputFormats: ["Text", "PDF"],
    icon: "Presentation",
  },
  {
    id: "podcast-outline",
    name: "Podcast Episode Outline",
    description: "Episode structure, questions, key points, show notes",
    category: "Video & Audio",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Mic",
  },

  // ─── Sales Enablement (4) ──────────────────────────────
  {
    id: "sales-deck",
    name: "Sales Deck",
    description: "Presentation outline for sales conversations",
    category: "Sales Enablement",
    funnelStage: "conversion",
    outputFormats: ["Text", "PDF"],
    icon: "BarChart3",
  },
  {
    id: "one-pager",
    name: "One-Pager / Battle Card",
    description: "Single-page product or competitive overview",
    category: "Sales Enablement",
    funnelStage: "conversion",
    outputFormats: ["Text", "PDF"],
    icon: "FileSpreadsheet",
  },
  {
    id: "proposal-template",
    name: "Proposal Template",
    description: "Customizable proposal structure with key messaging",
    category: "Sales Enablement",
    funnelStage: "conversion",
    outputFormats: ["Text", "PDF"],
    icon: "ClipboardList",
  },
  {
    id: "product-description",
    name: "Product Description",
    description: "Concise product copy for catalogs or marketplace",
    category: "Sales Enablement",
    funnelStage: "consideration",
    outputFormats: ["Text"],
    icon: "Tag",
  },

  // ─── PR & Communications (3) ───────────────────────────
  {
    id: "press-release",
    name: "Press Release",
    description: "Official media announcement with boilerplate",
    category: "PR & Communications",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Newspaper",
  },
  {
    id: "media-pitch",
    name: "Media Pitch",
    description: "Personalized journalist/editor pitch email",
    category: "PR & Communications",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Send",
  },
  {
    id: "internal-comms",
    name: "Internal Communication",
    description: "Employee-facing announcement or update",
    category: "PR & Communications",
    funnelStage: "retention",
    outputFormats: ["Text", "HTML"],
    icon: "Building2",
  },
];

export const DELIVERABLE_CATEGORIES = [
  "Long-Form Content",
  "Social Media",
  "Advertising & Paid",
  "Email & Automation",
  "Website & Landing Pages",
  "Video & Audio",
  "Sales Enablement",
  "PR & Communications",
] as const;

/** All valid deliverable type IDs — used to constrain AI output */
export const DELIVERABLE_TYPE_IDS = DELIVERABLE_TYPES.map((d) => d.id);

export function getDeliverablesByCategory(
  category: string,
): DeliverableTypeDefinition[] {
  return DELIVERABLE_TYPES.filter((d) => d.category === category);
}

/** Look up a deliverable type definition by its ID */
export function getDeliverableTypeById(
  id: string,
): DeliverableTypeDefinition | undefined {
  return DELIVERABLE_TYPES.find((d) => d.id === id);
}

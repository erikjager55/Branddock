export interface DeliverableTypeDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  outputFormats: string[];
  icon: string;
}

export const DELIVERABLE_TYPES: DeliverableTypeDefinition[] = [
  // Written (4)
  {
    id: "blog-post",
    name: "Blog Post",
    description: "SEO-optimized blog article",
    category: "Written",
    outputFormats: ["Text", "HTML"],
    icon: "FileText",
  },
  {
    id: "article",
    name: "Article",
    description: "In-depth feature article",
    category: "Written",
    outputFormats: ["Text", "HTML", "PDF"],
    icon: "Newspaper",
  },
  {
    id: "whitepaper",
    name: "Whitepaper",
    description: "Research-backed thought leadership",
    category: "Written",
    outputFormats: ["PDF", "HTML"],
    icon: "BookOpen",
  },
  {
    id: "case-study",
    name: "Case Study",
    description: "Customer success story",
    category: "Written",
    outputFormats: ["PDF", "HTML"],
    icon: "Award",
  },
  // Social Media (4)
  {
    id: "linkedin-post",
    name: "LinkedIn Post",
    description: "Professional social media post",
    category: "Social Media",
    outputFormats: ["Text", "Image"],
    icon: "Linkedin",
  },
  {
    id: "twitter-thread",
    name: "Twitter Thread",
    description: "Multi-tweet narrative thread",
    category: "Social Media",
    outputFormats: ["Text"],
    icon: "Twitter",
  },
  {
    id: "instagram-post",
    name: "Instagram Post",
    description: "Visual-first social content",
    category: "Social Media",
    outputFormats: ["Image", "Carousel"],
    icon: "Instagram",
  },
  {
    id: "facebook-post",
    name: "Facebook Post",
    description: "Engaging social media post",
    category: "Social Media",
    outputFormats: ["Text", "Image"],
    icon: "Facebook",
  },
  // Visual Assets (4)
  {
    id: "infographic",
    name: "Infographic",
    description: "Data visualization graphic",
    category: "Visual Assets",
    outputFormats: ["Image", "PDF"],
    icon: "BarChart3",
  },
  {
    id: "banner",
    name: "Banner",
    description: "Web or social media banner",
    category: "Visual Assets",
    outputFormats: ["Image"],
    icon: "Image",
  },
  {
    id: "presentation",
    name: "Presentation",
    description: "Slide deck for stakeholders",
    category: "Visual Assets",
    outputFormats: ["PDF", "PPTX"],
    icon: "Presentation",
  },
  {
    id: "brand-guidelines",
    name: "Brand Guidelines",
    description: "Brand identity document",
    category: "Visual Assets",
    outputFormats: ["PDF"],
    icon: "Palette",
  },
  // Email (4)
  {
    id: "newsletter",
    name: "Newsletter",
    description: "Regular email newsletter",
    category: "Email",
    outputFormats: ["HTML", "Text"],
    icon: "Mail",
  },
  {
    id: "welcome-email",
    name: "Welcome Email",
    description: "Onboarding welcome email",
    category: "Email",
    outputFormats: ["HTML", "Text"],
    icon: "MailPlus",
  },
  {
    id: "promotional-email",
    name: "Promotional Email",
    description: "Marketing promotional email",
    category: "Email",
    outputFormats: ["HTML", "Text"],
    icon: "Megaphone",
  },
  {
    id: "drip-campaign",
    name: "Drip Campaign",
    description: "Automated email sequence",
    category: "Email",
    outputFormats: ["HTML", "Text"],
    icon: "Timer",
  },
];

export const DELIVERABLE_CATEGORIES = [
  "Written",
  "Social Media",
  "Visual Assets",
  "Email",
] as const;

export function getDeliverablesByCategory(
  category: string,
): DeliverableTypeDefinition[] {
  return DELIVERABLE_TYPES.filter((d) => d.category === category);
}

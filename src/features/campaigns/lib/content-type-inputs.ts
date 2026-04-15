/**
 * Content Type Input Registry
 *
 * Defines type-specific input fields that improve content generation quality.
 * Fields are collected in the Canvas ContextPanel (review & edit) and optionally
 * in the content-mode wizard SetupStep (direct input).
 *
 * Three layers use this registry:
 * 1. AI derivation — Asset Planner fills aiDerivable fields automatically
 * 2. Canvas review — User reviews/edits pre-filled values before (re)generation
 * 3. Quality nudges — Scorer flags missing required fields after generation
 */

// ─── Types ─────────────────────────────────────────────────

export type InputCategory =
  | "seo"
  | "campaign-details"
  | "format-specs"
  | "audience"
  | "references"
  | "creative-direction";

export type InputFieldType =
  | "text"
  | "textarea"
  | "tags"
  | "number"
  | "boolean"
  | "select";

export type ContentTypeInputValue = string | string[] | number | boolean;

export interface ContentTypeInputField {
  /** Unique key within the type, used as JSON property name */
  key: string;
  /** Human-readable label */
  label: string;
  /** Grouping category for UI rendering */
  category: InputCategory;
  /** Input control type */
  type: InputFieldType;
  /** Placeholder text for text/textarea/tags */
  placeholder?: string;
  /** Options for 'select' type */
  options?: string[];
  /** If true, quality scorer will nudge when missing */
  required?: boolean;
  /** Short help text / tooltip */
  helpText?: string;
  /** If true, Asset Planner AI will attempt to fill this */
  aiDerivable?: boolean;
  /** Instruction for AI on how to derive this field */
  aiHint?: string;
}

// ─── Category display config ───────────────────────────────

export const INPUT_CATEGORY_CONFIG: Record<
  InputCategory,
  { label: string; order: number }
> = {
  seo: { label: "SEO & Keywords", order: 1 },
  "campaign-details": { label: "Campaign Details", order: 2 },
  "format-specs": { label: "Format & Specs", order: 3 },
  audience: { label: "Audience", order: 4 },
  references: { label: "References & Sources", order: 5 },
  "creative-direction": { label: "Creative Direction", order: 6 },
};

// ─── Shared field builders ─────────────────────────────────

function seoKeyword(): ContentTypeInputField {
  return {
    key: "seoKeyword",
    label: "SEO Keyword",
    category: "seo",
    type: "text",
    placeholder: "e.g. brand positioning strategy",
    required: true,
    helpText: "Primary keyword to target for search ranking",
    aiDerivable: true,
    aiHint: "Derive from campaign goal + persona pain points",
  };
}

function secondaryKeywords(): ContentTypeInputField {
  return {
    key: "secondaryKeywords",
    label: "Secondary Keywords",
    category: "seo",
    type: "tags",
    placeholder: "Add keyword…",
    helpText: "Related keywords to naturally incorporate",
    aiDerivable: true,
    aiHint: "3-5 related long-tail keywords",
  };
}

function targetWordCount(): ContentTypeInputField {
  return {
    key: "targetWordCount",
    label: "Target Word Count",
    category: "format-specs",
    type: "number",
    placeholder: "e.g. 1500",
    helpText: "Desired word count for the content",
    aiDerivable: true,
    aiHint: "Based on content type and topic depth",
  };
}

function landingPageUrl(): ContentTypeInputField {
  return {
    key: "landingPageUrl",
    label: "Landing Page URL",
    category: "campaign-details",
    type: "text",
    placeholder: "e.g. https://example.com/offer",
    required: true,
    helpText: "Where the CTA should link to",
    aiDerivable: true,
    aiHint: "Suggest a URL path based on campaign and product",
  };
}

function visualDirection(): ContentTypeInputField {
  return {
    key: "visualDirection",
    label: "Visual Direction",
    category: "creative-direction",
    type: "textarea",
    placeholder: "e.g. Clean, professional photography with teal accents",
    helpText: "Guidance for accompanying visuals",
    aiDerivable: true,
    aiHint: "Based on brand style and campaign tone",
  };
}

function videoDuration(): ContentTypeInputField {
  return {
    key: "videoDuration",
    label: "Duration (seconds)",
    category: "format-specs",
    type: "number",
    placeholder: "e.g. 30",
    required: true,
    helpText: "Target video/audio duration in seconds",
    aiDerivable: true,
    aiHint: "Based on platform best practices",
  };
}

function slidesCount(): ContentTypeInputField {
  return {
    key: "slidesCount",
    label: "Number of Slides",
    category: "format-specs",
    type: "number",
    placeholder: "e.g. 8",
    helpText: "Target number of slides/cards",
    aiDerivable: true,
    aiHint: "Based on content depth and platform limits",
  };
}

function subjectLine(): ContentTypeInputField {
  return {
    key: "subjectLine",
    label: "Subject Line",
    category: "campaign-details",
    type: "text",
    placeholder: "e.g. Your brand deserves better",
    required: true,
    helpText: "Email subject line (AI will also suggest alternatives)",
    aiDerivable: true,
    aiHint: "Based on campaign message and audience pain points",
  };
}

// ─── Registry ──────────────────────────────────────────────

const CONTENT_TYPE_INPUTS: Record<string, ContentTypeInputField[]> = {
  // ── Long-Form Content ──────────────────────────────────

  "blog-post": [
    seoKeyword(),
    secondaryKeywords(),
    targetWordCount(),
    {
      key: "metaDescription",
      label: "Meta Description",
      category: "seo",
      type: "textarea",
      placeholder: "150-160 character SEO meta description",
      helpText: "Search engine result snippet",
      aiDerivable: true,
      aiHint: "Summarize article value proposition in 155 chars",
    },
    {
      key: "internalLinks",
      label: "Internal Links to Include",
      category: "seo",
      type: "tags",
      placeholder: "Add page/topic to link to…",
      helpText: "Pages or topics to cross-reference",
    },
  ],

  "pillar-page": [
    seoKeyword(),
    secondaryKeywords(),
    targetWordCount(),
    {
      key: "clusterTopics",
      label: "Topic Cluster Pages",
      category: "seo",
      type: "tags",
      placeholder: "Add sub-topic…",
      required: true,
      helpText: "Sub-topics that link to/from this pillar page",
      aiDerivable: true,
      aiHint: "5-8 sub-topics based on the primary keyword",
    },
  ],

  whitepaper: [
    targetWordCount(),
    {
      key: "researchTheme",
      label: "Research Theme",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. The future of AI in brand strategy",
      required: true,
      helpText: "Central research question or thesis",
      aiDerivable: true,
      aiHint: "Based on campaign goal and industry context",
    },
    {
      key: "dataSourcesHint",
      label: "Data Sources / References",
      category: "references",
      type: "textarea",
      placeholder: "e.g. Industry reports, internal data, case examples",
      helpText: "Types of evidence to reference",
    },
    {
      key: "expertiseLevel",
      label: "Reader Expertise",
      category: "audience",
      type: "select",
      options: ["Beginner", "Intermediate", "Expert", "C-Level"],
      helpText: "Target reader's knowledge level",
      aiDerivable: true,
      aiHint: "Based on target persona's expertise",
    },
  ],

  "case-study": [
    {
      key: "customerName",
      label: "Customer / Company Name",
      category: "references",
      type: "text",
      placeholder: "e.g. Acme Corp",
      required: true,
      helpText: "The featured customer (use placeholder if confidential)",
    },
    {
      key: "challengeDescription",
      label: "Challenge Description",
      category: "references",
      type: "textarea",
      placeholder: "What problem did the customer face?",
      required: true,
      helpText: "The business challenge before your solution",
      aiDerivable: true,
      aiHint: "Based on product/service value proposition",
    },
    {
      key: "keyMetrics",
      label: "Key Results / Metrics",
      category: "references",
      type: "tags",
      placeholder: "e.g. +40% revenue, 2x conversion rate",
      required: true,
      helpText: "Quantifiable results to highlight",
    },
    {
      key: "customerQuote",
      label: "Customer Quote",
      category: "references",
      type: "textarea",
      placeholder: "A testimonial quote from the customer",
      helpText: "Direct quote for social proof",
    },
  ],

  ebook: [
    targetWordCount(),
    {
      key: "chapterCount",
      label: "Number of Chapters",
      category: "format-specs",
      type: "number",
      placeholder: "e.g. 5",
      helpText: "Desired chapter count",
      aiDerivable: true,
      aiHint: "Based on topic breadth, typically 4-8",
    },
    {
      key: "expertiseLevel",
      label: "Reader Expertise",
      category: "audience",
      type: "select",
      options: ["Beginner", "Intermediate", "Expert"],
      helpText: "Target reader's knowledge level",
      aiDerivable: true,
      aiHint: "Based on target persona",
    },
    {
      key: "leadMagnetContext",
      label: "Lead Magnet Context",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. Gated download after webinar signup",
      helpText: "How this ebook will be used for lead generation",
    },
  ],

  article: [
    seoKeyword(),
    secondaryKeywords(),
    targetWordCount(),
    {
      key: "publicationTarget",
      label: "Publication / Platform",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. Company blog, Medium, industry publication",
      helpText: "Where this article will be published",
    },
  ],

  "thought-leadership": [
    seoKeyword(),
    targetWordCount(),
    {
      key: "authorPerspective",
      label: "Author / Executive Perspective",
      category: "creative-direction",
      type: "text",
      placeholder: "e.g. CEO viewpoint on industry disruption",
      required: true,
      helpText: "Whose perspective and what contrarian angle",
      aiDerivable: true,
      aiHint: "Based on brand positioning and industry context",
    },
    {
      key: "publicationTarget",
      label: "Publication Target",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. LinkedIn, Forbes, industry magazine",
      helpText: "Target publication determines tone and format",
    },
  ],

  // ── Social Media ───────────────────────────────────────

  "linkedin-post": [
    {
      key: "postType",
      label: "Post Type",
      category: "format-specs",
      type: "select",
      options: [
        "Thought Leadership",
        "Company News",
        "Personal Story",
        "Industry Insight",
        "Poll / Question",
        "Case Study Snippet",
      ],
      helpText: "Determines structure and tone",
      aiDerivable: true,
      aiHint: "Based on campaign goal and content strategy",
    },
    {
      key: "hookStyle",
      label: "Hook Style",
      category: "creative-direction",
      type: "select",
      options: [
        "Bold Statement",
        "Question",
        "Statistic",
        "Story Opening",
        "Contrarian Take",
      ],
      helpText: "Opening line approach for engagement",
      aiDerivable: true,
      aiHint: "Match to post type and audience",
    },
    {
      key: "hashtagStrategy",
      label: "Hashtags",
      category: "seo",
      type: "tags",
      placeholder: "Add hashtag…",
      helpText: "3-5 relevant hashtags",
      aiDerivable: true,
      aiHint: "Industry + topic + branded hashtags",
    },
  ],

  "linkedin-article": [
    seoKeyword(),
    targetWordCount(),
    {
      key: "authorPerspective",
      label: "Author Perspective",
      category: "creative-direction",
      type: "text",
      placeholder: "e.g. VP Marketing sharing lessons learned",
      helpText: "Professional angle and authority positioning",
      aiDerivable: true,
      aiHint: "Based on brand role and campaign context",
    },
  ],

  "linkedin-carousel": [
    slidesCount(),
    {
      key: "narrativeStructure",
      label: "Narrative Structure",
      category: "creative-direction",
      type: "select",
      options: [
        "Listicle (tips/steps)",
        "Before & After",
        "Problem → Solution",
        "Data Story",
        "How-To Guide",
      ],
      helpText: "Slide flow structure",
      aiDerivable: true,
      aiHint: "Based on content goal and audience",
    },
    visualDirection(),
  ],

  "linkedin-ad": [
    landingPageUrl(),
    {
      key: "adFormat",
      label: "Ad Format",
      category: "format-specs",
      type: "select",
      options: [
        "Single Image",
        "Carousel",
        "Video",
        "Message Ad",
        "Text Ad",
      ],
      required: true,
      helpText: "LinkedIn ad placement format",
      aiDerivable: true,
      aiHint: "Based on campaign goal: awareness→image, conversion→carousel/message",
    },
    {
      key: "audienceTargeting",
      label: "Audience Targeting",
      category: "audience",
      type: "text",
      placeholder: "e.g. Marketing Directors, SaaS companies, 50-200 employees",
      helpText: "Key targeting criteria for ad copy alignment",
      aiDerivable: true,
      aiHint: "Based on persona job title, industry, company size",
    },
  ],

  "linkedin-newsletter": [
    subjectLine(),
    targetWordCount(),
    {
      key: "newsletterTheme",
      label: "Newsletter Theme",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. Weekly brand strategy insights",
      helpText: "Recurring theme or series name",
    },
  ],

  "linkedin-video": [
    videoDuration(),
    {
      key: "videoFormat",
      label: "Video Format",
      category: "format-specs",
      type: "select",
      options: ["Talking Head", "Screen Recording", "Animation", "B-Roll Montage"],
      helpText: "Production style",
      aiDerivable: true,
      aiHint: "Based on content type and available resources",
    },
    visualDirection(),
  ],

  "linkedin-event": [
    {
      key: "eventName",
      label: "Event Name",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. Brand Strategy Masterclass 2026",
      required: true,
      helpText: "Official event title",
    },
    {
      key: "eventDate",
      label: "Event Date & Time",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. June 15, 2026 at 2:00 PM CET",
      required: true,
      helpText: "Date, time and timezone",
    },
    {
      key: "eventUrl",
      label: "Registration URL",
      category: "campaign-details",
      type: "text",
      placeholder: "https://…",
      required: true,
      helpText: "Registration or event page link",
    },
    {
      key: "eventLocation",
      label: "Location",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. Online (Zoom) or Amsterdam, Netherlands",
      helpText: "Physical location or virtual platform",
    },
    {
      key: "speakers",
      label: "Speakers / Hosts",
      category: "references",
      type: "tags",
      placeholder: "Add speaker name…",
      helpText: "Featured speakers or panel members",
    },
  ],

  "linkedin-poll": [
    {
      key: "pollQuestion",
      label: "Poll Question",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. What's your biggest brand challenge?",
      required: true,
      helpText: "The question to ask (max ~140 chars on LinkedIn)",
      aiDerivable: true,
      aiHint: "Based on campaign topic and audience pain points",
    },
    {
      key: "pollOptions",
      label: "Poll Options",
      category: "campaign-details",
      type: "tags",
      placeholder: "Add option…",
      required: true,
      helpText: "2-4 answer choices",
      aiDerivable: true,
      aiHint: "Generate 3-4 mutually exclusive options",
    },
  ],

  "instagram-post": [
    {
      key: "contentStyle",
      label: "Content Style",
      category: "creative-direction",
      type: "select",
      options: [
        "Product Shot",
        "Lifestyle",
        "Quote / Text",
        "Behind the Scenes",
        "User-Generated",
        "Infographic",
      ],
      helpText: "Visual content approach",
      aiDerivable: true,
      aiHint: "Based on campaign goal and brand style",
    },
    {
      key: "hashtagStrategy",
      label: "Hashtags",
      category: "seo",
      type: "tags",
      placeholder: "Add hashtag…",
      helpText: "Mix of branded, community, and trending hashtags",
      aiDerivable: true,
      aiHint: "5-15 relevant hashtags across branded/community/trending",
    },
    visualDirection(),
  ],

  "twitter-thread": [
    {
      key: "threadLength",
      label: "Thread Length (tweets)",
      category: "format-specs",
      type: "number",
      placeholder: "e.g. 7",
      helpText: "Number of tweets in the thread (5-15 recommended)",
      aiDerivable: true,
      aiHint: "Based on topic depth, typically 5-10",
    },
    {
      key: "hookStyle",
      label: "Opening Hook",
      category: "creative-direction",
      type: "select",
      options: [
        "Bold Claim",
        "Thread Opener (🧵)",
        "Question",
        "Contrarian Take",
        "Story Start",
      ],
      helpText: "First tweet style to stop the scroll",
      aiDerivable: true,
      aiHint: "Based on topic and audience",
    },
  ],

  "facebook-post": [
    {
      key: "postType",
      label: "Post Type",
      category: "format-specs",
      type: "select",
      options: ["Link Share", "Photo", "Video", "Event", "Status Update"],
      helpText: "Post format determines engagement style",
      aiDerivable: true,
      aiHint: "Based on campaign content and goal",
    },
    {
      key: "engagementGoal",
      label: "Engagement Goal",
      category: "creative-direction",
      type: "select",
      options: ["Comments", "Shares", "Link Clicks", "Reactions", "Saves"],
      helpText: "Primary engagement metric to optimize for",
      aiDerivable: true,
      aiHint: "Based on campaign funnel stage",
    },
  ],

  "tiktok-script": [
    videoDuration(),
    {
      key: "trendReference",
      label: "Trend / Sound Reference",
      category: "creative-direction",
      type: "text",
      placeholder: "e.g. 'Day in the life' format, trending audio XYZ",
      helpText: "TikTok trend or sound to leverage",
    },
    {
      key: "hookType",
      label: "Hook (First 3 Seconds)",
      category: "creative-direction",
      type: "select",
      options: [
        "Text Overlay",
        "Direct Address",
        "Visual Surprise",
        "Question",
        "POV Setup",
      ],
      helpText: "First 3 seconds determine watch rate",
      aiDerivable: true,
      aiHint: "Based on content style and audience",
    },
  ],

  "social-carousel": [
    slidesCount(),
    {
      key: "platform",
      label: "Platform",
      category: "format-specs",
      type: "select",
      options: ["Instagram", "LinkedIn", "Facebook"],
      required: true,
      helpText: "Platform determines format constraints and tone",
      aiDerivable: true,
      aiHint: "Based on campaign channel strategy",
    },
    {
      key: "narrativeStructure",
      label: "Slide Narrative",
      category: "creative-direction",
      type: "select",
      options: [
        "Listicle",
        "Before & After",
        "Problem → Solution",
        "Step-by-Step",
        "Data Story",
      ],
      helpText: "How slides connect into a story",
      aiDerivable: true,
      aiHint: "Based on campaign message and goal",
    },
  ],

  // ── Advertising ────────────────────────────────────────

  "search-ad": [
    {
      key: "targetKeywords",
      label: "Target Keywords",
      category: "seo",
      type: "tags",
      placeholder: "Add keyword…",
      required: true,
      helpText: "Keywords this ad targets in Google/Bing",
      aiDerivable: true,
      aiHint: "Based on campaign goal, product, and audience search intent",
    },
    {
      key: "negativeKeywords",
      label: "Negative Keywords",
      category: "seo",
      type: "tags",
      placeholder: "Add keyword to exclude…",
      helpText: "Keywords to exclude from targeting",
    },
    landingPageUrl(),
    {
      key: "adExtensions",
      label: "Ad Extensions",
      category: "campaign-details",
      type: "tags",
      placeholder: "e.g. Sitelinks, Callouts, Structured Snippets",
      helpText: "Google Ads extensions to include",
      aiDerivable: true,
      aiHint: "Suggest relevant extensions based on ad goal",
    },
  ],

  "social-ad": [
    landingPageUrl(),
    {
      key: "adPlatform",
      label: "Platform",
      category: "format-specs",
      type: "select",
      options: ["Facebook", "Instagram", "LinkedIn", "TikTok"],
      required: true,
      helpText: "Social ad platform determines format and copy constraints",
      aiDerivable: true,
      aiHint: "Based on campaign channel strategy and audience",
    },
    {
      key: "adObjective",
      label: "Ad Objective",
      category: "campaign-details",
      type: "select",
      options: [
        "Traffic",
        "Conversions",
        "Lead Generation",
        "Brand Awareness",
        "Engagement",
      ],
      required: true,
      helpText: "Platform ad objective setting",
      aiDerivable: true,
      aiHint: "Based on campaign funnel stage",
    },
    {
      key: "audienceTargeting",
      label: "Audience Targeting",
      category: "audience",
      type: "text",
      placeholder: "e.g. Women 25-44, interest: sustainable fashion",
      helpText: "Key targeting criteria to align copy with",
      aiDerivable: true,
      aiHint: "Based on persona demographics and interests",
    },
  ],

  "display-ad": [
    landingPageUrl(),
    {
      key: "bannerSizes",
      label: "Banner Sizes",
      category: "format-specs",
      type: "tags",
      placeholder: "e.g. 300x250, 728x90, 160x600",
      helpText: "Ad dimensions to write copy for",
      aiDerivable: true,
      aiHint: "Standard sizes: 300x250, 728x90, 160x600",
    },
    {
      key: "placementContext",
      label: "Placement Context",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. News sites, industry blogs, Google Display Network",
      helpText: "Where the ads will appear",
    },
  ],

  "retargeting-ad": [
    landingPageUrl(),
    {
      key: "retargetingSegment",
      label: "Retargeting Segment",
      category: "audience",
      type: "select",
      options: [
        "Cart Abandonment",
        "Page Visitors",
        "Past Customers",
        "Email Subscribers",
        "Video Viewers",
      ],
      required: true,
      helpText: "Which audience segment is being retargeted",
      aiDerivable: true,
      aiHint: "Based on campaign funnel and goal",
    },
    {
      key: "productReference",
      label: "Product / Page to Reference",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. Product X they viewed, pricing page",
      helpText: "What the user previously interacted with",
      aiDerivable: true,
      aiHint: "Based on campaign products",
    },
  ],

  "video-ad": [
    videoDuration(),
    landingPageUrl(),
    {
      key: "adPlatform",
      label: "Platform",
      category: "format-specs",
      type: "select",
      options: [
        "YouTube Pre-Roll",
        "YouTube Bumper (6s)",
        "Social Feed",
        "Connected TV",
      ],
      required: true,
      helpText: "Platform determines pacing and skip behavior",
      aiDerivable: true,
      aiHint: "Based on campaign channel strategy",
    },
    {
      key: "skipBehavior",
      label: "Skippable?",
      category: "format-specs",
      type: "boolean",
      helpText: "Whether viewers can skip after 5 seconds",
      aiDerivable: true,
      aiHint: "YouTube pre-roll is typically skippable; bumper ads are not",
    },
  ],

  "native-ad": [
    landingPageUrl(),
    {
      key: "publisherStyle",
      label: "Publisher / Editorial Style",
      category: "creative-direction",
      type: "text",
      placeholder: "e.g. Matches editorial tone of TechCrunch",
      helpText: "Native ads should match the host publication's style",
      aiDerivable: true,
      aiHint: "Based on placement context and audience",
    },
    {
      key: "disclosureText",
      label: "Disclosure / Sponsored Label",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. Sponsored by [Brand]",
      helpText: "Required advertising disclosure text",
    },
  ],

  // ── Email Marketing ────────────────────────────────────

  newsletter: [
    subjectLine(),
    {
      key: "sectionTopics",
      label: "Section Topics",
      category: "campaign-details",
      type: "tags",
      placeholder: "Add section topic…",
      helpText: "Content sections to include in the newsletter",
      aiDerivable: true,
      aiHint: "3-5 sections based on campaign themes and recent content",
    },
    {
      key: "subscriberSegment",
      label: "Subscriber Segment",
      category: "audience",
      type: "text",
      placeholder: "e.g. Active subscribers, free tier users",
      helpText: "Which subscriber segment receives this",
      aiDerivable: true,
      aiHint: "Based on campaign audience targeting",
    },
  ],

  "welcome-sequence": [
    {
      key: "emailCount",
      label: "Number of Emails",
      category: "format-specs",
      type: "number",
      placeholder: "e.g. 5",
      required: true,
      helpText: "Emails in the welcome sequence (3-7 typical)",
      aiDerivable: true,
      aiHint: "Based on onboarding complexity, typically 4-5",
    },
    {
      key: "sendInterval",
      label: "Send Interval",
      category: "format-specs",
      type: "select",
      options: ["Daily", "Every 2 Days", "Every 3 Days", "Weekly"],
      helpText: "Time between emails in the sequence",
      aiDerivable: true,
      aiHint: "Based on urgency and engagement pattern",
    },
    {
      key: "onboardingSteps",
      label: "Key Onboarding Steps",
      category: "campaign-details",
      type: "tags",
      placeholder: "e.g. Setup profile, First project, Invite team",
      helpText: "Actions you want new users to complete",
      aiDerivable: true,
      aiHint: "Based on product features and activation goals",
    },
  ],

  "promotional-email": [
    subjectLine(),
    {
      key: "offerDetails",
      label: "Offer Details",
      category: "campaign-details",
      type: "textarea",
      placeholder: "e.g. 30% off annual plans until June 30",
      required: true,
      helpText: "The specific offer, discount, or promotion",
    },
    {
      key: "urgencyElement",
      label: "Urgency / Scarcity",
      category: "creative-direction",
      type: "text",
      placeholder: "e.g. Limited to first 100 signups, ends Friday",
      helpText: "Time-bound or quantity-limited element",
      aiDerivable: true,
      aiHint: "Based on campaign dates and offer structure",
    },
    landingPageUrl(),
  ],

  "nurture-sequence": [
    {
      key: "emailCount",
      label: "Number of Emails",
      category: "format-specs",
      type: "number",
      placeholder: "e.g. 5",
      required: true,
      helpText: "Emails in the nurture sequence",
      aiDerivable: true,
      aiHint: "Based on sales cycle length, typically 5-8",
    },
    {
      key: "buyingStage",
      label: "Entry Buying Stage",
      category: "audience",
      type: "select",
      options: ["Awareness", "Consideration", "Evaluation", "Decision"],
      required: true,
      helpText: "Where leads enter this sequence",
      aiDerivable: true,
      aiHint: "Based on campaign funnel position",
    },
    {
      key: "keyObjections",
      label: "Objections to Address",
      category: "audience",
      type: "tags",
      placeholder: "e.g. Price too high, Not sure about ROI",
      helpText: "Common objections to overcome in the sequence",
      aiDerivable: true,
      aiHint: "Based on persona pain points and buying barriers",
    },
  ],

  "re-engagement-email": [
    subjectLine(),
    {
      key: "incentive",
      label: "Re-engagement Incentive",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. 20% welcome-back discount, exclusive content",
      helpText: "What motivates return (discount, exclusive, reminder)",
      aiDerivable: true,
      aiHint: "Based on product value and audience segment",
    },
    {
      key: "inactivityPeriod",
      label: "Inactivity Period",
      category: "audience",
      type: "select",
      options: ["30 days", "60 days", "90 days", "6+ months"],
      helpText: "How long the subscriber has been inactive",
    },
  ],

  // ── Website & Landing Pages ────────────────────────────

  "landing-page": [
    seoKeyword(),
    {
      key: "conversionGoal",
      label: "Conversion Goal",
      category: "campaign-details",
      type: "select",
      options: [
        "Email Signup",
        "Free Trial",
        "Download",
        "Purchase",
        "Demo Request",
        "Contact Form",
      ],
      required: true,
      helpText: "Primary action visitors should take",
      aiDerivable: true,
      aiHint: "Based on campaign funnel stage and goal",
    },
    {
      key: "trafficSource",
      label: "Primary Traffic Source",
      category: "audience",
      type: "select",
      options: ["Paid Ads", "Email", "Organic Search", "Social Media", "Referral"],
      helpText: "Where visitors come from affects messaging",
      aiDerivable: true,
      aiHint: "Based on campaign channel strategy",
    },
    {
      key: "formFields",
      label: "Form Fields",
      category: "format-specs",
      type: "tags",
      placeholder: "e.g. Name, Email, Company, Phone",
      helpText: "Fields in the conversion form",
    },
    {
      key: "socialProof",
      label: "Available Social Proof",
      category: "references",
      type: "tags",
      placeholder: "e.g. Client logos, testimonials, stats",
      helpText: "Trust elements to include on the page",
    },
  ],

  "product-page": [
    seoKeyword(),
    {
      key: "productSpecs",
      label: "Key Product Specs",
      category: "references",
      type: "textarea",
      placeholder: "e.g. Dimensions, materials, compatibility, pricing",
      required: true,
      helpText: "Technical specifications to include",
      aiDerivable: true,
      aiHint: "Based on linked products in campaign",
    },
    {
      key: "pricingInfo",
      label: "Pricing Information",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. Starting at €49/month, free tier available",
      helpText: "Pricing to display or reference",
    },
    {
      key: "competitorDifferentiator",
      label: "Key Differentiator vs Competition",
      category: "creative-direction",
      type: "text",
      placeholder: "e.g. Only solution with AI-powered brand analysis",
      helpText: "What makes this product unique",
      aiDerivable: true,
      aiHint: "Based on competitive positioning and brand promise",
    },
  ],

  "faq-page": [
    {
      key: "topQuestions",
      label: "Top Questions to Answer",
      category: "campaign-details",
      type: "tags",
      placeholder: "Add question…",
      required: true,
      helpText: "Most common customer questions",
      aiDerivable: true,
      aiHint: "Based on product, persona pain points, and objections",
    },
    seoKeyword(),
  ],

  "comparison-page": [
    seoKeyword(),
    {
      key: "competitors",
      label: "Competitors to Compare",
      category: "references",
      type: "tags",
      placeholder: "Add competitor name…",
      required: true,
      helpText: "Which competitors to compare against",
      aiDerivable: true,
      aiHint: "Based on campaign competitor data",
    },
    {
      key: "comparisonCriteria",
      label: "Comparison Criteria",
      category: "campaign-details",
      type: "tags",
      placeholder: "e.g. Price, Features, Support, Integrations",
      helpText: "Dimensions to compare on",
      aiDerivable: true,
      aiHint: "Based on product strengths and competitor weaknesses",
    },
  ],

  microsite: [
    seoKeyword(),
    {
      key: "micrositePages",
      label: "Page Count",
      category: "format-specs",
      type: "number",
      placeholder: "e.g. 3",
      helpText: "Number of pages in the microsite",
      aiDerivable: true,
      aiHint: "Based on campaign scope, typically 3-5",
    },
    {
      key: "campaignDuration",
      label: "Campaign Duration",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. June 1-30, 2026",
      helpText: "How long the microsite will be live",
    },
    visualDirection(),
  ],

  // ── Video & Audio ──────────────────────────────────────

  "explainer-video": [
    videoDuration(),
    {
      key: "videoFormat",
      label: "Video Format",
      category: "format-specs",
      type: "select",
      options: [
        "Animation / Motion Graphics",
        "Screen Recording",
        "Live Action",
        "Mixed Media",
      ],
      required: true,
      helpText: "Production style of the explainer",
      aiDerivable: true,
      aiHint: "Based on product type and brand style",
    },
    {
      key: "complexityLevel",
      label: "Topic Complexity",
      category: "audience",
      type: "select",
      options: ["Simple (consumer)", "Moderate (prosumer)", "Complex (technical)"],
      helpText: "Determines explanation depth and jargon level",
      aiDerivable: true,
      aiHint: "Based on target persona expertise",
    },
  ],

  "testimonial-video": [
    videoDuration(),
    {
      key: "customerName",
      label: "Featured Customer",
      category: "references",
      type: "text",
      placeholder: "e.g. Sarah Chen, VP Marketing at TechCorp",
      required: true,
      helpText: "Customer name and title for the testimonial",
    },
    {
      key: "keyMessages",
      label: "Key Messages to Capture",
      category: "creative-direction",
      type: "tags",
      placeholder: "e.g. Time saved, ROI achieved, team adoption",
      helpText: "Core points the testimonial should convey",
      aiDerivable: true,
      aiHint: "Based on product value proposition and campaign goals",
    },
  ],

  "promo-video": [
    videoDuration(),
    {
      key: "emotionalTone",
      label: "Emotional Tone",
      category: "creative-direction",
      type: "select",
      options: [
        "Inspirational",
        "Energetic",
        "Professional",
        "Playful",
        "Urgent",
        "Warm",
      ],
      helpText: "Emotional direction for the video",
      aiDerivable: true,
      aiHint: "Based on brand personality and campaign goal",
    },
    {
      key: "musicDirection",
      label: "Music / Sound Direction",
      category: "creative-direction",
      type: "text",
      placeholder: "e.g. Upbeat electronic, corporate ambient, acoustic",
      helpText: "Music mood and style guidance",
      aiDerivable: true,
      aiHint: "Based on brand personality and video tone",
    },
    visualDirection(),
  ],

  "webinar-outline": [
    videoDuration(),
    {
      key: "webinarFormat",
      label: "Webinar Format",
      category: "format-specs",
      type: "select",
      options: [
        "Presentation + Q&A",
        "Panel Discussion",
        "Workshop / Hands-on",
        "Interview",
        "Demo",
      ],
      helpText: "Webinar structure",
      aiDerivable: true,
      aiHint: "Based on topic and audience engagement goals",
    },
    {
      key: "speakers",
      label: "Speakers / Hosts",
      category: "references",
      type: "tags",
      placeholder: "Add speaker name…",
      helpText: "Presenter names and titles",
    },
    {
      key: "interactionPoints",
      label: "Interaction Points",
      category: "format-specs",
      type: "tags",
      placeholder: "e.g. Poll at 10min, Q&A at 25min, breakout at 35min",
      helpText: "Planned audience interaction moments",
    },
  ],

  "podcast-outline": [
    videoDuration(),
    {
      key: "podcastFormat",
      label: "Episode Format",
      category: "format-specs",
      type: "select",
      options: ["Solo", "Interview", "Panel", "Co-hosted", "Narrative"],
      required: true,
      helpText: "Episode structure",
      aiDerivable: true,
      aiHint: "Based on content type and available speakers",
    },
    {
      key: "guestInfo",
      label: "Guest Name & Bio",
      category: "references",
      type: "textarea",
      placeholder: "e.g. Jane Doe, CEO of BrandCo — 15 years in brand strategy",
      helpText: "Guest details for interview-style episodes",
    },
    {
      key: "seriesContext",
      label: "Series / Season Context",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. Episode 12 of 'Brand Builders' series",
      helpText: "How this episode fits into a larger series",
    },
  ],

  // ── Sales & Pitch ──────────────────────────────────────

  "sales-deck": [
    slidesCount(),
    {
      key: "targetClient",
      label: "Target Client / Audience",
      category: "audience",
      type: "text",
      placeholder: "e.g. Enterprise CMOs at retail brands",
      required: true,
      helpText: "Who will receive this pitch",
      aiDerivable: true,
      aiHint: "Based on campaign personas and target segment",
    },
    {
      key: "pricingInfo",
      label: "Pricing / Investment",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. Starting at €5K/month, custom enterprise pricing",
      helpText: "Pricing information to include in the deck",
    },
    {
      key: "keyMetrics",
      label: "Proof Points / Metrics",
      category: "references",
      type: "tags",
      placeholder: "e.g. 150+ clients, 40% avg ROI increase",
      helpText: "Quantifiable results and credentials",
      aiDerivable: true,
      aiHint: "Based on product data and case studies",
    },
  ],

  "one-pager": [
    {
      key: "targetClient",
      label: "Target Audience",
      category: "audience",
      type: "text",
      placeholder: "e.g. Marketing managers evaluating tools",
      required: true,
      helpText: "Who will read this one-pager",
      aiDerivable: true,
      aiHint: "Based on campaign personas",
    },
    {
      key: "keyDifferentiators",
      label: "Key Differentiators",
      category: "creative-direction",
      type: "tags",
      placeholder: "e.g. AI-powered, all-in-one platform, 24/7 support",
      helpText: "Top 3-5 competitive advantages",
      aiDerivable: true,
      aiHint: "Based on brand promise and competitor analysis",
    },
    {
      key: "keyMetrics",
      label: "Proof Points",
      category: "references",
      type: "tags",
      placeholder: "e.g. 500+ customers, 99.9% uptime",
      helpText: "Quantifiable proof of value",
    },
  ],

  "proposal-template": [
    {
      key: "clientName",
      label: "Client / Project Name",
      category: "references",
      type: "text",
      placeholder: "e.g. TechCorp Q3 Brand Refresh",
      required: true,
      helpText: "Client name for proposal personalization",
    },
    {
      key: "projectScope",
      label: "Project Scope",
      category: "campaign-details",
      type: "textarea",
      placeholder: "e.g. Full brand identity redesign including logo, guidelines, and collateral",
      required: true,
      helpText: "High-level scope of work",
      aiDerivable: true,
      aiHint: "Based on campaign deliverables and strategy",
    },
    {
      key: "budgetRange",
      label: "Budget Range",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. €15,000 - €25,000",
      helpText: "Budget indication for the proposal",
    },
    {
      key: "timeline",
      label: "Project Timeline",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. 6 weeks, starting July 2026",
      helpText: "Expected project duration",
      aiDerivable: true,
      aiHint: "Based on campaign dates",
    },
  ],

  "product-description": [
    seoKeyword(),
    {
      key: "productSpecs",
      label: "Product Specifications",
      category: "references",
      type: "textarea",
      placeholder: "Technical specs, dimensions, materials, etc.",
      required: true,
      helpText: "Key product details to include",
      aiDerivable: true,
      aiHint: "Based on linked products",
    },
    {
      key: "pricingInfo",
      label: "Pricing",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. €99, starting at €49/month",
      helpText: "Product pricing to mention",
    },
    {
      key: "targetSegment",
      label: "Target Buyer Segment",
      category: "audience",
      type: "text",
      placeholder: "e.g. Small business owners, creative professionals",
      helpText: "Primary buyer for tone and benefit framing",
      aiDerivable: true,
      aiHint: "Based on campaign personas",
    },
  ],

  // ── PR & Communications ────────────────────────────────

  "press-release": [
    {
      key: "newsFact",
      label: "News Fact / Announcement",
      category: "campaign-details",
      type: "textarea",
      placeholder: "e.g. Launch of new AI-powered brand analysis platform",
      required: true,
      helpText: "The newsworthy event or announcement",
      aiDerivable: true,
      aiHint: "Based on campaign goal and product/service",
    },
    {
      key: "releaseDate",
      label: "Release Date",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. June 15, 2026",
      helpText: "Publication date (for dateline)",
      aiDerivable: true,
      aiHint: "Based on campaign start date",
    },
    {
      key: "spokespersonQuote",
      label: "Spokesperson Quote",
      category: "references",
      type: "textarea",
      placeholder: "e.g. 'This launch represents...' — CEO Name",
      helpText: "Quote from company executive",
    },
    {
      key: "contactInfo",
      label: "Press Contact",
      category: "references",
      type: "text",
      placeholder: "e.g. press@company.com, +31 20 123 4567",
      helpText: "Media contact information",
    },
  ],

  "media-pitch": [
    {
      key: "targetJournalist",
      label: "Target Journalist / Publication",
      category: "audience",
      type: "text",
      placeholder: "e.g. Marketing Week, Adformatie, specific journalist name",
      required: true,
      helpText: "Who you're pitching to",
    },
    {
      key: "exclusiveAngle",
      label: "Exclusive Angle",
      category: "creative-direction",
      type: "textarea",
      placeholder: "e.g. First look at AI brand strategy tool with exclusive data",
      helpText: "What makes this pitch newsworthy for this journalist",
      aiDerivable: true,
      aiHint: "Based on campaign USP and target publication",
    },
    {
      key: "embargoDate",
      label: "Embargo Date",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. Under embargo until June 15, 2026",
      helpText: "If applicable, when the news can be published",
    },
  ],

  "internal-comms": [
    {
      key: "announcementType",
      label: "Announcement Type",
      category: "format-specs",
      type: "select",
      options: [
        "Company Update",
        "Policy Change",
        "Product Launch",
        "Leadership Change",
        "Team Achievement",
      ],
      helpText: "Type of internal communication",
      aiDerivable: true,
      aiHint: "Based on campaign context",
    },
    {
      key: "actionRequired",
      label: "Action Required?",
      category: "campaign-details",
      type: "boolean",
      helpText: "Whether employees need to do something",
    },
    {
      key: "affectedTeams",
      label: "Affected Teams / Departments",
      category: "audience",
      type: "tags",
      placeholder: "e.g. Marketing, Sales, Product, All Staff",
      helpText: "Who this communication is for",
    },
  ],

  "career-page": [
    {
      key: "jobTitle",
      label: "Job Title",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. Senior Brand Strategist",
      required: true,
      helpText: "Position title",
    },
    {
      key: "jobLocation",
      label: "Location",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. Amsterdam, Netherlands (Hybrid)",
      helpText: "Work location and remote policy",
    },
    {
      key: "salaryRange",
      label: "Salary Range",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. €60,000 - €80,000",
      helpText: "Salary indication (recommended for transparency)",
    },
    {
      key: "teamContext",
      label: "Team Context",
      category: "references",
      type: "text",
      placeholder: "e.g. Join a 12-person brand strategy team",
      helpText: "Team size and who they'll work with",
      aiDerivable: true,
      aiHint: "Based on company context",
    },
  ],

  "job-ad-copy": [
    {
      key: "jobTitle",
      label: "Job Title",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. Marketing Manager",
      required: true,
      helpText: "Position title",
    },
    {
      key: "keyRequirements",
      label: "Key Requirements",
      category: "references",
      type: "tags",
      placeholder: "e.g. 5+ years marketing, B2B experience, data-driven",
      required: true,
      helpText: "Must-have qualifications",
    },
    {
      key: "uniquePerks",
      label: "Unique Perks / Benefits",
      category: "creative-direction",
      type: "tags",
      placeholder: "e.g. 4-day work week, learning budget, equity",
      helpText: "Differentiating benefits to highlight",
    },
  ],

  "employee-story": [
    {
      key: "employeeName",
      label: "Employee Name & Role",
      category: "references",
      type: "text",
      placeholder: "e.g. Maria Santos, Lead Designer — 3 years at company",
      required: true,
      helpText: "Featured employee details",
    },
    {
      key: "storyAngle",
      label: "Story Angle",
      category: "creative-direction",
      type: "select",
      options: [
        "Career Growth",
        "Day in the Life",
        "Project Highlight",
        "Culture & Values",
        "Innovation Story",
      ],
      helpText: "Narrative focus of the story",
      aiDerivable: true,
      aiHint: "Based on employer brand goals",
    },
  ],

  "employer-brand-video": [
    videoDuration(),
    {
      key: "storyAngle",
      label: "Video Focus",
      category: "creative-direction",
      type: "select",
      options: [
        "Culture Overview",
        "Employee Testimonials",
        "Office / Workspace Tour",
        "Team Collaboration",
        "Impact & Mission",
      ],
      helpText: "Video narrative focus",
      aiDerivable: true,
      aiHint: "Based on employer brand goals and company values",
    },
    {
      key: "musicDirection",
      label: "Music Direction",
      category: "creative-direction",
      type: "text",
      placeholder: "e.g. Warm acoustic, modern upbeat",
      helpText: "Music mood for the video",
    },
  ],

  "impact-report": [
    {
      key: "reportingPeriod",
      label: "Reporting Period",
      category: "campaign-details",
      type: "text",
      placeholder: "e.g. FY 2025, Q1-Q2 2026",
      required: true,
      helpText: "Time period covered by the report",
    },
    {
      key: "impactMetrics",
      label: "Key Impact Metrics",
      category: "references",
      type: "tags",
      placeholder: "e.g. CO2 reduced 40%, 500 jobs created, €2M donated",
      required: true,
      helpText: "Quantifiable impact data to highlight",
    },
    {
      key: "stakeholderAudience",
      label: "Primary Audience",
      category: "audience",
      type: "select",
      options: ["Investors", "Customers", "Employees", "General Public", "Regulators"],
      helpText: "Who will read this report",
      aiDerivable: true,
      aiHint: "Based on campaign audience",
    },
    {
      key: "esgFramework",
      label: "Reporting Framework",
      category: "references",
      type: "select",
      options: ["GRI", "SASB", "TCFD", "B Corp", "UN SDGs", "Custom"],
      helpText: "ESG/sustainability reporting framework used",
    },
  ],
};

// ─── Public API ────────────────────────────────────────────

/**
 * Get all content-type-specific input fields for a deliverable type.
 * Returns empty array for unknown types.
 */
export function getContentTypeInputs(
  typeId: string
): ContentTypeInputField[] {
  return CONTENT_TYPE_INPUTS[typeId] ?? [];
}

/**
 * Get only required fields (triggers quality nudge when missing).
 */
export function getRequiredInputs(
  typeId: string
): ContentTypeInputField[] {
  return getContentTypeInputs(typeId).filter((f) => f.required);
}

/**
 * Get only AI-derivable fields (Asset Planner should attempt to fill these).
 */
export function getAiDerivableInputs(
  typeId: string
): ContentTypeInputField[] {
  return getContentTypeInputs(typeId).filter((f) => f.aiDerivable);
}

/**
 * Get all unique categories that have fields for a given type.
 * Returns categories sorted by display order.
 */
export function getInputCategories(
  typeId: string
): { category: InputCategory; label: string }[] {
  const fields = getContentTypeInputs(typeId);
  const seen = new Set<InputCategory>();
  const result: { category: InputCategory; label: string }[] = [];

  for (const field of fields) {
    if (!seen.has(field.category)) {
      seen.add(field.category);
      result.push({
        category: field.category,
        label: INPUT_CATEGORY_CONFIG[field.category].label,
      });
    }
  }

  return result.sort(
    (a, b) =>
      INPUT_CATEGORY_CONFIG[a.category].order -
      INPUT_CATEGORY_CONFIG[b.category].order
  );
}

/**
 * Build AI derivation instructions for the Asset Planner prompt.
 * Groups aiDerivable fields by type for compact prompt injection.
 */
export function buildAiDerivationInstructions(): string {
  const typeGroups = new Map<string, string[]>();

  for (const [typeId, fields] of Object.entries(CONTENT_TYPE_INPUTS)) {
    const derivable = fields.filter((f) => f.aiDerivable);
    if (derivable.length === 0) continue;

    const fieldDescs = derivable.map(
      (f) => `${f.key} (${f.aiHint || f.label})`
    );
    typeGroups.set(typeId, fieldDescs);
  }

  // Group similar types for shorter prompt
  const lines: string[] = [];
  lines.push(
    'For each deliverable, include a "contentTypeInputs" object with type-specific metadata.'
  );
  lines.push(
    "Only include fields where you can derive a reasonable value from the campaign context."
  );
  lines.push("Examples by content type:");

  // Show representative examples, not all 53
  const examples: [string, string[]][] = [
    [
      "Blog posts / articles / pillar pages",
      ['seoKeyword: "primary keyword"', "secondaryKeywords: [...]", "targetWordCount: N"],
    ],
    [
      "Social ads / search ads",
      ['landingPageUrl: "suggested URL"', "targetKeywords: [...]", 'adObjective: "Conversions"'],
    ],
    [
      "Email (newsletter, promotional, welcome)",
      ['subjectLine: "suggested subject"', "emailCount: N (for sequences)"],
    ],
    [
      "Video / audio content",
      ["videoDuration: N (seconds)", 'videoFormat: "Animation"'],
    ],
    [
      "Landing pages / product pages",
      ['conversionGoal: "Free Trial"', 'trafficSource: "Paid Ads"'],
    ],
    [
      "Carousels / decks",
      ["slidesCount: N", 'narrativeStructure: "Problem → Solution"'],
    ],
    [
      "Press releases / media pitches",
      ['newsFact: "announcement"', 'releaseDate: "date"'],
    ],
    [
      "Job postings / career pages",
      ['jobTitle: "role"', "keyRequirements: [...]"],
    ],
  ];

  for (const [types, fields] of examples) {
    lines.push(`  - ${types}: { ${fields.join(", ")} }`);
  }

  return lines.join("\n");
}

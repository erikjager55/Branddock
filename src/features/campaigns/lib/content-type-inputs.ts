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
  | "creative-direction"
  | "content-style"
  | "engagement";

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
  /**
   * Options for 'select' type. Accepts either bare strings (value === label)
   * or `{ value, label }` objects when the underlying value differs from the
   * display text (e.g. value `"text-only"`, label `"Text Only"`).
   */
  options?: Array<string | { value: string; label: string }>;
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
  "content-style": { label: "Content Style", order: 2 },
  engagement: { label: "Engagement", order: 3 },
  "campaign-details": { label: "Campaign Details", order: 4 },
  "format-specs": { label: "Format & Specs", order: 5 },
  audience: { label: "Audience", order: 6 },
  references: { label: "References & Sources", order: 7 },
  "creative-direction": { label: "Creative Direction", order: 8 },
};

// ─── Content categories ────────────────────────────────────

/**
 * Top-level grouping for content types. Drives the Strategy-tone suggestion
 * chips (only 4 categories have curated tone vocabularies; the rest fall
 * back to free text). NOT a UI-visible label — used internally to scope
 * tone/CTA helpers.
 */
export type ContentCategory =
  | 'social'
  | 'long-form'
  | 'sales'
  | 'pr-hr'
  | 'email'
  | 'carousel'
  | 'podcast'
  | 'ad'
  | 'video'
  | 'web-page';

/**
 * Map of every registered content-type id to its category. Sourced from
 * which *ContentStyleFields() bundle each type spreads in CONTENT_TYPE_INPUTS.
 * For types using multiple bundles (e.g. video-ad spreads both ad + video),
 * the category that owns tone wins (video-ad → 'ad' because ad has button
 * labels, video has none).
 */
const CATEGORY_BY_TYPE: Record<string, ContentCategory> = {
  // social
  'linkedin-post': 'social',
  'instagram-post': 'social',
  'twitter-thread': 'social',
  'facebook-post': 'social',
  'linkedin-event': 'social',
  'linkedin-poll': 'social',
  // long-form
  'blog-post': 'long-form',
  'pillar-page': 'long-form',
  'case-study': 'long-form',
  'thought-leadership': 'long-form',
  'linkedin-article': 'long-form',
  // sales
  'sales-deck': 'sales',
  'one-pager': 'sales',
  'proposal-template': 'sales',
  'product-description': 'sales',
  // pr / hr / comms
  'press-release': 'pr-hr',
  'media-pitch': 'pr-hr',
  'internal-comms': 'pr-hr',
  'career-page': 'pr-hr',
  'job-ad-copy': 'pr-hr',
  'employee-story': 'pr-hr',
  'impact-report': 'pr-hr',
  // email
  'welcome-sequence': 'email',
  'promotional-email': 'email',
  'nurture-sequence': 'email',
  're-engagement-email': 'email',
  'linkedin-newsletter': 'email',
  // carousel
  'linkedin-carousel': 'carousel',
  'social-carousel': 'carousel',
  // podcast / webinar
  'webinar-outline': 'podcast',
  'podcast-outline': 'podcast',
  // ad
  'search-ad': 'ad',
  'social-ad': 'ad',
  'display-ad': 'ad',
  'retargeting-ad': 'ad',
  'native-ad': 'ad',
  'linkedin-ad': 'ad',
  // video — types that spread videoContentStyleFields()
  'tiktok-script': 'video',
  'explainer-video': 'video',
  'testimonial-video': 'video',
  'promo-video': 'video',
  'linkedin-video': 'video',
  'employer-brand-video': 'video',
  'video-ad': 'ad',
  // web-page
  'landing-page': 'web-page',
  'product-page': 'web-page',
  'faq-page': 'web-page',
  'comparison-page': 'web-page',
  microsite: 'web-page',
};

/**
 * Curated tone-of-voice suggestion chips per content category. The Strategy
 * tone field in the Content Brief is always a free-text input — these
 * chips populate the input when clicked, replacing the per-type tone
 * dropdowns that used to ask the same question twice. Categories not
 * listed here render free-text only (no chips).
 */
export const TONE_SUGGESTIONS_BY_CATEGORY: Partial<
  Record<ContentCategory, ReadonlyArray<{ value: string; label: string }>>
> = {
  social: [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'inspirational', label: 'Inspirational' },
    { value: 'educational', label: 'Educational' },
    { value: 'humorous', label: 'Humorous' },
  ],
  'long-form': [
    { value: 'authoritative', label: 'Authoritative — expert, definitive' },
    { value: 'conversational', label: 'Conversational — friendly, peer-to-peer' },
    { value: 'analytical', label: 'Analytical — data-driven, neutral' },
    { value: 'inspirational', label: 'Inspirational — vision-driven' },
    { value: 'journalistic', label: 'Journalistic — fact-first, investigative' },
  ],
  sales: [
    { value: 'consultative', label: 'Consultative — advisor approach' },
    { value: 'direct', label: 'Direct — clear and assertive' },
    { value: 'premium', label: 'Premium — sophisticated, high-end' },
    { value: 'friendly', label: 'Friendly — warm and approachable' },
  ],
  'pr-hr': [
    { value: 'neutral-journalistic', label: 'Neutral / Journalistic — press-release style' },
    { value: 'official', label: 'Official — formal corporate' },
    { value: 'warm-personal', label: 'Warm / Personal — human voice' },
    { value: 'advocacy', label: 'Advocacy — values-driven' },
  ],
};

/**
 * Curated call-to-action suggestion chips per content category. Used by the
 * Strategy CTA field (free-text input + chips). Replaces the social-style /
 * sales-style fields that were really "what action should the audience
 * take?" — now asked once. Type-specific button labels (adCtaType),
 * placement (ctaPlacement), and toggles (includeCtaSlide) remain in the
 * type-specific fields because they answer different questions.
 */
export const CTA_SUGGESTIONS_BY_CATEGORY: Partial<
  Record<ContentCategory, ReadonlyArray<{ value: string; label: string }>>
> = {
  social: [
    { value: 'Direct', label: 'Direct ask' },
    { value: 'Question', label: 'Question to engage' },
    { value: 'Soft suggestion', label: 'Soft suggestion' },
  ],
  sales: [
    { value: 'Request a demo', label: 'Request a demo' },
    { value: 'Book a meeting', label: 'Book a meeting' },
    { value: 'Start free trial', label: 'Start free trial' },
    { value: 'Contact sales', label: 'Contact sales' },
  ],
};

// ─── Shared field builders ─────────────────────────────────

function seoKeyword(overrides: Partial<ContentTypeInputField> = {}): ContentTypeInputField {
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
    ...overrides,
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

// ─── Content-styling field builders ───────────────────────
// Migrated 2026-04-27 from medium-config-registry. These shape WHAT the AI
// writes (hashtag strategy, visual direction, etc.) — they belong with the
// brief, not with the medium-rendering config in Step 3. The medium config
// still holds platform-rendering fields (page layout, hero style, slide
// count, etc.). Prompt-injection still happens via formatMediumConfig in
// the orchestrator — the value just travels through contentTypeInputs now.
//
// The per-type tone + CTA-style fields that used to live here were removed
// 2026-04-28 — they duplicated brief.toneDirection / brief.callToAction,
// asking the same strategic question twice in different formats. The
// curated tone/CTA vocabularies are exposed via TONE_SUGGESTIONS_BY_CATEGORY
// and CTA_SUGGESTIONS_BY_CATEGORY so the unified Strategy fields in the
// Content Brief section can show them as suggestion chips.

function visualStyle(overrides: Partial<ContentTypeInputField> = {}): ContentTypeInputField {
  return {
    key: "visualStyle",
    label: "Visual Style",
    category: "content-style",
    type: "select",
    options: [
      { value: "photo", label: "Photo" },
      { value: "illustration", label: "Illustration" },
      { value: "text-only", label: "Text Only" },
      { value: "infographic", label: "Infographic" },
    ],
    helpText: "Direction for the accompanying visual",
    aiDerivable: true,
    aiHint: "Default to photo unless brand or content type suggests otherwise",
    ...overrides,
  };
}

function hashtagStrategy(overrides: Partial<ContentTypeInputField> = {}): ContentTypeInputField {
  return {
    key: "hashtagStrategy",
    label: "Hashtag Strategy",
    category: "engagement",
    type: "select",
    options: [
      { value: "trending", label: "Trending — broad reach" },
      { value: "niche", label: "Niche — targeted community" },
      { value: "branded", label: "Branded — own hashtags" },
      { value: "mixed", label: "Mixed — combination" },
      { value: "none", label: "None" },
    ],
    helpText: "Which kind of hashtags to add at the end of the post",
    aiDerivable: true,
    ...overrides,
  };
}

function includeEmoji(overrides: Partial<ContentTypeInputField> = {}): ContentTypeInputField {
  return {
    key: "includeEmoji",
    label: "Include Emojis",
    category: "engagement",
    type: "boolean",
    helpText: "Weave emojis naturally into the post body",
    aiDerivable: true,
    ...overrides,
  };
}

/**
 * Standard set of content-style fields for all social-post types
 * (LinkedIn / Instagram / Facebook / X / TikTok / etc.). Tone + CTA are
 * handled by the unified Strategy fields in the Content Brief — see
 * TONE_SUGGESTIONS_BY_CATEGORY / CTA_SUGGESTIONS_BY_CATEGORY for the
 * social-specific suggestion chips.
 */
function socialContentStyleFields(): ContentTypeInputField[] {
  return [
    visualStyle(),
    hashtagStrategy(),
    includeEmoji(),
  ];
}

// ── Long-form (blog / pillar / whitepaper / case-study / article / FAQ) ──
// Tone is unified into the Strategy field with long-form suggestion chips
// (see TONE_SUGGESTIONS_BY_CATEGORY['long-form']).

function articleStructure(): ContentTypeInputField {
  return {
    key: "articleStructure",
    label: "Article Structure",
    category: "content-style",
    type: "select",
    options: [
      { value: "deep-dive", label: "Deep Dive — single topic, in depth" },
      { value: "listicle", label: "Listicle — numbered list of points" },
      { value: "how-to", label: "How-to Guide — step-by-step instructions" },
      { value: "explainer", label: "Explainer — break down a complex concept" },
      { value: "comparison", label: "Comparison — compare options or approaches" },
      { value: "narrative", label: "Narrative — story-driven arc" },
    ],
    helpText: "How the article is structured",
    aiDerivable: true,
  };
}

function readingLevel(): ContentTypeInputField {
  return {
    key: "readingLevel",
    label: "Reading Level (1–5)",
    category: "content-style",
    type: "number",
    placeholder: "3",
    helpText: "1 = beginner / general audience · 5 = expert / technical",
    aiDerivable: true,
  };
}

function includeFaq(): ContentTypeInputField {
  return {
    key: "includeFaq",
    label: "Include FAQ Section",
    category: "engagement",
    type: "boolean",
    helpText: "Generate a FAQ block at the end — useful for SEO",
    aiDerivable: true,
  };
}

function longFormContentStyleFields(): ContentTypeInputField[] {
  // Removed 2026-04-28: includeQuotes (the AI uses quotes appropriately
  // by default — explicit toggle was rarely flipped), internalLinking
  // (vague strategy that overlaps with the explicit per-type
  // `internalLinks` field), longFormSeoFocus (redundant — having a
  // seoKeyword set IS the SEO signal). Per-article tone now lives in
  // the unified Strategy field.
  return [
    articleStructure(),
    readingLevel(),
    includeFaq(),
  ];
}

// ── Sales (one-pager / deck / proposal / product description) ──
// Tone + CTA-style are unified into the Strategy fields (see
// TONE_SUGGESTIONS_BY_CATEGORY['sales'] and CTA_SUGGESTIONS_BY_CATEGORY['sales']).

function salesAngle(): ContentTypeInputField {
  return {
    key: "salesAngle",
    label: "Sales Angle",
    category: "content-style",
    type: "select",
    options: [
      { value: "problem-solution", label: "Problem → Solution — pain-led" },
      { value: "benefit-led", label: "Benefit-led — lead with outcomes" },
      { value: "feature-focused", label: "Feature-focused — capability breakdown" },
      { value: "social-proof", label: "Social Proof — customer wins first" },
      { value: "competitive", label: "Competitive — differentiate vs alternatives" },
    ],
    aiDerivable: true,
  };
}

function includePricing(): ContentTypeInputField {
  return {
    key: "includePricing",
    label: "Include Pricing Section",
    category: "engagement",
    type: "boolean",
    helpText: "Placeholder only — leave off if pricing is custom",
  };
}

function salesContentStyleFields(): ContentTypeInputField[] {
  // Removed 2026-04-28: proofPointDensity (1-5 numeric was too granular —
  // the AI matches density to audience and tone by default). Tone + CTA-
  // style now live in the unified Strategy fields.
  return [salesAngle(), includePricing()];
}

// ── PR / HR / Comms ──
// Tone is unified into the Strategy field (see TONE_SUGGESTIONS_BY_CATEGORY['pr-hr']).

function prStructure(): ContentTypeInputField {
  return {
    key: "structure",
    label: "Structure",
    category: "content-style",
    type: "select",
    options: [
      { value: "inverted-pyramid", label: "Inverted Pyramid — lead first" },
      { value: "chronological", label: "Chronological — timeline / story arc" },
      { value: "profile", label: "Profile — person-centric" },
      { value: "impact-report", label: "Impact Report — metrics + narrative" },
    ],
    aiDerivable: true,
  };
}

function quoteCount(): ContentTypeInputField {
  return {
    key: "quoteCount",
    label: "Embedded Quotes (0–4)",
    category: "engagement",
    type: "number",
    placeholder: "2",
    helpText: "Number of quote placeholders to generate",
  };
}

function includeBoilerplate(): ContentTypeInputField {
  return {
    key: "includeBoilerplate",
    label: "Include Boilerplate",
    category: "engagement",
    type: "boolean",
    helpText: 'Standard "About [Brand]" block at the end',
  };
}

function includeContactBlock(): ContentTypeInputField {
  return {
    key: "includeContactBlock",
    label: "Include Press Contact",
    category: "engagement",
    type: "boolean",
    helpText: "Name / email / phone placeholders for media",
  };
}

function prContentStyleFields(): ContentTypeInputField[] {
  // Removed 2026-04-28: hasEmbargo (irrelevant for HR/internal/career
  // types that share this bundle — press releases that need an embargo
  // can use a free-text note in the Strategy / brief). Tone now lives in
  // the unified Strategy field.
  return [prStructure(), quoteCount(), includeBoilerplate(), includeContactBlock()];
}

// ── Email ──

function ctaPlacement(): ContentTypeInputField {
  return {
    key: "ctaPlacement",
    label: "CTA Placement",
    category: "engagement",
    type: "select",
    options: [
      { value: "above-fold", label: "Above the Fold" },
      { value: "bottom", label: "Bottom" },
      { value: "multiple", label: "Multiple CTAs" },
      { value: "inline", label: "Inline" },
    ],
    aiDerivable: true,
  };
}

function previewTextLength(): ContentTypeInputField {
  return {
    key: "previewTextLength",
    label: "Preview Text Length (chars)",
    category: "engagement",
    type: "number",
    placeholder: "90",
    helpText: "Characters visible in email client preview (30–150)",
  };
}

function personalize(): ContentTypeInputField {
  return {
    key: "personalize",
    label: "Personalization",
    category: "engagement",
    type: "boolean",
    helpText: "Use recipient name and dynamic content",
  };
}

function emailContentStyleFields(): ContentTypeInputField[] {
  return [ctaPlacement(), previewTextLength(), personalize()];
}

// ── Carousel ──

function carouselVisualStyle(): ContentTypeInputField {
  return {
    key: "visualStyle",
    label: "Visual Theme",
    category: "content-style",
    type: "select",
    options: [
      { value: "clean-minimal", label: "Clean & Minimal" },
      { value: "bold-colorful", label: "Bold & Colorful" },
      { value: "photo-centric", label: "Photo-Centric" },
      { value: "data-driven", label: "Data-Driven" },
    ],
    aiDerivable: true,
  };
}

function transitionStyle(): ContentTypeInputField {
  return {
    key: "transitionStyle",
    label: "Transition Style",
    category: "content-style",
    type: "select",
    options: [
      { value: "continuous", label: "Continuous — content flows across slides" },
      { value: "standalone", label: "Standalone — each slide independent" },
      { value: "story-arc", label: "Story Arc — build toward a conclusion" },
    ],
    aiDerivable: true,
  };
}

function includeCtaSlide(): ContentTypeInputField {
  return {
    key: "includeCtaSlide",
    label: "Include CTA Slide",
    category: "engagement",
    type: "boolean",
    helpText: "Final slide is a dedicated call-to-action",
  };
}

function carouselContentStyleFields(): ContentTypeInputField[] {
  return [carouselVisualStyle(), transitionStyle(), includeCtaSlide()];
}

// ── Podcast ──

function episodeFormat(): ContentTypeInputField {
  return {
    key: "episodeFormat",
    label: "Episode Format",
    category: "content-style",
    type: "select",
    options: [
      { value: "solo", label: "Solo" },
      { value: "interview", label: "Interview" },
      { value: "panel", label: "Panel" },
      { value: "narrative", label: "Narrative" },
    ],
    aiDerivable: true,
  };
}

function segmentCount(): ContentTypeInputField {
  return {
    key: "segmentCount",
    label: "Segments (1–8)",
    category: "content-style",
    type: "number",
    placeholder: "3",
    helpText: "Number of distinct segments with transitions",
  };
}

function introStyle(): ContentTypeInputField {
  return {
    key: "introStyle",
    label: "Intro Style",
    category: "content-style",
    type: "select",
    options: [
      { value: "cold-open", label: "Cold Open — jump straight in" },
      { value: "teaser", label: "Teaser — preview key takeaways" },
      { value: "music-intro", label: "Music Intro — theme music + host intro" },
    ],
    aiDerivable: true,
  };
}

function includeShowNotes(): ContentTypeInputField {
  return {
    key: "includeShowNotes",
    label: "Generate Show Notes",
    category: "engagement",
    type: "boolean",
  };
}

function includeTranscript(): ContentTypeInputField {
  return {
    key: "includeTranscript",
    label: "Generate Transcript",
    category: "engagement",
    type: "boolean",
  };
}

function podcastContentStyleFields(): ContentTypeInputField[] {
  return [episodeFormat(), segmentCount(), introStyle(), includeShowNotes(), includeTranscript()];
}

// ── Advertising ──

function adVisualStyle(): ContentTypeInputField {
  return {
    key: "visualStyle",
    label: "Visual Style",
    category: "content-style",
    type: "select",
    options: [
      { value: "product-focused", label: "Product Focused" },
      { value: "lifestyle", label: "Lifestyle" },
      { value: "testimonial", label: "Testimonial" },
      { value: "data-stat", label: "Data / Statistic" },
    ],
    aiDerivable: true,
  };
}

function adCtaType(): ContentTypeInputField {
  return {
    key: "ctaType",
    label: "CTA Type",
    category: "engagement",
    type: "select",
    options: [
      { value: "learn-more", label: "Learn More" },
      { value: "sign-up", label: "Sign Up" },
      { value: "shop-now", label: "Shop Now" },
      { value: "contact-us", label: "Contact Us" },
    ],
    aiDerivable: true,
  };
}

function urgencyLevel(): ContentTypeInputField {
  return {
    key: "urgencyLevel",
    label: "Urgency Level (1–5)",
    category: "engagement",
    type: "number",
    placeholder: "2",
    helpText: "1 = evergreen, 5 = high urgency / scarcity",
  };
}

function socialProof(): ContentTypeInputField {
  return {
    key: "socialProof",
    label: "Include Social Proof",
    category: "engagement",
    type: "boolean",
    helpText: "Add testimonial or stat to ad copy",
  };
}

function adContentStyleFields(): ContentTypeInputField[] {
  return [adVisualStyle(), adCtaType(), urgencyLevel(), socialProof()];
}

// ── Video ──

function footageType(): ContentTypeInputField {
  return {
    key: "footageType",
    label: "Footage Type",
    category: "content-style",
    type: "select",
    options: [
      { value: "real-person", label: "Real Person" },
      { value: "stock", label: "Stock Footage" },
      { value: "animation", label: "Animation" },
      { value: "mixed", label: "Mixed" },
    ],
    aiDerivable: true,
  };
}

function textOverlay(): ContentTypeInputField {
  return {
    key: "textOverlay",
    label: "Text Overlay",
    category: "content-style",
    type: "select",
    options: [
      { value: "bold-headlines", label: "Bold Headlines" },
      { value: "minimal", label: "Minimal" },
      { value: "dynamic-captions", label: "Dynamic Captions" },
    ],
  };
}

function videoContentStyleFields(): ContentTypeInputField[] {
  return [footageType(), textOverlay()];
}

// ── Web-page ──

function webPageSeoFocus(): ContentTypeInputField {
  return {
    key: "seoFocus",
    label: "SEO Focus",
    category: "engagement",
    type: "boolean",
    helpText: "Optimize headings and meta for search engines",
    aiDerivable: true,
  };
}

function webPageContentStyleFields(): ContentTypeInputField[] {
  return [webPageSeoFocus()];
}

// ─── Registry ──────────────────────────────────────────────

const CONTENT_TYPE_INPUTS: Record<string, ContentTypeInputField[]> = {
  // ── Long-Form Content ──────────────────────────────────

  "blog-post": [
    ...longFormContentStyleFields(),
    seoKeyword(),
    secondaryKeywords(),

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
    ...longFormContentStyleFields(),
    seoKeyword(),
    secondaryKeywords(),
  ],

  whitepaper: [
    ...longFormContentStyleFields(),

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
    ...longFormContentStyleFields(),
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
    ...longFormContentStyleFields(),

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
  ],

  article: [
    ...longFormContentStyleFields(),
    seoKeyword(),
    secondaryKeywords(),
  ],

  "thought-leadership": [
    ...longFormContentStyleFields(),
    seoKeyword(),

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
  ],

  // ── Social Media ───────────────────────────────────────

  "linkedin-post": [
    ...socialContentStyleFields(),
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
  ],

  "linkedin-article": [
    ...longFormContentStyleFields(),
    // LinkedIn article is a social long-form post — keyword targeting is
    // helpful but not structural. Marked optional so users can skip it.
    seoKeyword({ required: false, helpText: 'Optional — helps the AI focus the angle. Leave blank if you have no target keyword.' }),

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
    ...carouselContentStyleFields(),
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
    ...adContentStyleFields(),
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
  ],

  "linkedin-newsletter": [
    ...emailContentStyleFields(),
    subjectLine(),

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
    ...videoContentStyleFields(),
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
    ...socialContentStyleFields(),
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
    visualDirection(),
  ],

  "twitter-thread": [
    ...socialContentStyleFields(),
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
  ],

  "facebook-post": [
    ...socialContentStyleFields(),
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
  ],

  "tiktok-script": [
    ...videoContentStyleFields(),
    videoDuration(),
    {
      key: "trendReference",
      label: "Trend / Sound Reference",
      category: "creative-direction",
      type: "text",
      placeholder: "e.g. 'Day in the life' format, trending audio XYZ",
      helpText: "TikTok trend or sound to leverage",
    },
  ],

  "social-carousel": [
    ...carouselContentStyleFields(),
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
    ...adContentStyleFields(),
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
    landingPageUrl(),
  ],

  "social-ad": [
    ...adContentStyleFields(),
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
  ],

  "display-ad": [
    ...adContentStyleFields(),
    landingPageUrl(),
  ],

  "retargeting-ad": [
    ...adContentStyleFields(),
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
    ...adContentStyleFields(),
    ...videoContentStyleFields(),
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
  ],

  "native-ad": [
    ...adContentStyleFields(),
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
  ],

  "welcome-sequence": [
    ...emailContentStyleFields(),
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
    ...emailContentStyleFields(),
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
    landingPageUrl(),
  ],

  "nurture-sequence": [
    ...emailContentStyleFields(),
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
    ...emailContentStyleFields(),
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
    ...webPageContentStyleFields(),
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
      key: "socialProof",
      label: "Available Social Proof",
      category: "references",
      type: "tags",
      placeholder: "e.g. Client logos, testimonials, stats",
      helpText: "Trust elements to include on the page",
    },
  ],

  "product-page": [
    ...webPageContentStyleFields(),
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
  ],

  "faq-page": [
    ...webPageContentStyleFields(),
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
    ...webPageContentStyleFields(),
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
    visualDirection(),
  ],

  // ── Video & Audio ──────────────────────────────────────

  "explainer-video": [
    ...videoContentStyleFields(),
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
    ...videoContentStyleFields(),
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
    ...videoContentStyleFields(),
    videoDuration(),
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
    ...podcastContentStyleFields(),
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
    ...podcastContentStyleFields(),
    videoDuration(),
    {
      key: "guestInfo",
      label: "Guest Name & Bio",
      category: "references",
      type: "textarea",
      placeholder: "e.g. Jane Doe, CEO of BrandCo — 15 years in brand strategy",
      helpText: "Guest details for interview-style episodes",
    },
  ],

  // ── Sales & Pitch ──────────────────────────────────────

  "sales-deck": [
    ...salesContentStyleFields(),
    slidesCount(),
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
    ...salesContentStyleFields(),
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
    ...salesContentStyleFields(),
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
    ...salesContentStyleFields(),
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
  ],

  // ── PR & Communications ────────────────────────────────

  "press-release": [
    ...prContentStyleFields(),
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
    ...prContentStyleFields(),
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
  ],

  "internal-comms": [
    ...prContentStyleFields(),
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
    ...prContentStyleFields(),
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
  ],

  "job-ad-copy": [
    ...prContentStyleFields(),
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
    ...prContentStyleFields(),
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
    ...videoContentStyleFields(),
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
  ],

  "impact-report": [
    ...prContentStyleFields(),
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
/**
 * Map common AI-generated content type variants to canonical registry IDs.
 * The Asset Planner sometimes generates non-standard IDs (e.g. "blog-article"
 * instead of "blog-post"). This mapping ensures the registry still works.
 */
const CONTENT_TYPE_ALIASES: Record<string, string> = {
  "blog-article": "blog-post",
  "blog": "blog-post",
  "linkedin-sponsored-content": "linkedin-ad",
  "facebook-ad-copy": "social-ad",
  "instagram-carousel": "social-carousel",
  "linkedin-carousel-post": "linkedin-carousel",
  "google-ads-copy": "search-ad",
  "google-ad": "search-ad",
  "podcast-episode-outline": "podcast-outline",
  "explainer-video-script": "explainer-video",
  "sales-email-sequence": "nurture-sequence",
  "welcome-email-series": "welcome-sequence",
  "sales-page-copy": "product-description",
  "pitch-deck-copy": "sales-deck",
  "company-announcement": "internal-comms",
  "job-posting": "career-page",
  "employer-brand-story": "employee-story",
};

/**
 * Get all content-type-specific input fields for a deliverable type.
 * Falls back to alias mapping for non-standard AI-generated type IDs.
 * Returns empty array for unknown types.
 */
export function getContentTypeInputs(
  typeId: string
): ContentTypeInputField[] {
  return CONTENT_TYPE_INPUTS[typeId]
    ?? CONTENT_TYPE_INPUTS[CONTENT_TYPE_ALIASES[typeId] ?? '']
    ?? [];
}

/**
 * Resolve a content type to its category. Used by the unified Strategy
 * tone/CTA fields in the Content Brief to scope suggestion chips. Returns
 * null when the type id is unknown or the alias lookup fails.
 */
export function getContentCategory(typeId: string): ContentCategory | null {
  const resolved = CONTENT_TYPE_ALIASES[typeId] ?? typeId;
  return CATEGORY_BY_TYPE[resolved] ?? null;
}

/**
 * Get the tone-of-voice suggestion chips for a content type, or null when
 * no curated vocabulary exists (the Strategy tone field falls back to a
 * plain free-text input in that case).
 */
export function getToneSuggestions(
  typeId: string,
): ReadonlyArray<{ value: string; label: string }> | null {
  const category = getContentCategory(typeId);
  return category ? (TONE_SUGGESTIONS_BY_CATEGORY[category] ?? null) : null;
}

/**
 * Get the call-to-action suggestion chips for a content type, or null when
 * no curated vocabulary exists.
 */
export function getCtaSuggestions(
  typeId: string,
): ReadonlyArray<{ value: string; label: string }> | null {
  const category = getContentCategory(typeId);
  return category ? (CTA_SUGGESTIONS_BY_CATEGORY[category] ?? null) : null;
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

/**
 * Estimated generation duration per content type.
 * Returns { label: "20-40 seconds", seconds: [20, 40] } for UI display + elapsed timer.
 */
export function getEstimatedDuration(typeId: string): { label: string; minSeconds: number; maxSeconds: number } {
  const resolved = CONTENT_TYPE_ALIASES[typeId] ?? typeId;

  // Long-form content (800-10,000 words) — significantly longer
  const longForm = new Set([
    'blog-post', 'pillar-page', 'whitepaper', 'case-study', 'ebook',
    'article', 'thought-leadership',
  ]);

  // Website types run the 8-step SEO pipeline
  const seoTypes = new Set([
    'landing-page', 'product-page', 'faq-page', 'comparison-page', 'microsite',
  ]);

  // Medium-length content (300-1000 words)
  const mediumForm = new Set([
    'newsletter', 'welcome-sequence', 'promotional-email', 'nurture-sequence',
    're-engagement-email', 'sales-deck', 'one-pager', 'proposal-template',
    'product-description', 'sales-page', 'press-release', 'media-pitch',
    'internal-comms', 'career-page', 'job-ad-copy', 'employee-story',
    'impact-report', 'media-kit', 'employer-brand-video',
  ]);

  // Video/audio scripts
  const videoAudio = new Set([
    'explainer-video', 'testimonial-video', 'promo-video',
    'webinar-outline', 'podcast-outline', 'video-ad', 'native-ad',
  ]);

  if (seoTypes.has(resolved)) {
    return { label: '2-4 minutes', minSeconds: 120, maxSeconds: 240 };
  }
  if (longForm.has(resolved)) {
    return { label: '45-90 seconds', minSeconds: 45, maxSeconds: 90 };
  }
  if (mediumForm.has(resolved)) {
    return { label: '30-60 seconds', minSeconds: 30, maxSeconds: 60 };
  }
  if (videoAudio.has(resolved)) {
    return { label: '30-60 seconds', minSeconds: 30, maxSeconds: 60 };
  }
  // Short-form: social posts, ads, carousels
  return { label: '15-30 seconds', minSeconds: 15, maxSeconds: 30 };
}

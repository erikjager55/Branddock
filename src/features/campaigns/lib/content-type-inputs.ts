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

import { LONG_FORM_SEO_TYPES, DEFAULT_LONG_FORM_OPTIMIZATION_GOALS } from "@/lib/ai/seo-pipeline.types";

// ─── Types ─────────────────────────────────────────────────

export type InputCategory =
  | "seo"
  | "campaign-details"
  | "format-specs"
  | "audience"
  | "references"
  | "creative-direction"
  | "content-style"
  | "engagement"
  | "conversion-hook"
  | "authority-frame"
  | "narrative-anchor"
  | "structure-skeleton";

export type InputFieldType =
  | "text"
  | "textarea"
  | "tags"
  | "number"
  | "boolean"
  | "select"
  // GEO/SEO Fase 1b: groep onafhankelijke vinkjes die een `string[]` muteren
  // (bv. optimizationGoals = ["seo","geo"]). Opties via `options`.
  | "checkbox-group"
  // W2 (plan §2.3): product-koppeling. Dropdown gevoed door GET /api/products;
  // de waarde is een Product-id (cuid). Wordt server-side in Layer 7
  // (settings-first) opgelost naar volledige ProductContext + ProductImages.
  | "product-select";

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
  /** Default value applied by the renderer when no stored value exists. For
   *  'checkbox-group' a `string[]` of pre-checked option values (GEO/SEO Fase 1b). */
  defaultValue?: ContentTypeInputValue;
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
  // Argument / framing groups — only one of these surfaces per content-type
  // (conversion-hook for short-form, authority-frame for long-form,
  // narrative-anchor for PR/case). All share order=1 because they're
  // mutually exclusive at the type-level.
  "conversion-hook": { label: "Conversion Hook", order: 1 },
  "authority-frame": { label: "Authority Frame", order: 1 },
  "narrative-anchor": { label: "Narrative Anchor", order: 1 },
  "structure-skeleton": { label: "Structure Skeleton", order: 1 },
  seo: { label: "SEO & Keywords", order: 2 },
  "content-style": { label: "Content Style", order: 3 },
  engagement: { label: "Engagement", order: 4 },
  "campaign-details": { label: "Campaign Details", order: 5 },
  "format-specs": { label: "Format & Specs", order: 6 },
  audience: { label: "Audience", order: 7 },
  references: { label: "References & Sources", order: 8 },
  "creative-direction": { label: "Creative Direction", order: 9 },
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
  // 2026-05-19 paid LinkedIn video-ad (split-out van linkedin-ad
  // video-ad subformat). Hybrid: conversion-ad + video category, hier
  // primair als 'video' geclassificeerd voor input-field samenstelling.
  'linkedin-video-ad': 'video',
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
 * tone field renders as multi-select pills only (no free text input) — see
 * TonePillsField in Step1Context. Selected pills are stored as a
 * comma-separated string in brief.toneDirection; the orchestrator
 * interpolates that verbatim into the prompt.
 *
 * Every ContentCategory has chips defined so every content type gets a
 * tone selector. Vocabularies are tuned per category — social leans
 * personality, long-form leans editorial stance, ads lean energy, etc.
 */
export const TONE_SUGGESTIONS_BY_CATEGORY: Record<
  ContentCategory,
  ReadonlyArray<{ value: string; label: string }>
> = {
  social: [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'inspirational', label: 'Inspirational' },
    { value: 'educational', label: 'Educational' },
    { value: 'humorous', label: 'Humorous' },
  ],
  'long-form': [
    { value: 'authoritative', label: 'Authoritative' },
    { value: 'conversational', label: 'Conversational' },
    { value: 'analytical', label: 'Analytical' },
    { value: 'inspirational', label: 'Inspirational' },
    { value: 'journalistic', label: 'Journalistic' },
  ],
  sales: [
    { value: 'consultative', label: 'Consultative' },
    { value: 'direct', label: 'Direct' },
    { value: 'premium', label: 'Premium' },
    { value: 'friendly', label: 'Friendly' },
  ],
  'pr-hr': [
    { value: 'neutral-journalistic', label: 'Neutral / Journalistic' },
    { value: 'official', label: 'Official' },
    { value: 'warm-personal', label: 'Warm / Personal' },
    { value: 'advocacy', label: 'Advocacy' },
  ],
  email: [
    { value: 'professional', label: 'Professional' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'inspirational', label: 'Inspirational' },
    { value: 'casual', label: 'Casual' },
  ],
  carousel: [
    { value: 'professional', label: 'Professional' },
    { value: 'educational', label: 'Educational' },
    { value: 'inspirational', label: 'Inspirational' },
    { value: 'playful', label: 'Playful' },
    { value: 'bold', label: 'Bold' },
  ],
  podcast: [
    { value: 'conversational', label: 'Conversational' },
    { value: 'authoritative', label: 'Authoritative' },
    { value: 'educational', label: 'Educational' },
    { value: 'inspirational', label: 'Inspirational' },
    { value: 'casual', label: 'Casual' },
  ],
  ad: [
    { value: 'direct', label: 'Direct' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'aspirational', label: 'Aspirational' },
    { value: 'playful', label: 'Playful' },
  ],
  video: [
    { value: 'energetic', label: 'Energetic' },
    { value: 'cinematic', label: 'Cinematic' },
    { value: 'conversational', label: 'Conversational' },
    { value: 'inspirational', label: 'Inspirational' },
    { value: 'playful', label: 'Playful' },
  ],
  'web-page': [
    { value: 'authoritative', label: 'Authoritative' },
    { value: 'conversational', label: 'Conversational' },
    { value: 'direct', label: 'Direct' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'inspirational', label: 'Inspirational' },
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

/** GEO/SEO Fase 1b — optimalisatie-doel-veld (UI). SEO default-aan (uitvinken
 *  slaat de SEO-pipeline over). GEO-optie volgt in Fase 2. De default + de
 *  gate-logica leven in `@/lib/ai/seo-pipeline.types` + `seo-pipeline-utils`. */
function optimizationGoals(): ContentTypeInputField {
  return {
    key: "optimizationGoals",
    label: "Optimalisatiedoel",
    category: "seo",
    type: "checkbox-group",
    options: [{ value: "seo", label: "SEO-optimalisatie" }],
    defaultValue: [...DEFAULT_LONG_FORM_OPTIMIZATION_GOALS],
    helpText: "Draai de SEO-pipeline voor dit stuk. Uitvinken slaat SEO over.",
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
// writes (hashtag strategy, etc.) — they belong with the brief, not with
// the medium-rendering config in Step 3.
//
// Removed 2026-04-28: per-type tone + CTA-style fields (duplicated
// brief.toneDirection / brief.callToAction).
//
// Removed 2026-04-28 (Visual Brief migration): visualStyle / visualDirection
// / contentStyle / carouselVisualStyle / adVisualStyle. They're replaced by
// settings.visualBrief (Step 1 Visual Brief subsection) which gives a
// single coherent answer per content item: source + style chip with rich
// per-chip prompt mapping in canvas-orchestrator.

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
  // Visual style now lives in the Visual Brief subsection (Step 1) — see
  // settings.visualBrief.styleDirection. Bundle keeps the social-specific
  // engagement knobs.
  return [hashtagStrategy(), includeEmoji()];
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
  // Removed: includeQuotes / internalLinking / longFormSeoFocus
  // (2026-04-28 — duplicates / vague), readingLevel (2026-04-29 — AI
  // derives this from tone + audience). Per-article tone lives in the
  // unified Strategy field.
  return [
    articleStructure(),
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
// Visual theme moved to Visual Brief (settings.visualBrief.styleDirection).

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
  return [transitionStyle(), includeCtaSlide()];
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
// Visual style moved to Visual Brief (settings.visualBrief.styleDirection).

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

// urgencyLevel deprecated 2026-05-17 — input-type number (1-5) but the
// canvas-orchestrator block compared against string 'high', so the
// urgency-language branch never fired. Overlapped with adCtaType,
// hookFormat, and (for promo email) urgencyMechanism which now carry the
// strategic urgency-signal more precisely. Function + adContentStyleFields
// usage removed; old stored values are gracefully ignored.

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
  // urgencyLevel removed 2026-05-17 (deprecated, see helper-comment above).
  // Strategic urgency now flows through adCtaType + hookFormat + (for
  // promo email) urgencyMechanism instead.
  return [adCtaType(), socialProof()];
}

// ── Conversion Hook bundle (short-form / direct-response content) ──
// Drives the narrative scaffolding the AI uses to compose the opener and
// argument-arc for social posts, ads, and promotional emails. See
// docs/audits/2026-05-08-canvas-per-item-tweaks-plan.md for the rationale
// per content-type.

function hookFormat(): ContentTypeInputField {
  return {
    key: "hookFormat",
    label: "Hook Format",
    category: "conversion-hook",
    type: "select",
    options: [
      { value: "pattern-interrupt", label: "Pattern Interrupt — break expected rhythm" },
      { value: "question", label: "Question — open with a probing question" },
      { value: "stat", label: "Stat — surprising number first" },
      { value: "contrarian-take", label: "Contrarian Take — challenge a common belief" },
      { value: "story-open", label: "Story Open — narrative micro-scene" },
      { value: "listicle-promise", label: "Listicle Promise — promise N items / steps" },
    ],
    helpText: "Drives the first 1–3 lines / opening seconds",
    aiDerivable: true,
    aiHint: "Pick the hook style most likely to stop the scroll for this persona; default to 'question' if uncertain",
  };
}

function payoffPromise(): ContentTypeInputField {
  return {
    key: "payoffPromise",
    label: "Payoff Promise",
    category: "conversion-hook",
    type: "text",
    placeholder: "e.g. \"Een 3-stappen-frame om brand-fluff te detecteren\"",
    helpText: "What the reader gets if they keep reading / click through",
    aiDerivable: true,
    aiHint: "1 sentence; concrete and specific (not 'learn more about X'). Derive from product value-prop + persona desired outcome",
  };
}

function targetObjection(): ContentTypeInputField {
  return {
    key: "targetObjection",
    label: "Target Objection",
    category: "conversion-hook",
    type: "text",
    placeholder: "e.g. \"marketing-budget al uitgeput\"",
    helpText: "Concrete weerstand the copy should address head-on (optional)",
    aiDerivable: true,
    aiHint: "Pick the single strongest objection from persona pain points or campaign keyObjections; leave blank if none stands out",
  };
}

function proofPoint(): ContentTypeInputField {
  return {
    key: "proofPoint",
    label: "Proof Point",
    category: "conversion-hook",
    type: "text",
    placeholder: "e.g. \"Better Brands +24% voice-fidelity in 4 weken\"",
    helpText: "1 stat / quote / customer-fragment for the body (optional)",
    aiDerivable: true,
    aiHint: "Use a brand-context customer story, metric, or testimonial; leave blank if none available",
  };
}

function conversionContentStyleFields(): ContentTypeInputField[] {
  return [hookFormat(), payoffPromise(), targetObjection(), proofPoint()];
}

// ── Reusable conversion helpers (used by 2+ types) ──

function valueProposition(): ContentTypeInputField {
  return {
    key: "valueProposition",
    label: "Value Proposition",
    category: "conversion-hook",
    type: "textarea",
    placeholder: "e.g. \"Voor brand-managers die voice-consistency willen meten — zonder eigen taal-team op te bouwen\"",
    helpText: "Short, sharp value-prop the ad-copy should anchor on",
    aiDerivable: true,
    aiHint: "1-2 sentences; (audience) + (job-to-be-done) + (differentiator). Derive from product + persona + competitor-positioning",
  };
}

function headlineCount(defaultValue: number = 3): ContentTypeInputField {
  return {
    key: "headlineCount",
    label: `Headline Variants (default ${defaultValue})`,
    category: "format-specs",
    type: "number",
    placeholder: String(defaultValue),
    helpText: "Number of headline variations to generate (Google search-ad asset best practice: 3-5)",
    aiDerivable: true,
    aiHint: `Default ${defaultValue}; for search-ads aim 3-5, display-ads 1-2`,
  };
}

// ── Authority Frame bundle (long-form / argumentative content) ──
// Drives the thesis the AI argues for. Without these, long-form content
// defaults to descriptive SEO-blog patterns ("What is X — A Comprehensive
// Guide") instead of taking a position. See audit sectie 3.2.

function uniqueAngle(): ContentTypeInputField {
  return {
    key: "uniqueAngle",
    label: "Unique Angle",
    category: "authority-frame",
    type: "textarea",
    placeholder: "e.g. \"Most positioning frameworks fail because they treat positioning as creative rather than operational\"",
    helpText: "What this content says that 95% of others don't — 1-2 sentences",
    aiDerivable: true,
    aiHint: "Synthesize from brand-positioning + persona pain points + competitor analysis: pick the contrarian or under-discussed angle most credible for this brand",
  };
}

function evidencePieces(): ContentTypeInputField {
  return {
    key: "evidencePieces",
    label: "Evidence Pieces",
    category: "authority-frame",
    type: "textarea",
    placeholder: "One piece of evidence per line:\n- Reichheld churn data 2024\n- Patagonia case (Worn Wear)\n- Own voice-fidelity benchmark (n=200)",
    helpText: "One piece of evidence per line — minimum 3, maximum 7 (quotes, statistics, customer examples, anecdotes)",
    aiDerivable: true,
    aiHint: "Suggest 3-5 named evidence pieces (data, quote, anecdote, customer-fragment) drawn from brand-context, persona pains, or external industry references; each item on its own line",
  };
}

function counterClaim(): ContentTypeInputField {
  return {
    key: "counterClaim",
    label: "Counter-Claim (optional)",
    category: "authority-frame",
    type: "textarea",
    placeholder: "e.g. \"Positioning is a constraint engineering problem, not a creative exercise\"",
    helpText: "The anti-thesis the content explicitly refutes — sharpens the argument",
    aiDerivable: true,
    aiHint: "Pick the strongest commonly-held belief that uniqueAngle contradicts; leave blank if uniqueAngle is additive rather than contrarian",
  };
}

function authorityContentFields(): ContentTypeInputField[] {
  return [uniqueAngle(), evidencePieces(), counterClaim()];
}

// ── Reusable authority helpers (used by 2+ types) ──

function coreThesis(): ContentTypeInputField {
  return {
    key: "coreThesis",
    label: "Core Thesis",
    category: "authority-frame",
    type: "textarea",
    placeholder: "e.g. \"Brand consistency drives 2.3x conversion in B2B SaaS — but only when measured at the voice-level, not the visual-level\"",
    helpText: "1-2 sentence thesis statement the whole document defends",
    aiDerivable: true,
    aiHint: "1-2 sentences; testable claim; should sharpen uniqueAngle into a single defendable proposition",
  };
}

function industryNorm(): ContentTypeInputField {
  return {
    key: "industryNorm",
    label: "Industry Norm (the consensus you're challenging)",
    category: "authority-frame",
    type: "textarea",
    placeholder: "e.g. \"Most brand consultants treat brand voice as taste — subjective, untestable\"",
    helpText: "What does everyone in this space currently believe — that you're about to challenge",
    aiDerivable: true,
    aiHint: "State the commonly-held belief in plain language; the rest of the content will refute or update it",
  };
}

function personalCredentials(): ContentTypeInputField {
  return {
    key: "personalCredentials",
    label: "Personal Credentials",
    category: "creative-direction",
    type: "text",
    placeholder: "e.g. \"15 jaar brand-strategie bij B2B SaaS, ex-VP Brand bij ACME\"",
    helpText: "Why is this author qualified to take this position?",
    aiDerivable: true,
    aiHint: "Derive from brand-context author/team info; 1 sentence, concrete role + experience",
  };
}

// ── Narrative Anchor bundle (PR / case-study / employee-story) ──
// Drives the narrative scharnier-moment + why-now framing. Without these,
// PR content defaults to corporate-speak boilerplate without journalistic
// hook. See audit sectie 2 (PR/HR/Comms).

function whyNowAngle(): ContentTypeInputField {
  return {
    key: "whyNowAngle",
    label: "Why Now",
    category: "narrative-anchor",
    type: "textarea",
    placeholder: "e.g. \"With the EU AI Act in force from Q1 2026, brand teams must prove their AI-content audit trail\"",
    helpText: "What makes this newsworthy NOW — the journalistic timing-hook",
    aiDerivable: true,
    aiHint: "Tie to a current event, regulatory shift, market trend, or seasonal moment that justifies publishing now rather than next quarter",
  };
}

function pivotMoment(): ContentTypeInputField {
  return {
    key: "pivotMoment",
    label: "Pivot Moment",
    category: "narrative-anchor",
    type: "text",
    placeholder: "e.g. \"the moment the customer dared to halve their team\"",
    helpText: "The narrative scharnier — the specific scene the story turns on",
    aiDerivable: true,
    aiHint: "Identify the single concrete moment / decision / scene that makes the story memorable; 1 sentence",
  };
}

function industryContext(): ContentTypeInputField {
  return {
    key: "industryContext",
    label: "Industry Context (optional)",
    category: "narrative-anchor",
    type: "text",
    placeholder: "e.g. \"in a market where 80% of AI tools still return English-only output\"",
    helpText: "Wider industry frame the story sits in (optional)",
    aiDerivable: true,
    aiHint: "Brief 1-sentence backdrop that situates the story; leave blank if the story stands alone",
  };
}

function narrativeAnchorFields(): ContentTypeInputField[] {
  return [whyNowAngle(), pivotMoment(), industryContext()];
}

// ── Structure Skeleton bundle (multi-section content) ──
// Drives the structural spine for content with multiple sections /
// slides / chapters / agenda-items. Without these, AI invents a default
// skeleton (e.g. "Tip 1: Start strong, Tip 5: Stay consistent" for
// carousels) — generic by construction. See audit sectie 2 (Carousel,
// Website, Sales, Video & Audio sub-rijen).

type SkeletonKind = 'slide' | 'section' | 'chapter' | 'agenda' | 'page' | 'scene';

const SKELETON_LABELS: Record<SkeletonKind, { item: string; itemPlural: string; firstLabel: string }> = {
  slide: { item: 'slide', itemPlural: 'slides', firstLabel: 'First Slide Hook' },
  section: { item: 'section', itemPlural: 'sections', firstLabel: 'First Section Hook' },
  chapter: { item: 'chapter', itemPlural: 'chapters', firstLabel: 'Opening Chapter Hook' },
  agenda: { item: 'agenda item', itemPlural: 'agenda items', firstLabel: 'Opening Hook' },
  page: { item: 'page', itemPlural: 'pages', firstLabel: 'Landing-Page Hook' },
  scene: { item: 'scene', itemPlural: 'scenes', firstLabel: 'Opening Scene Hook' },
};

function skeletonField(kind: SkeletonKind): ContentTypeInputField {
  const meta = SKELETON_LABELS[kind];
  return {
    key: `${kind}Skeleton`,
    label: `${meta.item.charAt(0).toUpperCase() + meta.item.slice(1)} Skeleton`,
    category: "structure-skeleton",
    type: "textarea",
    placeholder: `One ${meta.item} per line:\n- The problem no one names\n- The data that proves it\n- Our approach\n- Evidence from a customer case\n- The next step`,
    helpText: `One ${meta.item} per line — used 1-to-1 as the ${meta.itemPlural} title. Optional: \`Title — bullet1; bullet2\` for sub-points.`,
    aiDerivable: true,
    aiHint: `Generate 5-7 concrete ${meta.item} titles aligned with the campaign goal + persona pain points; each on its own line. Avoid generic templates like "Tip 1 / Tip 2".`,
  };
}

function skeletonHookField(kind: SkeletonKind): ContentTypeInputField {
  const meta = SKELETON_LABELS[kind];
  return {
    key: `${kind}Hook`,
    label: meta.firstLabel,
    category: "structure-skeleton",
    type: "text",
    placeholder: `e.g. \"Most brands don't measure brand voice — we do.\"`,
    helpText: `Exact opening line for ${meta.item} 1 (or the piece overall). Make-or-break for engagement.`,
    aiDerivable: true,
    aiHint: `Generate the literal opening line that makes the audience pause; align with ${meta.item}Skeleton item 1 if present`,
  };
}

function skeletonPayoffPosition(kind: SkeletonKind): ContentTypeInputField {
  const meta = SKELETON_LABELS[kind];
  return {
    key: "payoffPosition",
    label: `Payoff ${meta.item.charAt(0).toUpperCase() + meta.item.slice(1)} (number)`,
    category: "structure-skeleton",
    type: "number",
    placeholder: "4",
    helpText: `Which ${meta.item} number lands the payoff (typically 60-70% through the piece).`,
    aiDerivable: true,
    aiHint: `Suggest a position roughly 60-70% through the total ${meta.item} count`,
  };
}

function skeletonInputFields(kind: SkeletonKind): ContentTypeInputField[] {
  return [skeletonField(kind), skeletonHookField(kind), skeletonPayoffPosition(kind)];
}

// ── Reusable structure helpers (used by 2+ types) ──

function targetTakeaway(): ContentTypeInputField {
  return {
    key: "targetTakeaway",
    label: "Target Takeaway",
    category: "structure-skeleton",
    type: "text",
    placeholder: "e.g. \"A measurable brand voice is an operational choice, not a creative one\"",
    helpText: "1 sentence the audience should remember after consuming this piece",
    aiDerivable: true,
    aiHint: "Distill the single proposition the audience should walk away with; concrete and testable",
  };
}

function centralPainPoint(): ContentTypeInputField {
  return {
    key: "centralPainPoint",
    label: "Central Pain Point",
    category: "structure-skeleton",
    type: "text",
    placeholder: "e.g. \"Inconsistentie kost teams 30% meer review-tijd\"",
    helpText: "The single pain the entire piece anchors on (deck/one-pager spine)",
    aiDerivable: true,
    aiHint: "Pick the most-acute pain from persona pain points that this content addresses",
  };
}

function featureBenefitMap(): ContentTypeInputField {
  return {
    key: "featureBenefitMap",
    label: "Feature → Benefit Map",
    category: "structure-skeleton",
    type: "textarea",
    placeholder: "One pair per line — Feature → Benefit:\n- Voice-fidelity scoring → know your copy is on-brand before you publish\n- Template library → 80% fewer review rounds",
    helpText: "One Feature → Benefit pair per line. Prevents product pages from becoming feature dumps.",
    aiDerivable: true,
    aiHint: "Generate 3-5 feature/benefit pairs from product specs; each pair: feature → concrete user-outcome (not 'increased efficiency')",
  };
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
    helpText: "Style of on-screen text — drives caption rhythm and visual density",
    // 2026-05-19: aiDerivable + aiHint toegevoegd zodat brand-assistant
    // ("vul de velden") ook deze content-style velden invult. Voorheen
    // werd dit veld stilzwijgend overgeslagen.
    aiDerivable: true,
    aiHint: "Bepaal op basis van persona-aandacht + platform: silent-autoplay platforms (LinkedIn, IG) → 'dynamic-captions'; brand-driven content → 'bold-headlines'; understated tone → 'minimal'",
  };
}

function colorGrade(): ContentTypeInputField {
  return {
    key: "colorGrade",
    label: "Color Grade",
    category: "content-style",
    type: "select",
    options: [
      { value: "warm", label: "Warm" },
      { value: "cool", label: "Cool" },
      { value: "vibrant", label: "Vibrant" },
      { value: "natural", label: "Natural" },
    ],
    helpText: "Visual mood — beïnvloedt phrasing en tone (warm = nostalgisch, cool = professioneel, vibrant = energiek, natural = documentary)",
    // 2026-05-19: aiDerivable + aiHint toegevoegd, zelfde reden als textOverlay.
    aiDerivable: true,
    aiHint: "Leid af uit brand visual-direction + tone-of-voice: corporate/B2B → 'cool', lifestyle/wellness → 'warm', youth/energy → 'vibrant', documentary/educational → 'natural'",
  };
}

function videoContentStyleFields(): ContentTypeInputField[] {
  return [footageType(), textOverlay(), colorGrade()];
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
    ...authorityContentFields(),
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
    ...authorityContentFields(),
    {
      key: "subTopicMap",
      label: "Sub-Topic Map (3-7 H2s)",
      category: "authority-frame",
      type: "textarea",
      placeholder: "One sub-topic per line — becomes an H2:\n- How to define brand-voice operationally\n- Why most voice-guides fail\n- Measuring voice-fidelity",
      helpText: "3-7 sub-topics — these become H2 sections + drive internal-linking strategy",
      aiDerivable: true,
      aiHint: "Generate 3-7 sub-topics that decompose uniqueAngle into hub-and-spoke structure; one per line",
    },
    {
      key: "internalSubpages",
      label: "Internal Sub-Pages to Link (optional)",
      category: "seo",
      type: "textarea",
      placeholder: "One URL or page title per line",
      helpText: "Existing sub-pages to cross-link from this pillar (optional)",
    },
    ...longFormContentStyleFields(),
    seoKeyword(),
    secondaryKeywords(),
  ],

  whitepaper: [
    ...authorityContentFields(),
    coreThesis(),
    {
      key: "dataSourcesUsed",
      label: "Data Sources Used",
      category: "references",
      type: "textarea",
      placeholder: "One source per line — author, organization or dataset",
      helpText: "Named data sources / studies / datasets the whitepaper builds on",
      aiDerivable: true,
      aiHint: "Suggest 3-5 credible source-types or specific publications relevant to coreThesis; each source on its own line",
    },
    {
      key: "targetCitationCount",
      label: "Target Citation Count",
      category: "format-specs",
      type: "number",
      placeholder: "10",
      helpText: "Number of citations to weave through the whitepaper (academic feel: 8-15, commercial: 3-7)",
      aiDerivable: true,
      aiHint: "Default 8 for academic, 5 for commercial whitepapers; adjust to expertiseLevel",
    },
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
    ...narrativeAnchorFields(),
    {
      key: "solutionPhases",
      label: "Solution Phases (3-5)",
      category: "narrative-anchor",
      type: "textarea",
      placeholder: "One implementation phase per line:\n- Discovery + audit (week 1-2)\n- Voice-baseline definition (week 3)\n- Team rollout (week 4-6)",
      helpText: "3-5 implementation steps — gives the case-study spine and pacing",
      aiDerivable: true,
      aiHint: "Generate 3-5 phases that show concrete progression; one per line",
    },
    {
      key: "failureFootnote",
      label: "Failure Footnote (optional but credible)",
      category: "narrative-anchor",
      type: "textarea",
      placeholder: "e.g. \"Eerste poging gestrand: voice-guide te abstract; iteratie 2 voegde concrete do/don't-voorbeelden toe\"",
      helpText: "What went wrong on the way — adds credibility, breaks hagiography pattern",
      aiDerivable: true,
      aiHint: "Suggest a plausible mid-project setback that makes the success more credible; leave blank if customer prefers polished narrative",
    },
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
    ...skeletonInputFields('chapter'),
    targetTakeaway(),
    {
      key: "narrativeArc",
      label: "Narrative Arc",
      category: "structure-skeleton",
      type: "select",
      options: [
        { value: "educational", label: "Educational — informative arc" },
        { value: "journey", label: "Journey — protagonist transformation" },
        { value: "argument", label: "Argument — thesis + evidence + conclusion" },
      ],
      helpText: "Overarching story-shape across chapters",
      aiDerivable: true,
      aiHint: "Match to topic: how-to/explainer → educational, case-driven → journey, position-piece → argument",
    },
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
    ...authorityContentFields(),
    ...longFormContentStyleFields(),
    seoKeyword(),
    secondaryKeywords(),
  ],

  "thought-leadership": [
    ...authorityContentFields(),
    industryNorm(),
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
    ...conversionContentStyleFields(),
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
    {
      key: "personalAnecdote",
      label: "Lead with Personal Anecdote",
      category: "creative-direction",
      type: "boolean",
      helpText: "Open with a 1-2 sentence personal scene before the argument",
      aiDerivable: true,
      aiHint: "Set true when hookFormat='story-open' or 'pattern-interrupt' and persona favors human voice",
    },
  ],

  "linkedin-article": [
    ...authorityContentFields(),
    personalCredentials(),
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
    ...skeletonInputFields('slide'),
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
  ],

  "linkedin-ad": [
    ...conversionContentStyleFields(),
    valueProposition(),
    ...adContentStyleFields(),
    landingPageUrl(),
    {
      key: "adFormat",
      label: "Ad Format",
      category: "format-specs",
      type: "select",
      // 2026-05-19 update: video-ad subformat is split-out naar eigen
      // content-type `linkedin-video-ad` (eigen prompt + video-generation
      // pipeline). linkedin-ad heeft nu alleen Single Image en Message Ad.
      options: [
        { value: "single-image", label: "Single Image" },
        { value: "message-ad", label: "Message Ad" },
      ],
      required: true,
      helpText: "LinkedIn ad placement format — for video ads, select the 'LinkedIn Video Ad' content type",
      aiDerivable: true,
      aiHint: "Based on campaign goal: awareness→single-image, conversion-1-op-1→message-ad",
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
    ...skeletonInputFields('scene'),
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
    ...conversionContentStyleFields(),
    ...socialContentStyleFields(),
    {
      key: "captionLength",
      label: "Caption Length",
      category: "format-specs",
      type: "select",
      options: [
        { value: "short", label: "Short — 1 sentence + emoji" },
        { value: "medium", label: "Medium — 3-5 sentences" },
        { value: "long", label: "Long — micro-essay (5+ sentences)" },
      ],
      helpText: "Driver for caption-depth and structure",
      aiDerivable: true,
      aiHint: "Default 'medium' unless hookFormat='story-open' (then 'long') or audience is awareness-stage (then 'short')",
    },
    {
      key: "firstLineMagnet",
      label: "First-Line Magnet",
      category: "conversion-hook",
      type: "text",
      placeholder: "e.g. \"Stop scrolling. Read this.\"",
      helpText: "The exact first line — Instagram truncates after ~125 chars",
      aiDerivable: true,
      aiHint: "Generate the exact opening line that aligns with hookFormat; max 125 chars before truncation",
    },
  ],

  "twitter-thread": [
    ...conversionContentStyleFields(),
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
    {
      key: "openingHook",
      label: "Opening Tweet — Exact Text",
      category: "conversion-hook",
      type: "textarea",
      placeholder: "e.g. \"Most B2B brands think consistency slows them down. The opposite is true.\"",
      helpText: "The literal first tweet (max 280 chars) — make-or-break for thread engagement",
      aiDerivable: true,
      aiHint: "Generate the exact opening tweet aligned with hookFormat; max 280 chars; should stand alone as a strong claim",
    },
    {
      key: "tweetSkeleton",
      label: "Tweet Skeleton (optional)",
      category: "creative-direction",
      type: "textarea",
      placeholder: "One tweet per line — outline of the thread",
      helpText: "Optional: outline tweet-by-tweet (one per line) to lock the structure",
      aiDerivable: true,
      aiHint: "Generate N-line outline matching threadLength; leave blank if you want AI to choose structure",
    },
  ],

  "facebook-post": [
    ...conversionContentStyleFields(),
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
    {
      key: "audienceMood",
      label: "Audience Mood",
      category: "creative-direction",
      type: "select",
      options: [
        { value: "casual-conversational", label: "Casual / Conversational — friendly, light" },
        { value: "community-rallying", label: "Community Rallying — calls to shared identity" },
        { value: "informative-helpful", label: "Informative / Helpful — explainer voice" },
        { value: "playful-irreverent", label: "Playful / Irreverent — humor, surprise" },
      ],
      helpText: "Facebook is conversational — mood-input shifts tone significantly",
      aiDerivable: true,
      aiHint: "Match to brand-personality archetype + persona age/setting",
    },
  ],

  "tiktok-script": [
    ...skeletonInputFields('scene'),
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

  // 2026-05-19 nieuw content-type — paid LinkedIn Video Ad
  "linkedin-video-ad": [
    ...conversionContentStyleFields(),
    valueProposition(),
    ...videoContentStyleFields(),
    videoDuration(),
    landingPageUrl(),
    {
      key: "hookStrategy",
      label: "Hook Strategy (first 3s)",
      category: "creative-direction",
      type: "select",
      options: [
        { value: "bold-statement", label: "Bold statement / counterintuitive claim" },
        { value: "question", label: "Open question" },
        { value: "pattern-interrupt", label: "Pattern-interrupt visual" },
        { value: "stat-shock", label: "Surprising statistic" },
        { value: "story-open", label: "Mid-scene story-open" },
      ],
      helpText: "How you stop the scroll in the first 3 seconds (silent autoplay)",
      aiDerivable: true,
      aiHint: "Based on persona pain-point + campaign goal: awareness→bold-statement, conversion→stat-shock",
    },
    {
      key: "captionStyle",
      label: "On-screen Caption Style",
      category: "format-specs",
      type: "select",
      options: [
        { value: "burned-in", label: "Burned-in captions (always visible)" },
        { value: "auto-closed", label: "Auto-generated closed captions" },
        { value: "key-phrases", label: "Key-phrase overlays (highlights only)" },
      ],
      helpText: "LinkedIn autoplay is silent — captions are essential for watch-time. Default: burned-in.",
      aiDerivable: true,
      aiHint: "Default 'burned-in' voor LinkedIn paid (silent autoplay vereist altijd-zichtbare captions). 'key-phrases' wanneer brand-tone minimalistisch is en spoken-script kort genoeg om visueel ruimte te hebben.",
    },
  ],

  "social-carousel": [
    ...skeletonInputFields('slide'),
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
    ...conversionContentStyleFields(),
    valueProposition(),
    headlineCount(3),
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
    ...conversionContentStyleFields(),
    valueProposition(),
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
    ...conversionContentStyleFields(),
    valueProposition(),
    headlineCount(2),
    ...adContentStyleFields(),
    landingPageUrl(),
    {
      key: "dominantVisualElement",
      label: "Dominant Visual Element",
      category: "creative-direction",
      type: "text",
      placeholder: "e.g. \"product hero shot center, bold contrast badge top-right\"",
      helpText: "Display ads have ~1-2 words of copy room — visual focus is essential",
      aiDerivable: true,
      aiHint: "Suggest one focal element that supports the value-prop; avoid generic 'lifestyle photo'",
    },
  ],

  "retargeting-ad": [
    ...conversionContentStyleFields(),
    {
      key: "previousActionContext",
      label: "Previous Action Context",
      category: "conversion-hook",
      type: "text",
      placeholder: "e.g. \"viewed pricing page 3 days ago, bounced before signup\"",
      helpText: "What the user concretely did — copy must reference this directly",
      aiDerivable: true,
      aiHint: "Derive from retargetingSegment + productReference: name the specific action that triggered this audience",
    },
    {
      key: "incentiveOffer",
      label: "Incentive Offer (optional)",
      category: "conversion-hook",
      type: "text",
      placeholder: "e.g. \"15% off when you sign up this week\"",
      helpText: "Optional incentive to overcome the bounce-reason",
      aiDerivable: true,
      aiHint: "Suggest a moderate incentive aligned with funnel-stage; leave blank if brand avoids discounting",
    },
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
    ...conversionContentStyleFields(),
    {
      key: "hookSecond",
      label: "0:00 – 0:03 — Visual Hook",
      category: "conversion-hook",
      type: "text",
      placeholder: "e.g. \"Close-up of hands snapping a notebook shut\"",
      helpText: "What happens in the first 3 seconds — make-or-break for skip behavior",
      aiDerivable: true,
      aiHint: "Describe a concrete visual that aligns with hookFormat; avoid 'engaging intro'-type vagueness",
    },
    {
      key: "payoffMoment",
      label: "Payoff Moment (timestamp + scene)",
      category: "conversion-hook",
      type: "text",
      placeholder: "e.g. \"0:18 — split-screen: chaotic-marketing vs. consistent-brand\"",
      helpText: "Scene where the value lands for the viewer",
      aiDerivable: true,
      aiHint: "Position payoff at ~60-70% of duration; describe the visual that makes the message stick",
    },
    {
      key: "skipDeterrent",
      label: "Skip Deterrent (0:00 – 0:05)",
      category: "conversion-hook",
      type: "text",
      placeholder: "e.g. \"open with statement that names viewer's exact frustration\"",
      helpText: "Specific tactic to prevent skip in the 5-second skippable window",
      aiDerivable: true,
      aiHint: "Pick one of: pattern-interrupt visual, named-pain-point statement, contrarian claim, surprising stat",
    },
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
    ...conversionContentStyleFields(),
    valueProposition(),
    {
      key: "editorialPretext",
      label: "Editorial Pretext",
      category: "conversion-hook",
      type: "textarea",
      placeholder: "e.g. \"3 lessons brand managers learned about consistency\"",
      helpText: "Editorial framing — what makes this read like content, not an ad",
      aiDerivable: true,
      aiHint: "Frame as an editorial story angle (lesson, trend-piece, list, profile); not a product-pitch",
    },
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
    ...emailContentStyleFields(),
    subjectLine(),
    {
      key: "featuredItem",
      label: "Featured Item This Edition",
      category: "structure-skeleton",
      type: "text",
      placeholder: "e.g. \"New brand-voice scoring now available for LinkedIn content\"",
      helpText: "The single hero-item that anchors this edition (vs. recurring sections)",
      aiDerivable: true,
      aiHint: "Pick the most newsworthy item from campaign content; 1 sentence",
    },
    {
      key: "recurringSegments",
      label: "Recurring Segments",
      category: "structure-skeleton",
      type: "textarea",
      placeholder: "One recurring segment per line:\n- Brand news of the week\n- Customer case\n- Quick tip\n- What we're reading",
      helpText: "Vaste rubrieken die in elke editie terugkomen — drives consistency across editions",
      aiDerivable: true,
      aiHint: "Suggest 3-5 recurring segment names that fit the brand and audience; one per line",
    },
    {
      key: "sectionTopics",
      label: "Section Topics (this edition)",
      category: "campaign-details",
      type: "tags",
      placeholder: "Add section topic…",
      helpText: "Content sections specific to this edition (overlay on top of recurringSegments)",
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
    ...conversionContentStyleFields(),
    {
      key: "urgencyMechanism",
      label: "Urgency Mechanism",
      category: "conversion-hook",
      type: "select",
      options: [
        { value: "deadline", label: "Deadline — date/time-bound" },
        { value: "scarcity", label: "Scarcity — limited inventory / seats" },
        { value: "loss-aversion", label: "Loss Aversion — what they lose by not acting" },
        { value: "none", label: "None — evergreen / no manufactured urgency" },
      ],
      helpText: "Promo emails without an urgency mechanism read as 'nice to know'",
      aiDerivable: true,
      aiHint: "Match to offerDetails: time-bound discount → deadline; finite seats → scarcity; ongoing pricing → none",
    },
    {
      key: "socialProofSnippet",
      label: "Social Proof Snippet (optional)",
      category: "conversion-hook",
      type: "text",
      placeholder: "e.g. \"\"3x faster than our previous tool\" — Maartje, brand lead at ACME\"",
      helpText: "1 customer-quote / metric / case-fragment that supports the offer",
      aiDerivable: true,
      aiHint: "Use a brand-context testimonial or metric; leave blank if none available",
    },
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
    ...conversionContentStyleFields(),
    {
      key: "lastValueDelivered",
      label: "Last Value Delivered",
      category: "conversion-hook",
      type: "text",
      placeholder: "e.g. \"last shown interest: brand-voice analyzer for LinkedIn\"",
      helpText: "Anchor — what concretely interested the user the last time they engaged",
      aiDerivable: true,
      aiHint: "Derive from segmentation data if available; if not, suggest a high-value moment based on persona",
    },
    {
      key: "pivotAngle",
      label: "Pivot Angle",
      category: "conversion-hook",
      type: "text",
      placeholder: "e.g. \"ask whether the pain is still relevant, not 'we miss you'\"",
      helpText: "How the email pivots away from generic 'we miss you'",
      aiDerivable: true,
      aiHint: "Suggest a specific re-entry angle: new feature relevant to lastValueDelivered, or check-in question about a known pain",
    },
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
    ...skeletonInputFields('section'),
    valueProposition(),
    targetObjection(),
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
    // W2 (plan §2.3): een product-page is ALTIJD aan een Product gekoppeld.
    // De generator krijgt zo de echte naam/features/benefits/prijzen/beelden
    // mee i.p.v. te verzinnen. Staat bewust bovenaan — het is de spil van
    // de pagina.
    {
      key: "productId",
      label: "Linked product",
      category: "campaign-details",
      type: "product-select",
      required: true,
      helpText: "The product/service from your knowledge section that this page is about",
      aiDerivable: true,
      aiHint: "Kies het product dat het beste past bij het campagne-doel; verplicht voor een product-page",
    },
    valueProposition(),
    targetObjection(),
    featureBenefitMap(),
    ...webPageContentStyleFields(),
    seoKeyword(),
    {
      key: "productSpecs",
      label: "Extra product specs (optional)",
      category: "references",
      type: "textarea",
      placeholder: "e.g. Dimensions, materials, compatibility, pricing",
      helpText: "Additional specs on top of the linked product — only what isn't already in the product record",
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
    {
      key: "differentiatorClaim",
      label: "Differentiator Claim",
      category: "structure-skeleton",
      type: "text",
      placeholder: "e.g. \"We measure brand voice; competitors only measure visual consistency\"",
      helpText: "1 sentence naming the single dimension on which you win — anchors the comparison",
      aiDerivable: true,
      aiHint: "Pick the strongest defensible advantage from competitor analysis; concrete and measurable, not 'better UX'",
    },
    {
      key: "tonePosition",
      label: "Tone Position",
      category: "structure-skeleton",
      type: "select",
      options: [
        { value: "factual", label: "Factual — neutral comparison, let data speak" },
        { value: "persuasive", label: "Persuasive — actively argue your case" },
        { value: "diplomatic", label: "Diplomatic — acknowledge their strengths first" },
      ],
      helpText: "Comparison tone — too aggressive backfires, too soft is wasted breath",
      aiDerivable: true,
      aiHint: "Match to brand-personality + audience expectation: technical buyers prefer factual, marketing-buyers persuasive",
    },
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
    ...skeletonInputFields('page'),
    {
      key: "narrativeFlow",
      label: "Narrative Flow Across Pages",
      category: "structure-skeleton",
      type: "text",
      placeholder: "e.g. \"Probleem (page 1) → Bewijs + case (page 2) → Aanpak (page 3) → CTA (page 4)\"",
      helpText: "How the story unfolds page-by-page — give the multi-page-microsite a spine",
      aiDerivable: true,
      aiHint: "Describe in 1 sentence how the user-journey flows across pages; tie to campaign goal",
    },
    ...webPageContentStyleFields(),
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
  ],

  // ── Video & Audio ──────────────────────────────────────

  "explainer-video": [
    ...skeletonInputFields('scene'),
    {
      key: "coreAnalogy",
      label: "Core Analogy",
      category: "structure-skeleton",
      type: "text",
      placeholder: "e.g. \"brand-voice consistency = a vocal test in a choir — miss one part and it shows\"",
      helpText: "The single metaphor the explainer hangs on — explainers stand or fall on this",
      aiDerivable: true,
      aiHint: "Pick an analogy from the persona's everyday-world that maps cleanly to the product mechanism; concrete and memorable",
    },
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
    ...skeletonInputFields('scene'),
    valueProposition(),
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
  ],

  "webinar-outline": [
    ...skeletonInputFields('agenda'),
    targetTakeaway(),
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
    ...skeletonInputFields('agenda'),
    {
      key: "centralQuestion",
      label: "Central Question",
      category: "structure-skeleton",
      type: "text",
      placeholder: "e.g. \"Why does brand consistency fail at agencies but succeed in-house?\"",
      helpText: "The single question the episode investigates — keeps the conversation focused",
      aiDerivable: true,
      aiHint: "Frame as an open question the guest is uniquely positioned to answer; not yes/no",
    },
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
    ...skeletonInputFields('slide'),
    centralPainPoint(),
    {
      key: "competitorContext",
      label: "Competitor Context",
      category: "structure-skeleton",
      type: "text",
      placeholder: "e.g. \"vs. legacy tools that still review brand voice manually\"",
      helpText: "How the deck positions vs. competitors (1 sentence)",
      aiDerivable: true,
      aiHint: "Pick the dominant alternative the buyer is comparing against; derive from competitor analysis if available",
    },
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
    ...narrativeAnchorFields(),
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
    ...narrativeAnchorFields(),
    {
      key: "journalistRecentArticle",
      label: "Journalist's Recent Article (reference)",
      category: "narrative-anchor",
      type: "text",
      placeholder: "e.g. \"Marketing Week 2026-04-12 — 'Brand-tools die nooit pivoteren'\"",
      helpText: "Title or summary of a recent piece by this journalist — pitches without this are auto-deleted",
      aiDerivable: false,
    },
    {
      key: "dataPoint",
      label: "Hero Data Point",
      category: "narrative-anchor",
      type: "text",
      placeholder: "e.g. \"3 in 5 B2B brands don't measure brand voice\"",
      helpText: "1 surprising stat / number that anchors the pitch",
      aiDerivable: true,
      aiHint: "Suggest a credible-sounding statistic relevant to the story; mark clearly when source is hypothesised vs. confirmed",
    },
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
    ...narrativeAnchorFields(),
    {
      key: "cultureSignal",
      label: "Culture Signal",
      category: "narrative-anchor",
      type: "text",
      placeholder: "e.g. \"team durft elkaar te corrigeren in design-review zonder hiërarchie\"",
      helpText: "1 specific cultural behavior the story implicitly demonstrates",
      aiDerivable: true,
      aiHint: "Pick one observable behavior that signals the company culture; concrete and specific, not 'collaborative' or 'innovative'",
    },
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
 *
 * ## Dynamic field injection (GEO/SEO Fase 1b)
 * Voor long-form-types wordt het `optimizationGoals`-veld hier RUNTIME toegevoegd
 * (SEO opt-in, default-aan) i.p.v. in elk `CONTENT_TYPE_INPUTS`-blok. BEWUST: voeg
 * `optimizationGoals` NIET toe aan de statische registry-entries. Callers mogen
 * niet aannemen dat deze functie puur de statische registry teruggeeft.
 */
export function getContentTypeInputs(
  typeId: string
): ContentTypeInputField[] {
  const resolved = CONTENT_TYPE_ALIASES[typeId] ?? typeId;
  const base = CONTENT_TYPE_INPUTS[typeId] ?? CONTENT_TYPE_INPUTS[resolved] ?? [];
  if (LONG_FORM_SEO_TYPES.has(resolved) && !base.some((f) => f.key === "optimizationGoals")) {
    return [...base, optimizationGoals()];
  }
  return base;
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

  // Note: durations include the new 3-call flow (Gemini Flash angle picker
  // + 2 parallel Claude calls per angle). Adds ~10-15s vs old single-call
  // generation but produces fundamenteel verschillende variants.
  if (seoTypes.has(resolved)) {
    return { label: '2-4 minutes', minSeconds: 120, maxSeconds: 240 };
  }
  if (longForm.has(resolved)) {
    return { label: '60-120 seconds', minSeconds: 60, maxSeconds: 120 };
  }
  if (mediumForm.has(resolved)) {
    return { label: '45-75 seconds', minSeconds: 45, maxSeconds: 75 };
  }
  if (videoAudio.has(resolved)) {
    return { label: '45-75 seconds', minSeconds: 45, maxSeconds: 75 };
  }
  // Short-form: social posts, ads, carousels
  return { label: '25-45 seconds', minSeconds: 25, maxSeconds: 45 };
}

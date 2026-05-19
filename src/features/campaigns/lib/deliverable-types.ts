export type FunnelStage = "awareness" | "consideration" | "conversion" | "retention";

export interface DeliverableTypeConstraints {
  minChars?: number;
  maxChars?: number;
  minWords?: number;
  maxWords?: number;
  requiredSections?: string[];
  maxHashtags?: number;
  maxSlides?: number;
}

export interface QualityCriterion {
  name: string;
  weight: number;
  description: string;
}

export interface DeliverableTypeDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  funnelStage: FunnelStage;
  outputFormats: string[];
  icon: string;
  constraints?: DeliverableTypeConstraints;
  qualityCriteria?: QualityCriterion[];
  exportFormats?: string[];
  /**
   * Wanneer true, wordt het type uit de "Add Content"-modal verborgen.
   * Type blijft bestaan in code (prompts, F-VAL, exporters) zodat
   * historische deliverables van dit type blijven werken. Toggle terug
   * door `hidden` te verwijderen of false te zetten.
   */
  hidden?: boolean;
}

// ─── Multi-candidate image generation (Pattern B image-quality-chain) ───

/**
 * Default aantal image-candidates dat parallel wordt gegenereerd per content-type.
 *
 * 3-4 voor "expensive types" waar visuele variatie cruciaal is en cost-toename
 * (~3× per generation) gerechtvaardigd. 2 voor de rest — voldoende voor user-keuze
 * zonder ongegronde cost-impact. Caller (generate-visual* routes) gebruikt deze
 * default wanneer body.count niet expliciet meegegeven wordt.
 */
const MULTI_CANDIDATE_DEFAULTS: Record<string, number> = {
  // Long-form & hero visuals — beeld bepaalt sterk de perceptie
  "landing-page": 3,
  "blog-post": 3,
  "explainer-video": 3,
  // Social media hero — head-to-head test loont voor scroll-stopper
  "instagram-post-carousel": 3,
  "instagram-post": 3,
  // 2026-05-19: LinkedIn Video Ad — 3 thumbnail-candidates voor selectie
  // (thumbnail bepaalt stop-scroll-rate sterker dan caption alleen)
  "linkedin-video-ad": 3,
  // Standaard 2 — alle andere types vallen in default-tak
};

/**
 * Lookup default multi-candidate count voor een content-type. Default 2.
 */
export function getMultiCandidateDefault(deliverableTypeId: string): number {
  return MULTI_CANDIDATE_DEFAULTS[deliverableTypeId] ?? 2;
}

// ─── Modality-fit defaults (Pattern G1 image-quality-chain) ────────────

/**
 * Recommended modality per content-type. Suggesteert aan de user welke
 * beeld-aanpak het beste past — voorkomt dat een tweet als hero-photo
 * gegenereerd wordt of een explainer-video als infographic.
 *
 * Waardes:
 * - `photo`: realistic photography (lifestyle, product-shot, behind-the-scenes)
 * - `illustration`: vector / digital illustration (concept, metaphor, abstract)
 * - `infographic`: data-viz, charts, diagrams (data-driven, hoe-werkt-X)
 * - `ugc`: authentic, low-fi user-generated-content look (testimonials, tiktok)
 * - `none`: geen visual nodig (puur tekst-content zoals scripts, briefings)
 */
export type RecommendedModality =
  | "photo"
  | "illustration"
  | "infographic"
  | "ugc"
  | "none";

const MODALITY_DEFAULTS: Record<string, RecommendedModality> = {
  // Long-form & hero — krachtige photography
  "blog-post": "photo",
  "landing-page": "photo",
  "case-study": "photo",
  "press-release": "photo",
  // Social media — context per platform
  "instagram-post": "photo",
  "instagram-post-carousel": "photo",
  "linkedin-post": "photo",
  "facebook-post": "photo",
  "twitter-post": "illustration",
  "tweet": "illustration",
  // TikTok & short-form video: UGC-look
  "tiktok-script": "ugc",
  "video-ad": "photo",
  "explainer-video": "illustration",
  "linkedin-video": "photo",
  "promo-video": "photo",
  // Data-heavy types
  "infographic": "infographic",
  "one-pager": "infographic",
  "report": "infographic",
  // Ads & conversion
  "search-ad": "none",
  "google-ad": "none",
  "display-ad": "photo",
  "facebook-ad": "photo",
  // Email & newsletters
  "newsletter": "photo",
  "email": "photo",
  // Pure-text types — geen visual nodig
  "voice-over-script": "none",
  "podcast-script": "none",
};

/**
 * Lookup recommended modality voor een content-type. Default `photo` —
 * geschikt voor de meeste algemene content. Caller (UI hint) gebruikt
 * dit om een suggestion-banner te tonen aan de user.
 */
export function getRecommendedModality(deliverableTypeId: string): RecommendedModality {
  return MODALITY_DEFAULTS[deliverableTypeId] ?? "photo";
}

/**
 * User-friendly label + uitleg per modality voor UI-rendering.
 */
export const MODALITY_LABELS: Record<RecommendedModality, { label: string; description: string }> = {
  photo: {
    label: "Photography",
    description: "Realistic photo (lifestyle, product-shot, behind-the-scenes). Beste voor tastbare merkbeleving.",
  },
  illustration: {
    label: "Illustration",
    description: "Digital illustration of vector-art. Beste voor concepten, metaphors, abstracte ideeën.",
  },
  infographic: {
    label: "Infographic",
    description: "Data-visualisatie, charts, diagrammen. Beste voor cijfers en complexe ideeën uitleg.",
  },
  ugc: {
    label: "UGC-style",
    description: "Authentieke, low-fi user-generated-content look. Beste voor TikTok, testimonials, social proof.",
  },
  none: {
    label: "Geen visual",
    description: "Dit content-type werkt zonder beeld (pure-text formats zoals scripts, briefings, search ads).",
  },
};

// ─── Category-level defaults ────────────────────────────────

const LONG_FORM_DEFAULTS = {
  constraints: { minWords: 500, maxWords: 5000, requiredSections: ['introduction', 'body', 'conclusion'] },
  qualityCriteria: [
    { name: 'SEO Optimization', weight: 0.25, description: 'Keyword usage, meta description, heading structure' },
    { name: 'Brand Alignment', weight: 0.20, description: 'Voice consistency, value messaging' },
    { name: 'Readability', weight: 0.20, description: 'Flesch score, paragraph length, scanability' },
    { name: 'Engagement', weight: 0.20, description: 'Hook strength, CTA clarity, active voice' },
    { name: 'Structure', weight: 0.15, description: 'Intro-body-conclusion, section headers, transitions' },
  ],
  exportFormats: ['txt', 'html', 'pdf', 'md'],
};

const SOCIAL_MEDIA_DEFAULTS = {
  constraints: { maxHashtags: 30 },
  qualityCriteria: [
    { name: 'Visual-Text Synergy', weight: 0.25, description: 'Caption complements visual, not duplicates' },
    { name: 'Engagement Hooks', weight: 0.25, description: 'Opening line, question/CTA, save-worthiness' },
    { name: 'Brand Voice', weight: 0.20, description: 'Tone match, personality consistency' },
    { name: 'Platform Fit', weight: 0.20, description: 'Length limits, hashtag strategy, emoji use' },
    { name: 'Accessibility', weight: 0.10, description: 'Alt text, readability, inclusive language' },
  ],
  exportFormats: ['txt'],
};

const ADVERTISING_DEFAULTS = {
  constraints: { maxWords: 150 },
  qualityCriteria: [
    { name: 'Conversion Focus', weight: 0.30, description: 'CTA strength, urgency, value proposition clarity' },
    { name: 'Brand Alignment', weight: 0.20, description: 'Voice consistency, brand promise delivery' },
    { name: 'Platform Compliance', weight: 0.20, description: 'Character limits, policy compliance, format fit' },
    { name: 'Targeting Precision', weight: 0.15, description: 'Audience relevance, persona alignment' },
    { name: 'Creative Impact', weight: 0.15, description: 'Memorability, differentiation, stopping power' },
  ],
  exportFormats: ['txt'],
};

const EMAIL_DEFAULTS = {
  constraints: { minWords: 50, maxWords: 1000, requiredSections: ['subject', 'body', 'cta'] },
  qualityCriteria: [
    { name: 'Subject Line', weight: 0.25, description: 'Open rate potential, curiosity, personalization' },
    { name: 'Brand Voice', weight: 0.20, description: 'Tone match, personality consistency' },
    { name: 'Conversion Path', weight: 0.20, description: 'CTA clarity, urgency, value proposition' },
    { name: 'Readability', weight: 0.20, description: 'Scannability, mobile-friendly, paragraph length' },
    { name: 'Deliverability', weight: 0.15, description: 'Spam trigger avoidance, link ratio, text-to-image' },
  ],
  exportFormats: ['html', 'txt'],
};

const WEBSITE_DEFAULTS = {
  constraints: { minWords: 100, maxWords: 3000, requiredSections: ['hero', 'benefits', 'cta'] },
  qualityCriteria: [
    { name: 'Conversion Optimization', weight: 0.25, description: 'CTA placement, value hierarchy, friction reduction' },
    { name: 'SEO', weight: 0.20, description: 'Keyword targeting, meta tags, heading structure' },
    { name: 'Brand Alignment', weight: 0.20, description: 'Voice, visual direction, positioning' },
    { name: 'User Experience', weight: 0.20, description: 'Scanability, information architecture, mobile-first' },
    { name: 'Persuasion', weight: 0.15, description: 'Social proof, urgency, benefit-driven copy' },
  ],
  exportFormats: ['txt', 'html'],
};

const VIDEO_AUDIO_DEFAULTS = {
  constraints: { minWords: 50, maxWords: 2000 },
  qualityCriteria: [
    { name: 'Hook Strength', weight: 0.25, description: 'First 3 seconds, pattern interrupt, curiosity gap' },
    { name: 'Narrative Flow', weight: 0.25, description: 'Pacing, transitions, storytelling arc' },
    { name: 'Brand Integration', weight: 0.20, description: 'Natural brand mentions, value alignment' },
    { name: 'CTA Effectiveness', weight: 0.15, description: 'Clear next step, urgency, placement timing' },
    { name: 'Production Readiness', weight: 0.15, description: 'Shoot-ready directions, timing cues, format specs' },
  ],
  exportFormats: ['txt', 'pdf', 'srt'],
};

const SALES_DEFAULTS = {
  constraints: { minWords: 100, maxWords: 3000 },
  qualityCriteria: [
    { name: 'Value Proposition', weight: 0.25, description: 'Clear differentiation, benefit-focused, ROI framing' },
    { name: 'Brand Alignment', weight: 0.20, description: 'Voice consistency, positioning reinforcement' },
    { name: 'Persuasion Structure', weight: 0.20, description: 'Problem-solution, objection handling, social proof' },
    { name: 'Actionability', weight: 0.20, description: 'Clear next steps, contact info, pricing guidance' },
    { name: 'Visual Readiness', weight: 0.15, description: 'Layout-friendly, scannable, chart/table ready' },
  ],
  exportFormats: ['txt', 'pdf'],
};

const PR_HR_DEFAULTS = {
  constraints: { minWords: 100, maxWords: 2000 },
  qualityCriteria: [
    { name: 'Message Clarity', weight: 0.25, description: 'Key message prominence, takeaway clarity' },
    { name: 'Brand Voice', weight: 0.20, description: 'Tone consistency, employer brand alignment' },
    { name: 'Audience Fit', weight: 0.20, description: 'Stakeholder relevance, register appropriateness' },
    { name: 'Credibility', weight: 0.20, description: 'Data backing, quote usage, source attribution' },
    { name: 'Structure', weight: 0.15, description: 'Inverted pyramid, scannable sections, boilerplate' },
  ],
  exportFormats: ['txt'],
};

const LINKEDIN_DEFAULTS = {
  qualityCriteria: [
    { name: 'Professional Tone', weight: 0.25, description: 'Business-appropriate language, industry credibility' },
    { name: 'Platform Fit', weight: 0.25, description: 'LinkedIn-native formatting, optimal length, hashtag strategy' },
    { name: 'Engagement Hooks', weight: 0.20, description: 'Opening line strength, question/CTA, share-worthiness' },
    { name: 'Brand Voice', weight: 0.20, description: 'Tone consistency, thought leadership positioning' },
    { name: 'Accessibility', weight: 0.10, description: 'Readability, inclusive language, alt text' },
  ],
  exportFormats: ['txt'],
};

// ─── Deliverable Types (53 total) ───────────────────────────

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
    constraints: { minWords: 800, maxWords: 3000, requiredSections: ['introduction', 'body', 'conclusion'] },
    qualityCriteria: LONG_FORM_DEFAULTS.qualityCriteria,
    exportFormats: LONG_FORM_DEFAULTS.exportFormats,
  },
  {
    id: "pillar-page",
    name: "Pillar Page",
    description: "Comprehensive topic hub page (2000+ words)",
    category: "Long-Form Content",
    funnelStage: "awareness",
    outputFormats: ["Text", "HTML"],
    icon: "Layers",
    constraints: { minWords: 2000, maxWords: 8000, requiredSections: ['introduction', 'table-of-contents', 'body', 'conclusion'] },
    qualityCriteria: LONG_FORM_DEFAULTS.qualityCriteria,
    exportFormats: LONG_FORM_DEFAULTS.exportFormats,
  },
  {
    id: "whitepaper",
    name: "Whitepaper",
    description: "Research-backed thought leadership document",
    category: "Long-Form Content",
    funnelStage: "consideration",
    outputFormats: ["Text", "PDF"],
    icon: "BookOpen",
    constraints: { minWords: 2500, maxWords: 10000, requiredSections: ['abstract', 'introduction', 'methodology', 'findings', 'conclusion'] },
    qualityCriteria: LONG_FORM_DEFAULTS.qualityCriteria,
    exportFormats: ['txt', 'pdf'],
  },
  {
    id: "case-study",
    name: "Case Study",
    description: "Customer success story with metrics and quotes",
    category: "Long-Form Content",
    funnelStage: "consideration",
    outputFormats: ["Text", "PDF"],
    icon: "Award",
    constraints: { minWords: 800, maxWords: 3000, requiredSections: ['challenge', 'solution', 'results'] },
    qualityCriteria: LONG_FORM_DEFAULTS.qualityCriteria,
    exportFormats: ['txt', 'pdf'],
  },
  {
    id: "ebook",
    name: "E-book",
    description: "Multi-chapter downloadable guide (lead magnet)",
    category: "Long-Form Content",
    funnelStage: "consideration",
    outputFormats: ["Text", "PDF"],
    icon: "BookMarked",
    constraints: { minWords: 5000, maxWords: 30000, requiredSections: ['table-of-contents', 'introduction', 'chapters', 'conclusion'] },
    qualityCriteria: LONG_FORM_DEFAULTS.qualityCriteria,
    exportFormats: ['txt', 'pdf'],
  },
  {
    id: "article",
    name: "Feature Article",
    description: "In-depth journalistic-style feature piece",
    category: "Long-Form Content",
    funnelStage: "awareness",
    outputFormats: ["Text", "HTML"],
    icon: "Newspaper",
    constraints: LONG_FORM_DEFAULTS.constraints,
    qualityCriteria: LONG_FORM_DEFAULTS.qualityCriteria,
    exportFormats: LONG_FORM_DEFAULTS.exportFormats,
  },
  {
    id: "thought-leadership",
    name: "Thought Leadership",
    description: "Executive-bylined opinion or industry analysis",
    category: "Long-Form Content",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Lightbulb",
    constraints: { minWords: 1000, maxWords: 4000, requiredSections: ['thesis', 'argument', 'evidence', 'conclusion'] },
    qualityCriteria: LONG_FORM_DEFAULTS.qualityCriteria,
    exportFormats: LONG_FORM_DEFAULTS.exportFormats,
  },

  // ─── Social Media (13) ──────────────────────────────────
  {
    id: "linkedin-post",
    name: "LinkedIn Post",
    description: "Professional network post with text and image",
    category: "Social Media",
    funnelStage: "awareness",
    outputFormats: ["Text", "Image"],
    icon: "Linkedin",
    // 2026-05-19 added minWords/maxWords: zonder word-bounds viel
    // fidelity-runner's targetWordCount terug op 500, wat een 200-woord
    // LinkedIn-post 40% van target maakte -> length-control multiplier
    // 0.8 -> -15-25 punten op composite. Sweet-spot per LinkedIn-prompt
    // is 150-300w; bounds 100-400 geven targetWordCount=250.
    constraints: { minWords: 100, maxWords: 400, maxChars: 3000, maxHashtags: 5 },
    qualityCriteria: SOCIAL_MEDIA_DEFAULTS.qualityCriteria,
    exportFormats: SOCIAL_MEDIA_DEFAULTS.exportFormats,
  },
  {
    id: "linkedin-article",
    name: "LinkedIn Article",
    description: "Long-form LinkedIn native article (1000-2000 words)",
    category: "Long-Form Content",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Linkedin",
    constraints: { minWords: 500, maxWords: 3000, maxHashtags: 5 },
    qualityCriteria: LONG_FORM_DEFAULTS.qualityCriteria,
    exportFormats: ['txt', 'html'],
  },
  {
    id: "linkedin-carousel",
    name: "LinkedIn Carousel",
    description: "Multi-slide educational or storytelling carousel for LinkedIn",
    category: "Social Media",
    funnelStage: "awareness",
    outputFormats: ["Carousel"],
    icon: "GalleryHorizontalEnd",
    // 7-10 slides x 15-30 words = ~100-300w total text content.
    constraints: { minWords: 100, maxWords: 300, maxSlides: 10, maxChars: 3000, maxHashtags: 5 },
    qualityCriteria: LINKEDIN_DEFAULTS.qualityCriteria,
    exportFormats: ['pdf', 'png'],
    // 2026-05-19 verborgen uit Add Content per user — carousel asset-
    // pipeline nog niet productie-klaar (zie idea-linkedin-carousel-
    // verbeterplan.md). Toggle terug zodra full multi-slide visual deck
    // pipeline post-launch beschikbaar is.
    hidden: true,
  },
  {
    id: "linkedin-ad",
    name: "LinkedIn Sponsored Post",
    description: "Paid LinkedIn ad (Single Image or Message Ad)",
    category: "Advertising & Paid",
    funnelStage: "conversion",
    outputFormats: ["Text", "Image"],
    icon: "Linkedin",
    constraints: { minWords: 40, maxWords: 150, maxChars: 600 },
    qualityCriteria: [
      { name: 'Conversion Focus', weight: 0.30, description: 'CTA strength, value proposition clarity' },
      { name: 'Professional Tone', weight: 0.25, description: 'Business credibility, industry relevance' },
      { name: 'Platform Compliance', weight: 0.20, description: 'LinkedIn ad policies, character limits' },
      { name: 'Targeting Precision', weight: 0.15, description: 'Audience relevance, persona alignment' },
      { name: 'Creative Impact', weight: 0.10, description: 'Visual-text synergy, stopping power' },
    ],
    exportFormats: LINKEDIN_DEFAULTS.exportFormats,
  },
  {
    // 2026-05-19 nieuw content-type (split-out van linkedin-ad video-ad
    // subformat). Eigen content-type heeft eigen prompt, eigen video-
    // generation pipeline via VIDEO_ADJACENT_TYPES, eigen checklist.
    id: "linkedin-video-ad",
    name: "LinkedIn Video Ad",
    description: "Paid LinkedIn video ad with script + thumbnail + ad-copy. Generates actual video via fal.ai providers.",
    category: "Social Media",
    funnelStage: "conversion",
    outputFormats: ["Text", "Video"],
    icon: "Film",
    constraints: { minWords: 80, maxWords: 250, maxChars: 600 },
    qualityCriteria: [
      { name: 'Hook Impact', weight: 0.30, description: 'First 3 seconds stop the scroll on autoplay-silent' },
      { name: 'Conversion Focus', weight: 0.25, description: 'CTA strength, value-proposition clarity' },
      { name: 'Visual-Script Synergy', weight: 0.20, description: 'Script + [VISUAL] cues align coherent' },
      { name: 'Platform Compliance', weight: 0.15, description: 'LinkedIn video-ad specs (length, aspect, captions)' },
      { name: 'Brand Voice', weight: 0.10, description: 'Authenticity, persona-fit, professional credibility' },
    ],
    exportFormats: ['txt', 'mp4'],
    // 2026-05-19 — verborgen uit Add Content. Scene-visual-split + per-scene
    // video-gen pipeline pre-launch te complex om consistent te leveren;
    // re-enable post-launch wanneer Optie C (multi-shot per scene + compose)
    // af is. Bestaande deliverables van dit type blijven werken.
    hidden: true,
  },
  {
    id: "linkedin-newsletter",
    name: "LinkedIn Newsletter",
    description: "Recurring LinkedIn newsletter edition for subscriber base",
    category: "Social Media",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Linkedin",
    constraints: { minWords: 300, maxWords: 2000, maxHashtags: 5 },
    qualityCriteria: LINKEDIN_DEFAULTS.qualityCriteria,
    exportFormats: ['txt', 'html'],
    // 2026-05-19 verborgen uit Add Content per user.
    hidden: true,
  },
  {
    id: "linkedin-video",
    name: "LinkedIn Video Script",
    description: "Script for native LinkedIn video (30s-5min)",
    category: "Social Media",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Film",
    constraints: { minWords: 50, maxWords: 500 },
    qualityCriteria: LINKEDIN_DEFAULTS.qualityCriteria,
    exportFormats: ['txt', 'srt'],
    // 2026-05-19 verborgen uit Add Content per user.
    hidden: true,
  },
  {
    id: "linkedin-event",
    name: "LinkedIn Event Post",
    description: "Event promotion post with details and registration CTA",
    category: "Social Media",
    funnelStage: "awareness",
    outputFormats: ["Text", "Image"],
    icon: "Linkedin",
    constraints: { minWords: 80, maxWords: 350, maxChars: 3000, maxHashtags: 5 },
    qualityCriteria: LINKEDIN_DEFAULTS.qualityCriteria,
    exportFormats: LINKEDIN_DEFAULTS.exportFormats,
  },
  {
    id: "linkedin-poll",
    name: "LinkedIn Poll",
    description: "Engaging poll with context text to drive discussion",
    category: "Social Media",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Linkedin",
    // Context-paragraph (30-50w) + 2-4 options (8-12w total) + suggested follow-up comment (40-60w).
    constraints: { minWords: 60, maxWords: 200, maxChars: 140, maxHashtags: 3 },
    qualityCriteria: LINKEDIN_DEFAULTS.qualityCriteria,
    exportFormats: LINKEDIN_DEFAULTS.exportFormats,
  },
  {
    id: "instagram-post",
    name: "Instagram Post",
    description: "Visual-first post with caption and hashtags",
    category: "Social Media",
    funnelStage: "awareness",
    outputFormats: ["Image", "Carousel"],
    icon: "Instagram",
    constraints: { minWords: 50, maxWords: 250, maxChars: 2200, maxHashtags: 30 },
    qualityCriteria: SOCIAL_MEDIA_DEFAULTS.qualityCriteria,
    exportFormats: SOCIAL_MEDIA_DEFAULTS.exportFormats,
  },
  {
    id: "twitter-thread",
    name: "X / Twitter Thread",
    description: "Multi-tweet narrative thread",
    category: "Social Media",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Twitter",
    // 7-12 tweets × 30-60w/tweet (within 280-char limit) = ~150-400w total
    constraints: { minWords: 150, maxWords: 500, maxHashtags: 3 },
    qualityCriteria: SOCIAL_MEDIA_DEFAULTS.qualityCriteria,
    exportFormats: SOCIAL_MEDIA_DEFAULTS.exportFormats,
  },
  {
    id: "facebook-post",
    name: "Facebook Post",
    description: "Engaging social media post for Facebook/Meta",
    category: "Social Media",
    funnelStage: "awareness",
    outputFormats: ["Text", "Image"],
    icon: "Facebook",
    constraints: { minWords: 40, maxWords: 200, maxChars: 63206, maxHashtags: 10 },
    qualityCriteria: SOCIAL_MEDIA_DEFAULTS.qualityCriteria,
    exportFormats: SOCIAL_MEDIA_DEFAULTS.exportFormats,
  },
  {
    id: "tiktok-script",
    name: "TikTok / Reels Script",
    description: "Short-form video script (15-60s) with hook and CTA",
    category: "Social Media",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Clapperboard",
    constraints: { minWords: 30, maxWords: 200 },
    qualityCriteria: [
      { name: 'Hook Strength', weight: 0.30, description: 'First 2 seconds hook, pattern interrupt' },
      { name: 'Trend Alignment', weight: 0.25, description: 'Current trends, sounds, formats' },
      { name: 'Brand Voice', weight: 0.20, description: 'Authentic tone, personality fit' },
      { name: 'CTA Clarity', weight: 0.15, description: 'Clear action, easy to follow' },
      { name: 'Replay Value', weight: 0.10, description: 'Rewatchability, share-worthiness' }
    ],
    exportFormats: SOCIAL_MEDIA_DEFAULTS.exportFormats,
    // 2026-05-19 — verborgen uit Add Content (zie linkedin-video-ad voor reden).
    hidden: true,
  },
  {
    id: "social-carousel",
    name: "Social Carousel",
    description: "Multi-slide educational or storytelling carousel",
    category: "Social Media",
    funnelStage: "awareness",
    outputFormats: ["Carousel"],
    icon: "GalleryHorizontalEnd",
    constraints: { minWords: 100, maxWords: 300, maxSlides: 10, maxChars: 2200 },
    qualityCriteria: SOCIAL_MEDIA_DEFAULTS.qualityCriteria,
    exportFormats: ['pdf', 'png'],
    // 2026-05-19 verborgen uit Add Content per user — carousel asset-
    // pipeline nog niet productie-klaar. Toggle terug post-launch.
    hidden: true,
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
    constraints: { maxChars: 270 },
    qualityCriteria: ADVERTISING_DEFAULTS.qualityCriteria,
    exportFormats: ADVERTISING_DEFAULTS.exportFormats,
  },
  {
    id: "social-ad",
    name: "Social Ad",
    description: "Paid social ad copy (Meta, LinkedIn, TikTok)",
    category: "Advertising & Paid",
    funnelStage: "awareness",
    outputFormats: ["Text", "Image"],
    icon: "BadgeDollarSign",
    constraints: { maxChars: 125, maxWords: 40 },
    qualityCriteria: ADVERTISING_DEFAULTS.qualityCriteria,
    exportFormats: ADVERTISING_DEFAULTS.exportFormats,
  },
  {
    id: "display-ad",
    name: "Display Ad",
    description: "Banner/display ad copy and creative brief",
    category: "Advertising & Paid",
    funnelStage: "awareness",
    outputFormats: ["Text", "Image"],
    icon: "MonitorSmartphone",
    constraints: { maxWords: 30 },
    qualityCriteria: ADVERTISING_DEFAULTS.qualityCriteria,
    exportFormats: ADVERTISING_DEFAULTS.exportFormats,
  },
  {
    id: "retargeting-ad",
    name: "Retargeting Ad",
    description: "Remarketing ad for previous visitors/engagers",
    category: "Advertising & Paid",
    funnelStage: "conversion",
    outputFormats: ["Text", "Image"],
    icon: "RotateCcw",
    constraints: { maxWords: 40 },
    qualityCriteria: ADVERTISING_DEFAULTS.qualityCriteria,
    exportFormats: ADVERTISING_DEFAULTS.exportFormats,
  },
  {
    id: "video-ad",
    name: "Video Ad Script",
    description: "Script for pre-roll, in-feed, or CTV ad (15-30s)",
    category: "Advertising & Paid",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Play",
    constraints: { minWords: 30, maxWords: 150 },
    qualityCriteria: ADVERTISING_DEFAULTS.qualityCriteria,
    exportFormats: ['txt', 'srt'],
    // 2026-05-19 — verborgen uit Add Content (zie linkedin-video-ad voor reden).
    hidden: true,
  },
  {
    id: "native-ad",
    name: "Native Ad / Sponsored",
    description: "Sponsored article or in-feed native placement brief",
    category: "Advertising & Paid",
    funnelStage: "consideration",
    outputFormats: ["Text"],
    icon: "PanelTop",
    constraints: { minWords: 200, maxWords: 1000 },
    qualityCriteria: ADVERTISING_DEFAULTS.qualityCriteria,
    exportFormats: ADVERTISING_DEFAULTS.exportFormats,
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
    constraints: EMAIL_DEFAULTS.constraints,
    qualityCriteria: EMAIL_DEFAULTS.qualityCriteria,
    exportFormats: EMAIL_DEFAULTS.exportFormats,
  },
  {
    id: "welcome-sequence",
    name: "Welcome Sequence",
    description: "Multi-email onboarding series (3-5 emails)",
    category: "Email & Automation",
    funnelStage: "retention",
    outputFormats: ["HTML", "Text"],
    icon: "MailPlus",
    constraints: { minWords: 50, maxWords: 500, requiredSections: ['subject', 'greeting', 'body', 'cta'] },
    qualityCriteria: EMAIL_DEFAULTS.qualityCriteria,
    exportFormats: EMAIL_DEFAULTS.exportFormats,
  },
  {
    id: "promotional-email",
    name: "Promotional Email",
    description: "Campaign or offer announcement email",
    category: "Email & Automation",
    funnelStage: "conversion",
    outputFormats: ["HTML", "Text"],
    icon: "Megaphone",
    constraints: EMAIL_DEFAULTS.constraints,
    qualityCriteria: EMAIL_DEFAULTS.qualityCriteria,
    exportFormats: EMAIL_DEFAULTS.exportFormats,
  },
  {
    id: "nurture-sequence",
    name: "Nurture Sequence",
    description: "Lead nurturing drip campaign (5-7 emails)",
    category: "Email & Automation",
    funnelStage: "consideration",
    outputFormats: ["HTML", "Text"],
    icon: "Timer",
    constraints: EMAIL_DEFAULTS.constraints,
    qualityCriteria: EMAIL_DEFAULTS.qualityCriteria,
    exportFormats: EMAIL_DEFAULTS.exportFormats,
  },
  {
    id: "re-engagement-email",
    name: "Re-engagement Email",
    description: "Win-back email for inactive subscribers",
    category: "Email & Automation",
    funnelStage: "retention",
    outputFormats: ["HTML", "Text"],
    icon: "MailWarning",
    constraints: { minWords: 50, maxWords: 300, requiredSections: ['subject', 'body', 'cta', 'unsubscribe'] },
    qualityCriteria: EMAIL_DEFAULTS.qualityCriteria,
    exportFormats: EMAIL_DEFAULTS.exportFormats,
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
    constraints: WEBSITE_DEFAULTS.constraints,
    qualityCriteria: WEBSITE_DEFAULTS.qualityCriteria,
    exportFormats: WEBSITE_DEFAULTS.exportFormats,
  },
  {
    id: "product-page",
    name: "Product / Service Page",
    description: "Feature/benefit copy for a product or service",
    category: "Website & Landing Pages",
    funnelStage: "consideration",
    outputFormats: ["Text", "HTML"],
    icon: "ShoppingBag",
    constraints: { minWords: 200, maxWords: 2000, requiredSections: ['hero', 'features', 'benefits', 'cta'] },
    qualityCriteria: WEBSITE_DEFAULTS.qualityCriteria,
    exportFormats: WEBSITE_DEFAULTS.exportFormats,
  },
  {
    id: "faq-page",
    name: "FAQ Page",
    description: "Frequently asked questions with SEO answers",
    category: "Website & Landing Pages",
    funnelStage: "consideration",
    outputFormats: ["Text", "HTML"],
    icon: "HelpCircle",
    constraints: { minWords: 300, maxWords: 5000, requiredSections: ['questions', 'answers'] },
    qualityCriteria: [
      { name: 'Answer Quality', weight: 0.25, description: 'Completeness, accuracy, helpfulness' },
      { name: 'SEO', weight: 0.25, description: 'Question-based keywords, structured data readiness' },
      { name: 'Brand Voice', weight: 0.20, description: 'Consistent tone, empathetic language' },
      { name: 'Scanability', weight: 0.15, description: 'Clear questions, concise answers, anchor links' },
      { name: 'Completeness', weight: 0.15, description: 'Coverage of common questions, logical grouping' }
    ],
    exportFormats: WEBSITE_DEFAULTS.exportFormats,
  },
  {
    id: "comparison-page",
    name: "Comparison Page",
    description: "Us vs. them or feature comparison matrix copy",
    category: "Website & Landing Pages",
    funnelStage: "consideration",
    outputFormats: ["Text", "HTML"],
    icon: "GitCompareArrows",
    constraints: { minWords: 500, maxWords: 3000, requiredSections: ['intro', 'comparison-matrix', 'recommendation'] },
    qualityCriteria: WEBSITE_DEFAULTS.qualityCriteria,
    exportFormats: WEBSITE_DEFAULTS.exportFormats,
  },
  {
    id: "microsite",
    name: "Campaign Microsite",
    description: "Dedicated multi-page campaign site brief and copy",
    category: "Website & Landing Pages",
    funnelStage: "awareness",
    outputFormats: ["Text", "HTML"],
    icon: "Globe",
    constraints: { minWords: 500, maxWords: 5000, requiredSections: ['hero', 'sections', 'cta'] },
    qualityCriteria: WEBSITE_DEFAULTS.qualityCriteria,
    exportFormats: WEBSITE_DEFAULTS.exportFormats,
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
    constraints: { minWords: 150, maxWords: 500 },
    qualityCriteria: VIDEO_AUDIO_DEFAULTS.qualityCriteria,
    exportFormats: ['txt', 'pdf', 'srt'],
    // 2026-05-19 — verborgen uit Add Content (zie linkedin-video-ad voor reden).
    hidden: true,
  },
  {
    id: "testimonial-video",
    name: "Testimonial Video Brief",
    description: "Customer testimonial interview guide and script",
    category: "Video & Audio",
    funnelStage: "consideration",
    outputFormats: ["Text"],
    icon: "MessageSquareQuote",
    constraints: { minWords: 100, maxWords: 400, requiredSections: ['intro', 'questions', 'closing'] },
    qualityCriteria: VIDEO_AUDIO_DEFAULTS.qualityCriteria,
    exportFormats: VIDEO_AUDIO_DEFAULTS.exportFormats,
    // 2026-05-19 — verborgen uit Add Content (zie linkedin-video-ad voor reden).
    hidden: true,
  },
  {
    id: "promo-video",
    name: "Promo Video Script",
    description: "Promotional campaign video script (15-60s)",
    category: "Video & Audio",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Film",
    constraints: { minWords: 50, maxWords: 200 },
    qualityCriteria: VIDEO_AUDIO_DEFAULTS.qualityCriteria,
    exportFormats: ['txt', 'pdf', 'srt'],
    // 2026-05-19 — verborgen uit Add Content (zie linkedin-video-ad voor reden).
    hidden: true,
  },
  {
    id: "webinar-outline",
    name: "Webinar / Live Session",
    description: "Slide-by-slide outline with talking points",
    category: "Video & Audio",
    funnelStage: "consideration",
    outputFormats: ["Text", "PDF"],
    icon: "Presentation",
    constraints: { minWords: 500, maxWords: 3000, requiredSections: ['agenda', 'slides', 'talking-points'] },
    qualityCriteria: VIDEO_AUDIO_DEFAULTS.qualityCriteria,
    exportFormats: ['txt', 'pdf'],
    // 2026-05-19 — hele "Video & Audio" categorie verwijderd uit Add Content.
    hidden: true,
  },
  {
    id: "podcast-outline",
    name: "Podcast Episode Outline",
    description: "Episode structure, questions, key points, show notes",
    category: "Video & Audio",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Mic",
    constraints: { minWords: 300, maxWords: 2000, requiredSections: ['intro', 'segments', 'questions', 'outro'] },
    qualityCriteria: VIDEO_AUDIO_DEFAULTS.qualityCriteria,
    exportFormats: VIDEO_AUDIO_DEFAULTS.exportFormats,
    // 2026-05-19 — hele "Video & Audio" categorie verwijderd uit Add Content.
    hidden: true,
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
    constraints: { minWords: 500, maxWords: 3000, requiredSections: ['title', 'problem', 'solution', 'proof', 'cta'] },
    qualityCriteria: SALES_DEFAULTS.qualityCriteria,
    exportFormats: ['txt', 'pdf', 'pptx'],
  },
  {
    id: "one-pager",
    name: "One-Pager / Battle Card",
    description: "Single-page product or competitive overview",
    category: "Sales Enablement",
    funnelStage: "conversion",
    outputFormats: ["Text", "PDF"],
    icon: "FileSpreadsheet",
    constraints: { minWords: 200, maxWords: 600, requiredSections: ['headline', 'value-prop', 'differentiators', 'cta'] },
    qualityCriteria: SALES_DEFAULTS.qualityCriteria,
    exportFormats: SALES_DEFAULTS.exportFormats,
  },
  {
    id: "proposal-template",
    name: "Proposal Template",
    description: "Customizable proposal structure with key messaging",
    category: "Sales Enablement",
    funnelStage: "conversion",
    outputFormats: ["Text", "PDF"],
    icon: "ClipboardList",
    constraints: { minWords: 1000, maxWords: 5000, requiredSections: ['executive-summary', 'scope', 'approach', 'timeline', 'pricing'] },
    qualityCriteria: SALES_DEFAULTS.qualityCriteria,
    exportFormats: SALES_DEFAULTS.exportFormats,
  },
  {
    id: "product-description",
    name: "Product Description",
    description: "Concise product copy for catalogs or marketplace",
    category: "Sales Enablement",
    funnelStage: "consideration",
    outputFormats: ["Text"],
    icon: "Tag",
    constraints: { minWords: 50, maxWords: 300 },
    qualityCriteria: SALES_DEFAULTS.qualityCriteria,
    exportFormats: SALES_DEFAULTS.exportFormats,
  },

  // ─── PR, HR & Communications (8) ───────────────────────
  {
    id: "press-release",
    name: "Press Release",
    description: "Official media announcement with boilerplate",
    category: "PR, HR & Communications",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Newspaper",
    constraints: { minWords: 300, maxWords: 800, requiredSections: ['headline', 'dateline', 'lead', 'body', 'boilerplate'] },
    qualityCriteria: PR_HR_DEFAULTS.qualityCriteria,
    exportFormats: PR_HR_DEFAULTS.exportFormats,
  },
  {
    id: "media-pitch",
    name: "Media Pitch",
    description: "Personalized journalist/editor pitch email",
    category: "PR, HR & Communications",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Send",
    constraints: { minWords: 100, maxWords: 300, requiredSections: ['subject', 'hook', 'pitch', 'cta'] },
    qualityCriteria: PR_HR_DEFAULTS.qualityCriteria,
    exportFormats: ['txt'],
  },
  {
    id: "internal-comms",
    name: "Internal Communication",
    description: "Employee-facing announcement or update",
    category: "PR, HR & Communications",
    funnelStage: "retention",
    outputFormats: ["Text", "HTML"],
    icon: "Building2",
    constraints: PR_HR_DEFAULTS.constraints,
    qualityCriteria: PR_HR_DEFAULTS.qualityCriteria,
    exportFormats: PR_HR_DEFAULTS.exportFormats,
  },
  {
    id: "career-page",
    name: "Career Page",
    description: "Employer branding landing page for talent attraction",
    category: "PR, HR & Communications",
    funnelStage: "awareness",
    outputFormats: ["Text", "HTML"],
    icon: "Briefcase",
    constraints: { minWords: 300, maxWords: 2000, requiredSections: ['culture', 'benefits', 'positions', 'cta'] },
    qualityCriteria: PR_HR_DEFAULTS.qualityCriteria,
    exportFormats: ['txt', 'html'],
  },
  {
    id: "job-ad-copy",
    name: "Job Advertisement",
    description: "Compelling job ad copy with employer brand messaging",
    category: "PR, HR & Communications",
    funnelStage: "conversion",
    outputFormats: ["Text"],
    icon: "UserPlus",
    constraints: { minWords: 200, maxWords: 800, requiredSections: ['title', 'about', 'responsibilities', 'requirements', 'benefits'] },
    qualityCriteria: PR_HR_DEFAULTS.qualityCriteria,
    exportFormats: PR_HR_DEFAULTS.exportFormats,
  },
  {
    id: "employee-story",
    name: "Employee Story",
    description: "Employee testimonial or day-in-the-life story",
    category: "PR, HR & Communications",
    funnelStage: "awareness",
    outputFormats: ["Text", "HTML"],
    icon: "Users",
    constraints: { minWords: 300, maxWords: 1500 },
    qualityCriteria: PR_HR_DEFAULTS.qualityCriteria,
    exportFormats: ['txt', 'html'],
  },
  {
    id: "employer-brand-video",
    name: "Employer Branding Video",
    description: "Script for recruitment or culture video (60-120s)",
    category: "PR, HR & Communications",
    funnelStage: "awareness",
    outputFormats: ["Text"],
    icon: "Video",
    constraints: { minWords: 100, maxWords: 500 },
    qualityCriteria: PR_HR_DEFAULTS.qualityCriteria,
    exportFormats: ['txt', 'srt'],
    // 2026-05-19 — verborgen uit Add Content (zie linkedin-video-ad voor reden).
    hidden: true,
  },
  {
    id: "impact-report",
    name: "Impact Report",
    description: "CSR or social impact report for stakeholders",
    category: "PR, HR & Communications",
    funnelStage: "retention",
    outputFormats: ["Text", "PDF"],
    icon: "Leaf",
    constraints: { minWords: 1000, maxWords: 5000, requiredSections: ['executive-summary', 'metrics', 'stories', 'outlook'] },
    qualityCriteria: PR_HR_DEFAULTS.qualityCriteria,
    exportFormats: ['txt', 'pdf'],
  },
];

export const DELIVERABLE_CATEGORIES = [
  "Long-Form Content",
  "Social Media",
  "Advertising & Paid",
  "Email & Automation",
  "Website & Landing Pages",
  // 2026-05-19 — "Video & Audio" verwijderd; alle items in die categorie zijn
  // hidden tot post-launch (zie hidden-flags op explainer-video / promo-video /
  // testimonial-video / webinar-outline / podcast-outline). Categorie-string
  // blijft elders bestaan op de items zelf zodat re-enable enkel hidden→false
  // vereist.
  "Sales Enablement",
  "PR, HR & Communications",
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

// ─── Video-adjacent deliverable types ─────────────────────

/** Deliverable types that can generate a concept video from the script */
export const VIDEO_ADJACENT_TYPES = new Set([
  'tiktok-script',
  'video-script',
  'explainer-video-script',
  'brand-video-script',
  'radio-script',
  'podcast-ad-script',
  // 2026-05-19: LinkedIn Video Ad (paid) — split-out van linkedin-ad
  // video-ad subformat. Triggert dezelfde "Generate Video" flow.
  'linkedin-video-ad',
]);

/** Default video generation config per deliverable type */
export function getDefaultVideoConfig(typeId: string): {
  aspectRatio: string;
  duration: number;
  provider: string;
} {
  const isVertical = ['tiktok-script'].includes(typeId);
  // LinkedIn Video Ad: 16:9 landscape (LinkedIn's preferred ad-aspect),
  // 8-15s sweet-spot voor sponsored video (sweet-spot tussen attention
  // span en hook-development).
  if (typeId === 'linkedin-video-ad') {
    return { aspectRatio: '16:9', duration: 8, provider: 'kling-v3-pro' };
  }
  return {
    aspectRatio: isVertical ? '9:16' : '16:9',
    duration: typeId === 'tiktok-script' ? 6 : 8,
    provider: 'kling-v3-pro',
  };
}

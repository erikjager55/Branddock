// =============================================================
// Deliverable Type Settings — Dynamic settings field definitions
// for all 47 deliverable types across 8 categories.
//
// Each type gets 2-5 settings fields rendered by DynamicSettingsPanel.
// Common fields: tone (always), length (long-form).
// Type-specific fields: format, hashtags, duration, etc.
// =============================================================

export interface SettingsFieldOption {
  value: string;
  label: string;
}

export interface SettingsField {
  /** Unique key stored in settings record */
  key: string;
  /** Display label */
  label: string;
  /** Control type: pills = pill button row, select = dropdown, text = text input, toggle = on/off, number = stepper */
  type: 'pills' | 'select' | 'text' | 'toggle' | 'number';
  /** Options for pills/select */
  options?: SettingsFieldOption[];
  /** Default value */
  default: string | number | boolean;
  /** Placeholder for text inputs */
  placeholder?: string;
  /** Min value for number fields */
  min?: number;
  /** Max value for number fields */
  max?: number;
}

// ─── Shared Field Definitions ──────────────────────────────

const TONE_FIELD: SettingsField = {
  key: 'tone',
  label: 'Tone',
  type: 'pills',
  options: [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'bold', label: 'Bold' },
    { value: 'empathetic', label: 'Empathetic' },
  ],
  default: 'professional',
};

const LENGTH_FIELD: SettingsField = {
  key: 'length',
  label: 'Length',
  type: 'pills',
  options: [
    { value: 'short', label: 'Short' },
    { value: 'medium', label: 'Medium' },
    { value: 'long', label: 'Long' },
  ],
  default: 'medium',
};

const TARGET_AUDIENCE_FIELD: SettingsField = {
  key: 'targetAudience',
  label: 'Target Audience',
  type: 'text',
  default: '',
  placeholder: 'e.g., Marketing professionals',
};

const SEO_KEYWORD_FIELD: SettingsField = {
  key: 'seoKeyword',
  label: 'SEO Keyword',
  type: 'text',
  default: '',
  placeholder: 'e.g., brand strategy tips',
};

// ─── Settings per Deliverable Type ─────────────────────────

export const DELIVERABLE_TYPE_SETTINGS: Record<string, SettingsField[]> = {
  // ═══ Long-Form Content (7) ═══════════════════════════════
  'blog-post': [
    TARGET_AUDIENCE_FIELD,
    TONE_FIELD,
    LENGTH_FIELD,
    SEO_KEYWORD_FIELD,
    { key: 'includeMetaDescription', label: 'Include Meta Description', type: 'toggle', default: true },
  ],
  'pillar-page': [
    TARGET_AUDIENCE_FIELD,
    TONE_FIELD,
    LENGTH_FIELD,
    SEO_KEYWORD_FIELD,
    { key: 'includeTableOfContents', label: 'Include Table of Contents', type: 'toggle', default: true },
  ],
  'whitepaper': [
    TARGET_AUDIENCE_FIELD,
    TONE_FIELD,
    LENGTH_FIELD,
    { key: 'includeExecutiveSummary', label: 'Include Executive Summary', type: 'toggle', default: true },
  ],
  'case-study': [
    TARGET_AUDIENCE_FIELD,
    TONE_FIELD,
    LENGTH_FIELD,
    {
      key: 'caseStudyFormat',
      label: 'Format',
      type: 'pills',
      options: [
        { value: 'narrative', label: 'Narrative' },
        { value: 'problem-solution', label: 'Problem/Solution' },
        { value: 'metrics-focused', label: 'Metrics' },
      ],
      default: 'problem-solution',
    },
  ],
  'ebook': [
    TARGET_AUDIENCE_FIELD,
    TONE_FIELD,
    LENGTH_FIELD,
    { key: 'chapterCount', label: 'Chapters', type: 'number', default: 5, min: 3, max: 12 },
  ],
  'article': [
    TARGET_AUDIENCE_FIELD,
    TONE_FIELD,
    LENGTH_FIELD,
    SEO_KEYWORD_FIELD,
  ],
  'thought-leadership': [
    TARGET_AUDIENCE_FIELD,
    TONE_FIELD,
    LENGTH_FIELD,
    {
      key: 'perspective',
      label: 'Perspective',
      type: 'pills',
      options: [
        { value: 'first-person', label: 'First Person' },
        { value: 'third-person', label: 'Third Person' },
        { value: 'editorial', label: 'Editorial' },
      ],
      default: 'first-person',
    },
  ],

  // ═══ Social Media (7) ════════════════════════════════════
  'linkedin-post': [
    TONE_FIELD,
    {
      key: 'postFormat',
      label: 'Format',
      type: 'pills',
      options: [
        { value: 'story', label: 'Story' },
        { value: 'listicle', label: 'Listicle' },
        { value: 'opinion', label: 'Opinion' },
        { value: 'how-to', label: 'How-to' },
      ],
      default: 'story',
    },
    { key: 'includeHashtags', label: 'Include Hashtags', type: 'toggle', default: true },
  ],
  'linkedin-article': [
    TONE_FIELD,
    LENGTH_FIELD,
    SEO_KEYWORD_FIELD,
  ],
  'instagram-post': [
    TONE_FIELD,
    { key: 'hashtagCount', label: 'Hashtag Count', type: 'number', default: 15, min: 5, max: 30 },
    { key: 'includeEmoji', label: 'Include Emoji', type: 'toggle', default: true },
  ],
  'twitter-thread': [
    TONE_FIELD,
    { key: 'threadLength', label: 'Thread Length', type: 'number', default: 5, min: 3, max: 15 },
    {
      key: 'hookType',
      label: 'Hook Type',
      type: 'pills',
      options: [
        { value: 'question', label: 'Question' },
        { value: 'bold-claim', label: 'Bold Claim' },
        { value: 'statistic', label: 'Statistic' },
        { value: 'story', label: 'Story' },
      ],
      default: 'bold-claim',
    },
  ],
  'facebook-post': [
    TONE_FIELD,
    {
      key: 'postFormat',
      label: 'Format',
      type: 'pills',
      options: [
        { value: 'text-only', label: 'Text Only' },
        { value: 'link-share', label: 'Link Share' },
        { value: 'question', label: 'Question' },
        { value: 'story', label: 'Story' },
      ],
      default: 'text-only',
    },
  ],
  'tiktok-script': [
    TONE_FIELD,
    {
      key: 'duration',
      label: 'Duration',
      type: 'pills',
      options: [
        { value: '15s', label: '15s' },
        { value: '30s', label: '30s' },
        { value: '60s', label: '60s' },
      ],
      default: '30s',
    },
    {
      key: 'hookType',
      label: 'Hook Type',
      type: 'pills',
      options: [
        { value: 'question', label: 'Question' },
        { value: 'bold-claim', label: 'Bold Claim' },
        { value: 'pattern-interrupt', label: 'Pattern Interrupt' },
      ],
      default: 'pattern-interrupt',
    },
  ],
  'social-carousel': [
    TONE_FIELD,
    { key: 'slideCount', label: 'Slides', type: 'number', default: 5, min: 3, max: 10 },
    {
      key: 'carouselStyle',
      label: 'Style',
      type: 'pills',
      options: [
        { value: 'educational', label: 'Educational' },
        { value: 'storytelling', label: 'Storytelling' },
        { value: 'tips', label: 'Tips' },
      ],
      default: 'educational',
    },
  ],

  // ═══ Advertising & Paid (6) ══════════════════════════════
  'search-ad': [
    TONE_FIELD,
    { key: 'keywordFocus', label: 'Keyword Focus', type: 'text', default: '', placeholder: 'e.g., brand strategy software' },
    {
      key: 'platform',
      label: 'Platform',
      type: 'pills',
      options: [
        { value: 'google', label: 'Google' },
        { value: 'bing', label: 'Bing' },
        { value: 'both', label: 'Both' },
      ],
      default: 'google',
    },
  ],
  'social-ad': [
    TONE_FIELD,
    {
      key: 'platform',
      label: 'Platform',
      type: 'pills',
      options: [
        { value: 'meta', label: 'Meta' },
        { value: 'linkedin', label: 'LinkedIn' },
        { value: 'tiktok', label: 'TikTok' },
      ],
      default: 'meta',
    },
    {
      key: 'objective',
      label: 'Objective',
      type: 'pills',
      options: [
        { value: 'awareness', label: 'Awareness' },
        { value: 'traffic', label: 'Traffic' },
        { value: 'conversions', label: 'Conversions' },
      ],
      default: 'awareness',
    },
  ],
  'display-ad': [
    TONE_FIELD,
    {
      key: 'adFormat',
      label: 'Ad Format',
      type: 'pills',
      options: [
        { value: 'banner', label: 'Banner' },
        { value: 'skyscraper', label: 'Skyscraper' },
        { value: 'rectangle', label: 'Rectangle' },
      ],
      default: 'banner',
    },
    { key: 'includeCreativeBrief', label: 'Include Creative Brief', type: 'toggle', default: true },
  ],
  'retargeting-ad': [
    TONE_FIELD,
    {
      key: 'segment',
      label: 'Audience Segment',
      type: 'pills',
      options: [
        { value: 'cart-abandoners', label: 'Cart Abandoners' },
        { value: 'page-visitors', label: 'Page Visitors' },
        { value: 'past-customers', label: 'Past Customers' },
      ],
      default: 'page-visitors',
    },
    {
      key: 'urgencyLevel',
      label: 'Urgency',
      type: 'pills',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ],
      default: 'medium',
    },
  ],
  'video-ad': [
    TONE_FIELD,
    {
      key: 'duration',
      label: 'Duration',
      type: 'pills',
      options: [
        { value: '6s', label: '6s' },
        { value: '15s', label: '15s' },
        { value: '30s', label: '30s' },
      ],
      default: '15s',
    },
    {
      key: 'platform',
      label: 'Platform',
      type: 'pills',
      options: [
        { value: 'youtube', label: 'YouTube' },
        { value: 'social', label: 'Social' },
        { value: 'ctv', label: 'CTV' },
      ],
      default: 'youtube',
    },
  ],
  'native-ad': [
    TONE_FIELD,
    LENGTH_FIELD,
    {
      key: 'disclosureStyle',
      label: 'Disclosure',
      type: 'pills',
      options: [
        { value: 'subtle', label: 'Subtle' },
        { value: 'clear', label: 'Clear' },
        { value: 'prominent', label: 'Prominent' },
      ],
      default: 'clear',
    },
  ],

  // ═══ Email & Automation (5) ══════════════════════════════
  'newsletter': [
    TONE_FIELD,
    LENGTH_FIELD,
    { key: 'sectionCount', label: 'Sections', type: 'number', default: 3, min: 2, max: 8 },
  ],
  'welcome-sequence': [
    TONE_FIELD,
    { key: 'emailCount', label: 'Emails in Sequence', type: 'number', default: 4, min: 3, max: 7 },
  ],
  'promotional-email': [
    TONE_FIELD,
    {
      key: 'urgency',
      label: 'Urgency',
      type: 'pills',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ],
      default: 'medium',
    },
    { key: 'includeCountdown', label: 'Include Countdown', type: 'toggle', default: false },
  ],
  'nurture-sequence': [
    TONE_FIELD,
    { key: 'emailCount', label: 'Emails in Sequence', type: 'number', default: 5, min: 3, max: 10 },
    { key: 'dripInterval', label: 'Interval (days)', type: 'number', default: 3, min: 1, max: 14 },
  ],
  're-engagement-email': [
    TONE_FIELD,
    {
      key: 'reEngagementStyle',
      label: 'Style',
      type: 'pills',
      options: [
        { value: 'we-miss-you', label: 'We Miss You' },
        { value: 'whats-new', label: "What's New" },
        { value: 'exclusive-offer', label: 'Exclusive Offer' },
      ],
      default: 'we-miss-you',
    },
  ],

  // ═══ Website & Landing Pages (5) ═════════════════════════
  'landing-page': [
    TONE_FIELD,
    {
      key: 'pageGoal',
      label: 'Page Goal',
      type: 'pills',
      options: [
        { value: 'lead-gen', label: 'Lead Gen' },
        { value: 'signup', label: 'Sign Up' },
        { value: 'purchase', label: 'Purchase' },
        { value: 'download', label: 'Download' },
      ],
      default: 'lead-gen',
    },
    {
      key: 'pageLength',
      label: 'Page Length',
      type: 'pills',
      options: [
        { value: 'short', label: 'Short (1 screen)' },
        { value: 'medium', label: 'Medium' },
        { value: 'long', label: 'Long (scroll)' },
      ],
      default: 'medium',
    },
  ],
  'product-page': [
    TONE_FIELD,
    { key: 'includeSpecs', label: 'Include Specifications', type: 'toggle', default: true },
    { key: 'includePricing', label: 'Include Pricing Section', type: 'toggle', default: false },
  ],
  'faq-page': [
    TONE_FIELD,
    { key: 'questionCount', label: 'Questions', type: 'number', default: 10, min: 5, max: 25 },
    { key: 'includeSeoSchema', label: 'Include FAQ Schema', type: 'toggle', default: true },
  ],
  'comparison-page': [
    TONE_FIELD,
    {
      key: 'comparisonStyle',
      label: 'Style',
      type: 'pills',
      options: [
        { value: 'feature-matrix', label: 'Feature Matrix' },
        { value: 'narrative', label: 'Narrative' },
        { value: 'side-by-side', label: 'Side-by-Side' },
      ],
      default: 'feature-matrix',
    },
    { key: 'competitorCount', label: 'Competitors', type: 'number', default: 3, min: 1, max: 5 },
  ],
  'microsite': [
    TONE_FIELD,
    LENGTH_FIELD,
    { key: 'pageCount', label: 'Pages', type: 'number', default: 3, min: 2, max: 8 },
  ],

  // ═══ Video & Audio (5) ═══════════════════════════════════
  'explainer-video': [
    TONE_FIELD,
    {
      key: 'duration',
      label: 'Duration',
      type: 'pills',
      options: [
        { value: '60s', label: '60s' },
        { value: '90s', label: '90s' },
        { value: '120s', label: '120s' },
      ],
      default: '120s',
    },
    {
      key: 'visualStyle',
      label: 'Visual Style',
      type: 'pills',
      options: [
        { value: 'animation', label: 'Animation' },
        { value: 'live-action', label: 'Live Action' },
        { value: 'screencast', label: 'Screencast' },
      ],
      default: 'animation',
    },
  ],
  'testimonial-video': [
    TONE_FIELD,
    { key: 'questionCount', label: 'Interview Questions', type: 'number', default: 8, min: 5, max: 15 },
    { key: 'includesShotList', label: 'Include Shot List', type: 'toggle', default: true },
  ],
  'promo-video': [
    TONE_FIELD,
    {
      key: 'duration',
      label: 'Duration',
      type: 'pills',
      options: [
        { value: '15s', label: '15s' },
        { value: '30s', label: '30s' },
        { value: '60s', label: '60s' },
      ],
      default: '60s',
    },
    { key: 'includeMusicDirection', label: 'Include Music Direction', type: 'toggle', default: true },
  ],
  'webinar-outline': [
    TONE_FIELD,
    {
      key: 'webinarDuration',
      label: 'Duration',
      type: 'pills',
      options: [
        { value: '30min', label: '30 min' },
        { value: '45min', label: '45 min' },
        { value: '60min', label: '60 min' },
      ],
      default: '45min',
    },
    { key: 'includePolls', label: 'Include Poll Questions', type: 'toggle', default: true },
  ],
  'podcast-outline': [
    TONE_FIELD,
    {
      key: 'podcastFormat',
      label: 'Format',
      type: 'pills',
      options: [
        { value: 'solo', label: 'Solo' },
        { value: 'interview', label: 'Interview' },
        { value: 'panel', label: 'Panel' },
      ],
      default: 'solo',
    },
    { key: 'includeSocialClips', label: 'Include Social Clip Suggestions', type: 'toggle', default: true },
  ],

  // ═══ Sales Enablement (4) ════════════════════════════════
  'sales-deck': [
    TONE_FIELD,
    { key: 'slideCount', label: 'Slides', type: 'number', default: 11, min: 8, max: 20 },
    {
      key: 'presentationStyle',
      label: 'Style',
      type: 'pills',
      options: [
        { value: 'consultative', label: 'Consultative' },
        { value: 'demo-driven', label: 'Demo-Driven' },
        { value: 'roi-focused', label: 'ROI-Focused' },
      ],
      default: 'consultative',
    },
  ],
  'one-pager': [
    TONE_FIELD,
    {
      key: 'focus',
      label: 'Focus',
      type: 'pills',
      options: [
        { value: 'product', label: 'Product' },
        { value: 'competitive', label: 'Competitive' },
        { value: 'solution', label: 'Solution' },
      ],
      default: 'product',
    },
  ],
  'proposal-template': [
    TONE_FIELD,
    {
      key: 'formalLevel',
      label: 'Formality',
      type: 'pills',
      options: [
        { value: 'formal', label: 'Formal' },
        { value: 'conversational', label: 'Conversational' },
      ],
      default: 'formal',
    },
    { key: 'includePricing', label: 'Include Pricing Section', type: 'toggle', default: true },
  ],
  'product-description': [
    TONE_FIELD,
    LENGTH_FIELD,
    { key: 'includeSeo', label: 'Include SEO Metadata', type: 'toggle', default: true },
  ],

  // ═══ PR, HR & Communications (8) ═════════════════════════
  'press-release': [
    TONE_FIELD,
    {
      key: 'announcementType',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'product-launch', label: 'Product Launch' },
        { value: 'partnership', label: 'Partnership' },
        { value: 'milestone', label: 'Milestone' },
        { value: 'executive', label: 'Executive News' },
        { value: 'event', label: 'Event' },
      ],
      default: 'product-launch',
    },
  ],
  'media-pitch': [
    TONE_FIELD,
    {
      key: 'pitchType',
      label: 'Pitch Type',
      type: 'pills',
      options: [
        { value: 'exclusive', label: 'Exclusive' },
        { value: 'trend-hook', label: 'Trend Hook' },
        { value: 'data-angle', label: 'Data Angle' },
      ],
      default: 'exclusive',
    },
  ],
  'internal-comms': [
    TONE_FIELD,
    {
      key: 'audience',
      label: 'Audience',
      type: 'pills',
      options: [
        { value: 'all-hands', label: 'All Hands' },
        { value: 'leadership', label: 'Leadership' },
        { value: 'team', label: 'Team' },
      ],
      default: 'all-hands',
    },
    { key: 'includeFaq', label: 'Include FAQ', type: 'toggle', default: true },
  ],
  'career-page': [
    TONE_FIELD,
    { key: 'includeTestimonials', label: 'Include Testimonials', type: 'toggle', default: true },
    { key: 'includeDei', label: 'Include DEI Statement', type: 'toggle', default: true },
  ],
  'job-ad-copy': [
    TONE_FIELD,
    {
      key: 'seniority',
      label: 'Seniority',
      type: 'pills',
      options: [
        { value: 'entry', label: 'Entry' },
        { value: 'mid', label: 'Mid' },
        { value: 'senior', label: 'Senior' },
        { value: 'executive', label: 'Executive' },
      ],
      default: 'mid',
    },
  ],
  'employee-story': [
    TONE_FIELD,
    LENGTH_FIELD,
  ],
  'employer-brand-video': [
    TONE_FIELD,
    {
      key: 'duration',
      label: 'Duration',
      type: 'pills',
      options: [
        { value: '60s', label: '60s' },
        { value: '90s', label: '90s' },
      ],
      default: '90s',
    },
  ],
  'impact-report': [
    TONE_FIELD,
    LENGTH_FIELD,
    { key: 'includeDataViz', label: 'Include Data Visualization Suggestions', type: 'toggle', default: true },
  ],
};

/**
 * Get settings field definitions for a deliverable type.
 * Falls back to basic tone + length fields if type is not found.
 */
export function getSettingsForType(typeId: string): SettingsField[] {
  return DELIVERABLE_TYPE_SETTINGS[typeId] || [TONE_FIELD, LENGTH_FIELD];
}

/**
 * Resolve a contentType (display name like "Blog Post" or slug like "blog-post")
 * to a deliverable type ID (slug). Returns the input unchanged if already a valid slug.
 */
export function resolveDeliverableTypeId(contentType: string): string {
  // Check if the contentType is already a known settings key
  if (DELIVERABLE_TYPE_SETTINGS[contentType]) return contentType;

  // Try matching by slugifying the display name
  const slugified = contentType.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (DELIVERABLE_TYPE_SETTINGS[slugified]) return slugified;

  return slugified;
}

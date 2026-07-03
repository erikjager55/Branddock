// Canonical (source-of-truth) English UI strings — `campaigns-content-types` namespace.
//
// Render-edge catalog for the DATA-DRIVEN content-type registries in
// `src/features/campaigns/lib/deliverable-types.ts` (DELIVERABLE_TYPES,
// MODALITY_LABELS, DELIVERABLE_CATEGORIES) + the `format-content-type.ts`
// slug humanizer. The registries stay UNCHANGED (English source-of-truth);
// these keys are looked up at each render site via
// `t('campaigns-content-types:types.<id>', { defaultValue })`.
// `types` is keyed on the deliverable-type stable `id`/slug; `<id>Desc` is
// its description sibling. `categories` is keyed on the stable category
// string. `modality` is keyed on the RecommendedModality value.
const ns = {
  types: {
    // ─── Long-Form Content ───────────────────────────────
    'blog-post': 'Blog Post',
    'blog-postDesc': 'SEO-optimized blog article with keyword targeting',
    'pillar-page': 'Pillar Page',
    'pillar-pageDesc': 'Comprehensive topic hub page (2000+ words)',
    'whitepaper': 'Whitepaper',
    'whitepaperDesc': 'Research-backed thought leadership document',
    'case-study': 'Case Study',
    'case-studyDesc': 'Customer success story with metrics and quotes',
    'ebook': 'E-book',
    'ebookDesc': 'Multi-chapter downloadable guide (lead magnet)',
    'article': 'Feature Article',
    'articleDesc': 'In-depth journalistic-style feature piece',
    'thought-leadership': 'Thought Leadership',
    'thought-leadershipDesc': 'Executive-bylined opinion or industry analysis',
    'linkedin-article': 'LinkedIn Article',
    'linkedin-articleDesc': 'Long-form LinkedIn native article (1000-2000 words)',

    // ─── Social Media ────────────────────────────────────
    'linkedin-post': 'LinkedIn Post',
    'linkedin-postDesc': 'Professional network post with text and image',
    'linkedin-carousel': 'LinkedIn Carousel',
    'linkedin-carouselDesc': 'Multi-slide educational or storytelling carousel for LinkedIn',
    'linkedin-video-ad': 'LinkedIn Video Ad',
    'linkedin-video-adDesc': 'Paid LinkedIn video ad with script + thumbnail + ad-copy. Generates actual video via fal.ai providers.',
    'linkedin-newsletter': 'LinkedIn Newsletter',
    'linkedin-newsletterDesc': 'Recurring LinkedIn newsletter edition for subscriber base',
    'linkedin-video': 'LinkedIn Video Script',
    'linkedin-videoDesc': 'Script for native LinkedIn video (30s-5min)',
    'linkedin-event': 'LinkedIn Event Post',
    'linkedin-eventDesc': 'Event promotion post with details and registration CTA',
    'linkedin-poll': 'LinkedIn Poll',
    'linkedin-pollDesc': 'Engaging poll with context text to drive discussion',
    'instagram-post': 'Instagram Post',
    'instagram-postDesc': 'Visual-first post with caption and hashtags',
    'twitter-thread': 'X / Twitter Thread',
    'twitter-threadDesc': 'Multi-tweet narrative thread',
    'facebook-post': 'Facebook Post',
    'facebook-postDesc': 'Engaging social media post for Facebook/Meta',
    'tiktok-script': 'TikTok / Reels Script',
    'tiktok-scriptDesc': 'Short-form video script (15-60s) with hook and CTA',
    'social-carousel': 'Social Carousel',
    'social-carouselDesc': 'Multi-slide educational or storytelling carousel',

    // ─── Advertising & Paid ──────────────────────────────
    'linkedin-ad': 'LinkedIn Sponsored Post',
    'linkedin-adDesc': 'Paid LinkedIn ad (Single Image or Message Ad)',
    'facebook-ad': 'Facebook Sponsored Post',
    'facebook-adDesc': 'Paid Meta link-card ad (Facebook + Instagram feed)',
    'search-ad': 'Search Ad',
    'search-adDesc': 'Google/Bing responsive search ad copy',
    'social-ad': 'Social Ad',
    'social-adDesc': 'Paid social ad copy (Meta, LinkedIn, TikTok)',
    'display-ad': 'Display Ad',
    'display-adDesc': 'Banner/display ad copy and creative brief',
    'retargeting-ad': 'Retargeting Ad',
    'retargeting-adDesc': 'Remarketing ad for previous visitors/engagers',
    'video-ad': 'Video Ad Script',
    'video-adDesc': 'Script for pre-roll, in-feed, or CTV ad (15-30s)',
    'native-ad': 'Native Ad / Sponsored',
    'native-adDesc': 'Sponsored article or in-feed native placement brief',

    // ─── Email & Automation ──────────────────────────────
    'newsletter': 'Newsletter',
    'newsletterDesc': 'Regular email newsletter to subscribers',
    'welcome-sequence': 'Welcome Sequence',
    'welcome-sequenceDesc': 'Multi-email onboarding series (3-5 emails)',
    'promotional-email': 'Promotional Email',
    'promotional-emailDesc': 'Campaign or offer announcement email',
    'nurture-sequence': 'Nurture Sequence',
    'nurture-sequenceDesc': 'Lead nurturing drip campaign (5-7 emails)',
    're-engagement-email': 'Re-engagement Email',
    're-engagement-emailDesc': 'Win-back email for inactive subscribers',

    // ─── Website & Landing Pages ─────────────────────────
    'landing-page': 'Landing Page',
    'landing-pageDesc': 'Conversion-focused page with hero, benefits, CTA',
    'product-page': 'Product / Service Page',
    'product-pageDesc': 'Feature/benefit copy for a product or service',
    'faq-page': 'FAQ Page',
    'faq-pageDesc': 'Frequently asked questions with SEO answers',
    'comparison-page': 'Comparison Page',
    'comparison-pageDesc': 'Us vs. them or feature comparison matrix copy',
    'microsite': 'Campaign Microsite',
    'micrositeDesc': 'Dedicated multi-page campaign site brief and copy',

    // ─── Video & Audio ───────────────────────────────────
    'explainer-video': 'Explainer Video Script',
    'explainer-videoDesc': 'Product/service explainer script (60-120s)',
    'testimonial-video': 'Testimonial Video Brief',
    'testimonial-videoDesc': 'Customer testimonial interview guide and script',
    'promo-video': 'Promo Video Script',
    'promo-videoDesc': 'Promotional campaign video script (15-60s)',
    'webinar-outline': 'Webinar / Live Session',
    'webinar-outlineDesc': 'Slide-by-slide outline with talking points',
    'podcast-outline': 'Podcast Episode Outline',
    'podcast-outlineDesc': 'Episode structure, questions, key points, show notes',

    // ─── Sales Enablement ────────────────────────────────
    'sales-deck': 'Sales Deck',
    'sales-deckDesc': 'Presentation outline for sales conversations',
    'one-pager': 'One-Pager / Battle Card',
    'one-pagerDesc': 'Single-page product or competitive overview',
    'proposal-template': 'Proposal Template',
    'proposal-templateDesc': 'Customizable proposal structure with key messaging',
    'product-description': 'Product Description',
    'product-descriptionDesc': 'Concise product copy for catalogs or marketplace',

    // ─── PR, HR & Communications ─────────────────────────
    'press-release': 'Press Release',
    'press-releaseDesc': 'Official media announcement with boilerplate',
    'media-pitch': 'Media Pitch',
    'media-pitchDesc': 'Personalized journalist/editor pitch email',
    'internal-comms': 'Internal Communication',
    'internal-commsDesc': 'Employee-facing announcement or update',
    'career-page': 'Career Page',
    'career-pageDesc': 'Employer branding landing page for talent attraction',
    'job-ad-copy': 'Job Advertisement',
    'job-ad-copyDesc': 'Compelling job ad copy with employer brand messaging',
    'employee-story': 'Employee Story',
    'employee-storyDesc': 'Employee testimonial or day-in-the-life story',
    'employer-brand-video': 'Employer Branding Video',
    'employer-brand-videoDesc': 'Script for recruitment or culture video (60-120s)',
    'impact-report': 'Impact Report',
    'impact-reportDesc': 'CSR or social impact report for stakeholders',
  },

  categories: {
    'Long-Form Content': 'Long-Form Content',
    'Social Media': 'Social Media',
    'Advertising & Paid': 'Advertising & Paid',
    'Email & Automation': 'Email & Automation',
    'Website & Landing Pages': 'Website & Landing Pages',
    'Video & Audio': 'Video & Audio',
    'Sales Enablement': 'Sales Enablement',
    'PR, HR & Communications': 'PR, HR & Communications',
  },

  modality: {
    photo: 'Photography',
    photoDesc: 'Realistic photo (lifestyle, product shot, behind-the-scenes). Best for tangible brand experience.',
    illustration: 'Illustration',
    illustrationDesc: 'Digital illustration or vector art. Best for concepts, metaphors, abstract ideas.',
    infographic: 'Infographic',
    infographicDesc: 'Data visualization, charts, diagrams. Best for numbers and explaining complex ideas.',
    ugc: 'UGC-style',
    ugcDesc: 'Authentic, low-fi user-generated-content look. Best for TikTok, testimonials, social proof.',
    none: 'No visual',
    noneDesc: 'This content type works without an image (pure-text formats such as scripts, briefs, search ads).',
  },
} as const;

export default ns;

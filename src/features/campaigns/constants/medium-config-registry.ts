// =============================================================
// Medium Config Registry — category detection + field definitions for 7 categories
// =============================================================

import type { MediumCategory, MediumCategoryConfig } from '../types/medium-config.types';

// ─── Platform + Format → Category mapping ────────────────────
const PLATFORM_FORMAT_TO_CATEGORY: Record<string, Record<string, MediumCategory>> = {
  linkedin: {
    'organic-post': 'social-post',
    ad: 'advertising',
    carousel: 'carousel',
  },
  instagram: {
    'feed-post': 'social-post',
    carousel: 'carousel',
  },
  facebook: {
    'organic-post': 'social-post',
  },
  email: {
    newsletter: 'email',
    promotional: 'email',
  },
  tiktok: {
    video: 'video',
    story: 'video',
  },
  youtube: {
    short: 'video',
    video: 'video',
  },
  video: {
    script: 'video',
    storyboard: 'video',
  },
  podcast: {
    episode: 'podcast',
    'show-notes': 'podcast',
  },
  web: {
    'landing-page': 'web-page',
    'blog-article': 'web-page',
  },
};

/** Detect medium category from platform + format */
export function detectMediumCategory(
  platform: string | null,
  format: string | null,
): MediumCategory {
  if (!platform || !format) return 'social-post';
  return PLATFORM_FORMAT_TO_CATEGORY[platform]?.[format] ?? 'social-post';
}

// ─── Category Configs (registry-driven) ──────────────────────
export const MEDIUM_CATEGORY_CONFIGS: Record<MediumCategory, MediumCategoryConfig> = {
  'social-post': {
    category: 'social-post',
    label: 'Social Post',
    sections: [
      {
        id: 'content-style',
        title: 'Content Style',
        fields: [
          {
            key: 'tone',
            label: 'Tone of Voice',
            type: 'select',
            options: [
              { value: 'professional', label: 'Professional' },
              { value: 'casual', label: 'Casual' },
              { value: 'inspirational', label: 'Inspirational' },
              { value: 'educational', label: 'Educational' },
              { value: 'humorous', label: 'Humorous' },
            ],
            defaultValue: 'professional',
          },
          {
            key: 'visualStyle',
            label: 'Visual Style',
            type: 'button-group',
            options: [
              { value: 'photo', label: 'Photo' },
              { value: 'illustration', label: 'Illustration' },
              { value: 'text-only', label: 'Text Only' },
              { value: 'infographic', label: 'Infographic' },
            ],
            defaultValue: 'photo',
            columns: 4,
          },
        ],
      },
      {
        id: 'engagement',
        title: 'Engagement',
        fields: [
          {
            key: 'hashtagStrategy',
            label: 'Hashtag Strategy',
            type: 'select',
            options: [
              { value: 'trending', label: 'Trending', description: 'Use trending hashtags for reach' },
              { value: 'niche', label: 'Niche', description: 'Target specific community' },
              { value: 'branded', label: 'Branded', description: 'Use brand-specific hashtags' },
              { value: 'mixed', label: 'Mixed', description: 'Combination approach' },
            ],
            defaultValue: 'mixed',
          },
          {
            key: 'ctaStyle',
            label: 'Call to Action',
            type: 'button-group',
            options: [
              { value: 'subtle', label: 'Subtle' },
              { value: 'direct', label: 'Direct' },
              { value: 'question', label: 'Question' },
              { value: 'none', label: 'None' },
            ],
            defaultValue: 'direct',
            columns: 4,
          },
          {
            key: 'includeEmoji',
            label: 'Include Emojis',
            type: 'toggle',
            defaultValue: true,
          },
        ],
      },
    ],
  },

  carousel: {
    category: 'carousel',
    label: 'Carousel',
    sections: [
      {
        id: 'structure',
        title: 'Carousel Structure',
        fields: [
          {
            key: 'slideCount',
            label: 'Number of Slides',
            type: 'slider',
            min: 3,
            max: 10,
            step: 1,
            defaultValue: 5,
          },
          {
            key: 'slideFormat',
            label: 'Slide Format',
            type: 'button-group',
            options: [
              { value: 'square', label: '1:1' },
              { value: 'portrait', label: '4:5' },
              { value: 'landscape', label: '16:9' },
            ],
            defaultValue: 'square',
            columns: 3,
          },
        ],
      },
      {
        id: 'visual-style',
        title: 'Visual Style',
        fields: [
          {
            key: 'visualStyle',
            label: 'Visual Theme',
            type: 'select',
            options: [
              { value: 'clean-minimal', label: 'Clean & Minimal' },
              { value: 'bold-colorful', label: 'Bold & Colorful' },
              { value: 'photo-centric', label: 'Photo-Centric' },
              { value: 'data-driven', label: 'Data-Driven' },
            ],
            defaultValue: 'clean-minimal',
          },
          {
            key: 'transitionStyle',
            label: 'Transition Style',
            type: 'button-group',
            options: [
              { value: 'continuous', label: 'Continuous', description: 'Content flows across slides' },
              { value: 'standalone', label: 'Standalone', description: 'Each slide is independent' },
              { value: 'story-arc', label: 'Story Arc', description: 'Build toward a conclusion' },
            ],
            defaultValue: 'story-arc',
            columns: 3,
          },
          {
            key: 'includeCtaSlide',
            label: 'Include CTA Slide',
            type: 'toggle',
            defaultValue: true,
          },
        ],
      },
    ],
  },

  email: {
    category: 'email',
    label: 'Email',
    sections: [
      {
        id: 'template',
        title: 'Template',
        fields: [
          {
            key: 'templateStyle',
            label: 'Template Style',
            type: 'button-group',
            options: [
              { value: 'minimal', label: 'Minimal' },
              { value: 'editorial', label: 'Editorial' },
              { value: 'promotional', label: 'Promotional' },
              { value: 'newsletter', label: 'Newsletter' },
            ],
            defaultValue: 'minimal',
            columns: 4,
          },
          {
            key: 'headerType',
            label: 'Header Type',
            type: 'select',
            options: [
              { value: 'hero-image', label: 'Hero Image' },
              { value: 'logo-only', label: 'Logo Only' },
              { value: 'text-header', label: 'Text Header' },
              { value: 'gradient', label: 'Gradient Banner' },
            ],
            defaultValue: 'hero-image',
          },
        ],
      },
      {
        id: 'content-settings',
        title: 'Content Settings',
        fields: [
          {
            key: 'ctaPlacement',
            label: 'CTA Placement',
            type: 'select',
            options: [
              { value: 'above-fold', label: 'Above the Fold' },
              { value: 'bottom', label: 'Bottom' },
              { value: 'multiple', label: 'Multiple CTAs' },
              { value: 'inline', label: 'Inline' },
            ],
            defaultValue: 'above-fold',
          },
          {
            key: 'previewTextLength',
            label: 'Preview Text Length',
            type: 'slider',
            min: 30,
            max: 150,
            step: 10,
            defaultValue: 90,
            helpText: 'Characters visible in email client preview',
          },
          {
            key: 'personalize',
            label: 'Personalization',
            type: 'toggle',
            defaultValue: true,
            helpText: 'Use recipient name and dynamic content',
          },
        ],
      },
    ],
  },

  'web-page': {
    category: 'web-page',
    label: 'Web Page',
    sections: [
      {
        id: 'layout',
        title: 'Page Layout',
        fields: [
          {
            key: 'pageLayout',
            label: 'Layout Type',
            type: 'button-group',
            options: [
              { value: 'single-column', label: 'Single Column' },
              { value: 'two-column', label: 'Two Column' },
              { value: 'magazine', label: 'Magazine' },
            ],
            defaultValue: 'single-column',
            columns: 3,
          },
          {
            key: 'heroStyle',
            label: 'Hero Section',
            type: 'select',
            options: [
              { value: 'full-bleed-image', label: 'Full Bleed Image' },
              { value: 'split-content', label: 'Split Content/Image' },
              { value: 'video-hero', label: 'Video Hero' },
              { value: 'text-only', label: 'Text Only' },
              { value: 'animated', label: 'Animated' },
            ],
            defaultValue: 'split-content',
          },
        ],
      },
      {
        id: 'sections',
        title: 'Content Sections',
        fields: [
          {
            key: 'sectionCount',
            label: 'Number of Sections',
            type: 'slider',
            min: 3,
            max: 12,
            step: 1,
            defaultValue: 6,
          },
          {
            key: 'ctaType',
            label: 'Primary CTA',
            type: 'select',
            options: [
              { value: 'button', label: 'Button' },
              { value: 'form', label: 'Form / Sign-up' },
              { value: 'calendar', label: 'Book a Demo' },
              { value: 'download', label: 'Download' },
            ],
            defaultValue: 'button',
          },
          {
            key: 'seoFocus',
            label: 'SEO Focus',
            type: 'toggle',
            defaultValue: true,
            helpText: 'Optimize headings and meta for search engines',
          },
        ],
      },
    ],
  },

  podcast: {
    category: 'podcast',
    label: 'Podcast',
    sections: [
      {
        id: 'episode-format',
        title: 'Episode Format',
        fields: [
          {
            key: 'episodeFormat',
            label: 'Format',
            type: 'button-group',
            options: [
              { value: 'solo', label: 'Solo' },
              { value: 'interview', label: 'Interview' },
              { value: 'panel', label: 'Panel' },
              { value: 'narrative', label: 'Narrative' },
            ],
            defaultValue: 'solo',
            columns: 4,
          },
          {
            key: 'duration',
            label: 'Target Duration (min)',
            type: 'slider',
            min: 5,
            max: 120,
            step: 5,
            defaultValue: 30,
          },
          {
            key: 'segmentCount',
            label: 'Segments',
            type: 'slider',
            min: 1,
            max: 8,
            step: 1,
            defaultValue: 3,
          },
        ],
      },
      {
        id: 'production',
        title: 'Production Style',
        fields: [
          {
            key: 'introStyle',
            label: 'Intro Style',
            type: 'select',
            options: [
              { value: 'cold-open', label: 'Cold Open', description: 'Jump straight into content' },
              { value: 'teaser', label: 'Teaser', description: 'Preview key takeaways' },
              { value: 'music-intro', label: 'Music Intro', description: 'Theme music + host intro' },
            ],
            defaultValue: 'teaser',
          },
          {
            key: 'includeShowNotes',
            label: 'Generate Show Notes',
            type: 'toggle',
            defaultValue: true,
          },
          {
            key: 'includeTranscript',
            label: 'Generate Transcript',
            type: 'toggle',
            defaultValue: false,
          },
        ],
      },
    ],
  },

  advertising: {
    category: 'advertising',
    label: 'Advertising',
    sections: [
      {
        id: 'ad-format',
        title: 'Ad Format',
        fields: [
          {
            key: 'adFormat',
            label: 'Format',
            type: 'button-group',
            options: [
              { value: 'single-image', label: 'Single Image' },
              { value: 'carousel-ad', label: 'Carousel' },
              { value: 'video-ad', label: 'Video' },
              { value: 'text-ad', label: 'Text Only' },
            ],
            defaultValue: 'single-image',
            columns: 4,
          },
          {
            key: 'visualStyle',
            label: 'Visual Style',
            type: 'select',
            options: [
              { value: 'product-focused', label: 'Product Focused' },
              { value: 'lifestyle', label: 'Lifestyle' },
              { value: 'testimonial', label: 'Testimonial' },
              { value: 'data-stat', label: 'Data / Statistic' },
            ],
            defaultValue: 'product-focused',
          },
        ],
      },
      {
        id: 'messaging',
        title: 'Messaging',
        fields: [
          {
            key: 'ctaType',
            label: 'CTA Type',
            type: 'button-group',
            options: [
              { value: 'learn-more', label: 'Learn More' },
              { value: 'sign-up', label: 'Sign Up' },
              { value: 'shop-now', label: 'Shop Now' },
              { value: 'contact-us', label: 'Contact Us' },
            ],
            defaultValue: 'learn-more',
            columns: 4,
          },
          {
            key: 'urgencyLevel',
            label: 'Urgency Level',
            type: 'slider',
            min: 1,
            max: 5,
            step: 1,
            defaultValue: 2,
            helpText: '1 = Evergreen, 5 = High urgency',
          },
          {
            key: 'socialProof',
            label: 'Include Social Proof',
            type: 'toggle',
            defaultValue: false,
            helpText: 'Add testimonial or stat to ad copy',
          },
        ],
      },
    ],
  },

  video: {
    category: 'video',
    label: 'Video',
    sections: [
      {
        id: 'specifications',
        title: 'Video Specifications',
        fields: [
          {
            key: 'duration',
            label: 'Duration',
            type: 'button-group',
            options: [
              { value: '15s', label: '15s' },
              { value: '30s', label: '30s' },
              { value: '60s', label: '60s' },
            ],
            defaultValue: '30s',
            columns: 3,
          },
          {
            key: 'aspectRatio',
            label: 'Aspect Ratio',
            type: 'select',
            options: [
              { value: '9:16', label: '9:16 (Vertical)' },
              { value: '16:9', label: '16:9 (Landscape)' },
              { value: '1:1', label: '1:1 (Square)' },
              { value: '4:5', label: '4:5 (Portrait)' },
            ],
            defaultValue: '9:16',
          },
          {
            key: 'quality',
            label: 'Quality',
            type: 'select',
            options: [
              { value: '720p', label: '720p' },
              { value: '1080p', label: '1080p' },
              { value: '4k', label: '4K' },
            ],
            defaultValue: '1080p',
          },
        ],
      },
      {
        id: 'visual-style',
        title: 'Visual Style',
        fields: [
          {
            key: 'footageType',
            label: 'Footage Type',
            type: 'select',
            options: [
              { value: 'real-person', label: 'Real Person' },
              { value: 'stock', label: 'Stock Footage' },
              { value: 'animation', label: 'Animation' },
              { value: 'mixed', label: 'Mixed' },
            ],
            defaultValue: 'mixed',
          },
          {
            key: 'textOverlay',
            label: 'Text Overlay',
            type: 'select',
            options: [
              { value: 'bold-headlines', label: 'Bold Headlines' },
              { value: 'minimal', label: 'Minimal' },
              { value: 'dynamic-captions', label: 'Dynamic Captions' },
            ],
            defaultValue: 'bold-headlines',
          },
          {
            key: 'colorGrade',
            label: 'Color Grading',
            type: 'color-grid',
            options: [
              { value: 'warm', label: 'Warm' },
              { value: 'cool', label: 'Cool' },
              { value: 'vibrant', label: 'Vibrant' },
              { value: 'natural', label: 'Natural' },
            ],
            defaultValue: 'natural',
            columns: 4,
          },
        ],
      },
    ],
  },
};

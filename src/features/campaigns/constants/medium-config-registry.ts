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
    'blog-article': 'long-form',   // blog / article / whitepaper / case-study / ebook / thought-leadership
  },
  sales: {
    'one-pager': 'sales',
    'sales-deck': 'sales',
    'proposal': 'sales',
    'product-description': 'sales',
  },
  pr: {
    'press-release': 'pr-hr',
    'media-pitch': 'pr-hr',
    'internal-comms': 'pr-hr',
    'career-page': 'pr-hr',
    'job-ad': 'pr-hr',
    'employee-story': 'pr-hr',
    'impact-report': 'pr-hr',
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
// All content-styling fields (tone, structure, FAQ toggles, etc.) migrated
// to content-type-inputs.ts on 2026-04-27 (TODO 9.0c). Step 3 Medium retains
// only platform-rendering knobs that affect *how* the content is presented,
// not what's in it.
export const MEDIUM_CATEGORY_CONFIGS: Record<MediumCategory, MediumCategoryConfig> = {
  'long-form': {
    category: 'long-form',
    label: 'Long-form Content',
    sections: [],
  },

  sales: {
    category: 'sales',
    label: 'Sales Enablement',
    sections: [],
  },

  'pr-hr': {
    category: 'pr-hr',
    label: 'PR, HR & Comms',
    sections: [],
  },

  // Social-post category — content-styling fields (tone, visualStyle,
  // hashtagStrategy, ctaStyle, includeEmoji) migrated to content-type-inputs
  // (Step 1 Content Brief) on 2026-04-27. Step 3 Medium has nothing
  // social-post-specific to render anymore — the layout shows the platform
  // preview + Confirm only. Empty sections array → MediumConfigLayout still
  // renders the preview + summary chips, just no input fields.
  'social-post': {
    category: 'social-post',
    label: 'Social Post',
    sections: [],
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
        ],
      },
    ],
  },

  podcast: {
    category: 'podcast',
    label: 'Podcast',
    sections: [
      {
        id: 'duration',
        title: 'Duration',
        fields: [
          {
            key: 'duration',
            label: 'Target Duration (min)',
            type: 'slider',
            min: 5,
            max: 120,
            step: 5,
            defaultValue: 30,
          },
        ],
      },
    ],
  },

  advertising: {
    category: 'advertising',
    label: 'Advertising',
    // 2026-05-19: ad-format sectie verwijderd uit Step 3. Format wordt
    // geselecteerd in Step 1 (`contentTypeInputs.adFormat`) en is single
    // source of truth voor alle downstream consumers (canvas-orchestrator
    // prompt-builder + publish-timing checklist + preview-router). Step 3
    // Medium toonde dezelfde keuze opnieuw — verwarrend en stale-state risico.
    // Andere ad-specific config (zoals socialProof of ctaType) zou hier
    // kunnen blijven; momenteel zijn er geen andere advertising-medium-
    // configs, dus sections-array is leeg.
    sections: [],
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
      // colorGrade gemigreerd naar content-type-inputs.ts (Step 1 Content Brief)
      // op 2026-05-08, samen met footageType + textOverlay (al eerder gemigreerd).
      // Step 3 Medium toont alleen nog platform-rendering (duration, aspectRatio, quality).
    ],
  },
};

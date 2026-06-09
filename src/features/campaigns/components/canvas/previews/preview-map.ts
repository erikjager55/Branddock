import type { PreviewRegistryEntry } from '../../../types/canvas.types';
import { LinkedInPostPreview } from './LinkedInPostPreview';
import { LinkedInAdPreview } from './LinkedInAdPreview';
import { LinkedInVideoAdPreview } from './LinkedInVideoAdPreview';
import { LinkedInCarouselPreview } from './LinkedInCarouselPreview';
import { LinkedInPollPreview } from './LinkedInPollPreview';
import { InstagramPostPreview } from './InstagramPostPreview';
import { InstagramCarouselPreview } from './InstagramCarouselPreview';
import { FacebookPostPreview } from './FacebookPostPreview';
import { FacebookAdPreview } from './FacebookAdPreview';
import { DisplayAdPreview } from './DisplayAdPreview';
import { SearchAdPreview } from './SearchAdPreview';
import { NativeAdPreview } from './NativeAdPreview';
import { RetargetingAdPreview } from './RetargetingAdPreview';
import { XPostPreview } from './XPostPreview';
import { XThreadPreview } from './XThreadPreview';
import { EmailPreview } from './EmailPreview';
import { VideoPreview } from './VideoPreview';
import { PodcastPreview } from './PodcastPreview';
import { LandingPagePreview } from './LandingPagePreview';
import { GenericPreview } from './GenericPreview';

/**
 * Maps platform + format to a preview component.
 * Nested: PLATFORM_PREVIEW_MAP[platform][format]
 */
const PLATFORM_PREVIEW_MAP: Record<string, Record<string, PreviewRegistryEntry>> = {
  linkedin: {
    'organic-post': { component: LinkedInPostPreview, label: 'LinkedIn Post' },
    ad: { component: LinkedInAdPreview, label: 'LinkedIn Ad' },
    'video-ad': { component: LinkedInVideoAdPreview, label: 'LinkedIn Video Ad' },
    carousel: { component: LinkedInCarouselPreview, label: 'LinkedIn Carousel' },
    'poll-post': { component: LinkedInPollPreview, label: 'LinkedIn Poll' },
  },
  instagram: {
    'feed-post': { component: InstagramPostPreview, label: 'Instagram Post' },
    carousel: { component: InstagramCarouselPreview, label: 'Instagram Carousel' },
  },
  email: {
    newsletter: { component: EmailPreview, label: 'Email' },
    promotional: { component: EmailPreview, label: 'Email' },
  },
  tiktok: {
    video: { component: VideoPreview, label: 'TikTok Video' },
    story: { component: VideoPreview, label: 'TikTok Story' },
  },
  youtube: {
    short: { component: VideoPreview, label: 'YouTube Short' },
    video: { component: VideoPreview, label: 'YouTube Video' },
  },
  video: {
    script: { component: VideoPreview, label: 'Video Script' },
    storyboard: { component: VideoPreview, label: 'Storyboard' },
  },
  podcast: {
    episode: { component: PodcastPreview, label: 'Podcast Episode' },
    'show-notes': { component: PodcastPreview, label: 'Show Notes' },
  },
  facebook: {
    'organic-post': { component: FacebookPostPreview, label: 'Facebook Post' },
    ad: { component: FacebookAdPreview, label: 'Facebook Ad' },
  },
  x: {
    post: { component: XPostPreview, label: 'X Post' },
    thread: { component: XThreadPreview, label: 'X Thread' },
  },
  twitter: {
    post: { component: XPostPreview, label: 'X Post' },
    thread: { component: XThreadPreview, label: 'X Thread' },
  },
  web: {
    'landing-page': { component: LandingPagePreview, label: 'Landing Page' },
    'blog-article': { component: GenericPreview, label: 'Blog Post' },
  },
  google: {
    'display-ad': { component: DisplayAdPreview, label: 'Display Ad' },
    'search-ad': { component: SearchAdPreview, label: 'Search Ad' },
  },
  native: {
    'sponsored-article': { component: NativeAdPreview, label: 'Native Ad' },
  },
  meta: {
    retargeting: { component: RetargetingAdPreview, label: 'Retargeting Ad' },
  },
};

const GENERIC_ENTRY: PreviewRegistryEntry = {
  component: GenericPreview,
  label: 'Content Preview',
};

// 2026-05-19 — contentType-based fallback for cases where the
// MediumEnrichment row is missing or has no platform/format set.
// Without this, linkedin-video-ad (and other types without a seed row)
// fell back to GenericPreview which renders all variant groups as plain
// text sections instead of the platform-styled mockup.
const CONTENT_TYPE_PREVIEW_MAP: Record<string, PreviewRegistryEntry> = {
  'linkedin-video-ad': { component: LinkedInVideoAdPreview, label: 'LinkedIn Video Ad' },
  'linkedin-ad': { component: LinkedInAdPreview, label: 'LinkedIn Ad' },
  'linkedin-post': { component: LinkedInPostPreview, label: 'LinkedIn Post' },
  'linkedin-carousel': { component: LinkedInCarouselPreview, label: 'LinkedIn Carousel' },
  'linkedin-poll': { component: LinkedInPollPreview, label: 'LinkedIn Poll' },
  'instagram-post': { component: InstagramPostPreview, label: 'Instagram Post' },
  'instagram-carousel': { component: InstagramCarouselPreview, label: 'Instagram Carousel' },
  'facebook-post': { component: FacebookPostPreview, label: 'Facebook Post' },
  'facebook-ad': { component: FacebookAdPreview, label: 'Facebook Ad' },
  'display-ad': { component: DisplayAdPreview, label: 'Display Ad' },
  'search-ad': { component: SearchAdPreview, label: 'Search Ad' },
  'native-ad': { component: NativeAdPreview, label: 'Native Ad' },
  'retargeting-ad': { component: RetargetingAdPreview, label: 'Retargeting Ad' },
  'x-post': { component: XPostPreview, label: 'X Post' },
  'twitter-thread': { component: XThreadPreview, label: 'X Thread' },
  'video-script': { component: VideoPreview, label: 'Video Script' },
  'tiktok-script': { component: VideoPreview, label: 'TikTok Script' },
  'explainer-video-script': { component: VideoPreview, label: 'Explainer Video' },
  'brand-video-script': { component: VideoPreview, label: 'Brand Video' },
};

// Web-page builder MVP (per ADR 2026-05-22-landing-page-builder-architectuur).
//
// Phase 6.4 (2026-05-24): Step 2 ContentVariants behoudt de legacy
// LandingPagePreview (plain-text + image-suggestion) voor de 5 web-page
// types — user-feedback wees uit dat die opzet beter werkt voor variant-
// compare dan een mini Puck thumbnail. (De nooit-gedispatchte
// LandingPageVariantPreview mini-thumbnail is in P4 verwijderd als dead-code;
// Step 2 gebruikt nu VariantPuckPreview voor de WYSIWYG-thumbnails.)
//
// PuckPageBuilder zelf (Step 3, preview-first met fullscreen layout-editor
// modal) routet via `GenericConfigPanel` → `PuckLayoutWrapper`, niet via
// deze map.
const CONTENT_TYPE_PREVIEW_OVERRIDE: Record<string, PreviewRegistryEntry> = {};

/** Resolve the preview component for a platform + format pair, with
 *  contentType-based fallback when platform/format aren't seeded. */
export function resolvePreviewComponent(
  platform: string | null,
  format: string | null,
  contentType?: string | null,
): PreviewRegistryEntry {
  if (contentType && CONTENT_TYPE_PREVIEW_OVERRIDE[contentType]) {
    return CONTENT_TYPE_PREVIEW_OVERRIDE[contentType];
  }
  if (platform && format) {
    const match = PLATFORM_PREVIEW_MAP[platform]?.[format];
    if (match) return match;
  }
  if (contentType && CONTENT_TYPE_PREVIEW_MAP[contentType]) {
    return CONTENT_TYPE_PREVIEW_MAP[contentType];
  }
  return GENERIC_ENTRY;
}

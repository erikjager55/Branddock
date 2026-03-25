import type { PreviewRegistryEntry } from '../../../types/canvas.types';
import { LinkedInPostPreview } from './LinkedInPostPreview';
import { LinkedInAdPreview } from './LinkedInAdPreview';
import { InstagramPostPreview } from './InstagramPostPreview';
import { InstagramCarouselPreview } from './InstagramCarouselPreview';
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
  web: {
    'landing-page': { component: LandingPagePreview, label: 'Landing Page' },
    'blog-article': { component: GenericPreview, label: 'Blog Post' },
  },
};

const GENERIC_ENTRY: PreviewRegistryEntry = {
  component: GenericPreview,
  label: 'Content Preview',
};

/** Resolve the preview component for a platform + format pair */
export function resolvePreviewComponent(platform: string | null, format: string | null): PreviewRegistryEntry {
  if (!platform || !format) return GENERIC_ENTRY;
  return PLATFORM_PREVIEW_MAP[platform]?.[format] ?? GENERIC_ENTRY;
}

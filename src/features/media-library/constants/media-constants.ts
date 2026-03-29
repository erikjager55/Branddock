import {
  Image, FileText, Video, Music,
  Palette, Stamp, Star, Brush,
  Camera, Heart, Package, Users,
  CalendarDays, Sparkles, LayoutGrid, Megaphone,
  PenTool, BarChart, Presentation, Film,
  Wand2, Music2, File, Layout,
  Box, Paintbrush, Grid3X3, Square, HelpCircle,
} from 'lucide-react';
import type { MediaType, MediaCategory, MediaSource } from '../types/media.types';

// ─── Media Type Icons ────────────────────────────────────────

export const MEDIA_TYPE_ICONS: Record<MediaType, { icon: typeof Image; label: string; color: string }> = {
  IMAGE: { icon: Image, label: 'Image', color: 'text-blue-600' },
  DOCUMENT: { icon: FileText, label: 'Document', color: 'text-amber-600' },
  VIDEO: { icon: Video, label: 'Video', color: 'text-purple-600' },
  AUDIO: { icon: Music, label: 'Audio', color: 'text-pink-600' },
};

// ─── Media Category Config ───────────────────────────────────

export const MEDIA_CATEGORY_CONFIG: Record<MediaCategory, { icon: typeof Image; label: string }> = {
  LOGO: { icon: Stamp, label: 'Logo' },
  BRAND_MARK: { icon: Palette, label: 'Brand Mark' },
  ICON: { icon: Star, label: 'Icon' },
  ILLUSTRATION: { icon: Brush, label: 'Illustration' },
  PHOTOGRAPHY: { icon: Camera, label: 'Photography' },
  LIFESTYLE: { icon: Heart, label: 'Lifestyle' },
  PRODUCT_PHOTO: { icon: Package, label: 'Product Photo' },
  TEAM_PHOTO: { icon: Users, label: 'Team Photo' },
  EVENT_PHOTO: { icon: CalendarDays, label: 'Event Photo' },
  HERO_IMAGE: { icon: Sparkles, label: 'Hero Image' },
  BANNER: { icon: LayoutGrid, label: 'Banner' },
  SOCIAL_MEDIA: { icon: Megaphone, label: 'Social Media' },
  ADVERTISEMENT: { icon: Megaphone, label: 'Advertisement' },
  INFOGRAPHIC: { icon: BarChart, label: 'Infographic' },
  PRESENTATION: { icon: Presentation, label: 'Presentation' },
  VIDEO_CONTENT: { icon: Film, label: 'Video Content' },
  ANIMATION: { icon: Wand2, label: 'Animation' },
  AUDIO_CONTENT: { icon: Music2, label: 'Audio Content' },
  DOCUMENT_FILE: { icon: File, label: 'Document' },
  TEMPLATE: { icon: Layout, label: 'Template' },
  MOCKUP: { icon: Box, label: 'Mockup' },
  TEXTURE: { icon: Paintbrush, label: 'Texture' },
  PATTERN: { icon: Grid3X3, label: 'Pattern' },
  BACKGROUND: { icon: Square, label: 'Background' },
  OTHER: { icon: HelpCircle, label: 'Other' },
};

// ─── Category Groups ─────────────────────────────────────────

export const CATEGORY_GROUPS = [
  {
    label: 'Brand Identity',
    categories: ['LOGO', 'BRAND_MARK', 'ICON', 'ILLUSTRATION'] as MediaCategory[],
  },
  {
    label: 'Photography',
    categories: ['PHOTOGRAPHY', 'LIFESTYLE', 'PRODUCT_PHOTO', 'TEAM_PHOTO', 'EVENT_PHOTO', 'HERO_IMAGE'] as MediaCategory[],
  },
  {
    label: 'Marketing',
    categories: ['BANNER', 'SOCIAL_MEDIA', 'ADVERTISEMENT', 'INFOGRAPHIC', 'PRESENTATION'] as MediaCategory[],
  },
  {
    label: 'Rich Media',
    categories: ['VIDEO_CONTENT', 'ANIMATION', 'AUDIO_CONTENT'] as MediaCategory[],
  },
  {
    label: 'Documents & Design',
    categories: ['DOCUMENT_FILE', 'TEMPLATE', 'MOCKUP', 'TEXTURE', 'PATTERN', 'BACKGROUND', 'OTHER'] as MediaCategory[],
  },
];

export const ALL_CATEGORIES: MediaCategory[] = CATEGORY_GROUPS.flatMap(g => g.categories);

// ─── Source Config ───────────────────────────────────────────

export const MEDIA_SOURCE_LABELS: Record<MediaSource, string> = {
  UPLOAD: 'Uploaded',
  URL_IMPORT: 'Imported from URL',
  AI_GENERATED: 'AI Generated',
  SCRAPED: 'Scraped',
  STOCK: 'Stock Photo',
};

// ─── File Size Limits ────────────────────────────────────────

export const MAX_FILE_SIZES: Record<MediaType, number> = {
  IMAGE: 25 * 1024 * 1024,      // 25 MB
  VIDEO: 500 * 1024 * 1024,     // 500 MB
  AUDIO: 50 * 1024 * 1024,      // 50 MB
  DOCUMENT: 50 * 1024 * 1024,   // 50 MB
};

// ─── Accepted MIME Types ─────────────────────────────────────

export const ACCEPTED_MIME_TYPES: Record<MediaType, string[]> = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif'],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi'],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac'],
  DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
};

/** Derive MediaType from MIME type */
export function getMediaTypeFromMime(mime: string): MediaType {
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime.startsWith('video/')) return 'VIDEO';
  if (mime.startsWith('audio/')) return 'AUDIO';
  return 'DOCUMENT';
}

// ─── View Modes ──────────────────────────────────────────────

export type MediaViewMode = 'grid' | 'list';

// ─── Sort Options ────────────────────────────────────────────

export const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'name:asc', label: 'Name A-Z' },
  { value: 'name:desc', label: 'Name Z-A' },
  { value: 'fileSize:desc', label: 'Largest first' },
  { value: 'fileSize:asc', label: 'Smallest first' },
] as const;

/** Format bytes into human-readable string */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Format duration in seconds to mm:ss */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

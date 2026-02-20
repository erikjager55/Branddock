/**
 * Image optimization utilities for Branddock.
 *
 * Provides placeholder generation (shimmer SVG, blur data URL)
 * and size presets for the OptimizedImage component.
 */

// ─── Shimmer placeholder SVG ────────────────────────────────

/**
 * Generates a shimmer SVG placeholder as a base64 data URL.
 * Used as `placeholder="blur"` blurDataURL for next/image.
 */
export function shimmerPlaceholder(w: number, h: number): string {
  const svg = `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#e5e7eb" offset="20%" />
      <stop stop-color="#f3f4f6" offset="50%" />
      <stop stop-color="#e5e7eb" offset="80%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#e5e7eb" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)">
    <animate attributeName="x" from="-${w}" to="${w}" dur="1.5s" repeatCount="indefinite" />
  </rect>
</svg>`;

  return `data:image/svg+xml;base64,${toBase64(svg)}`;
}

/**
 * Generates a solid-color blur placeholder as a base64 data URL.
 * Lighter than shimmer — good for avatars and small images.
 */
export function solidPlaceholder(
  w: number,
  h: number,
  color = '#e5e7eb',
): string {
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" fill="${color}"/></svg>`;
  return `data:image/svg+xml;base64,${toBase64(svg)}`;
}

// ─── Avatar-specific helpers ────────────────────────────────

/** Common avatar size presets (px) mapped to next/image `sizes` hint. */
export const AVATAR_SIZES = {
  xs: { width: 16, height: 16, sizes: '16px' },
  sm: { width: 32, height: 32, sizes: '32px' },
  md: { width: 40, height: 40, sizes: '40px' },
  lg: { width: 64, height: 64, sizes: '64px' },
  xl: { width: 80, height: 80, sizes: '80px' },
  '2xl': { width: 96, height: 96, sizes: '96px' },
} as const;

export type AvatarSize = keyof typeof AVATAR_SIZES;

/**
 * Returns the avatar preset for a given Tailwind size class.
 * Maps e.g. "w-8 h-8" → sm (32px), "w-10 h-10" → md (40px).
 */
export function avatarSizeFromClass(className: string): AvatarSize {
  if (className.includes('w-4') || className.includes('w-5')) return 'xs';
  if (className.includes('w-8') || className.includes('w-9')) return 'sm';
  if (className.includes('w-10') || className.includes('w-12')) return 'md';
  if (className.includes('w-16')) return 'lg';
  if (className.includes('w-20')) return 'xl';
  if (className.includes('w-24')) return '2xl';
  return 'md';
}

// ─── Thumbnail helpers ──────────────────────────────────────

/**
 * Returns a responsive `sizes` attribute for grid thumbnails.
 * Uses container queries: on mobile 100vw, on md 50vw, on lg ~33vw.
 */
export function thumbnailSizes(columns: 2 | 3 | 4 = 3): string {
  const pct = Math.round(100 / columns);
  return `(max-width: 768px) 100vw, (max-width: 1024px) 50vw, ${pct}vw`;
}

// ─── Internal ───────────────────────────────────────────────

function toBase64(str: string): string {
  if (typeof window !== 'undefined') {
    return window.btoa(str);
  }
  return Buffer.from(str).toString('base64');
}

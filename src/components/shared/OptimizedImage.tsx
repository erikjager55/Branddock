'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  shimmerPlaceholder,
  solidPlaceholder,
  AVATAR_SIZES,
  type AvatarSize,
} from '@/lib/image-utils';

// ─── Types ──────────────────────────────────────────────────

export interface OptimizedImageProps {
  /** Image source URL. If falsy, renders the fallback. */
  src: string | null | undefined;
  alt: string;
  /** Explicit width (px). Required unless `fill` or `avatar` is set. */
  width?: number;
  /** Explicit height (px). Required unless `fill` or `avatar` is set. */
  height?: number;
  /** Use next/image `fill` mode (parent must be relative/absolute). */
  fill?: boolean;
  /** Responsive sizes hint. Defaults to "100vw". */
  sizes?: string;
  /** Tailwind classes applied to the <img> element. */
  className?: string;
  /**
   * Avatar shorthand. Sets width/height/sizes from preset,
   * applies rounded-full and object-cover automatically.
   */
  avatar?: AvatarSize;
  /** Render priority image (eager loading, skip lazy). Use for LCP images. */
  priority?: boolean;
  /** Custom placeholder: "blur" (default), "shimmer", or "empty". */
  placeholderStyle?: 'blur' | 'shimmer' | 'empty';
  /** Fallback element when src is missing or image fails to load. */
  fallback?: React.ReactNode;
  /** Additional props forwarded to next/image. */
  quality?: number;
  /** data-testid for E2E testing. */
  'data-testid'?: string;
}

// ─── Component ──────────────────────────────────────────────

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill,
  sizes,
  className = '',
  avatar,
  priority = false,
  placeholderStyle = 'blur',
  fallback,
  quality,
  'data-testid': testId,
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);

  // ─── Avatar preset ──────────────────────────────────────
  let resolvedWidth = width;
  let resolvedHeight = height;
  let resolvedSizes = sizes;
  let avatarClasses = '';

  if (avatar) {
    const preset = AVATAR_SIZES[avatar];
    resolvedWidth = preset.width;
    resolvedHeight = preset.height;
    resolvedSizes = preset.sizes;
    avatarClasses = 'rounded-full object-cover';
  }

  // ─── No src or load error → fallback ────────────────────
  if (!src || hasError) {
    if (fallback) return <>{fallback}</>;
    return (
      <div
        data-testid={testId}
        className={`bg-gray-100 flex items-center justify-center ${avatarClasses} ${className}`}
        style={
          !fill
            ? { width: resolvedWidth, height: resolvedHeight }
            : undefined
        }
        aria-label={alt}
      />
    );
  }

  // ─── Data URIs → regular <img> (next/image doesn't support data:) ──
  if (src.startsWith('data:')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={resolvedWidth}
        height={resolvedHeight}
        className={`${avatarClasses} ${className}`.trim()}
        data-testid={testId}
        onError={() => setHasError(true)}
      />
    );
  }

  // ─── Placeholder data URL ──────────────────────────────
  let blurDataURL: string | undefined;
  if (placeholderStyle === 'shimmer') {
    blurDataURL = shimmerPlaceholder(
      resolvedWidth ?? 16,
      resolvedHeight ?? 16,
    );
  } else if (placeholderStyle === 'blur') {
    blurDataURL = solidPlaceholder(
      resolvedWidth ?? 16,
      resolvedHeight ?? 16,
    );
  }

  const combinedClassName = `${avatarClasses} ${className}`.trim();

  // ─── Fill mode ─────────────────────────────────────────
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={resolvedSizes ?? '100vw'}
        className={combinedClassName}
        placeholder={blurDataURL ? 'blur' : 'empty'}
        blurDataURL={blurDataURL}
        priority={priority}
        quality={quality}
        onError={() => setHasError(true)}
        data-testid={testId}
      />
    );
  }

  // ─── Fixed dimensions ──────────────────────────────────
  return (
    <Image
      src={src}
      alt={alt}
      width={resolvedWidth ?? 100}
      height={resolvedHeight ?? 100}
      sizes={resolvedSizes}
      className={combinedClassName}
      placeholder={blurDataURL ? 'blur' : 'empty'}
      blurDataURL={blurDataURL}
      priority={priority}
      quality={quality}
      onError={() => setHasError(true)}
      data-testid={testId}
    />
  );
}

'use client';

import React from 'react';
import { ImagePlus } from 'lucide-react';
import type { CanvasHeroImage } from '../../../types/canvas.types';

interface HeroImageSlotProps {
  /** Image to display, or null/undefined to show the placeholder. */
  image?: CanvasHeroImage | null;
  /** Click handler for the placeholder — opens InsertImageModal. */
  onAddImage?: () => void;
  /** Aspect ratio for the slot (Tailwind class). Defaults to 16/9. */
  aspectRatio?: string;
  /** Border radius (Tailwind class). Defaults to rounded. */
  rounded?: string;
  /** Optional label shown in the placeholder. */
  label?: string;
  /** Extra wrapper classes. */
  className?: string;
}

/**
 * Hero image slot used by all platform preview components in the
 * Content Canvas. When `image` is set, renders the actual image.
 * When empty AND `onAddImage` is provided, renders a clickable
 * placeholder that opens the InsertImageModal. When empty AND no
 * handler, renders a static dashed box (read-only display).
 */
export function HeroImageSlot({
  image,
  onAddImage,
  aspectRatio = 'aspect-[16/9]',
  rounded = 'rounded',
  label = 'Add image',
  className = '',
}: HeroImageSlotProps) {
  if (image?.url) {
    return (
      <div className={`${aspectRatio} ${rounded} overflow-hidden bg-gray-100 ${className}`}>
        <img
          src={image.url}
          alt={image.alt ?? ''}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const isInteractive = !!onAddImage;
  const Component: React.ElementType = isInteractive ? 'button' : 'div';

  return (
    <Component
      type={isInteractive ? 'button' : undefined}
      onClick={onAddImage}
      className={`${aspectRatio} ${rounded} flex flex-col items-center justify-center gap-1.5 bg-gray-50 border-2 border-dashed border-gray-300 ${
        isInteractive
          ? 'hover:border-teal-400 hover:bg-teal-50/50 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500'
          : ''
      } ${className}`}
    >
      <ImagePlus className="h-5 w-5 text-gray-400" />
      <span className="text-[11px] font-medium text-gray-500">{label}</span>
    </Component>
  );
}

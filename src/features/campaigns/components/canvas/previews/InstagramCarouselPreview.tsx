'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { PreviewFrame } from './PreviewFrame';
import { ChevronLeft, ChevronRight, Heart, MessageCircle, Send, Bookmark } from 'lucide-react';

const INSTAGRAM_GRADIENT = '#E1306C';

/** Instagram carousel mockup with slide navigation */
export function InstagramCarouselPreview({ previewContent, imageVariants, isGenerating }: PlatformPreviewProps) {
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const caption = previewContent.caption?.content ?? previewContent.body?.content ?? '';

  const slides = imageVariants.length > 0 ? imageVariants : [];
  const totalSlides = Math.max(slides.length, 1);

  // Reset slide index when imageVariants change to prevent out-of-bounds
  React.useEffect(() => {
    setCurrentSlide(0);
  }, [imageVariants.length]);

  if (isGenerating) {
    return (
      <PreviewFrame platformLabel="Instagram Carousel" platformColor={INSTAGRAM_GRADIENT}>
        <div className="animate-pulse space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gray-200" />
            <div className="h-3 w-20 rounded bg-gray-200" />
          </div>
          <div className="aspect-square rounded bg-gray-200" />
          <div className="flex justify-center gap-1 py-2">
            <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
            <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
            <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
          </div>
        </div>
      </PreviewFrame>
    );
  }

  return (
    <PreviewFrame platformLabel="Instagram Carousel" platformColor={INSTAGRAM_GRADIENT}>
      {/* Profile header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center">
          <span className="text-xs font-bold text-pink-600">B</span>
        </div>
        <p className="text-xs font-semibold text-gray-900">brandname</p>
      </div>

      {/* Carousel viewer */}
      <div className="relative mb-3">
        {slides.length > 0 ? (
          <img
            src={slides[currentSlide]?.url}
            alt={slides[currentSlide]?.prompt ?? 'Carousel slide'}
            className="w-full aspect-square rounded object-cover"
          />
        ) : (
          <div className="w-full aspect-square rounded bg-gray-100 flex items-center justify-center">
            <span className="text-xs text-gray-400">Carousel slides will appear here</span>
          </div>
        )}

        {/* Navigation arrows */}
        {totalSlides > 1 && (
          <>
            {currentSlide > 0 && (
              <button
                type="button"
                onClick={() => setCurrentSlide((p) => Math.max(0, p - 1))}
                className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-white/80 flex items-center justify-center shadow"
              >
                <ChevronLeft className="h-4 w-4 text-gray-700" />
              </button>
            )}
            {currentSlide < totalSlides - 1 && (
              <button
                type="button"
                onClick={() => setCurrentSlide((p) => Math.min(totalSlides - 1, p + 1))}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-white/80 flex items-center justify-center shadow"
              >
                <ChevronRight className="h-4 w-4 text-gray-700" />
              </button>
            )}
          </>
        )}

        {/* Slide counter */}
        {totalSlides > 1 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px]">
            {currentSlide + 1}/{totalSlides}
          </div>
        )}
      </div>

      {/* Dots */}
      {totalSlides > 1 && (
        <div className="flex justify-center gap-1 mb-2">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === currentSlide ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Heart className="h-4 w-4 text-gray-700" />
          <MessageCircle className="h-4 w-4 text-gray-700" />
          <Send className="h-4 w-4 text-gray-700" />
        </div>
        <Bookmark className="h-4 w-4 text-gray-700" />
      </div>

      {/* Caption */}
      {caption && (
        <p className="text-xs text-gray-800">
          <span className="font-semibold">brandname </span>
          <span className="line-clamp-3">{caption}</span>
        </p>
      )}
    </PreviewFrame>
  );
}

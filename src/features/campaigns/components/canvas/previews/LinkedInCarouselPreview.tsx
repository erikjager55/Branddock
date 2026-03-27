'use client';

import React, { useState, useEffect } from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { PreviewFrame } from './PreviewFrame';
import { ThumbsUp, MessageCircle, Repeat2, Send, Globe, ChevronLeft, ChevronRight } from 'lucide-react';

const LINKEDIN_BLUE = '#0A66C2';

/** LinkedIn carousel post mockup */
export function LinkedInCarouselPreview({ previewContent, imageVariants, isGenerating }: PlatformPreviewProps) {
  const caption = previewContent.body?.content ?? previewContent.caption?.content ?? '';
  const totalSlides = imageVariants.length;

  const [currentSlide, setCurrentSlide] = useState(0);

  // Clamp currentSlide if imageVariants shrinks (e.g. after regeneration)
  useEffect(() => {
    if (totalSlides > 0 && currentSlide >= totalSlides) {
      setCurrentSlide(totalSlides - 1);
    }
  }, [totalSlides, currentSlide]);

  const handlePrev = () => setCurrentSlide((prev) => Math.max(0, prev - 1));
  const handleNext = () => setCurrentSlide((prev) => Math.min(totalSlides - 1, prev + 1));

  if (isGenerating) {
    return (
      <PreviewFrame platformLabel="LinkedIn Carousel" platformColor={LINKEDIN_BLUE}>
        <div className="animate-pulse space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-gray-200" />
            <div className="space-y-1.5">
              <div className="h-3 w-24 rounded bg-gray-200" />
              <div className="h-2 w-16 rounded bg-gray-200" />
            </div>
          </div>
          <div className="h-3 w-full rounded bg-gray-200" />
          <div className="aspect-square rounded bg-gray-200" />
        </div>
      </PreviewFrame>
    );
  }

  return (
    <PreviewFrame platformLabel="LinkedIn Carousel" platformColor={LINKEDIN_BLUE}>
      {/* Author header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-sm font-semibold text-blue-700">B</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Brand Name</p>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            Just now · <Globe className="h-3 w-3" />
          </p>
        </div>
      </div>

      {/* Caption text */}
      {caption && (
        <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-4 mb-3">
          {caption}
        </p>
      )}

      {/* Carousel container */}
      {totalSlides > 0 ? (
        <div className="relative aspect-square bg-gray-100 rounded overflow-hidden mb-1">
          <img
            src={imageVariants[currentSlide]?.url}
            alt={imageVariants[currentSlide]?.prompt ?? `Slide ${currentSlide + 1}`}
            className="w-full h-full object-cover"
          />

          {/* Slide counter badge */}
          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            {currentSlide + 1}/{totalSlides}
          </div>

          {/* Navigation arrows */}
          {currentSlide > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous slide"
              className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/80 flex items-center justify-center shadow"
            >
              <ChevronLeft className="h-4 w-4 text-gray-700" />
            </button>
          )}
          {currentSlide < totalSlides - 1 && (
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next slide"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/80 flex items-center justify-center shadow"
            >
              <ChevronRight className="h-4 w-4 text-gray-700" />
            </button>
          )}
        </div>
      ) : (
        <div className="aspect-square bg-gray-100 rounded flex items-center justify-center mb-1">
          <p className="text-xs text-gray-400">No slides generated yet</p>
        </div>
      )}

      {/* Dot pagination */}
      {totalSlides > 1 && (
        <div className="flex justify-center gap-1 mb-3">
          {imageVariants.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                idx === currentSlide ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}

      {/* Engagement bar */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
        <button type="button" className="flex items-center gap-1 text-xs text-gray-500">
          <ThumbsUp className="h-3.5 w-3.5" /> Like
        </button>
        <button type="button" className="flex items-center gap-1 text-xs text-gray-500">
          <MessageCircle className="h-3.5 w-3.5" /> Comment
        </button>
        <button type="button" className="flex items-center gap-1 text-xs text-gray-500">
          <Repeat2 className="h-3.5 w-3.5" /> Repost
        </button>
        <button type="button" className="flex items-center gap-1 text-xs text-gray-500">
          <Send className="h-3.5 w-3.5" /> Send
        </button>
      </div>
    </PreviewFrame>
  );
}

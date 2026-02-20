"use client";

import React from "react";
import { Layers } from "lucide-react";
import type { CarouselSlide } from "@/types/studio";

interface SlideThumbnailsProps {
  slides: CarouselSlide[];
  activeSlide: number;
  onSelect: (index: number) => void;
}

export function SlideThumbnails({ slides, activeSlide, onSelect }: SlideThumbnailsProps) {
  const safeSlides = Array.isArray(slides) ? slides : [];

  return (
    <div className="flex items-center justify-center gap-2 mt-4 pb-2 overflow-x-auto">
      {safeSlides.map((slide, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`h-14 w-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-colors ${
            i === activeSlide ? "border-teal-500" : "border-gray-200 hover:border-gray-300"
          }`}
        >
          {slide.imageUrl ? (
            <img
              src={slide.imageUrl}
              alt={`Slide ${i + 1}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <Layers className="h-4 w-4 text-gray-300" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

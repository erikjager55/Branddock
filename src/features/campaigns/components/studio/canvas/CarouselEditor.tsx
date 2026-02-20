"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Layers } from "lucide-react";
import { useContentStudioStore } from "@/stores/useContentStudioStore";
import { SlideThumbnails } from "./SlideThumbnails";

interface CarouselEditorProps {
  isPreviewMode: boolean;
}

export function CarouselEditor({ isPreviewMode }: CarouselEditorProps) {
  const rawSlides = useContentStudioStore((s) => s.slides);
  const setSlides = useContentStudioStore((s) => s.setSlides);
  const slides = Array.isArray(rawSlides) ? rawSlides : [];
  const [activeSlide, setActiveSlide] = useState(0);

  if (slides.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Layers className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">No carousel yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Write a prompt and click Generate to create slides
          </p>
        </div>
      </div>
    );
  }

  const current = slides[activeSlide];
  if (!current) return null;

  const handleAddSlide = () => {
    const newSlide = {
      index: slides.length,
      imageUrl: null,
      textOverlay: null,
    };
    setSlides([...slides, newSlide]);
    setActiveSlide(slides.length);
  };

  const handleUpdateOverlay = (text: string) => {
    const updated = slides.map((s, i) =>
      i === activeSlide ? { ...s, textOverlay: text } : s
    );
    setSlides(updated);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Slide Navigator */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onClick={() => setActiveSlide(Math.max(0, activeSlide - 1))}
          disabled={activeSlide === 0}
          className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-gray-700">
          Slide {activeSlide + 1} of {slides.length}
        </span>
        <button
          onClick={() => setActiveSlide(Math.min(slides.length - 1, activeSlide + 1))}
          disabled={activeSlide === slides.length - 1}
          className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {!isPreviewMode && (
          <button
            onClick={handleAddSlide}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Slide
          </button>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center overflow-auto">
        <div className="relative max-w-lg w-full aspect-square rounded-lg overflow-hidden shadow-lg bg-white">
          {current.imageUrl ? (
            <img
              src={current.imageUrl}
              alt={`Slide ${activeSlide + 1}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <Layers className="h-16 w-16 text-gray-300" />
            </div>
          )}
          {/* Text Overlay */}
          {isPreviewMode ? (
            current.textOverlay && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                <p className="text-white text-lg font-semibold">{current.textOverlay}</p>
              </div>
            )
          ) : (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <input
                type="text"
                value={current.textOverlay || ""}
                onChange={(e) => handleUpdateOverlay(e.target.value)}
                placeholder="Add text overlay..."
                className="w-full bg-transparent border-b border-white/50 text-white placeholder:text-white/50 text-sm py-1 focus:outline-none focus:border-white"
              />
            </div>
          )}
        </div>
      </div>

      {/* Thumbnails */}
      <SlideThumbnails
        slides={slides}
        activeSlide={activeSlide}
        onSelect={setActiveSlide}
      />
    </div>
  );
}

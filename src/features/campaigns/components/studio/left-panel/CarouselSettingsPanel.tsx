"use client";

import React from "react";
import { useContentStudioStore } from "@/stores/useContentStudioStore";
import type { CarouselSettings } from "@/types/studio";

const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3"];
const VISUAL_STYLES = ["photographic", "illustration", "flat", "3d"];

export function CarouselSettingsPanel() {
  const { settings, setSettings } = useContentStudioStore();
  const carouselSettings = (settings as CarouselSettings | null) || {
    aspectRatio: "1:1",
    visualStyle: "photographic",
    slideCount: 4,
  };

  const update = (partial: Partial<CarouselSettings>) =>
    setSettings({ ...carouselSettings, ...partial });

  return (
    <div className="space-y-3">
      {/* Aspect Ratio */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Aspect Ratio
        </label>
        <div className="flex gap-1">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio}
              onClick={() => update({ aspectRatio: ratio })}
              className={`flex-1 px-2 py-1 text-xs rounded-md transition-colors ${
                carouselSettings.aspectRatio === ratio
                  ? "bg-teal-50 text-teal-700 border border-teal-200"
                  : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Style */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Visual Style
        </label>
        <div className="grid grid-cols-2 gap-1">
          {VISUAL_STYLES.map((style) => (
            <button
              key={style}
              onClick={() => update({ visualStyle: style })}
              className={`px-2 py-1 text-xs rounded-md capitalize transition-colors ${
                carouselSettings.visualStyle === style
                  ? "bg-teal-50 text-teal-700 border border-teal-200"
                  : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Slide Count */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Number of Slides
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => update({ slideCount: Math.max(2, carouselSettings.slideCount - 1) })}
            className="h-7 w-7 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-sm"
          >
            −
          </button>
          <span className="text-sm font-medium text-gray-900 w-6 text-center">
            {carouselSettings.slideCount}
          </span>
          <button
            onClick={() => update({ slideCount: Math.min(10, carouselSettings.slideCount + 1) })}
            className="h-7 w-7 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-sm"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

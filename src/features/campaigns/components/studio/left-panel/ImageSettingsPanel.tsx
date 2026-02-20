"use client";

import React from "react";
import { useContentStudioStore } from "@/stores/useContentStudioStore";
import type { ImageSettings } from "@/types/studio";

const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3"];
const VISUAL_STYLES = ["photographic", "illustration", "flat", "3d"];

export function ImageSettingsPanel() {
  const { settings, setSettings } = useContentStudioStore();
  const imageSettings = (settings as ImageSettings | null) || {
    aspectRatio: "1:1",
    visualStyle: "photographic",
    colorPalette: "",
  };

  const update = (partial: Partial<ImageSettings>) =>
    setSettings({ ...imageSettings, ...partial });

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
                imageSettings.aspectRatio === ratio
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
                imageSettings.visualStyle === style
                  ? "bg-teal-50 text-teal-700 border border-teal-200"
                  : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Color Palette */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Color Palette
        </label>
        <input
          type="text"
          value={imageSettings.colorPalette}
          onChange={(e) => update({ colorPalette: e.target.value })}
          placeholder="e.g., Brand colors, warm tones"
          className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
        />
      </div>
    </div>
  );
}

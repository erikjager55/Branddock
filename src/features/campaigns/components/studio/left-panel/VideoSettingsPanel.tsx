"use client";

import React from "react";
import { useContentStudioStore } from "@/stores/useContentStudioStore";
import type { VideoSettings } from "@/types/studio";

const DURATIONS: VideoSettings["duration"][] = [15, 30, 45, 60];
const STYLES = ["cinematic", "motion-graphics", "talking-head", "product-demo"];

export function VideoSettingsPanel() {
  const { settings, setSettings } = useContentStudioStore();
  const videoSettings = (settings as VideoSettings | null) || {
    duration: 30 as const,
    style: "cinematic",
    backgroundMusic: true,
  };

  const update = (partial: Partial<VideoSettings>) =>
    setSettings({ ...videoSettings, ...partial });

  return (
    <div className="space-y-3">
      {/* Duration */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Duration
        </label>
        <div className="flex gap-1">
          {DURATIONS.map((dur) => (
            <button
              key={dur}
              onClick={() => update({ duration: dur })}
              className={`flex-1 px-2 py-1 text-xs rounded-md transition-colors ${
                videoSettings.duration === dur
                  ? "bg-teal-50 text-teal-700 border border-teal-200"
                  : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {dur}s
            </button>
          ))}
        </div>
      </div>

      {/* Style */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Style</label>
        <div className="grid grid-cols-2 gap-1">
          {STYLES.map((style) => (
            <button
              key={style}
              onClick={() => update({ style })}
              className={`px-2 py-1 text-xs rounded-md capitalize transition-colors ${
                videoSettings.style === style
                  ? "bg-teal-50 text-teal-700 border border-teal-200"
                  : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {style.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Background Music */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-700">
          Background Music
        </label>
        <button
          onClick={() => update({ backgroundMusic: !videoSettings.backgroundMusic })}
          className={`relative h-5 w-9 rounded-full transition-colors ${
            videoSettings.backgroundMusic ? "bg-teal-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              videoSettings.backgroundMusic ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

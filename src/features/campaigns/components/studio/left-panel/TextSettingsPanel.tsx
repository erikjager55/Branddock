"use client";

import React from "react";
import { useContentStudioStore } from "@/stores/useContentStudioStore";
import type { TextSettings } from "@/types/studio";

const TONES = ["professional", "casual", "bold", "empathetic"];
const LENGTHS: TextSettings["length"][] = ["short", "medium", "long"];

export function TextSettingsPanel() {
  const { settings, setSettings } = useContentStudioStore();
  const textSettings = (settings as TextSettings | null) || {
    tone: "professional",
    length: "medium" as const,
    targetAudience: "",
  };

  const update = (partial: Partial<TextSettings>) =>
    setSettings({ ...textSettings, ...partial });

  return (
    <div className="space-y-3">
      {/* Target Audience */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Target Audience
        </label>
        <input
          type="text"
          value={textSettings.targetAudience}
          onChange={(e) => update({ targetAudience: e.target.value })}
          placeholder="e.g., Marketing professionals"
          className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {/* Tone */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Tone</label>
        <div className="flex gap-1">
          {TONES.map((tone) => (
            <button
              key={tone}
              onClick={() => update({ tone })}
              className={`flex-1 px-2 py-1 text-xs rounded-md capitalize transition-colors ${
                textSettings.tone === tone
                  ? "bg-teal-50 text-teal-700 border border-teal-200"
                  : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {tone}
            </button>
          ))}
        </div>
      </div>

      {/* Length */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Length</label>
        <div className="flex gap-1">
          {LENGTHS.map((len) => (
            <button
              key={len}
              onClick={() => update({ length: len })}
              className={`flex-1 px-2 py-1 text-xs rounded-md capitalize transition-colors ${
                textSettings.length === len
                  ? "bg-teal-50 text-teal-700 border border-teal-200"
                  : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {len}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

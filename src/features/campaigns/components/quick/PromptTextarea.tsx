"use client";

import React from "react";

interface PromptTextareaProps {
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
}

const MAX_CHARS = 500;

export function PromptTextarea({ value, onChange, suggestions }: PromptTextareaProps) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        What&apos;s it about?
      </label>
      <textarea
        value={value}
        onChange={(e) => {
          if (e.target.value.length <= MAX_CHARS) onChange(e.target.value);
        }}
        placeholder="Describe what you want to create..."
        className="w-full h-28 p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
      />
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-gray-400">{value.length}/{MAX_CHARS}</span>
      </div>

      {/* Quick Prompt Chips */}
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onChange(s)}
              className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

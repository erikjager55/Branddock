"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

export function WhatArePersonasPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700">
            What are Personas?
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          <p className="text-sm text-gray-600">
            Personas are research-based representations of your target audience
            segments. They combine demographic data, psychographic insights,
            goals, motivations, and behavioral patterns to create a vivid
            picture of who your customers are. Use them to guide brand
            strategy, product decisions, and marketing campaigns with
            confidence.
          </p>
        </div>
      )}
    </div>
  );
}

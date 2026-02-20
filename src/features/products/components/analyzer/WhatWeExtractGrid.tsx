"use client";

import { Check } from "lucide-react";

const DEFAULT_ITEMS = [
  "Product features & specifications",
  "Pricing model & tiers",
  "Use cases & applications",
  "Target audience signals",
];

interface WhatWeExtractGridProps {
  items?: string[];
}

export function WhatWeExtractGrid({
  items = DEFAULT_ITEMS,
}: WhatWeExtractGridProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        What we extract
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 rounded-lg bg-green-50 p-3"
          >
            <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
            <span className="text-sm text-gray-700">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

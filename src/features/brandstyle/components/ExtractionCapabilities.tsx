"use client";

import { Palette, Type, Layers, Ruler } from "lucide-react";
import { Card } from "@/components/shared";

const CAPABILITIES = [
  {
    icon: Palette,
    title: "Colors & Palette",
    description: "Primary, secondary, accent, and semantic colors with contrast ratios",
  },
  {
    icon: Type,
    title: "Typography & Fonts",
    description: "Font families, sizes, weights, and type scale hierarchy",
  },
  {
    icon: Layers,
    title: "Component Styles",
    description: "Buttons, cards, inputs, and reusable UI component patterns",
  },
  {
    icon: Ruler,
    title: "Spacing & Layout",
    description: "Grid system, margins, padding, and layout composition rules",
  },
];

export function ExtractionCapabilities() {
  return (
    <Card data-testid="extraction-capabilities">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        What we extract
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {CAPABILITIES.map((cap) => (
          <div key={cap.title} data-testid="capability-item" className="flex gap-3">
            <div className="w-8 h-8 rounded-md bg-teal-50 flex items-center justify-center flex-shrink-0">
              <cap.icon className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{cap.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{cap.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

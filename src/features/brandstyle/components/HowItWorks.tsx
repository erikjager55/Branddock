"use client";

import { Globe, Cpu, Pencil } from "lucide-react";
import { Card } from "@/components/shared";

const STEPS = [
  {
    icon: Globe,
    step: "1",
    title: "Enter URL or Upload",
    description: "Provide a website URL or upload a brand guidelines PDF",
  },
  {
    icon: Cpu,
    step: "2",
    title: "AI Analyzes",
    description: "Our AI scans and extracts colors, fonts, and style patterns",
  },
  {
    icon: Pencil,
    step: "3",
    title: "Review & Edit",
    description: "Review the extracted styleguide and make adjustments as needed",
  },
];

export function HowItWorks() {
  return (
    <Card data-testid="how-it-works">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        How it works
      </h3>
      <div className="space-y-4">
        {STEPS.map((s) => (
          <div key={s.step} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-gray-600">{s.step}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{s.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

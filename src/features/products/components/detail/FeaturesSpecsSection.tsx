"use client";

import { Check } from "lucide-react";

interface FeaturesSpecsSectionProps {
  features: string[];
}

export function FeaturesSpecsSection({ features }: FeaturesSpecsSectionProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Features &amp; Specifications
      </h3>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <Check className="h-4 w-4 flex-shrink-0 text-green-500 mt-0.5" />
            <span className="text-sm text-gray-700">{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

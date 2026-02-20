"use client";

import React from "react";
import type { ResearchBundleSummary } from "../../types/research.types";
import { BundleCard } from "./BundleCard";

// ─── Types ───────────────────────────────────────────────────

interface FoundationPlansSectionProps {
  bundles: ResearchBundleSummary[];
  onSelect: (bundleId: string) => void;
  onLearnMore: (bundleId: string) => void;
}

// ─── Component ───────────────────────────────────────────────

export function FoundationPlansSection({
  bundles,
  onSelect,
  onLearnMore,
}: FoundationPlansSectionProps) {
  if (bundles.length === 0) return null;

  return (
    <div data-testid="foundation-plans">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Foundation Plans</h2>
        <p className="text-sm text-gray-500">
          Essential research packages to build your brand foundation
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bundles.map((bundle) => (
          <BundleCard
            key={bundle.id}
            bundle={bundle}
            onSelect={() => onSelect(bundle.id)}
            onLearnMore={() => onLearnMore(bundle.id)}
          />
        ))}
      </div>
    </div>
  );
}

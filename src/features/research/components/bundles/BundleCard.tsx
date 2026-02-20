"use client";

import React from "react";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/shared";
import type { ResearchBundleSummary } from "../../types/research.types";
import { BundleBadge } from "./BundleBadge";

// ─── Types ───────────────────────────────────────────────────

interface BundleCardProps {
  bundle: ResearchBundleSummary;
  onSelect: () => void;
  onLearnMore: () => void;
}

// ─── Component ───────────────────────────────────────────────

export function BundleCard({ bundle, onSelect, onLearnMore }: BundleCardProps) {
  return (
    <div data-testid="bundle-card" className="bg-white rounded-xl border p-6 hover:shadow-md transition-shadow flex flex-col">
      {/* Title + badges */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-900">{bundle.name}</h3>
        <div className="flex gap-1.5">
          {bundle.isRecommended && <BundleBadge type="recommended" />}
          {bundle.isPopular && <BundleBadge type="popular" />}
        </div>
      </div>

      {/* Metadata */}
      <p className="text-sm text-gray-500 mb-2">
        {bundle.methodCount} Methods
        {bundle.timeline ? ` \u00B7 ${bundle.timeline}` : ""}
      </p>

      {/* Description */}
      {bundle.description && (
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {bundle.description}
        </p>
      )}

      {/* Included tags */}
      {bundle.includedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {bundle.includedTags.map((tag) => (
            <span
              key={tag}
              className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Methods list */}
      {bundle.methods.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {bundle.methods.map((method) => (
            <div key={method.methodName} className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-gray-700">{method.methodName}</span>
            </div>
          ))}
        </div>
      )}

      {/* Price row */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-xl font-bold text-green-600">
          ${bundle.price.toLocaleString()}
        </span>
        {bundle.originalPrice && bundle.originalPrice > bundle.price && (
          <>
            <span className="text-sm line-through text-gray-400">
              ${bundle.originalPrice.toLocaleString()}
            </span>
            {bundle.discount && <BundleBadge type="save" discount={bundle.discount} />}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-auto pt-4">
        <Button data-testid="learn-more-button" variant="secondary" onClick={onLearnMore}>
          Learn More
        </Button>
        <Button
          data-testid="select-bundle-button"
          variant="primary"
          className="bg-green-600 hover:bg-green-700"
          onClick={onSelect}
        >
          Select Bundle
        </Button>
      </div>
    </div>
  );
}

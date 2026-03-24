"use client";

import React from "react";
import {
  Sparkles,
  Target,
  Palette,
  Eye,
  Lightbulb,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { Button, Badge } from "@/components/shared";
import { ElementRatingCard } from "./ElementRatingCard";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import type { StrategyLayer, ArchitectureLayer } from "../../types/campaign-wizard.types";

// ─── Constants ──────────────────────────────────────────

/** Rating keys for concept elements — used for gating and feedback compilation */
export const CONCEPT_RATING_KEYS = [
  "concept.creativePlatform",
  "concept.creativeTerritory",
  "concept.brandRole",
  "concept.memorableDevice",
  "concept.campaignTheme",
  "concept.effieRationale",
] as const;

// ─── Types ──────────────────────────────────────────────

interface ConceptReviewViewProps {
  strategy: StrategyLayer;
  architecture: ArchitectureLayer;
  onApprove: () => void;
  errorMessage?: string | null;
}

// ─── Component ──────────────────────────────────────────

export function ConceptReviewView({
  strategy,
  architecture,
  onApprove,
  errorMessage,
}: ConceptReviewViewProps) {
  const strategyRatings = useCampaignWizardStore((s) => s.strategyRatings);
  const conceptFeedback = useCampaignWizardStore((s) => s.conceptFeedback);
  const setConceptFeedback = useCampaignWizardStore((s) => s.setConceptFeedback);
  // Use the store's canonical gating logic to avoid duplicated all-rated checks
  const allRated = useCampaignWizardStore((s) => s.allConceptRated());

  // Progress display only — how many of the present concept elements have been rated
  const presentKeys = CONCEPT_RATING_KEYS.filter((key) => {
    const field = key.replace("concept.", "") as keyof StrategyLayer;
    return !!strategy[field];
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Review Creative Concept
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Rate each concept element to guide the final synthesis.
          All elements must be rated before you can proceed.
        </p>
      </div>

      {/* Read-only Rationale Summary */}
      <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Strategic Rationale (approved)
          </span>
        </div>

        {strategy.humanInsight && (
          <div className="flex items-start gap-2">
            <Eye className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600 italic">
              &ldquo;{strategy.humanInsight}&rdquo;
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {strategy.campaignTheme && (
            <div>
              <p className="font-medium text-gray-500">Theme</p>
              <p className="text-gray-700">{strategy.campaignTheme}</p>
            </div>
          )}
          <div>
            <p className="font-medium text-gray-500">Positioning</p>
            <p className="text-gray-700 line-clamp-2">{strategy.positioningStatement}</p>
          </div>
          <div>
            <p className="font-medium text-gray-500">Intent</p>
            <Badge variant="teal" className="mt-0.5">
              {strategy.strategicIntent === "brand_building"
                ? "Brand Building"
                : strategy.strategicIntent === "sales_activation"
                  ? "Sales Activation"
                  : "Hybrid"}
            </Badge>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          {(architecture.journeyPhases ?? []).length} phases, {" "}
          {(architecture.journeyPhases ?? []).reduce((sum, p) => sum + (p.touchpoints?.length ?? 0), 0)} touchpoints
        </div>
      </div>

      {/* Concept Elements with Ratings */}
      <div className="border border-gray-200 rounded-lg p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">
            Creative Concept
          </span>
          <span className="text-xs text-muted-foreground">
            Rate each element
          </span>
        </div>

        {/* Creative Platform (Big Idea) */}
        {strategy.creativePlatform && (
          <ElementRatingCard
            label="Creative Platform (Big Idea)"
            value={strategy.creativePlatform}
            ratingKey="concept.creativePlatform"
            icon={Lightbulb}
            highlighted
            highlightBg="bg-amber-50"
          />
        )}

        {/* Creative Territory */}
        {strategy.creativeTerritory && (
          <ElementRatingCard
            label="Creative Territory"
            value={strategy.creativeTerritory}
            ratingKey="concept.creativeTerritory"
          />
        )}

        {/* Brand Role */}
        {strategy.brandRole && (
          <ElementRatingCard
            label="Brand Role"
            value={strategy.brandRole}
            ratingKey="concept.brandRole"
          />
        )}

        {/* Memorable Device */}
        {strategy.memorableDevice && (
          <ElementRatingCard
            label="Memorable Device"
            value={strategy.memorableDevice}
            ratingKey="concept.memorableDevice"
            highlighted
            highlightBg="bg-blue-50"
          />
        )}

        {/* Campaign Theme */}
        {strategy.campaignTheme && (
          <ElementRatingCard
            label="Campaign Theme"
            value={strategy.campaignTheme}
            ratingKey="concept.campaignTheme"
          />
        )}

        {/* Effie Rationale */}
        {strategy.effieRationale && (
          <ElementRatingCard
            label="Effie Award Rationale"
            value={strategy.effieRationale}
            ratingKey="concept.effieRationale"
            highlighted
            highlightBg="bg-emerald-50"
          />
        )}
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      {/* Feedback + CTA */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">Additional Feedback</span>
          <span className="text-xs text-muted-foreground">(optional)</span>
        </div>
        <textarea
          value={conceptFeedback}
          onChange={(e) => setConceptFeedback(e.target.value)}
          placeholder="Any adjustments to the creative concept before finalizing..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />

        {/* Rating progress */}
        {!allRated && presentKeys.length > 0 && (
          <p className="text-xs text-amber-600 text-center">
            {presentKeys.filter((k) => !!strategyRatings[k]).length} of {presentKeys.length} elements rated
          </p>
        )}

        <div className="flex justify-center">
          <Button
            variant="cta"
            size="lg"
            icon={Sparkles}
            onClick={onApprove}
            disabled={!allRated}
          >
            Approve Creative Concept
          </Button>
        </div>
      </div>
    </div>
  );
}

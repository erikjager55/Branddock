"use client";

import React from "react";
import {
  Target,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Crosshair,
  Lightbulb,
} from "lucide-react";
import { Badge } from "@/components/shared";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import type { StrategyLayer, StrategicChoice } from "@/lib/campaigns/strategy-blueprint.types";

// ─── Types ──────────────────────────────────────────────

interface VariantStrategyOverviewProps {
  strategyLayer: StrategyLayer;
  variantKey: string;
}

// ─── Sub-Components ─────────────────────────────────────

function RatingButtons({ ratingKey }: { ratingKey: string }) {
  const rating = useCampaignWizardStore((s) => s.strategyRatings[ratingKey]);
  const setRating = useCampaignWizardStore((s) => s.setStrategyRating);

  return (
    <span className="inline-flex items-center gap-0.5 ml-2 flex-shrink-0">
      <button
        type="button"
        aria-pressed={rating === "up"}
        onClick={() => setRating(ratingKey, rating === "up" ? null : "up")}
        className={`p-0.5 rounded transition-colors ${
          rating === "up"
            ? "text-emerald-600 bg-emerald-50"
            : "text-gray-300 hover:text-emerald-500"
        }`}
        title="Approve this element"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        aria-pressed={rating === "down"}
        onClick={() => setRating(ratingKey, rating === "down" ? null : "down")}
        className={`p-0.5 rounded transition-colors ${
          rating === "down"
            ? "text-red-500 bg-red-50"
            : "text-gray-300 hover:text-red-400"
        }`}
        title="Needs change"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}

function RatableField({
  label,
  value,
  ratingKey,
}: {
  label: string;
  value: string;
  ratingKey: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <RatingButtons ratingKey={ratingKey} />
      </div>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  );
}

function getChoiceText(choice: string | StrategicChoice): string {
  return typeof choice === "string" ? choice : choice.choice;
}

function getChoiceRationale(choice: string | StrategicChoice): string | null {
  return typeof choice === "string" ? null : choice.rationale;
}

function getChoiceTradeoff(choice: string | StrategicChoice): string | null {
  return typeof choice === "string" ? null : choice.tradeoff;
}

// ─── Main Component ─────────────────────────────────────

export function VariantStrategyOverview({ strategyLayer, variantKey }: VariantStrategyOverviewProps) {
  const messagingHierarchy = strategyLayer.messagingHierarchy ?? { brandMessage: "", campaignMessage: "", proofPoints: [] };
  const jtbdFraming = strategyLayer.jtbdFraming ?? { jobStatement: "", functionalJob: "", emotionalJob: "", socialJob: "" };
  const strategicChoices = strategyLayer.strategicChoices ?? [];

  return (
    <div className="border border-gray-200 rounded-lg p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-semibold text-gray-900">
          Strategy
        </span>
        <span className="text-xs text-muted-foreground">
          Rate elements to guide synthesis
        </span>
      </div>

      {/* Theme + Positioning + Intent */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RatableField
          label="Campaign Theme"
          value={strategyLayer.campaignTheme}
          ratingKey={`${variantKey}.theme`}
        />
        <RatableField
          label="Positioning Statement"
          value={strategyLayer.positioningStatement}
          ratingKey={`${variantKey}.positioning`}
        />
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
            Strategic Intent
          </p>
          <Badge variant="teal">
            {strategyLayer.strategicIntent === "brand_building"
              ? "Brand Building"
              : strategyLayer.strategicIntent === "sales_activation"
                ? "Sales Activation"
                : "Hybrid"}{" "}
            ({strategyLayer.intentRatio.brand}/{strategyLayer.intentRatio.activation})
          </Badge>
        </div>
      </div>

      {/* Messaging Hierarchy */}
      <div className="border-t border-gray-100 pt-4 space-y-3">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Messaging Hierarchy
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <RatableField
            label="Brand Message"
            value={messagingHierarchy.brandMessage}
            ratingKey={`${variantKey}.messaging.brand`}
          />
          <RatableField
            label="Campaign Message"
            value={messagingHierarchy.campaignMessage}
            ratingKey={`${variantKey}.messaging.campaign`}
          />
        </div>
        {messagingHierarchy.proofPoints.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Proof Points
              </p>
              <RatingButtons ratingKey={`${variantKey}.messaging.proofPoints`} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {messagingHierarchy.proofPoints.map((pp, i) => (
                <Badge key={i} variant="default">
                  {pp}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* JTBD Framing */}
      <div className="border-t border-gray-100 pt-4 space-y-3">
        <div className="flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-gray-400" />
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Jobs-to-be-Done
          </p>
        </div>
        <div className="space-y-2">
          <RatableField
            label="Job Statement"
            value={jtbdFraming.jobStatement}
            ratingKey={`${variantKey}.jtbd.statement`}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Functional
              </p>
              <p className="text-sm text-gray-700">{jtbdFraming.functionalJob}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Emotional
              </p>
              <p className="text-sm text-gray-700">{jtbdFraming.emotionalJob}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Social</p>
              <p className="text-sm text-gray-700">{jtbdFraming.socialJob}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Choices */}
      {strategicChoices.length > 0 && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Strategic Choices
            </p>
          </div>
          <div className="space-y-2">
            {strategicChoices.map((choice, i) => (
              <div
                key={i}
                className="p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {getChoiceText(choice)}
                    </p>
                    {getChoiceRationale(choice) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Rationale: {getChoiceRationale(choice)}
                      </p>
                    )}
                    {getChoiceTradeoff(choice) && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        Trade-off: {getChoiceTradeoff(choice)}
                      </p>
                    )}
                  </div>
                  <RatingButtons ratingKey={`${variantKey}.choice.${i}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

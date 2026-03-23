"use client";

import React from "react";
import {
  Target,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Crosshair,
  Lightbulb,
  Eye,
  Palette,
  Compass,
  Shield,
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
    <span className="inline-flex items-center gap-1 ml-2 flex-shrink-0">
      <button
        type="button"
        aria-pressed={rating === "up"}
        onClick={() => setRating(ratingKey, rating === "up" ? null : "up")}
        className={`px-1.5 py-1 rounded-md border transition-colors ${
          rating === "up"
            ? "bg-emerald-100 border-emerald-300 text-emerald-600"
            : "bg-gray-50 border-gray-200 text-gray-400 hover:text-emerald-500 hover:border-emerald-200"
        }`}
        title="Approve"
      >
        <ThumbsUp className="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-pressed={rating === "down"}
        onClick={() => setRating(ratingKey, rating === "down" ? null : "down")}
        className={`px-1.5 py-1 rounded-md border transition-colors ${
          rating === "down"
            ? "bg-red-100 border-red-300 text-red-500"
            : "bg-gray-50 border-gray-200 text-gray-400 hover:text-red-400 hover:border-red-200"
        }`}
        title="Needs change"
      >
        <ThumbsDown className="w-4 h-4" />
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
  const intentRatio = strategyLayer.intentRatio ?? { brand: 50, activation: 50 };

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

      {/* Human Insight — the foundation */}
      {strategyLayer.humanInsight && (
        <div className="p-3.5 bg-violet-50 border border-violet-200 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            <Eye className="w-3.5 h-3.5 text-violet-500" />
            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider">
              Human Insight
            </p>
            <RatingButtons ratingKey={`${variantKey}.humanInsight`} />
          </div>
          <p className="text-sm text-gray-800 italic leading-relaxed">
            &ldquo;{strategyLayer.humanInsight}&rdquo;
          </p>
          {strategyLayer.culturalTension && (
            <p className="text-xs text-violet-600 mt-1.5">
              <span className="font-medium">Cultural tension:</span> {strategyLayer.culturalTension}
            </p>
          )}
        </div>
      )}

      {/* Creative Platform (Big Idea) — hero element */}
      {strategyLayer.creativePlatform && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            <Palette className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Creative Platform (Big Idea)
            </p>
            <RatingButtons ratingKey={`${variantKey}.creativePlatform`} />
          </div>
          <p className="text-base font-semibold text-gray-900">
            {strategyLayer.creativePlatform}
          </p>
        </div>
      )}

      {/* Creative Territory + Brand Role */}
      {(strategyLayer.creativeTerritory || strategyLayer.brandRole) && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategyLayer.creativeTerritory && (
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Compass className="w-3 h-3 text-gray-400" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Creative Territory
              </p>
              <RatingButtons ratingKey={`${variantKey}.creativeTerritory`} />
            </div>
            <p className="text-sm text-gray-700">{strategyLayer.creativeTerritory}</p>
          </div>
        )}
        {strategyLayer.brandRole && (
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Shield className="w-3 h-3 text-gray-400" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Brand Role
              </p>
              <RatingButtons ratingKey={`${variantKey}.brandRole`} />
            </div>
            <p className="text-sm text-gray-700">{strategyLayer.brandRole}</p>
          </div>
        )}
      </div>
      )}

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
            ({intentRatio.brand}/{intentRatio.activation})
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

"use client";

import React from "react";
import {
  Target,
  MessageSquare,
  Crosshair,
  Lightbulb,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/shared";
import { ElementRatingCard } from "./ElementRatingCard";
import type { StrategyLayer, StrategicChoice } from "@/lib/campaigns/strategy-blueprint.types";

// ─── Types ──────────────────────────────────────────────

interface VariantStrategyOverviewProps {
  strategyLayer: StrategyLayer;
  variantKey: string;
}

// ─── Helpers ────────────────────────────────────────────

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

      {/* Human Insight */}
      {strategyLayer.humanInsight && (
        <ElementRatingCard
          label="Human Insight"
          value={strategyLayer.humanInsight}
          ratingKey={`${variantKey}.humanInsight`}
          icon={Eye}
          highlighted
          highlightBg="bg-violet-50"
        />
      )}

      {/* Cultural Tension */}
      {strategyLayer.culturalTension && (
        <ElementRatingCard
          label="Cultural Tension"
          value={strategyLayer.culturalTension}
          ratingKey={`${variantKey}.culturalTension`}
          highlighted
          highlightBg="bg-violet-50"
        />
      )}

      {/* Theme + Positioning + Intent */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ElementRatingCard
          label="Campaign Theme"
          value={strategyLayer.campaignTheme}
          ratingKey={`${variantKey}.theme`}
        />
        <ElementRatingCard
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
          {messagingHierarchy.brandMessage && (
            <ElementRatingCard
              label="Brand Message"
              value={messagingHierarchy.brandMessage}
              ratingKey={`${variantKey}.messaging.brand`}
            />
          )}
          {messagingHierarchy.campaignMessage && (
            <ElementRatingCard
              label="Campaign Message"
              value={messagingHierarchy.campaignMessage}
              ratingKey={`${variantKey}.messaging.campaign`}
            />
          )}
        </div>
        {messagingHierarchy.proofPoints.length > 0 && (
          <ElementRatingCard
            label="Proof Points"
            value={messagingHierarchy.proofPoints.join(" · ")}
            ratingKey={`${variantKey}.messaging.proofPoints`}
          />
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
          {jtbdFraming.jobStatement && (
            <ElementRatingCard
              label="Job Statement"
              value={jtbdFraming.jobStatement}
              ratingKey={`${variantKey}.jtbd.statement`}
            />
          )}
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
            {strategicChoices.map((choice, i) => {
              const rationale = getChoiceRationale(choice);
              const tradeoff = getChoiceTradeoff(choice);
              const parts = [getChoiceText(choice)];
              if (rationale) parts.push(`Rationale: ${rationale}`);
              if (tradeoff) parts.push(`Trade-off: ${tradeoff}`);

              return (
                <ElementRatingCard
                  key={i}
                  label={`Choice ${i + 1}`}
                  value={parts.join(" — ")}
                  ratingKey={`${variantKey}.choice.${i}`}
                  highlighted
                  highlightBg="bg-gray-50"
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

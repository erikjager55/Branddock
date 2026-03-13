"use client";

import { Badge } from "@/components/shared";
import type { StrategyLayer } from "@/lib/campaigns/strategy-blueprint.types";

interface StrategySectionProps {
  strategy: StrategyLayer;
}

/** Layer 1: Campaign Strategy — theme, positioning, messaging, JTBD, strategic choices */
export function StrategySection({ strategy }: StrategySectionProps) {
  return (
    <div className="space-y-6">
      {/* Campaign Theme */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Campaign Theme</h4>
        <p className="text-base font-medium text-gray-800">{strategy.campaignTheme}</p>
      </div>

      {/* Positioning Statement */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Positioning Statement</h4>
        <p className="text-sm text-gray-700 leading-relaxed">{strategy.positioningStatement}</p>
      </div>

      {/* Strategic Intent */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Strategic Intent</h4>
        <div className="flex items-center gap-3">
          <Badge variant="teal">
            {strategy.strategicIntent === "brand_building"
              ? "Brand Building"
              : strategy.strategicIntent === "sales_activation"
                ? "Sales Activation"
                : "Hybrid"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {strategy.intentRatio.brand}/{strategy.intentRatio.activation} brand/activation
          </span>
        </div>
      </div>

      {/* Messaging Hierarchy */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Messaging Hierarchy</h4>
        <div className="space-y-3">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider mb-1">Brand Message</p>
            <p className="text-sm text-gray-800">{strategy.messagingHierarchy.brandMessage}</p>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-medium text-blue-700 uppercase tracking-wider mb-1">Campaign Message</p>
            <p className="text-sm text-gray-800">{strategy.messagingHierarchy.campaignMessage}</p>
          </div>
          {strategy.messagingHierarchy.proofPoints.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Proof Points</p>
              <ul className="space-y-1.5">
                {strategy.messagingHierarchy.proofPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* JTBD Framing */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Jobs-to-be-Done</h4>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
          <p className="text-xs font-medium text-amber-700 mb-1">Job Statement</p>
          <p className="text-sm text-gray-800 italic">&ldquo;{strategy.jtbdFraming.jobStatement}&rdquo;</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-1">Functional Job</p>
            <p className="text-sm text-gray-700">{strategy.jtbdFraming.functionalJob}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-1">Emotional Job</p>
            <p className="text-sm text-gray-700">{strategy.jtbdFraming.emotionalJob}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-1">Social Job</p>
            <p className="text-sm text-gray-700">{strategy.jtbdFraming.socialJob}</p>
          </div>
        </div>
      </div>

      {/* Strategic Choices */}
      {strategy.strategicChoices.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Strategic Choices</h4>
          <ul className="space-y-2">
            {strategy.strategicChoices.map((choice, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {choice}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

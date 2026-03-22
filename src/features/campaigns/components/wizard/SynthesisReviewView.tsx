"use client";

import React from "react";
import {
  Sparkles,
  Target,
  Layers,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { Button, Badge } from "@/components/shared";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import type { ArchitectureLayer, StrategyLayer } from "../../types/campaign-wizard.types";
import type { StrategicChoice } from "@/lib/campaigns/strategy-blueprint.types";

/** Extract display text from a strategic choice (string or object) */
function getChoiceText(choice: string | StrategicChoice): string {
  return typeof choice === "string" ? choice : choice.choice;
}

// ─── Types ──────────────────────────────────────────────

interface SynthesisReviewViewProps {
  synthesizedStrategy: StrategyLayer;
  synthesizedArchitecture: ArchitectureLayer;
  onElaborate: () => void;
  errorMessage?: string | null;
}

// ─── Component ──────────────────────────────────────────

export function SynthesisReviewView({
  synthesizedStrategy,
  synthesizedArchitecture,
  onElaborate,
  errorMessage,
}: SynthesisReviewViewProps) {
  const synthesisFeedback = useCampaignWizardStore((s) => s.synthesisFeedback);
  const setSynthesisFeedback = useCampaignWizardStore((s) => s.setSynthesisFeedback);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Review Definitive Strategy
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          The AI has synthesized the best elements from all three variants into one optimal strategy.
          Review it and provide any additional feedback before elaborating the customer journey.
        </p>
      </div>

      {/* Strategy Layer */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">Campaign Strategy</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Theme
            </p>
            <p className="text-sm font-medium text-gray-900">
              {synthesizedStrategy.campaignTheme}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Strategic Intent
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="teal">
                {synthesizedStrategy.strategicIntent === "brand_building"
                  ? "Brand Building"
                  : synthesizedStrategy.strategicIntent === "sales_activation"
                    ? "Sales Activation"
                    : "Hybrid"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {synthesizedStrategy.intentRatio.brand}/{synthesizedStrategy.intentRatio.activation} brand/activation
              </span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Positioning
          </p>
          <p className="text-sm text-gray-700">{synthesizedStrategy.positioningStatement}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Messaging
          </p>
          <ul className="space-y-1">
            <li className="text-xs text-gray-600 flex items-start gap-1.5">
              <span className="text-emerald-500 mt-0.5">&#8226;</span>
              <span><span className="font-medium text-gray-700">Brand:</span> {synthesizedStrategy.messagingHierarchy.brandMessage}</span>
            </li>
            <li className="text-xs text-gray-600 flex items-start gap-1.5">
              <span className="text-emerald-500 mt-0.5">&#8226;</span>
              <span><span className="font-medium text-gray-700">Campaign:</span> {synthesizedStrategy.messagingHierarchy.campaignMessage}</span>
            </li>
            {synthesizedStrategy.messagingHierarchy.proofPoints.length > 0 &&
              synthesizedStrategy.messagingHierarchy.proofPoints.map((pp, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5">&#8226;</span>
                  <span><span className="font-medium text-gray-700">Proof:</span> {pp}</span>
                </li>
              ))}
          </ul>
        </div>

        {synthesizedStrategy.strategicChoices.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Strategic Choices
            </p>
            <ul className="space-y-1">
              {synthesizedStrategy.strategicChoices.map((choice, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5">&#8226;</span>
                  {getChoiceText(choice)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Architecture Layer */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">Campaign Journey</span>
          <Badge variant="default">{synthesizedArchitecture.campaignType}</Badge>
          <span className="text-xs text-muted-foreground">
            {synthesizedArchitecture.journeyPhases.length} phase{synthesizedArchitecture.journeyPhases.length !== 1 ? "s" : ""},{" "}
            {synthesizedArchitecture.journeyPhases.reduce((sum, p) => sum + p.touchpoints.length, 0)} touchpoints
          </span>
        </div>

        <div className="flex gap-2 flex-wrap">
          {synthesizedArchitecture.journeyPhases.map((phase, i) => (
            <div
              key={phase.id ?? `phase-${i}`}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
            >
              <p className="font-medium text-gray-900">{phase.name}</p>
              <p className="text-muted-foreground">
                {phase.touchpoints.length} touchpoint{phase.touchpoints.length !== 1 ? "s" : ""}
              </p>
              {phase.goal && (
                <p className="text-muted-foreground mt-0.5 line-clamp-1">{phase.goal}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error banner (shown after Phase C failure) */}
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
          value={synthesisFeedback}
          onChange={(e) => setSynthesisFeedback(e.target.value)}
          placeholder="Any adjustments to the strategy before we elaborate the channel & asset plan..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        <div className="flex justify-center">
          <Button variant="cta" size="lg" icon={Sparkles} onClick={onElaborate}>
            Elaborate Customer Journey
          </Button>
        </div>
      </div>
    </div>
  );
}

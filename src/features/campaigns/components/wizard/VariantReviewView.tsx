"use client";

import React from "react";
import {
  Sparkles,
  Users,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/shared";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import type { ArchitectureLayer, StrategyLayer, PersonaValidationResult } from "../../types/campaign-wizard.types";
import { VariantDetailCard } from "./VariantDetailCard";
import { PersonaFeedbackCard } from "./PersonaFeedbackCard";

// ─── Types ──────────────────────────────────────────────

interface VariantReviewViewProps {
  strategyLayerA: StrategyLayer;
  strategyLayerB: StrategyLayer;
  variantA: ArchitectureLayer;
  variantB: ArchitectureLayer;
  personaValidation: PersonaValidationResult[];
  variantAScore: number;
  variantBScore: number;
  onSynthesize: () => void;
  errorMessage?: string | null;
}

// ─── Main Component ─────────────────────────────────────

export function VariantReviewView({
  strategyLayerA,
  strategyLayerB,
  variantA,
  variantB,
  personaValidation,
  variantAScore,
  variantBScore,
  onSynthesize,
  errorMessage,
}: VariantReviewViewProps) {
  const variantFeedback = useCampaignWizardStore((s) => s.variantFeedback);
  const setVariantFeedback = useCampaignWizardStore((s) => s.setVariantFeedback);
  const endorsedPersonaIds = useCampaignWizardStore((s) => s.endorsedPersonaIds);
  const togglePersonaEndorsement = useCampaignWizardStore((s) => s.togglePersonaEndorsement);

  const preferredVariant = variantAScore >= variantBScore ? "A" : "B";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Review Strategy Variants
        </h3>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Two AI models generated independent campaign journey variants. Review the strategy
          foundation, rate elements, endorse persona feedback, and provide notes to guide the
          definitive synthesis.
        </p>
      </div>

      {/* 1. Variant Details (each with own strategy + architecture) */}
      <div className="space-y-3">
        <VariantDetailCard
          label="Variant A (Claude)"
          variant={variantA}
          strategy={strategyLayerA}
          variantKey="A"
          score={variantAScore}
          isPreferred={preferredVariant === "A"}
        />
        <VariantDetailCard
          label="Variant B (Gemini)"
          variant={variantB}
          strategy={strategyLayerB}
          variantKey="B"
          score={variantBScore}
          isPreferred={preferredVariant === "B"}
        />
      </div>

      {/* 3. Persona Feedback with endorsement */}
      {personaValidation.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-900">
              Persona Feedback ({personaValidation.length})
            </span>
            <span className="text-xs text-muted-foreground">
              Endorse feedback to prioritize in synthesis
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {personaValidation.map((p) => (
              <PersonaFeedbackCard
                key={p.personaId}
                persona={p}
                isEndorsed={endorsedPersonaIds.includes(p.personaId)}
                onToggleEndorse={() => togglePersonaEndorsement(p.personaId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 4. Error banner (shown after Phase B failure) */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      {/* 5. Free-text feedback + CTA */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">Additional Notes</span>
          <span className="text-xs text-muted-foreground">(optional)</span>
        </div>
        <textarea
          value={variantFeedback}
          onChange={(e) => setVariantFeedback(e.target.value)}
          placeholder="Tell the AI which aspects of each variant you prefer, what to keep, what to change..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        <div className="flex justify-center">
          <Button variant="cta" size="lg" icon={Sparkles} onClick={onSynthesize}>
            Generate Definitive Strategy
          </Button>
        </div>
      </div>
    </div>
  );
}

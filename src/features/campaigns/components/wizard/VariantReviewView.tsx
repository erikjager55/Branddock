"use client";

import React, { useMemo } from "react";
import {
  Sparkles,
  Users,
  MessageSquare,
  AlertCircle,
  Layers,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { Button, Badge } from "@/components/shared";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import type { ArchitectureLayer, StrategyLayer, PersonaValidationResult } from "../../types/campaign-wizard.types";
import { VariantDetailCard } from "./VariantDetailCard";
import { PersonaFeedbackCard } from "./PersonaFeedbackCard";

// ─── Types ──────────────────────────────────────────────

interface VariantReviewViewProps {
  strategyLayerA: StrategyLayer;
  strategyLayerB: StrategyLayer;
  strategyLayerC: StrategyLayer;
  variantA: ArchitectureLayer;
  variantB: ArchitectureLayer;
  variantC: ArchitectureLayer;
  personaValidation: PersonaValidationResult[];
  variantAScore: number;
  variantBScore: number;
  variantCScore: number;
  onSynthesize: () => void;
  errorMessage?: string | null;
}

// ─── Section Number ─────────────────────────────────────

function SectionNumber({ number }: { number: number }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex-shrink-0">
      {number}
    </span>
  );
}

// ─── Rating Summary Bar ─────────────────────────────────

function RatingSummaryBar() {
  const strategyRatings = useCampaignWizardStore((s) => s.strategyRatings);

  const counts = useMemo(() => {
    const entries = Object.values(strategyRatings);
    return {
      approved: entries.filter((v) => v === "up").length,
      needsChange: entries.filter((v) => v === "down").length,
      total: entries.length,
    };
  }, [strategyRatings]);

  if (counts.total === 0) return null;

  return (
    <div className="flex items-center gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        Your Ratings
      </span>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-sm font-semibold text-emerald-600">
            {counts.approved}
          </span>
          <span className="text-xs text-gray-500">approved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ThumbsDown className="w-3.5 h-3.5 text-red-400" />
          <span className="text-sm font-semibold text-red-500">
            {counts.needsChange}
          </span>
          <span className="text-xs text-gray-500">needs change</span>
        </div>
      </div>
      {/* Visual progress bar */}
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden flex">
        {counts.approved > 0 && (
          <div
            className="h-full bg-emerald-400 rounded-l-full"
            style={{ width: `${(counts.approved / counts.total) * 100}%` }}
          />
        )}
        {counts.needsChange > 0 && (
          <div
            className="h-full bg-red-300"
            style={{ width: `${(counts.needsChange / counts.total) * 100}%` }}
          />
        )}
      </div>
      <span className="text-xs text-gray-400">
        {counts.total} rated
      </span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────

export function VariantReviewView({
  strategyLayerA,
  strategyLayerB,
  strategyLayerC,
  variantA,
  variantB,
  variantC,
  personaValidation,
  variantAScore,
  variantBScore,
  variantCScore,
  onSynthesize,
  errorMessage,
}: VariantReviewViewProps) {
  const variantFeedback = useCampaignWizardStore((s) => s.variantFeedback);
  const setVariantFeedback = useCampaignWizardStore((s) => s.setVariantFeedback);
  const endorsedPersonaIds = useCampaignWizardStore((s) => s.endorsedPersonaIds);
  const togglePersonaEndorsement = useCampaignWizardStore((s) => s.togglePersonaEndorsement);

  const preferredVariant = useMemo(() => {
    const scores = { A: variantAScore, B: variantBScore, C: variantCScore };
    return (Object.entries(scores) as [string, number][]).reduce((best, [key, score]) =>
      score > best[1] ? [key, score] : best
    , ["A", variantAScore])[0];
  }, [variantAScore, variantBScore, variantCScore]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Review Strategy Variants
        </h3>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Three AI models generated independent campaign journey variants. Review the strategy
          foundation, rate elements, endorse persona feedback, and provide notes to guide the
          definitive synthesis.
        </p>
      </div>

      {/* Rating summary bar */}
      <RatingSummaryBar />

      {/* Section 1: Strategy Variants */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <SectionNumber number={1} />
          <Layers className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">Strategy Variants</span>
          <span className="text-xs text-muted-foreground">
            Rate strategy elements with thumbs up/down
          </span>
        </div>
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
            label="Variant B (GPT)"
            variant={variantB}
            strategy={strategyLayerB}
            variantKey="B"
            score={variantBScore}
            isPreferred={preferredVariant === "B"}
          />
          <VariantDetailCard
            label="Variant C (Gemini)"
            variant={variantC}
            strategy={strategyLayerC}
            variantKey="C"
            score={variantCScore}
            isPreferred={preferredVariant === "C"}
          />
        </div>
      </div>

      {/* Divider */}
      <hr className="border-gray-200" />

      {/* Section 2: Persona Feedback */}
      {personaValidation.length > 0 && (
        <>
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <SectionNumber number={2} />
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">
                Persona Feedback
              </span>
              <Badge variant="default">{personaValidation.length} personas</Badge>
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

          {/* Divider */}
          <hr className="border-gray-200" />
        </>
      )}

      {/* Error banner */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      {/* Section 3: Your Notes + CTA */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <SectionNumber number={personaValidation.length > 0 ? 3 : 2} />
          <MessageSquare className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">Your Notes</span>
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

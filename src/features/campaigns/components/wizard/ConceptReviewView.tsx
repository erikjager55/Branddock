"use client";

import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  Target,
  Palette,
  Eye,
  Lightbulb,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  CheckCheck,
} from "lucide-react";
import { Button, Badge } from "@/components/shared";
import { ElementRatingCard } from "./ElementRatingCard";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import type { StrategyLayer, ArchitectureLayer } from "../../types/campaign-wizard.types";

// ─── Constants ──────────────────────────────────────────

interface ConceptElementSpec {
  key: string;
  field: keyof StrategyLayer;
  label: string;
  icon?: React.ElementType;
  highlighted?: boolean;
  highlightBg?: string;
}

/** Single source of truth for the 6 concept elements rendered in the review.
 *  Mirrors the conceptFields list in useCampaignWizardStore.allConceptRated().
 */
export const CONCEPT_ELEMENTS: readonly ConceptElementSpec[] = [
  {
    key: "concept.creativePlatform",
    field: "creativePlatform",
    label: "Creative Platform (Big Idea)",
    icon: Lightbulb,
    highlighted: true,
    highlightBg: "bg-amber-50",
  },
  {
    key: "concept.creativeTerritory",
    field: "creativeTerritory",
    label: "Creative Territory",
  },
  {
    key: "concept.brandRole",
    field: "brandRole",
    label: "Brand Role",
  },
  {
    key: "concept.memorableDevice",
    field: "memorableDevice",
    label: "Memorable Device",
    highlighted: true,
    highlightBg: "bg-blue-50",
  },
  {
    key: "concept.campaignTheme",
    field: "campaignTheme",
    label: "Campaign Theme",
  },
  {
    key: "concept.effieRationale",
    field: "effieRationale",
    label: "Award Potential Rationale",
    highlighted: true,
    highlightBg: "bg-emerald-50",
  },
] as const;

/** Backwards-compatible export for any external consumer */
export const CONCEPT_RATING_KEYS = CONCEPT_ELEMENTS.map((e) => e.key);

// ─── Types ──────────────────────────────────────────────

interface ConceptReviewViewProps {
  strategy: StrategyLayer;
  architecture: ArchitectureLayer;
  onApprove: () => void;
  onRefine?: () => void;
  errorMessage?: string | null;
}

// ─── Component ──────────────────────────────────────────

export function ConceptReviewView({
  strategy,
  architecture,
  onApprove,
  onRefine,
  errorMessage,
}: ConceptReviewViewProps) {
  const strategyRatings = useCampaignWizardStore((s) => s.strategyRatings);
  const conceptFeedback = useCampaignWizardStore((s) => s.conceptFeedback);
  const setConceptFeedback = useCampaignWizardStore((s) => s.setConceptFeedback);
  const setStrategyRating = useCampaignWizardStore((s) => s.setStrategyRating);
  const allRated = useCampaignWizardStore((s) => s.allConceptRated());

  const presentElements = CONCEPT_ELEMENTS.filter((el) => !!strategy[el.field]);
  const ratedCount = presentElements.filter((el) => !!strategyRatings[el.key]).length;
  const unratedElements = presentElements.filter((el) => !strategyRatings[el.key]);

  // Open the optional-feedback disclosure only when content is already
  // present at first render. After mount the user is in control — store
  // updates to conceptFeedback won't yank the panel open or closed.
  const [feedbackOpen, setFeedbackOpen] = useState(() => !!conceptFeedback);

  const handleApproveClick = useCallback(() => {
    if (allRated) {
      onApprove();
      return;
    }
    if (unratedElements.length > 0) {
      const visibleLabels = unratedElements.slice(0, 3).map((el) => el.label);
      const remaining = unratedElements.length - visibleLabels.length;
      const description =
        remaining > 0
          ? `${visibleLabels.join(", ")} and ${remaining} more`
          : visibleLabels.join(", ");
      toast.warning("Rate every element first", { description });
      const firstKey = unratedElements[0].key;
      const target = document.querySelector<HTMLElement>(
        `[data-rating-key="${firstKey}"]`,
      );
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [allRated, onApprove, unratedElements]);

  const handleApproveAll = useCallback(() => {
    let touched = 0;
    presentElements.forEach((el) => {
      if (!strategyRatings[el.key]) {
        setStrategyRating(el.key, "up");
        touched += 1;
      }
    });
    if (touched > 0) {
      toast.success(`Marked ${touched} element${touched === 1 ? "" : "s"} as approved`);
    }
  }, [presentElements, strategyRatings, setStrategyRating]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Review Creative Concept
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Rate each element to guide the final synthesis. Use a quick thumbs-up
          for everything you accept as-is, or thumbs-down with a note where you
          want changes.
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
          {!allRated && presentElements.length > 0 && (
            <div className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                icon={CheckCheck}
                onClick={handleApproveAll}
                title="Mark every remaining element as approved"
              >
                Mark all as approved
              </Button>
            </div>
          )}
        </div>

        {presentElements.map((el) => (
          <ElementRatingCard
            key={el.key}
            label={el.label}
            value={String(strategy[el.field] ?? "")}
            ratingKey={el.key}
            icon={el.icon}
            highlighted={el.highlighted}
            highlightBg={el.highlightBg}
          />
        ))}
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      {/* Optional feedback — visually de-emphasized. Initial-opens when
          rehydrated content exists; thereafter user-controlled so subsequent
          store mutations don't yank the panel open or closed. */}
      <details
        className="border border-gray-100 rounded-lg bg-gray-50"
        open={feedbackOpen}
        onToggle={(e) => setFeedbackOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer px-4 py-2.5 text-xs font-medium text-gray-600 hover:text-gray-900 select-none flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
          Additional feedback
          <span className="text-muted-foreground font-normal">(optional)</span>
          {conceptFeedback && (
            <span className="ml-auto text-xs text-emerald-600">
              {conceptFeedback.length} chars
            </span>
          )}
        </summary>
        <div className="px-4 pb-4">
          <textarea
            value={conceptFeedback}
            onChange={(e) => setConceptFeedback(e.target.value)}
            placeholder="Any adjustments to the creative concept before finalizing..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          />
        </div>
      </details>

      {/* Progress + actions — inline at the bottom of step content */}
      <div className="space-y-3">
        {presentElements.length > 0 && (
          <p
            className={`text-xs font-medium text-center ${
              ratedCount === 0
                ? "text-muted-foreground"
                : allRated
                  ? "text-emerald-600"
                  : "text-amber-600"
            }`}
            aria-live="polite"
          >
            {allRated
              ? `All ${presentElements.length} elements rated — ready to approve`
              : `${ratedCount} of ${presentElements.length} elements rated`}
          </p>
        )}

        <div className="flex justify-center gap-3">
          {onRefine && (
            <Button
              variant="secondary"
              size="lg"
              icon={RefreshCw}
              onClick={onRefine}
            >
              Refine Concept
            </Button>
          )}
          <Button
            variant="cta"
            size="lg"
            icon={CheckCircle2}
            onClick={handleApproveClick}
          >
            Approve Concept
          </Button>
        </div>
      </div>
    </div>
  );
}

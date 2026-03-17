"use client";

import React, { useState } from "react";
import {
  Layers,
  ChevronDown,
  ChevronRight,
  MapPin,
  Users,
  Zap,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { Badge } from "@/components/shared";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import { VariantStrategyOverview } from "./VariantStrategyOverview";
import type {
  ArchitectureLayer,
  StrategyLayer,
  JourneyPhase,
  Touchpoint,
  PersonaPhaseData,
} from "@/lib/campaigns/strategy-blueprint.types";

// ─── Helpers ────────────────────────────────────────────

/** Format phase names: "unaware_discovery" → "Unaware Discovery" */
function formatPhaseName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Types ──────────────────────────────────────────────

interface VariantDetailCardProps {
  label: string;
  variant: ArchitectureLayer;
  strategy: StrategyLayer;
  variantKey: string;
  score: number;
  isPreferred: boolean;
}

// ─── Sub-Components ─────────────────────────────────────

function PersonaPhaseInfo({ data }: { data: PersonaPhaseData }) {
  return (
    <div className="p-2.5 bg-white rounded border border-gray-100">
      <p className="text-xs font-semibold text-gray-800 mb-1">
        {data.personaName}
      </p>
      <div className="space-y-1 text-xs text-gray-600">
        <p>
          <span className="font-medium text-gray-500">Mindset:</span>{" "}
          {data.mindset}
        </p>
        <p>
          <span className="font-medium text-gray-500">Key question:</span>{" "}
          {data.keyQuestion}
        </p>
        {data.needs.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {data.needs.map((n, i) => (
              <Badge key={i} variant="info">
                {n}
              </Badge>
            ))}
          </div>
        )}
        {data.painPoints.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {data.painPoints.map((p, i) => (
              <Badge key={i} variant="warning">
                {p}
              </Badge>
            ))}
          </div>
        )}
        {data.triggers.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {data.triggers.map((t, i) => (
              <Badge key={i} variant="default">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TouchpointRow({ touchpoint }: { touchpoint: Touchpoint }) {
  return (
    <div className="p-2.5 bg-white rounded border border-gray-100 space-y-1.5">
      <div className="flex items-center gap-2">
        <Badge variant={touchpoint.role === "primary" ? "teal" : "default"}>
          {touchpoint.role}
        </Badge>
        <span className="text-xs font-semibold text-gray-800">
          {touchpoint.channel}
        </span>
        <span className="text-xs text-muted-foreground">
          ({touchpoint.contentType})
        </span>
      </div>
      <p className="text-xs text-gray-700">{touchpoint.message}</p>
      {touchpoint.personaRelevance.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {touchpoint.personaRelevance.map((pr) => (
            <span
              key={pr.personaId}
              className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                pr.relevance === "high"
                  ? "bg-emerald-50 text-emerald-700"
                  : pr.relevance === "medium"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-gray-50 text-gray-600"
              }`}
              title={pr.messagingAngle}
            >
              <Users className="w-3 h-3" />
              {pr.personaId.slice(0, 8)}
              <span className="text-xs opacity-70">
                {pr.messagingAngle.length > 40
                  ? pr.messagingAngle.slice(0, 40) + "..."
                  : pr.messagingAngle}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function PhaseRatingButtons({ ratingKey }: { ratingKey: string }) {
  const rating = useCampaignWizardStore((s) => s.strategyRatings[ratingKey]);
  const setRating = useCampaignWizardStore((s) => s.setStrategyRating);

  return (
    <span className="inline-flex items-center gap-0.5 ml-1 flex-shrink-0">
      <button
        type="button"
        aria-pressed={rating === "up"}
        onClick={(e) => { e.stopPropagation(); setRating(ratingKey, rating === "up" ? null : "up"); }}
        className={`p-0.5 rounded transition-colors ${
          rating === "up"
            ? "text-emerald-600 bg-emerald-50"
            : "text-gray-300 hover:text-emerald-500"
        }`}
        title="Approve this phase"
      >
        <ThumbsUp className="w-3 h-3" />
      </button>
      <button
        type="button"
        aria-pressed={rating === "down"}
        onClick={(e) => { e.stopPropagation(); setRating(ratingKey, rating === "down" ? null : "down"); }}
        className={`p-0.5 rounded transition-colors ${
          rating === "down"
            ? "text-red-500 bg-red-50"
            : "text-gray-300 hover:text-red-400"
        }`}
        title="Needs change"
      >
        <ThumbsDown className="w-3 h-3" />
      </button>
    </span>
  );
}

function PhaseSection({ phase, index, variantKey }: { phase: JourneyPhase; index: number; variantKey: string }) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        )}
        <span className="text-xs font-semibold text-gray-900 flex-1">
          {formatPhaseName(phase.name)}
        </span>
        <PhaseRatingButtons ratingKey={`${variantKey}.phase.${index}`} />
        <span className="text-xs text-muted-foreground">
          {phase.touchpoints.length} touchpoint{phase.touchpoints.length !== 1 ? "s" : ""}
        </span>
      </button>

      {expanded && (
        <div className="p-3 space-y-3">
          {/* Phase description + goal */}
          <div className="space-y-1">
            <p className="text-xs text-gray-700">{phase.description}</p>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-gray-400" />
              <p className="text-xs text-gray-600">
                <span className="font-medium">Goal:</span> {phase.goal}
              </p>
            </div>
          </div>

          {/* KPIs */}
          {phase.kpis.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {phase.kpis.map((kpi, i) => (
                <Badge key={i} variant="info">
                  {typeof kpi === "string" ? kpi : (kpi as { metric?: string; target?: string }).metric ?? "KPI"}
                </Badge>
              ))}
            </div>
          )}

          {/* Persona data */}
          {phase.personaPhaseData.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-gray-400" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Per Persona
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {phase.personaPhaseData.map((ppd) => (
                  <PersonaPhaseInfo key={ppd.personaId} data={ppd} />
                ))}
              </div>
            </div>
          )}

          {/* Touchpoints */}
          {phase.touchpoints.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-gray-400" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Touchpoints
                </p>
              </div>
              <div className="space-y-1.5">
                {phase.touchpoints.map((tp, i) => (
                  <TouchpointRow key={i} touchpoint={tp} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────

export function VariantDetailCard({
  label,
  variant,
  strategy,
  variantKey,
  score,
  isPreferred,
}: VariantDetailCardProps) {
  return (
    <div
      className={`border rounded-lg p-4 space-y-3 ${
        isPreferred ? "border-emerald-300 bg-emerald-50/30" : "border-gray-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">{label}</span>
          <Badge variant="default">{variant.campaignType}</Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Persona score:</span>
          <Badge variant={score >= 7 ? "success" : score >= 5 ? "warning" : "danger"}>
            {(score ?? 0).toFixed(1)}/10
          </Badge>
          {isPreferred && <Badge variant="teal">Preferred</Badge>}
        </div>
      </div>

      {/* Strategy overview (per-variant) */}
      <VariantStrategyOverview strategyLayer={strategy} variantKey={variantKey} />

      {/* Journey phases (collapsible) */}
      <div className="space-y-2">
        {variant.journeyPhases.map((phase, i) => (
          <PhaseSection key={phase.id ?? `phase-${i}`} phase={phase} index={i} variantKey={variantKey} />
        ))}
      </div>
    </div>
  );
}

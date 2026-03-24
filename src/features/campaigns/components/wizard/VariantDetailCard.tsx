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
  Route,
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
  const needs = Array.isArray(data.needs) ? data.needs : [];
  const painPoints = Array.isArray(data.painPoints) ? data.painPoints : [];
  const triggers = Array.isArray(data.triggers) ? data.triggers : [];

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
        {needs.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {needs.map((n, i) => (
              <Badge key={i} variant="info">
                {n}
              </Badge>
            ))}
          </div>
        )}
        {painPoints.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {painPoints.map((p, i) => (
              <Badge key={i} variant="warning">
                {p}
              </Badge>
            ))}
          </div>
        )}
        {triggers.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {triggers.map((t, i) => (
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

function CollapsiblePersonaData({ personaPhaseData, defaultCollapsed }: { personaPhaseData: PersonaPhaseData[]; defaultCollapsed: boolean }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1 group"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-gray-400" />
        ) : (
          <ChevronDown className="w-3 h-3 text-gray-400" />
        )}
        <Users className="w-3 h-3 text-gray-400" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Per Persona ({personaPhaseData.length})
        </p>
      </button>
      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {personaPhaseData.map((ppd) => (
            <PersonaPhaseInfo key={ppd.personaId} data={ppd} />
          ))}
        </div>
      )}
    </div>
  );
}

function TouchpointRow({ touchpoint, ratingKey }: { touchpoint: Touchpoint; ratingKey: string }) {
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
        <PhaseRatingButtons ratingKey={ratingKey} />
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
  const entry = useCampaignWizardStore((s) => s.strategyRatings[ratingKey]);
  const setRating = useCampaignWizardStore((s) => s.setStrategyRating);
  const rating = entry?.rating ?? null;

  return (
    <span className="inline-flex items-center gap-1 ml-1 flex-shrink-0">
      <button
        type="button"
        aria-pressed={rating === "up"}
        onClick={(e) => { e.stopPropagation(); setRating(ratingKey, rating === "up" ? null : "up"); }}
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
        onClick={(e) => { e.stopPropagation(); setRating(ratingKey, rating === "down" ? null : "down"); }}
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

function PhaseSection({ phase, index, variantKey }: { phase: JourneyPhase; index: number; variantKey: string }) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded); } }}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left cursor-pointer"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        )}
        <span className="text-xs font-semibold text-gray-900 flex-1">
          Phase {index + 1}: {formatPhaseName(phase.name)}
        </span>
        <PhaseRatingButtons ratingKey={`${variantKey}.phase.${index}`} />
        <Badge variant="default">
          {phase.touchpoints.length} touchpoint{phase.touchpoints.length !== 1 ? "s" : ""}
        </Badge>
      </div>

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

          {/* Persona data — collapsible when >2 personas */}
          {phase.personaPhaseData.length > 0 && (
            <CollapsiblePersonaData personaPhaseData={phase.personaPhaseData} defaultCollapsed={phase.personaPhaseData.length > 2} />
          )}

          {/* Touchpoints */}
          {phase.touchpoints.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-gray-400" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Touchpoints
                </p>
                <Badge variant="default">{phase.touchpoints.length}</Badge>
              </div>
              <div className="space-y-1.5">
                {phase.touchpoints.map((tp, i) => (
                  <TouchpointRow key={i} touchpoint={tp} ratingKey={`${variantKey}.phase.${index}.tp.${i}`} />
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
          <Badge variant={(score ?? 0) >= 7 ? "success" : (score ?? 0) >= 5 ? "warning" : "danger"}>
            {(score ?? 0).toFixed(1)}/10
          </Badge>
          {isPreferred && <Badge variant="teal">Preferred</Badge>}
        </div>
      </div>

      {/* Strategy overview (per-variant) */}
      <VariantStrategyOverview strategyLayer={strategy} variantKey={variantKey} />

      {/* Journey phases (collapsible) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">Journey Phases</span>
          <Badge variant="default">{variant.journeyPhases.length} phases</Badge>
        </div>
        {variant.journeyPhases.map((phase, i) => (
          <PhaseSection key={phase.id ?? `phase-${i}`} phase={phase} index={i} variantKey={variantKey} />
        ))}
      </div>
    </div>
  );
}

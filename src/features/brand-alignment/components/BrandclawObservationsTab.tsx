"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { useFormat } from "@/lib/ui-i18n/format";
import {
  Brain,
  Loader2,
  Play,
  AlertCircle,
  Inbox,
  Filter,
  LayoutList,
  LayoutGrid,
} from "lucide-react";
import {
  useRunStrategyAnalyst,
  useStrategyObservations,
} from "../hooks/use-strategy-observations";
import { ObservationCard } from "./ObservationCard";
import { EvidenceModal } from "./EvidenceModal";
import type {
  ObservationSeverity,
  StrategyObservationResponse,
} from "../api/brandclaw-observations.api";

const SEVERITY_OPTION_KEYS: Array<{ value: ObservationSeverity | "all"; labelKey: string }> = [
  { value: "all", labelKey: "brandclaw.severityOptions.all" },
  { value: "HIGH", labelKey: "brandclaw.severityOptions.HIGH" },
  { value: "MEDIUM", labelKey: "brandclaw.severityOptions.MEDIUM" },
  { value: "LOW", labelKey: "brandclaw.severityOptions.LOW" },
];

const DIMENSION_OPTION_KEYS: Array<{ value: string; labelKey: string }> = [
  { value: "", labelKey: "brandclaw.dimensionOptions.all" },
  { value: "voice_drift", labelKey: "brandclaw.dimensionOptions.voice_drift" },
  { value: "fidelity_decline", labelKey: "brandclaw.dimensionOptions.fidelity_decline" },
  { value: "review_pattern", labelKey: "brandclaw.dimensionOptions.review_pattern" },
  { value: "alignment_gap", labelKey: "brandclaw.dimensionOptions.alignment_gap" },
  { value: "publish_quality_trend", labelKey: "brandclaw.dimensionOptions.publish_quality_trend" },
];

type ViewMode = "grouped" | "flat";

const SEVERITY_RANK: Record<ObservationSeverity, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

function compareObservations(
  a: StrategyObservationResponse,
  b: StrategyObservationResponse,
): number {
  const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
  if (sev !== 0) return sev;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

/**
 * Brand Alignment Tab 5 — Strategy Analyst observations (Phase A).
 *
 * "Run Analyst" knop triggert backend agent-loop; observations rendered
 * groupbar per dimension + filter op severity. Geen autonomy — observations
 * zijn read-only suggesties met user-flags (Read/Acted/Dismissed).
 */
export function BrandclawObservationsTab() {
  const { t } = useTranslation('brand-alignment');
  const { formatDate } = useFormat();
  const [severityFilter, setSeverityFilter] = React.useState<ObservationSeverity | "all">("all");
  const [dimensionFilter, setDimensionFilter] = React.useState<string>("");
  const [includeDismissed, setIncludeDismissed] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>("grouped");
  const [evidenceObs, setEvidenceObs] = React.useState<StrategyObservationResponse | null>(null);

  const { data, isLoading, isError, error } = useStrategyObservations({
    severity: severityFilter === "all" ? undefined : severityFilter,
    dimension: dimensionFilter || undefined,
    includeDismissed,
  });

  const runAnalyst = useRunStrategyAnalyst();

  const observations = React.useMemo(
    () => data?.observations ?? [],
    [data?.observations],
  );
  const lastRun = data?.lastRun ?? null;

  // Flat severity-sorted list (HIGH → MEDIUM → LOW, then newest-first)
  const sortedFlat = React.useMemo(
    () => [...observations].sort(compareObservations),
    [observations],
  );

  // Group per dimension; binnen elke groep zelfde severity-sort
  const grouped = React.useMemo(() => {
    const map = new Map<string, StrategyObservationResponse[]>();
    for (const obs of observations) {
      const arr = map.get(obs.dimension) ?? [];
      arr.push(obs);
      map.set(obs.dimension, arr);
    }
    for (const arr of map.values()) {
      arr.sort(compareObservations);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [observations]);

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Brain className="w-5 h-5 text-violet-700 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{t('brandclaw.title')}</h2>
            <p className="text-xs text-gray-500 leading-snug max-w-prose">
              {t('brandclaw.subtitle')}
            </p>
            {lastRun && (
              <p className="text-[11px] text-gray-400 mt-1 font-mono">
                {t('brandclaw.lastRun')} {formatDate(lastRun.createdAt, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" · "}${Number(lastRun.totalCostUsd).toFixed(4)}
                {" · "}
                {(lastRun.latencyMs / 1000).toFixed(1)}s
                {" · "}
                {lastRun.agentVersion}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => runAnalyst.mutate()}
          disabled={runAnalyst.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
        >
          {runAnalyst.isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t('brandclaw.running')}
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              {t('brandclaw.runAnalyst')}
            </>
          )}
        </button>
      </header>

      {runAnalyst.isError && (
        <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{t('brandclaw.runFailed', { message: runAnalyst.error.message })}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Filter className="w-3 h-3 text-gray-400" />
        <select
          value={dimensionFilter}
          onChange={(e) => setDimensionFilter(e.target.value)}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          {DIMENSION_OPTION_KEYS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as ObservationSeverity | "all")}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          {SEVERITY_OPTION_KEYS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-1 text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={includeDismissed}
            onChange={(e) => setIncludeDismissed(e.target.checked)}
            className="rounded border-gray-300"
          />
          {t('brandclaw.includeDismissed')}
        </label>
        <div className="ml-auto inline-flex items-center gap-2">
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("grouped")}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs ${
                viewMode === "grouped"
                  ? "bg-violet-50 text-violet-700"
                  : "bg-white text-gray-500 hover:text-gray-700"
              }`}
              title={t('brandclaw.groupTooltip')}
            >
              <LayoutGrid className="w-3 h-3" />
              {t('brandclaw.group')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("flat")}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs border-l border-gray-300 ${
                viewMode === "flat"
                  ? "bg-violet-50 text-violet-700"
                  : "bg-white text-gray-500 hover:text-gray-700"
              }`}
              title={t('brandclaw.severityTooltip')}
            >
              <LayoutList className="w-3 h-3" />
              {t('brandclaw.severity')}
            </button>
          </div>
          <span className="text-gray-400">{t('brandclaw.total', { count: observations.length })}</span>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : isError ? (
        <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{t('brandclaw.loadError', { message: error?.message ?? t('brandclaw.unknownError') })}</span>
        </div>
      ) : observations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-2">
          <Inbox className="w-8 h-8 text-gray-300" />
          <p className="text-sm">{t('brandclaw.emptyTitle')}</p>
          <p className="text-xs text-gray-400">
            {t('brandclaw.emptyBody')}
          </p>
        </div>
      ) : viewMode === "flat" ? (
        <div className="space-y-2">
          {sortedFlat.map((obs) => (
            <ObservationCard
              key={obs.id}
              observation={obs}
              onOpenEvidence={() => setEvidenceObs(obs)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([dimension, obsList]) => (
            <section key={dimension} className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {t(`observation.dimension.${dimension}`, { defaultValue: dimension.replace(/_/g, " ") })} ({obsList.length})
              </h3>
              <div className="space-y-2">
                {obsList.map((obs) => (
                  <ObservationCard
                    key={obs.id}
                    observation={obs}
                    onOpenEvidence={() => setEvidenceObs(obs)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {evidenceObs && (
        <EvidenceModal observation={evidenceObs} onClose={() => setEvidenceObs(null)} />
      )}
    </div>
  );
}

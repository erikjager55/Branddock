"use client";

import React from "react";
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

const SEVERITY_OPTIONS: Array<{ value: ObservationSeverity | "all"; label: string }> = [
  { value: "all", label: "All severities" },
  { value: "HIGH", label: "High only" },
  { value: "MEDIUM", label: "Medium+" },
  { value: "LOW", label: "Low+" },
];

const DIMENSION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All dimensions" },
  { value: "voice_drift", label: "Voice drift" },
  { value: "fidelity_decline", label: "Fidelity decline" },
  { value: "review_pattern", label: "Review pattern" },
  { value: "alignment_gap", label: "Alignment gap" },
  { value: "publish_quality_trend", label: "Publish quality trend" },
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
            <h2 className="text-sm font-semibold text-gray-900">Strategy Analyst</h2>
            <p className="text-xs text-gray-500 leading-snug max-w-prose">
              Brandclaw observations on alignment / fidelity / review / voice drift.
              Read-only suggestions — no autonomy. You decide which ones to act on.
            </p>
            {lastRun && (
              <p className="text-[11px] text-gray-400 mt-1 font-mono">
                Last run {new Date(lastRun.createdAt).toLocaleString("nl-NL", {
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
              Running…
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              Run Analyst
            </>
          )}
        </button>
      </header>

      {runAnalyst.isError && (
        <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>Analyst run failed: {runAnalyst.error.message}</span>
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
          {DIMENSION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as ObservationSeverity | "all")}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          {SEVERITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
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
          Include dismissed
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
              title="Group per dimension"
            >
              <LayoutGrid className="w-3 h-3" />
              Group
            </button>
            <button
              type="button"
              onClick={() => setViewMode("flat")}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs border-l border-gray-300 ${
                viewMode === "flat"
                  ? "bg-violet-50 text-violet-700"
                  : "bg-white text-gray-500 hover:text-gray-700"
              }`}
              title="Sort by severity"
            >
              <LayoutList className="w-3 h-3" />
              Severity
            </button>
          </div>
          <span className="text-gray-400">{observations.length} total</span>
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
          <span>Failed to load observations: {error?.message ?? "unknown error"}</span>
        </div>
      ) : observations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-2">
          <Inbox className="w-8 h-8 text-gray-300" />
          <p className="text-sm">No observations yet</p>
          <p className="text-xs text-gray-400">
            Click &ldquo;Run Analyst&rdquo; at the top to start the first run.
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
                {dimension.replace(/_/g, " ")} ({obsList.length})
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

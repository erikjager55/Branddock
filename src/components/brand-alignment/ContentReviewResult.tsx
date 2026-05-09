"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { SeverityBadge } from "./SeverityBadge";
import type {
  ReviewSeverity,
  ReviewCategory,
  ReviewFinding,
  ReviewSubmitResponse,
} from "@/hooks/useReviewContent";

const SEVERITIES: ReviewSeverity[] = ["HIGH", "MEDIUM", "LOW"];
const CATEGORIES: ReviewCategory[] = [
  "VOICE",
  "TERMINOLOGY",
  "CLAIMS",
  "STYLE",
  "BUSINESS",
  "AI_TELL",
];

const CATEGORY_LABELS: Record<ReviewCategory, string> = {
  VOICE: "Voice",
  TERMINOLOGY: "Terminology",
  CLAIMS: "Claims",
  STYLE: "Style",
  BUSINESS: "Business",
  AI_TELL: "AI tell",
};

interface ContentReviewResultProps {
  submitData: ReviewSubmitResponse;
  findings: ReviewFinding[];
  findingsLoading: boolean;
  findingsError: string | null;
}

/**
 * Rendert score-gauge + filterable findings-tabel voor een afgeronde review.
 * Filter-state is component-local — geen Zustand-vervuiling voor v1.
 */
export function ContentReviewResult({
  submitData,
  findings,
  findingsLoading,
  findingsError,
}: ContentReviewResultProps) {
  const [severityFilter, setSeverityFilter] = useState<ReviewSeverity | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<ReviewCategory | null>(null);

  const filtered = useMemo(() => {
    return findings.filter((f) => {
      if (severityFilter && f.severity !== severityFilter) return false;
      if (categoryFilter && f.category !== categoryFilter) return false;
      return true;
    });
  }, [findings, severityFilter, categoryFilter]);

  const severityCounts = useMemo(() => {
    const counts: Record<ReviewSeverity, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const f of findings) counts[f.severity]++;
    return counts;
  }, [findings]);

  const categoryCounts = useMemo(() => {
    const counts: Record<ReviewCategory, number> = {
      VOICE: 0,
      TERMINOLOGY: 0,
      CLAIMS: 0,
      STYLE: 0,
      BUSINESS: 0,
      AI_TELL: 0,
    };
    for (const f of findings) counts[f.category]++;
    return counts;
  }, [findings]);

  return (
    <div className="space-y-5">
      <ScorePanel data={submitData} actualFindingsCount={findings.length} />

      {findingsLoading && <FindingsLoadingState />}
      {findingsError && <FindingsErrorState message={findingsError} />}

      {!findingsLoading && !findingsError && (
        <>
          {findings.length > 0 && (
            <FilterPills
              severityFilter={severityFilter}
              onSeverityChange={setSeverityFilter}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
              severityCounts={severityCounts}
              categoryCounts={categoryCounts}
            />
          )}

          {findings.length === 0 ? (
            <EmptyFindingsState />
          ) : filtered.length === 0 ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              No findings match the current filters.
            </div>
          ) : (
            <FindingsTable findings={filtered} />
          )}
        </>
      )}
    </div>
  );
}

// ─── Score panel ──────────────────────────────────────

interface ScorePanelProps {
  data: ReviewSubmitResponse;
  /** Actual count uit GET response zodra die binnen is. Vóór GET-load
   *  valt dit terug op `data.findingsCount` uit de POST-mutation —
   *  voorkomt UX-divergentie als beide getallen zouden gaan
   *  verschillen (hoort niet, defense-in-depth). */
  actualFindingsCount?: number;
}

function ScorePanel({ data, actualFindingsCount }: ScorePanelProps) {
  const score = Math.round(data.compositeScore);
  const passed = data.thresholdMet;
  const color = passed ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600";
  const findingsCount = actualFindingsCount ?? data.findingsCount;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 flex items-center gap-5">
      <div className="flex flex-col items-center px-4">
        <div className={`text-4xl font-bold ${color}`}>{score}</div>
        <div className="text-xs text-gray-500 mt-1">F-VAL score</div>
      </div>
      <div className="flex-1 border-l border-gray-200 pl-5 space-y-1.5 text-sm">
        <div className="flex items-center gap-2">
          {passed ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-medium text-emerald-700">Threshold met</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="font-medium text-amber-700">Below threshold</span>
            </>
          )}
        </div>
        <div className="text-gray-600">
          {findingsCount} finding{findingsCount === 1 ? "" : "s"} ·
          run took {(data.durationMs / 1000).toFixed(1)}s
          {data.scorerVersion && (
            <> · scorer <code className="text-xs">{data.scorerVersion}</code></>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Filter pills ─────────────────────────────────────

interface FilterPillsProps {
  severityFilter: ReviewSeverity | null;
  onSeverityChange: (s: ReviewSeverity | null) => void;
  categoryFilter: ReviewCategory | null;
  onCategoryChange: (c: ReviewCategory | null) => void;
  severityCounts: Record<ReviewSeverity, number>;
  categoryCounts: Record<ReviewCategory, number>;
}

function FilterPills({
  severityFilter,
  onSeverityChange,
  categoryFilter,
  onCategoryChange,
  severityCounts,
  categoryCounts,
}: FilterPillsProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 mr-1">Severity:</span>
        {SEVERITIES.map((s) => (
          <PillButton
            key={s}
            label={`${s} (${severityCounts[s]})`}
            active={severityFilter === s}
            disabled={severityCounts[s] === 0}
            onClick={() => onSeverityChange(severityFilter === s ? null : s)}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 mr-1">Category:</span>
        {CATEGORIES.map((c) => (
          <PillButton
            key={c}
            label={`${CATEGORY_LABELS[c]} (${categoryCounts[c]})`}
            active={categoryFilter === c}
            disabled={categoryCounts[c] === 0}
            onClick={() => onCategoryChange(categoryFilter === c ? null : c)}
          />
        ))}
      </div>
    </div>
  );
}

function PillButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
        active
          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
          : disabled
            ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Findings table ───────────────────────────────────

function FindingsTable({ findings }: { findings: ReviewFinding[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            <th scope="col" className="px-3 py-2 w-24">Severity</th>
            <th scope="col" className="px-3 py-2 w-32">Category</th>
            <th scope="col" className="px-3 py-2 w-48">Location</th>
            <th scope="col" className="px-3 py-2">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {findings.map((f) => (
            <tr key={f.id} className="hover:bg-gray-50/50">
              <td className="px-3 py-3 align-top">
                <SeverityBadge severity={mapSeverity(f.severity)} />
              </td>
              <td className="px-3 py-3 align-top text-gray-700">
                {CATEGORY_LABELS[f.category] ?? f.category}
              </td>
              <td className="px-3 py-3 align-top text-gray-600 text-xs">
                {f.location}
              </td>
              <td className="px-3 py-3 align-top text-gray-800 leading-relaxed">
                <div>{f.description}</div>
                {f.suggestion && (
                  <div className="mt-1 text-xs text-emerald-700">
                    <strong>Suggestion:</strong> {f.suggestion}
                  </div>
                )}
                {(f.beforeText || f.afterText) && (
                  <div className="mt-2 text-xs text-gray-600 grid grid-cols-2 gap-2">
                    {f.beforeText && (
                      <div className="rounded bg-red-50 border border-red-100 px-2 py-1">
                        <div className="text-red-700 font-medium mb-0.5">Before</div>
                        <div className="text-red-900 break-words whitespace-pre-wrap">{f.beforeText}</div>
                      </div>
                    )}
                    {f.afterText && (
                      <div className="rounded bg-emerald-50 border border-emerald-100 px-2 py-1">
                        <div className="text-emerald-700 font-medium mb-0.5">After</div>
                        <div className="text-emerald-900 break-words whitespace-pre-wrap">{f.afterText}</div>
                      </div>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── States ───────────────────────────────────────────

function FindingsLoadingState() {
  return (
    <div className="flex items-center justify-center py-10 text-gray-500">
      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
      <span>Loading findings...</span>
    </div>
  );
}

function FindingsErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <span>Failed to load findings: {message}</span>
    </div>
  );
}

function EmptyFindingsState() {
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-5 py-6 text-center">
      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
      <div className="text-sm text-emerald-800 font-medium">No findings</div>
      <div className="text-xs text-emerald-700 mt-1">
        Content passed F-VAL evaluation without issues.
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────

/**
 * Map BrandReviewSeverity (HIGH/MEDIUM/LOW) op IssueSeverity die SeverityBadge
 * verwacht (CRITICAL/WARNING/SUGGESTION). Hergebruikt visuele lexicon zonder
 * een nieuwe badge-component te introduceren.
 */
function mapSeverity(severity: ReviewSeverity): "CRITICAL" | "WARNING" | "SUGGESTION" {
  if (severity === "HIGH") return "CRITICAL";
  if (severity === "MEDIUM") return "WARNING";
  return "SUGGESTION";
}

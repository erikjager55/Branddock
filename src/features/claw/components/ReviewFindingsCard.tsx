"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";

/**
 * Δ-1 Surface D — Brand Assistant chat-card render voor `review_content`
 * tool-result. Compact: composite-score, threshold-status, top-3 findings,
 * link naar Tab 3 voor volledige weergave.
 *
 * Output van `review_content` tool heeft twee shapes:
 *   - Success: `{ reviewLogId, compositeScore, thresholdMet, findingsCount,
 *                 topFindings: [...], scorerVersion, clientAction }`
 *   - Failure (ingest error): `{ error, code, failureReason: 'ingest_failed',
 *                                 clientAction }`
 *
 * Beide hebben `clientAction === 'review_findings_card'` zodat de chat-router
 * deze component kan dispatchen.
 */

interface ReviewFinding {
  severity: "HIGH" | "MEDIUM" | "LOW";
  category: "VOICE" | "TERMINOLOGY" | "CLAIMS" | "STYLE" | "BUSINESS" | "AI_TELL";
  location: string;
  description: string;
  suggestion: string | null;
}

export interface ReviewSuccessResult {
  reviewLogId: string;
  compositeScore: number;
  thresholdMet: boolean;
  findingsCount: number;
  topFindings: ReviewFinding[];
  scorerVersion: string | null;
  clientAction: "review_findings_card";
}

export interface ReviewErrorResult {
  error: string;
  code?: string;
  // `ingest_failed` = paste/url ingest threw (private-IP, byte-cap, scheme).
  // `invalid_input` = Zod safeParse afwees (malformed shape, content < 50,
  // ongeldige URL). Apart houden zodat FE differentiated copy kan tonen.
  failureReason: "ingest_failed" | "invalid_input";
  clientAction: "review_findings_card";
}

export type ReviewCardData = ReviewSuccessResult | ReviewErrorResult;

const CATEGORY_LABELS: Record<ReviewFinding["category"], string> = {
  VOICE: "Voice",
  TERMINOLOGY: "Terminology",
  CLAIMS: "Claims",
  STYLE: "Style",
  BUSINESS: "Business",
  AI_TELL: "AI tell",
};

const SEVERITY_COLORS: Record<ReviewFinding["severity"], string> = {
  HIGH: "bg-red-100 text-red-800 border-red-200",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-200",
  LOW: "bg-gray-100 text-gray-700 border-gray-200",
};

export function ReviewFindingsCard({ data }: { data: ReviewCardData }) {
  if ("error" in data) {
    return <ReviewErrorCard error={data.error} code={data.code} />;
  }
  return <ReviewSuccessCard data={data} />;
}

function ReviewSuccessCard({ data }: { data: ReviewSuccessResult }) {
  const score = Math.round(data.compositeScore);
  const passed = data.thresholdMet;
  const scoreColor = passed
    ? "text-emerald-600"
    : score >= 60
      ? "text-amber-600"
      : "text-red-600";

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm">
      {/* Score row */}
      <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
        <div className={`text-2xl font-bold ${scoreColor} leading-none`}>{score}</div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-xs">
            {passed ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-medium text-emerald-700">Threshold met</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-medium text-amber-700">Below threshold</span>
              </>
            )}
            <span className="text-gray-400">·</span>
            <span className="text-gray-600">
              {data.findingsCount} finding{data.findingsCount === 1 ? "" : "s"}
            </span>
          </div>
          {data.scorerVersion && (
            <div className="text-[10px] text-gray-400 font-mono mt-0.5">
              {data.scorerVersion}
            </div>
          )}
        </div>
      </div>

      {/* Top findings */}
      {data.topFindings.length > 0 && (
        <div className="pt-2 space-y-1.5">
          <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">
            Top {data.topFindings.length} of {data.findingsCount}
          </div>
          {data.topFindings.map((f, i) => (
            <div key={i} className="flex gap-2 items-start text-xs">
              <span
                className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border ${SEVERITY_COLORS[f.severity]}`}
              >
                {f.severity}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-gray-800 break-words">
                  <span className="text-gray-500">{CATEGORY_LABELS[f.category]}:</span>{" "}
                  {f.description}
                </div>
                {f.suggestion && (
                  <div className="text-emerald-700 mt-0.5 break-words">
                    → {f.suggestion}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pointer naar Tab 3. Geen href: BrandAlignmentPage parsed (nog) geen
          URL-param voor reviewLogId pre-load — een klikbare link zou broken
          UX geven (lege Tab 3). Bij implementatie van URL-param parser
          (separate task) kan deze block weer een werkende deep-link worden. */}
      {data.findingsCount > data.topFindings.length && (
        <div className="pt-2 mt-2 border-t border-gray-100 text-xs text-gray-500">
          + {data.findingsCount - data.topFindings.length} more finding
          {data.findingsCount - data.topFindings.length === 1 ? "" : "s"} —
          run a fresh review in <strong>Brand Alignment → Content Review</strong>{" "}
          to see all.
        </div>
      )}
    </div>
  );
}

function ReviewErrorCard({ error, code }: { error: string; code?: string }) {
  return (
    <div
      role="status"
      className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-2"
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-medium">Could not review content</div>
        <div className="break-words">{error}</div>
        {code && <div className="text-[10px] mt-0.5 font-mono opacity-70">{code}</div>}
      </div>
    </div>
  );
}

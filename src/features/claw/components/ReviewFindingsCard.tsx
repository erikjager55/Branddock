"use client";

import { CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUIState } from "@/contexts/UIStateContext";
import { useBrandAlignmentStore } from "@/stores/useBrandAlignmentStore";
import { useClawStore } from "@/stores/useClawStore";

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
  const { t } = useTranslation("claw");
  const score = Math.round(data.compositeScore);
  const passed = data.thresholdMet;
  const scoreColor = passed
    ? "text-emerald-600"
    : score >= 60
      ? "text-amber-600"
      : "text-red-600";

  const { setActiveSection } = useUIState();
  const openReviewByLogId = useBrandAlignmentStore((s) => s.openReviewByLogId);
  const closeClaw = useClawStore((s) => s.closeClaw);

  // SPA-transition i.p.v. <a href>: hybrid-SPA pad maakt URL-params
  // niet bruikbaar. Pre-load gebeurt via Zustand-store; ContentReviewTab
  // leest preloadReviewLogId en opent direct met die review.
  const handleViewAll = () => {
    openReviewByLogId(data.reviewLogId);
    setActiveSection("brand-alignment");
    closeClaw();
  };

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
                <span className="font-medium text-emerald-700">{t("review.thresholdMet")}</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-medium text-amber-700">{t("review.belowThreshold")}</span>
              </>
            )}
            <span className="text-gray-400">·</span>
            <span className="text-gray-600">
              {t("review.findingCount", { count: data.findingsCount })}
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
            {t("review.topOf", { shown: data.topFindings.length, total: data.findingsCount })}
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
                  <span className="text-gray-500">{t(`review.categories.${f.category}`)}:</span>{" "}
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

      {/* Werkende deep-link via SPA-transition (Δ-1 cleanup-pack):
          opent Brand Alignment → Content Review tab met deze specifieke
          review pre-loaded zodat user alle findings + filters ziet. */}
      {data.findingsCount > data.topFindings.length && (
        <div className="pt-2 mt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleViewAll}
            className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            {t("review.viewAll", { total: data.findingsCount })}
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function ReviewErrorCard({ error, code }: { error: string; code?: string }) {
  const { t } = useTranslation("claw");
  return (
    <div
      role="status"
      className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-2"
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-medium">{t("review.couldNotReview")}</div>
        <div className="break-words">{error}</div>
        {code && <div className="text-[10px] mt-0.5 font-mono opacity-70">{code}</div>}
      </div>
    </div>
  );
}

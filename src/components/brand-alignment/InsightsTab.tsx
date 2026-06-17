"use client";

import {
  BarChart3,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ShieldOff,
  TrendingUp,
  FileSearch,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  useAlignmentInsights,
  type CategoryCount,
  type PassRatePoint,
  type RecentReview,
} from "@/hooks/useAlignmentInsights";
import { useWorkspace } from "@/hooks/use-workspace";
import { SparklineChart } from "@/features/business-strategy/components/detail/SparklineChart";
import { FeedbackLoopPanels } from "./FeedbackLoopPanels";

const FINDING_CATEGORY_LABELS: Record<string, string> = {
  VOICE: "Voice",
  TERMINOLOGY: "Terminology",
  CLAIMS: "Claims",
  STYLE: "Style",
  BUSINESS: "Business",
  AI_TELL: "AI tell",
};

const SOURCE_LABELS: Record<RecentReview["source"], string> = {
  paste: "Paste",
  url: "URL",
  canvas: "Canvas",
};

const SOURCE_PILL: Record<RecentReview["source"], string> = {
  paste: "bg-blue-100 text-blue-700 border-blue-200",
  url: "bg-violet-100 text-violet-700 border-violet-200",
  canvas: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

/**
 * Brand Alignment "Insights" tab — pilot-feedback dashboard voor Δ-1 surfaces.
 * KPI-tiles + 7d threshold-pass-rate sparkline + top finding-categories +
 * recent reviews lijst. 30d window per workspace; geen org-overview.
 */
export function InsightsTab() {
  const { workspaceId, isLoading: wsLoading } = useWorkspace();
  // `isPending` (TanStack v5) is true zolang er geen data EN geen error is —
  // dekt zowel "query nog niet gestart (enabled flipte zojuist)" als
  // "fetch in flight". Voorkomt het flicker-window dat ontstaat bij
  // `isLoading` alleen, waar isLoading=false even op kan duiken tussen
  // enabled-flip en queryFn-start.
  const { data, isPending: queryLoading, isError, error } = useAlignmentInsights();

  // Skeleton zolang óf de workspace-resolution óf de insights-query loopt.
  // Zonder de wsLoading check kon een falende workspace-resolve een eternal
  // skeleton geven (query blijft `enabled: false`, dus isPending=true).
  if (wsLoading || (workspaceId && queryLoading)) {
    return (
      <div className="max-w-4xl mx-auto py-12 flex flex-col items-center text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mb-2" />
        <span className="text-sm">Loading insights...</span>
      </div>
    );
  }

  // Workspace-resolve klaar maar geen workspaceId → kan een resolve-fail
  // zijn (sessie/cookie/network) OF de user heeft geen actieve workspace.
  // useWorkspace swallowt netwerk-errors naar `null`, dus we kunnen de
  // twee paden niet onderscheiden — copy benoemt beide opties expliciet
  // i.p.v. te suggereren dat het een gebruikerskeuze is.
  if (!workspaceId) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div
          role="alert"
          className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">Workspace context unavailable</div>
            <div className="text-xs mt-0.5">
              Insights are calculated per workspace, but no active workspace
              could be found. Try signing in again or switch to a different
              workspace via the header.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div
          role="alert"
          className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">Could not load insights</div>
            <div className="text-xs mt-0.5">
              {error instanceof Error ? error.message : "Unknown error"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { totals, topCategories, passRateTrend, recentReviews } = data;

  // Empty-state — geen reviews in 30d window. Toon placeholder met CTA naar
  // Tab 3 in plaats van cryptische 0-tegels.
  if (totals.totalReviews === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center mb-4">
          <Sparkles size={24} className="text-emerald-700" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No reviews in the past 30 days
        </h3>
        <p className="text-sm text-gray-500 max-w-md">
          Run a review via the <strong>Content Review</strong> tab, ask the
          Brand Assistant for feedback, or generate content via Canvas —
          insights appear here as soon as there is data.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <header className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-emerald-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Insights</h2>
          <p className="text-sm text-gray-500">
            Aggregates over the past 30 days — external (paste/url) +
            internal (canvas) combined, per workspace.
          </p>
        </div>
      </header>

      {/* Truncated-banner — ge-aggregeerd uit een gedeeltelijke set wanneer
          5000+ reviews of scores in 30d. Tekst expliciet over de sampling-
          methode (orderBy createdAt desc + take 5000), inclusief het effect
          op de 7d sparkline trend (oude dagen kunnen verloren gaan). */}
      {data.truncated && (
        <div
          role="status"
          className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 flex items-start gap-2"
        >
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium">Partial aggregation</span> —
            there are more than 5000 reviews in 30 days; the percentages
            shown are calculated over the 5000 most recent reviews. Older
            records are not included, so both absolute counts and the 7d
            trend may be underestimated for less recent days.
          </div>
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile
          icon={FileSearch}
          label="Reviews 30d"
          value={totals.totalReviews}
          sub={`${totals.externalReviews} external · ${totals.internalReviews} internal`}
        />
        <KpiTile
          icon={CheckCircle2}
          label="Threshold pass-rate"
          value={`${totals.thresholdPassRate}%`}
          sub={`${totals.reviewsLast7d} reviews in last 7d`}
          accent={totals.thresholdPassRate >= 60 ? "good" : "warn"}
        />
        <KpiTile
          icon={AlertTriangle}
          label="Findings 30d"
          value={totals.totalFindings}
          sub={
            totals.totalReviews > 0
              ? `${(totals.totalFindings / totals.totalReviews).toFixed(1)} per review on average`
              : "0 per review"
          }
        />
        <KpiTile
          icon={ShieldOff}
          label="Below-threshold published"
          value={
            totals.blockedCount > 0
              ? `${totals.blockedPublishedRate}%`
              : "—"
          }
          sub={
            totals.blockedCount > 0
              ? `${totals.blockedCount} below-threshold internal scores`
              : "No below-threshold scores"
          }
          accent={
            totals.blockedCount === 0
              ? "neutral"
              : totals.blockedPublishedRate > 50
                ? "warn"
                : "good"
          }
        />
      </div>

      {/* Sparkline trend + Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <PassRateTrendCard data={passRateTrend} />
        <TopCategoriesCard data={topCategories} />
      </div>

      {/* Recent reviews */}
      <RecentReviewsCard reviews={recentReviews} />

      {/* Δ-3 Feedback-loop panels (content-test #6.B) */}
      <div className="pt-4 mt-2 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gray-500" />
          Feedback-loop
        </h3>
        <FeedbackLoopPanels />
      </div>
    </div>
  );
}

// ─── KPI Tile ───────────────────────────────────────

const ACCENT_CLASSES: Record<"good" | "warn" | "neutral", string> = {
  good: "text-emerald-700",
  warn: "text-amber-700",
  neutral: "text-gray-700",
};

interface KpiTileProps {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  value: string | number;
  sub: string;
  accent?: "good" | "warn" | "neutral";
}

function KpiTile({ icon: Icon, label, value, sub, accent = "neutral" }: KpiTileProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={`text-2xl font-semibold ${ACCENT_CLASSES[accent]}`}>
        {value}
      </div>
      <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

// ─── Pass Rate Trend Card ───────────────────────────

function PassRateTrendCard({ data }: { data: PassRatePoint[] }) {
  // Sparkline alleen tonen als er minstens één dag MET reviews is — anders is
  // de lijn vlak op 0 wat niet informatief is.
  const totalReviews = data.reduce((s, p) => s + p.reviewCount, 0);
  const series = data.map((p) => p.passRate);
  const trendArrow = computeTrend(series);

  return (
    <div className="md:col-span-2 rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <TrendingUp className="w-3.5 h-3.5" />
          Pass-rate trend (7d)
        </div>
        {trendArrow && (
          <span className={`text-xs ${trendArrow.color}`}>{trendArrow.label}</span>
        )}
      </div>
      {totalReviews > 0 ? (
        <div className="flex items-end justify-between gap-3">
          <SparklineChart data={series} width={240} height={48} color="#10b981" />
          <div className="text-[11px] text-gray-400 leading-tight text-right">
            {totalReviews} reviews
            <br />
            in 7 days
          </div>
        </div>
      ) : (
        <div className="text-xs text-gray-400 italic py-3">
          No reviews in the past 7 days.
        </div>
      )}
    </div>
  );
}

function computeTrend(series: number[]): { label: string; color: string } | null {
  if (series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const delta = last - first;
  if (delta > 5) return { label: `+${delta}pp`, color: "text-emerald-600" };
  if (delta < -5) return { label: `${delta}pp`, color: "text-amber-600" };
  return { label: "stable", color: "text-gray-500" };
}

// ─── Top Categories Card ────────────────────────────

function TopCategoriesCard({ data }: { data: CategoryCount[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
        <AlertTriangle className="w-3.5 h-3.5" />
        Top finding categories
      </div>
      {data.length === 0 ? (
        <div className="text-xs text-gray-400 italic">No findings.</div>
      ) : (
        <div className="space-y-1.5">
          {data.map((c, i) => (
            <div key={c.category} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-700">
                <span className="text-gray-400 w-4">{i + 1}.</span>
                {FINDING_CATEGORY_LABELS[c.category] ?? c.category}
              </div>
              <span className="text-gray-500 tabular-nums">{c.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Recent Reviews Card ────────────────────────────

function RecentReviewsCard({ reviews }: { reviews: RecentReview[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
        <ExternalLink className="w-3.5 h-3.5" />
        Recent reviews
      </div>
      {reviews.length === 0 ? (
        <div className="text-xs text-gray-400 italic">No reviews.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {reviews.map((r) => (
            <RecentReviewRow key={r.id} review={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecentReviewRow({ review }: { review: RecentReview }) {
  const score = review.compositeScore;
  const scoreColor = review.thresholdMet
    ? "text-emerald-700"
    : score >= 60
      ? "text-amber-700"
      : "text-red-700";

  return (
    <div className="flex items-center gap-3 py-2 text-sm">
      <div className={`text-base font-semibold tabular-nums w-10 ${scoreColor}`}>
        {score}
      </div>
      <span
        className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border ${SOURCE_PILL[review.source]}`}
      >
        {SOURCE_LABELS[review.source]}
      </span>
      <div className="flex-1 text-xs text-gray-500">
        {review.findingsCount} finding{review.findingsCount === 1 ? "" : "s"}
      </div>
      <div className="text-[11px] text-gray-400 tabular-nums">
        {formatRelative(review.scoredAt)}
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  const diffMs = Date.now() - ts;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

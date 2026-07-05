"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity, AlertTriangle, Building2 } from "lucide-react";
import { Badge, Card, Skeleton } from "@/components/shared";
import { useFormat } from "@/lib/ui-i18n/format";
import { useCompetitorActivitySummary } from "../hooks/use-competitor-activities";
import { useCompetitorsStore } from "../stores/useCompetitorsStore";
import {
  ACTIVITY_TYPE_LABEL,
  type ActivitySeverity,
} from "../types/activity";
import type { BadgeVariant } from "@/components/shared/Badge";

interface CompetitorActivityDigestProps {
  onNavigateToDetail: (id: string) => void;
}

const SEVERITY_VARIANT: Record<ActivitySeverity, BadgeVariant> = {
  MAJOR: "danger",
  NOTABLE: "warning",
  INFO: "info",
};

/** Multi-competitor activity digest. Renders boven de competitor-grid op
 *  het overzicht; toont severity-tellers, top recent events en hot
 *  competitors per window. Return null indien geen events in window. */
export function CompetitorActivityDigest({ onNavigateToDetail }: CompetitorActivityDigestProps) {
  const { t } = useTranslation("competitors");
  const { formatRelative } = useFormat();
  const [window, setWindow] = useState<"7d" | "30d">("7d");
  const { data, isLoading, isError } = useCompetitorActivitySummary(window);

  if (isLoading) {
    return (
      <Card>
        <Skeleton className="h-5 w-48 mb-3" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          {t("digest.loadError")}
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const noContent =
    data.topEvents.length === 0 &&
    data.hotCompetitors.length === 0 &&
    data.totals.major === 0 &&
    data.totals.notable === 0 &&
    data.totals.info === 0;

  if (noContent) return null;

  const handleClick = (competitorId: string) => {
    useCompetitorsStore.getState().setSelectedCompetitorId(competitorId);
    onNavigateToDetail(competitorId);
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            {t("digest.title", {
              window: window === "7d" ? t("digest.windowThisWeek") : t("digest.window30Days"),
            })}
          </h3>
        </div>
        <div className="flex gap-1">
          <WindowChip active={window === "7d"} onClick={() => setWindow("7d")}>
            7d
          </WindowChip>
          <WindowChip active={window === "30d"} onClick={() => setWindow("30d")}>
            30d
          </WindowChip>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <TotalChip label={t("digest.major")} value={data.totals.major} variant="danger" />
        <TotalChip label={t("digest.notable")} value={data.totals.notable} variant="warning" />
        <TotalChip label={t("digest.info")} value={data.totals.info} variant="info" />
      </div>

      {data.topEvents.length > 0 && (
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
            {t("digest.topEvents")}
          </div>
          <ul className="divide-y divide-gray-100">
            {data.topEvents.slice(0, 5).map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => handleClick(event.competitor.id)}
                  className="w-full text-left py-2 flex items-center gap-3 hover:bg-gray-50 rounded px-1"
                >
                  <Logo url={event.competitor.logoUrl} alt={event.competitor.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {event.competitor.name}
                      </span>
                      <Badge variant={SEVERITY_VARIANT[event.severity]}>
                        {event.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 truncate">
                      {ACTIVITY_TYPE_LABEL[event.type] ?? event.type} · {event.summary}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {safeRelativeTime(formatRelative, event.detectedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.hotCompetitors.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
            {t("digest.mostSignals")}
          </div>
          <div className="flex flex-wrap gap-2">
            {data.hotCompetitors.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleClick(c.id)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 hover:bg-gray-100 text-sm text-gray-800"
              >
                <Logo url={c.logoUrl} alt={c.name} size={5} />
                <span>{c.name}</span>
                <span className="text-xs text-gray-500">({c.unackCount})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

interface WindowChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function WindowChip({ active, onClick, children }: WindowChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "px-2 py-0.5 text-xs font-medium rounded bg-emerald-50 text-emerald-700"
          : "px-2 py-0.5 text-xs font-medium rounded text-gray-500 hover:bg-gray-100"
      }
    >
      {children}
    </button>
  );
}

interface TotalChipProps {
  label: string;
  value: number;
  variant: "danger" | "warning" | "info";
}

const TOTAL_BG: Record<TotalChipProps["variant"], string> = {
  danger: "bg-red-50 text-red-700",
  warning: "bg-amber-50 text-amber-700",
  info: "bg-blue-50 text-blue-700",
};

function TotalChip({ label, value, variant }: TotalChipProps) {
  return (
    <div className={`rounded-md p-3 ${TOTAL_BG[variant]}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

interface LogoProps {
  url: string | null;
  alt: string;
  size?: 5 | 8;
}

function Logo({ url, alt, size = 8 }: LogoProps) {
  const dim = size === 5 ? "h-5 w-5" : "h-8 w-8";
  if (url) {
    return <img src={url} alt={alt} className={`${dim} rounded object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${dim} rounded bg-gray-100 flex items-center justify-center flex-shrink-0`}>
      <Building2 className="h-4 w-4 text-gray-500" />
    </div>
  );
}

function safeRelativeTime(
  formatRelative: (value: Date | string | number) => string,
  iso: string,
): string {
  try {
    return formatRelative(iso);
  } catch {
    return iso;
  }
}

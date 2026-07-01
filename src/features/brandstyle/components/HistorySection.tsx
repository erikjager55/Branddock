"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, GitCompare, RefreshCw } from "lucide-react";
import { Card, Button, Skeleton, EmptyState } from "@/components/shared";
import { useSnapshots } from "../hooks/useSnapshots";
import { SnapshotTimelineRow } from "./SnapshotTimelineRow";
import { CompareSnapshotsModal } from "./CompareSnapshotsModal";
import type { BrandStyleguide } from "../types/brandstyle.types";

interface HistorySectionProps {
  styleguide: BrandStyleguide;
  onReanalyze: () => void;
  isReanalyzing?: boolean;
}

export function HistorySection({ styleguide, onReanalyze, isReanalyzing }: HistorySectionProps) {
  const { t } = useTranslation("brandstyle");
  const { data, isLoading, isError } = useSnapshots();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  const snapshots = data?.snapshots ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-teal-600 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold text-gray-900">{t("history.title")}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {t("history.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {snapshots.length >= 2 && (
            <Button variant="secondary" size="sm" onClick={() => setCompareOpen(true)}>
              <GitCompare className="w-3.5 h-3.5 mr-1.5" />
              {t("history.compare")}
            </Button>
          )}
          {styleguide.sourceUrl && (
            <Button variant="primary" size="sm" onClick={onReanalyze} disabled={isReanalyzing}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isReanalyzing ? 'animate-spin' : ''}`} />
              {t("history.reanalyze")}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : isError ? (
        <Card>
          <p className="text-sm text-gray-600">
            {t("history.loadError")}
          </p>
        </Card>
      ) : snapshots.length === 0 ? (
        <EmptyState
          icon={Clock}
          title={t("history.emptyTitle")}
          description={t("history.emptyDescription")}
          action={
            styleguide.sourceUrl
              ? {
                  label: t("history.emptyAction"),
                  onClick: onReanalyze,
                }
              : undefined
          }
        />
      ) : (
        <Card>
          <ol className="divide-y divide-gray-100">
            {snapshots.map((snap, idx) => (
              <SnapshotTimelineRow
                key={snap.id}
                snapshot={snap}
                isLatest={idx === 0}
                isOldest={idx === snapshots.length - 1}
                expanded={expandedId === snap.id}
                onToggleExpand={() =>
                  setExpandedId(expandedId === snap.id ? null : snap.id)
                }
                previousSnapshotId={snapshots[idx + 1]?.id ?? null}
              />
            ))}
          </ol>
        </Card>
      )}

      {compareOpen && (
        <CompareSnapshotsModal
          snapshots={snapshots}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </div>
  );
}

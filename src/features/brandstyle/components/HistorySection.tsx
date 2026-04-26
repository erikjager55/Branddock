"use client";

import { useState } from "react";
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
            <h3 className="text-base font-semibold text-gray-900">History</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Each analyzer run produces a snapshot. Compare versions to see how the
              brand evolved over time — color shifts, font swaps, new components.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {snapshots.length >= 2 && (
            <Button variant="secondary" size="sm" onClick={() => setCompareOpen(true)}>
              <GitCompare className="w-3.5 h-3.5 mr-1.5" />
              Compare
            </Button>
          )}
          {styleguide.sourceUrl && (
            <Button variant="primary" size="sm" onClick={onReanalyze} disabled={isReanalyzing}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isReanalyzing ? 'animate-spin' : ''}`} />
              Re-analyze
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
            Could not load snapshot history. Try refreshing.
          </p>
        </Card>
      ) : snapshots.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No history yet"
          description="Snapshots are created automatically each time the analyzer runs. Re-analyze the source to capture the first snapshot."
          action={
            styleguide.sourceUrl
              ? {
                  label: 'Re-analyze now',
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

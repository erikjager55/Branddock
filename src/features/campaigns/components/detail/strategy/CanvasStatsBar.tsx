"use client";

import type { DeliverableResponse } from "@/types/campaign";
import { APPROVAL_HEX } from "@/features/campaigns/lib/approval-status";

interface CanvasStatsBarProps {
  deliverables: DeliverableResponse[];
}

/** Horizontal bar showing approval status counts and publication progress */
export function CanvasStatsBar({ deliverables }: CanvasStatsBarProps) {
  if (deliverables.length === 0) return null;

  // Count per status
  const counts: Record<string, number> = {};
  for (const d of deliverables) {
    const status = d.approvalStatus || "DRAFT";
    counts[status] = (counts[status] || 0) + 1;
  }

  const total = deliverables.length;
  const readyCount = (counts["APPROVED"] || 0) + (counts["PUBLISHED"] || 0);
  const progressPct = total > 0 ? Math.round((readyCount / total) * 100) : 0;

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
      {/* Status pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {Object.entries(APPROVAL_HEX).map(([key, style]) => {
          const count = counts[key] || 0;
          if (count === 0) return null;
          return (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border"
              style={{
                backgroundColor: style.bg,
                color: style.text,
                borderColor: style.border,
              }}
            >
              {style.label}
              <span className="font-semibold">{count}</span>
            </span>
          );
        })}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs text-gray-500">
          {readyCount} of {total} ready
        </span>
        <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressPct}%`,
              backgroundColor: "#0d9488",
            }}
          />
        </div>
        <span className="text-xs font-medium" style={{ color: "#0d9488" }}>
          {progressPct}%
        </span>
      </div>
    </div>
  );
}

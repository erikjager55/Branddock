"use client";

import React, { useMemo } from "react";
import { X } from "lucide-react";
import { useContentLibraryStore, countActiveFilters } from "../../stores/useContentLibraryStore";
import { useCampaigns } from "../../hooks";
import { getDeliverableTypeById } from "../../lib/deliverable-types";
import type { ReadinessLight, CampaignTypeFilter } from "../../types/content-library.types";

// ─── Label maps ─────────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  awareness: "Awareness",
  consideration: "Consideration",
  conversion: "Conversion",
  retention: "Retention",
};

const READINESS_LABELS: Record<ReadinessLight, string> = {
  red: "🔴 Not started",
  amber: "🟡 In progress",
  green: "🟢 Ready",
};

const CAMPAIGN_TYPE_LABELS: Record<CampaignTypeFilter, string> = {
  STRATEGIC: "Strategic",
  QUICK: "Quick",
  CONTENT: "Content",
};

const READINESS_HINT_LABELS: Record<string, string> = {
  "no-content": "No content",
  "not-reviewed": "Not reviewed",
  "pipeline-incomplete": "Pipeline incomplete",
};

// ─── Component ──────────────────────────────────────────────

export function ActiveFilterChips() {
  const filters = useContentLibraryStore((s) => s.filters);
  const toggleTypeFilter = useContentLibraryStore((s) => s.toggleTypeFilter);
  const toggleCampaignFilter = useContentLibraryStore((s) => s.toggleCampaignFilter);
  const toggleCampaignTypeFilter = useContentLibraryStore((s) => s.toggleCampaignTypeFilter);
  const togglePhaseFilter = useContentLibraryStore((s) => s.togglePhaseFilter);
  const toggleReadinessFilter = useContentLibraryStore((s) => s.toggleReadinessFilter);
  const toggleReadinessHintFilter = useContentLibraryStore((s) => s.toggleReadinessHintFilter);
  const setFilter = useContentLibraryStore((s) => s.setFilter);

  const activeCount = countActiveFilters(filters);
  const { data: campaignsData } = useCampaigns();

  const campaignNameLookup = useMemo(() => {
    const map = new Map<string, string>();
    const raw = campaignsData as
      | { campaigns?: unknown[]; items?: unknown[] }
      | unknown[]
      | undefined;
    const list = Array.isArray(raw)
      ? raw
      : raw?.campaigns ?? raw?.items ?? [];
    for (const c of list as Array<{ id: string; title?: string; name?: string }>) {
      map.set(c.id, c.title ?? c.name ?? "Untitled");
    }
    return map;
  }, [campaignsData]);

  if (activeCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 py-2">
      <span className="text-xs font-semibold text-gray-500 mr-1">Filters:</span>

      {filters.types.map((typeId) => {
        const def = getDeliverableTypeById(typeId);
        return (
          <Chip
            key={`type-${typeId}`}
            label={def?.name ?? typeId}
            onRemove={() => toggleTypeFilter(typeId)}
          />
        );
      })}

      {filters.campaigns.map((id) => (
        <Chip
          key={`camp-${id}`}
          label={`Campaign: ${campaignNameLookup.get(id) ?? id.slice(0, 8)}`}
          onRemove={() => toggleCampaignFilter(id)}
        />
      ))}

      {filters.campaignTypes.map((t) => (
        <Chip
          key={`ctype-${t}`}
          label={CAMPAIGN_TYPE_LABELS[t] ?? t}
          onRemove={() => toggleCampaignTypeFilter(t)}
        />
      ))}

      {filters.phases.map((p) => (
        <Chip
          key={`phase-${p}`}
          label={PHASE_LABELS[p] ?? p}
          onRemove={() => togglePhaseFilter(p)}
        />
      ))}

      {filters.readiness.map((r) => (
        <Chip
          key={`ready-${r}`}
          label={READINESS_LABELS[r]}
          onRemove={() => toggleReadinessFilter(r)}
        />
      ))}

      {filters.readinessHints.map((h) => (
        <Chip
          key={`hint-${h}`}
          label={READINESS_HINT_LABELS[h] ?? h}
          onRemove={() => toggleReadinessHintFilter(h)}
        />
      ))}

      {(filters.scheduledFrom || filters.scheduledTo) && (
        <Chip
          label={formatDateRange(filters.scheduledFrom, filters.scheduledTo)}
          onRemove={() => {
            setFilter("scheduledFrom", null);
            setFilter("scheduledTo", null);
          }}
        />
      )}

      {filters.qualityMin != null && (
        <Chip
          label={`Quality ≥ ${filters.qualityMin}`}
          onRemove={() => setFilter("qualityMin", null)}
        />
      )}

    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200 text-xs text-teal-800"
      style={{ padding: "2px 8px" }}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="p-0.5 hover:bg-teal-100 rounded-full"
        aria-label={`Remove ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function formatDateRange(from: string | null, to: string | null): string {
  if (from && to) return `Scheduled ${from} → ${to}`;
  if (from) return `Scheduled from ${from}`;
  if (to) return `Scheduled until ${to}`;
  return "Scheduled";
}

export default ActiveFilterChips;

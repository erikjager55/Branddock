"use client";

import React, { useMemo } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useContentLibraryStore, countActiveFilters } from "../../stores/useContentLibraryStore";
import { useCampaigns } from "../../hooks";
import { getDeliverableTypeById } from "../../lib/deliverable-types";
import type { ReadinessLight } from "../../types/content-library.types";

// ─── Label maps ─────────────────────────────────────────────
// Readiness labels carry a leading status emoji — kept verbatim (not i18n'd).

const READINESS_LABELS: Record<ReadinessLight, string> = {
  red: "🔴 Not started",
  amber: "🟡 In progress",
  green: "🟢 Ready",
};

// ─── Component ──────────────────────────────────────────────

export function ActiveFilterChips() {
  const { t } = useTranslation("campaigns-content-library");
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

  const formatDateRange = (from: string | null, to: string | null): string => {
    if (from && to) return t("chips.scheduledRange", { from, to });
    if (from) return t("chips.scheduledFrom", { from });
    if (to) return t("chips.scheduledUntil", { to });
    return t("chips.scheduled");
  };

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
      map.set(c.id, c.title ?? c.name ?? t("common.untitled"));
    }
    return map;
  }, [campaignsData, t]);

  if (activeCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 py-2">
      <span className="text-xs font-semibold text-gray-500 mr-1">{t("chips.label")}</span>

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
          label={t("chips.campaign", { name: campaignNameLookup.get(id) ?? id.slice(0, 8) })}
          onRemove={() => toggleCampaignFilter(id)}
        />
      ))}

      {filters.campaignTypes.map((ct) => (
        <Chip
          key={`ctype-${ct}`}
          label={t(`chips.campaignType.${ct}`, { defaultValue: ct })}
          onRemove={() => toggleCampaignTypeFilter(ct)}
        />
      ))}

      {filters.phases.map((p) => (
        <Chip
          key={`phase-${p}`}
          label={t(`chips.phase.${p}`, { defaultValue: p })}
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
          label={t(`chips.readinessHint.${h}`, { defaultValue: h })}
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
          label={t("chips.qualityMin", { min: filters.qualityMin })}
          onRemove={() => setFilter("qualityMin", null)}
        />
      )}

    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const { t } = useTranslation("campaigns-content-library");
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
        aria-label={t("chips.remove", { label })}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}


export default ActiveFilterChips;

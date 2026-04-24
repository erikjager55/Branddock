"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Check, Minus, Star } from "lucide-react";
import { useContentLibraryStore, countActiveFilters } from "../../stores/useContentLibraryStore";
import { useCampaigns, useStrategy } from "../../hooks";
import {
  DELIVERABLE_CATEGORIES,
  getDeliverablesByCategory,
} from "../../lib/deliverable-types";
import type { BlueprintStrategyResponse } from "@/types/campaign";

// ─── Static option lists ────────────────────────────────────

/** Fallback phase palette — used when the blueprint doesn't supply colors. */
const PHASE_FALLBACK_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4"];

/** Fallback phase options when a campaign has no blueprint yet. */
const FALLBACK_PHASE_OPTIONS = [
  { value: "awareness", label: "Awareness", color: "#3b82f6" },
  { value: "consideration", label: "Consideration", color: "#f59e0b" },
  { value: "conversion", label: "Conversion", color: "#10b981" },
  { value: "retention", label: "Retention", color: "#8b5cf6" },
];

// Readiness options moved to the top-level status tabs in ContentFilterBar.tsx —
// the traffic-light filter is no longer shown in this panel.

const READINESS_HINT_OPTIONS = [
  { value: "no-content", label: "No content generated" },
  { value: "not-reviewed", label: "Not reviewed" },
  { value: "pipeline-incomplete", label: "Pipeline incomplete" },
];

/** Status options — traffic-light readiness + favorites toggle combined
 *  into a single Status filter (previously shown as top-level pill tabs). */
const STATUS_OPTIONS: Array<{
  value: "red" | "amber" | "green";
  label: string;
  dot: string;
}> = [
  { value: "red", label: "Not started", dot: "#ef4444" },
  { value: "amber", label: "In progress", dot: "#f59e0b" },
  { value: "green", label: "Ready", dot: "#10b981" },
];

// ─── Component ──────────────────────────────────────────────

/** Content filter panel — always visible inline, no card wrapper.
 *  The panel is part of the page flow; no toggle button, no border. */
export function ContentFiltersPanel() {
  const filters = useContentLibraryStore((s) => s.filters);
  const setFilter = useContentLibraryStore((s) => s.setFilter);
  const clearFilters = useContentLibraryStore((s) => s.clearFilters);

  const activeCount = countActiveFilters(filters);

  // Journey Phase is only meaningful in a single-campaign context
  // (phases come from a specific campaign's blueprint). PhaseDropdown
  // itself renders a disabled shell when activeCampaignId is null so the
  // layout no longer shifts — see PhaseDropdown's internal handling.
  const activeCampaignId = filters.campaigns.length === 1 ? filters.campaigns[0] : null;

  return (
    <div role="region" aria-label="Content filters" className="w-full">
      {/* Filter grid — three fixed columns, each a stack of two dropdowns:
          [Campaign / Journey Phase] [Status / Readiness Gap] [Content Type]
          Inline grid styles because Tailwind 4 purge sometimes drops
          lg:grid-cols-3 utilities. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          columnGap: 20,
          rowGap: 14,
          alignItems: "start",
        }}
      >
        {/* Column 1 — Campaign + Journey Phase */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <CampaignList />
          <PhaseDropdown campaignId={activeCampaignId} />
        </div>

        {/* Column 2 — Status + Readiness Gap */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <StatusDropdown />
          <ReadinessGapDropdown />
        </div>

        {/* Column 3 — Content Type (top) + Clear all (bottom, aligned with
            Phase/Readiness in cols 1-2). In campaign-mode we preserve the
            campaign filter so the user doesn't get bounced out. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ContentTypeList />
          <div
            className="flex items-center justify-end"
            style={{ minHeight: 44 /* matches dropdown height so row aligns */ }}
          >
            {activeCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  clearFilters({ keepCampaigns: filters.campaigns.length === 1 })
                }
                className="text-xs text-gray-500 hover:text-gray-700 underline decoration-dashed"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Always-visible list filters ───────────────────────────
// No dropdowns — the content stays expanded in the panel so everything
// is visible at a glance.

function ContentTypeList() {
  const filters = useContentLibraryStore((s) => s.filters);
  const setFilter = useContentLibraryStore((s) => s.setFilter);
  const toggleTypeFilter = useContentLibraryStore((s) => s.toggleTypeFilter);

  const count = filters.types.length;

  // Pre-compute category → types mapping + per-category selection state
  const categories = useMemo(() => {
    return DELIVERABLE_CATEGORIES.map((category) => {
      const types = getDeliverablesByCategory(category).map((t) => ({
        id: t.id,
        label: t.name,
      }));
      const selectedIds = types.filter((t) => filters.types.includes(t.id)).map((t) => t.id);
      const state: "empty" | "partial" | "all" =
        selectedIds.length === 0
          ? "empty"
          : selectedIds.length === types.length
            ? "all"
            : "partial";
      return { category, types, selectedIds, state };
    });
  }, [filters.types]);

  // Tri-state category checkbox: toggles all types in the category.
  //   empty/partial → select everything in this category
  //   all           → deselect everything in this category
  const handleCategoryToggle = (category: (typeof categories)[number]) => {
    const typeIds = category.types.map((t) => t.id);
    const currentlySelected = new Set(filters.types);
    if (category.state === "all") {
      const next = filters.types.filter((id) => !typeIds.includes(id));
      setFilter("types", next);
    } else {
      for (const id of typeIds) currentlySelected.add(id);
      setFilter("types", Array.from(currentlySelected));
    }
  };

  const [open, setOpen] = useState(false);
  // Track which categories are expanded to reveal individual type checkboxes.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (category: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const labelText = count === 0 ? "All types" : `${count} selected`;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Content Type</h4>
        {count > 0 && (
          <span
            className="inline-flex items-center justify-center rounded-full bg-teal-600 text-white font-semibold"
            style={{ height: 18, minWidth: 18, padding: "0 6px", fontSize: 10 }}
          >
            {count}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ padding: "6px 12px" }}
        className="w-full flex items-center justify-between gap-2 text-sm font-medium rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="truncate">{labelText}</span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 z-30 bg-white border border-gray-200 rounded-md shadow-lg overflow-y-auto"
          style={{ padding: 4, maxHeight: 360 }}
        >
          {categories.map((cat) => {
            const isExpanded = expanded.has(cat.category);
            return (
              <div key={cat.category}>
                <CategoryRow
                  label={cat.category}
                  state={cat.state}
                  selectedCount={cat.selectedIds.length}
                  totalCount={cat.types.length}
                  expanded={isExpanded}
                  onToggleSelect={() => handleCategoryToggle(cat)}
                  onToggleExpand={() => toggleExpand(cat.category)}
                />
                {isExpanded && (
                  <div style={{ paddingLeft: 24 }}>
                    {cat.types.map((t) => (
                      <CheckboxRow
                        key={t.id}
                        label={t.label}
                        checked={filters.types.includes(t.id)}
                        onToggle={() => toggleTypeFilter(t.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CategoryRow — tri-state checkbox + expandable row ─────

interface CategoryRowProps {
  label: string;
  state: "empty" | "partial" | "all";
  selectedCount: number;
  totalCount: number;
  expanded: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
}

function CategoryRow({
  label,
  state,
  selectedCount,
  totalCount,
  expanded,
  onToggleSelect,
  onToggleExpand,
}: CategoryRowProps) {
  const countText = state === "partial" ? `${selectedCount}/${totalCount}` : `${totalCount}`;
  const checkedOrPartial = state !== "empty";

  return (
    <div
      className="flex items-center gap-2 rounded hover:bg-gray-50"
      style={{ padding: "4px 8px" }}
    >
      {/* Tri-state checkbox — toggles all types in category */}
      <button
        type="button"
        onClick={onToggleSelect}
        aria-pressed={checkedOrPartial}
        aria-label={
          state === "all"
            ? `Deselect all types in ${label}`
            : `Select all types in ${label}`
        }
        className="flex items-center justify-center rounded border flex-shrink-0"
        style={{
          width: 16,
          height: 16,
          backgroundColor: checkedOrPartial ? "#0d9488" : "#ffffff",
          borderColor: checkedOrPartial ? "#0d9488" : "#d1d5db",
        }}
      >
        {state === "all" && (
          <Check strokeWidth={3} style={{ width: 12, height: 12, color: "#ffffff" }} />
        )}
        {state === "partial" && (
          <Minus strokeWidth={3} style={{ width: 12, height: 12, color: "#ffffff" }} />
        )}
      </button>

      {/* Expandable row — clicking toggles expansion */}
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={expanded}
        className="flex-1 flex items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm text-gray-700 truncate">{label}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">{countText}</span>
        </span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        )}
      </button>
    </div>
  );
}

function StatusDropdown() {
  const filters = useContentLibraryStore((s) => s.filters);
  const toggleReadinessFilter = useContentLibraryStore((s) => s.toggleReadinessFilter);
  const showFavorites = useContentLibraryStore((s) => s.showFavorites);
  const setShowFavorites = useContentLibraryStore((s) => s.setShowFavorites);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const readinessCount = filters.readiness.length;
  const activeCount = readinessCount + (showFavorites ? 1 : 0);

  let labelText: string;
  if (activeCount === 0) {
    labelText = "All";
  } else if (activeCount === 1 && readinessCount === 1) {
    labelText = STATUS_OPTIONS.find((o) => o.value === filters.readiness[0])?.label ?? "1 selected";
  } else if (activeCount === 1 && showFavorites) {
    labelText = "Favorites";
  } else {
    labelText = `${activeCount} selected`;
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</h4>
        {activeCount > 0 && (
          <span
            className="inline-flex items-center justify-center rounded-full bg-teal-600 text-white font-semibold"
            style={{ height: 18, minWidth: 18, padding: "0 6px", fontSize: 10 }}
          >
            {activeCount}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ padding: "6px 12px" }}
        className="w-full flex items-center justify-between gap-2 text-sm font-medium rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="truncate">{labelText}</span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 z-30 bg-white border border-gray-200 rounded-md shadow-lg"
          style={{ padding: 4 }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <CheckboxRow
              key={opt.value}
              label={opt.label}
              dot={opt.dot}
              checked={filters.readiness.includes(opt.value)}
              onToggle={() => toggleReadinessFilter(opt.value)}
            />
          ))}
          {/* Divider + Favorites — orthogonal to readiness, but lives in
              the same Status dropdown for a single filter entry point. */}
          <div style={{ margin: "4px 6px", borderTop: "1px solid #f3f4f6" }} />
          <CheckboxRow
            label="Favorites only"
            checked={showFavorites}
            onToggle={() => setShowFavorites(!showFavorites)}
            icon={<Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />}
          />
        </div>
      )}
    </div>
  );
}

function PhaseDropdown({ campaignId }: { campaignId: string | null }) {
  const filters = useContentLibraryStore((s) => s.filters);
  const setFilter = useContentLibraryStore((s) => s.setFilter);
  const togglePhaseFilter = useContentLibraryStore((s) => s.togglePhaseFilter);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const disabled = campaignId === null;

  // Fetch the campaign's blueprint so we can show the real phase names.
  // Hook called with "" when disabled — the useQuery inside will no-op
  // thanks to its `enabled` flag (see useStrategy impl).
  const { data: strategy } = useStrategy(campaignId ?? "");

  const phaseOptions = useMemo(() => {
    const blueprintPhases = (strategy && "format" in strategy && strategy.format === "blueprint"
      ? (strategy as BlueprintStrategyResponse).blueprint.architecture?.journeyPhases
      : undefined) ?? [];

    if (blueprintPhases.length === 0) return FALLBACK_PHASE_OPTIONS;

    return blueprintPhases.map((p, i) => ({
      value: p.name,
      label: p.name,
      color: PHASE_FALLBACK_COLORS[i % PHASE_FALLBACK_COLORS.length],
    }));
  }, [strategy]);

  // Auto-clear phase filter when disabled (no single campaign) or when the
  // saved values don't match the currently loaded blueprint.
  useEffect(() => {
    if (filters.phases.length === 0) return;
    if (disabled) {
      setFilter("phases", []);
      return;
    }
    const validValues = new Set(phaseOptions.map((o) => o.value));
    const cleaned = filters.phases.filter((p) => validValues.has(p));
    if (cleaned.length !== filters.phases.length) {
      setFilter("phases", cleaned);
    }
  }, [phaseOptions, filters.phases, setFilter, disabled]);

  // Close dropdown when disabled or on outside click.
  useEffect(() => {
    if (!open) return;
    if (disabled) {
      setOpen(false);
      return;
    }
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, disabled]);

  const count = filters.phases.length;
  const labelText = disabled
    ? "Select a campaign"
    : count === 0
      ? "All phases"
      : `${count} selected`;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <h4 className={`text-xs font-semibold uppercase tracking-wide ${disabled ? "text-gray-400" : "text-gray-500"}`}>
          Journey Phase
        </h4>
        {!disabled && count > 0 && (
          <span
            className="inline-flex items-center justify-center rounded-full bg-teal-600 text-white font-semibold"
            style={{ height: 18, minWidth: 18, padding: "0 6px", fontSize: 10 }}
          >
            {count}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-disabled={disabled}
        title={disabled ? "Filter a single campaign to pick its journey phases" : undefined}
        style={{ padding: "6px 12px" }}
        className={`w-full flex items-center justify-between gap-2 text-sm font-medium rounded-md border transition-colors ${
          disabled
            ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        <span className="truncate">{labelText}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 ${disabled ? "text-gray-300" : "text-gray-400"}`} />
      </button>
      {open && !disabled && (
        <div
          className="absolute top-full left-0 right-0 mt-1 z-30 bg-white border border-gray-200 rounded-md shadow-lg"
          style={{ padding: 4 }}
        >
          {phaseOptions.map((opt) => (
            <CheckboxRow
              key={opt.value}
              label={opt.label}
              dot={opt.color}
              checked={filters.phases.includes(opt.value)}
              onToggle={() => togglePhaseFilter(opt.value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReadinessGapDropdown() {
  const filters = useContentLibraryStore((s) => s.filters);
  const toggleReadinessHintFilter = useContentLibraryStore((s) => s.toggleReadinessHintFilter);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const count = filters.readinessHints.length;
  const labelText = count === 0 ? "Any" : `${count} selected`;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Readiness Gap</h4>
        {count > 0 && (
          <span
            className="inline-flex items-center justify-center rounded-full bg-teal-600 text-white font-semibold"
            style={{ height: 18, minWidth: 18, padding: "0 6px", fontSize: 10 }}
          >
            {count}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ padding: "6px 12px" }}
        className="w-full flex items-center justify-between gap-2 text-sm font-medium rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="truncate">{labelText}</span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 z-30 bg-white border border-gray-200 rounded-md shadow-lg"
          style={{ padding: 4 }}
        >
          {READINESS_HINT_OPTIONS.map((opt) => (
            <CheckboxRow
              key={opt.value}
              label={opt.label}
              checked={filters.readinessHints.includes(opt.value)}
              onToggle={() => toggleReadinessHintFilter(opt.value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignList() {
  const filters = useContentLibraryStore((s) => s.filters);
  const toggleCampaignFilter = useContentLibraryStore((s) => s.toggleCampaignFilter);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const { data: campaignsData } = useCampaigns();

  const campaigns = useMemo(() => {
    // API returns { campaigns: [...], stats: {...} } — unwrap defensively.
    const raw = campaignsData as
      | { campaigns?: unknown[]; items?: unknown[] }
      | unknown[]
      | undefined;
    const list = Array.isArray(raw)
      ? raw
      : raw?.campaigns ?? raw?.items ?? [];
    return (list as Array<{ id: string; title?: string; name?: string }>)
      .map((c) => ({ id: c.id, name: c.title ?? c.name ?? "Untitled" }))
      .filter((c) => {
        if (!search.trim()) return true;
        return c.name.toLowerCase().includes(search.toLowerCase());
      });
  }, [campaignsData, search]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const count = filters.campaigns.length;
  const labelText = count === 0 ? "All campaigns" : `${count} selected`;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Campaign</h4>
        {count > 0 && (
          <span
            className="inline-flex items-center justify-center rounded-full bg-teal-600 text-white font-semibold"
            style={{ height: 18, minWidth: 18, padding: "0 6px", fontSize: 10 }}
          >
            {count}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ padding: "6px 12px" }}
        className="w-full flex items-center justify-between gap-2 text-sm font-medium rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="truncate">{labelText}</span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 z-30 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col"
          style={{ maxHeight: 240 }}
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            autoFocus
            className="text-sm border-b border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary rounded-t-md"
            style={{ padding: "6px 12px" }}
          />
          <div className="overflow-y-auto flex-1" style={{ padding: "4px" }}>
            {campaigns.length === 0 && (
              <p className="text-sm text-gray-400 italic" style={{ padding: "8px" }}>
                No campaigns found
              </p>
            )}
            {campaigns.map((c) => (
              <CheckboxRow
                key={c.id}
                label={c.name}
                checked={filters.campaigns.includes(c.id)}
                onToggle={() => toggleCampaignFilter(c.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Backward-compat export — old name used by ContentFilterBar.tsx
export const ContentFiltersPopover = ContentFiltersPanel;

// ─── Sub-components ─────────────────────────────────────────

function CheckboxRow({
  label,
  checked,
  onToggle,
  dot,
  icon,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  dot?: string;
  /** Optional icon rendered before the label (e.g. favorite star). Mutually
   *  exclusive with `dot` in practice but both render if passed. */
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className="w-full flex items-center gap-2 text-left rounded hover:bg-gray-50"
      style={{ padding: "4px 8px" }}
    >
      <span
        className="flex items-center justify-center rounded border flex-shrink-0"
        style={{
          width: 16,
          height: 16,
          backgroundColor: checked ? "#0d9488" : "#ffffff",
          borderColor: checked ? "#0d9488" : "#d1d5db",
        }}
      >
        {checked && (
          <Check
            strokeWidth={3}
            style={{ width: 12, height: 12, color: "#ffffff" }}
          />
        )}
      </span>
      {dot && (
        <span
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: dot }}
        />
      )}
      {icon}
      <span className="text-sm text-gray-700 truncate">{label}</span>
    </button>
  );
}
export default ContentFiltersPopover;

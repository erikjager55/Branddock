import { create } from "zustand";
import {
  EMPTY_FILTERS,
  type ContentLibraryFilters,
  type ContentLibrarySort,
  type ReadinessLight,
  type CampaignTypeFilter,
} from "../types/content-library.types";

// ─── Types ────────────────────────────────────────────────

/** Sub-tab shown when a single campaign is filtered (campaign-mode view).
 *  "channel-plan" is retained as a legacy value for backward compat with
 *  older persisted state, but no longer has a UI entry point. */
export type CampaignSubTab = "content" | "strategy";

/** Group-By dimension for the Timeline view. */
export type TimelineGroupBy = "phase" | "campaign" | "channel" | "none";

/** Zoom preset for the Timeline view — real time-unit granularity per column.
 *  - day   : each column = 1 calendar day     (~14-90 columns shown)
 *  - week  : each column = Monday-Sunday week (~6-26 columns shown)
 *  - month : each column = 1 calendar month   (~3-18 columns shown) */
export type TimelineZoom = "day" | "week" | "month";

interface ContentLibraryState {
  // Primary controls
  search: string;
  statusFilter: string | null;        // status tabs (IN_PROGRESS/COMPLETED)
  sort: ContentLibrarySort;
  viewMode: "grid" | "list" | "calendar" | "timeline";
  groupByCampaign: boolean;
  showFavorites: boolean;

  // Campaign-mode sub-tab — only used when exactly 1 campaign is filtered.
  campaignSubTab: CampaignSubTab;

  // Timeline-view controls.
  timelineGroupBy: TimelineGroupBy;
  timelineZoom: TimelineZoom;

  // Advanced filters (popover)
  filters: ContentLibraryFilters;

  // Selection
  selectedIds: string[];

  // Setters — primary
  setSearch: (s: string) => void;
  setStatusFilter: (f: string | null) => void;
  setSort: (s: ContentLibrarySort) => void;
  setViewMode: (m: "grid" | "list" | "calendar" | "timeline") => void;
  setTimelineGroupBy: (g: TimelineGroupBy) => void;
  toggleGroupByCampaign: () => void;
  setShowFavorites: (v: boolean) => void;
  toggleShowFavorites: () => void;
  setCampaignSubTab: (tab: CampaignSubTab) => void;
  setTimelineZoom: (zoom: TimelineZoom) => void;

  // Setters — advanced filters
  setFilter: <K extends keyof ContentLibraryFilters>(
    key: K,
    value: ContentLibraryFilters[K],
  ) => void;
  toggleTypeFilter: (typeId: string) => void;
  toggleCampaignFilter: (campaignId: string) => void;
  toggleCampaignTypeFilter: (type: CampaignTypeFilter) => void;
  togglePhaseFilter: (phase: string) => void;
  toggleReadinessFilter: (light: ReadinessLight) => void;
  toggleReadinessHintFilter: (hint: string) => void;
  /** Clear all filters. Pass `{ keepCampaigns: true }` to preserve the
   *  current campaign selection — used from campaign-mode so "Clear all
   *  filters" doesn't bounce the user out of the campaign view. */
  clearFilters: (options?: { keepCampaigns?: boolean }) => void;

  // Selection
  toggleSelected: (id: string) => void;
  clearSelection: () => void;

  // Global reset
  resetAll: () => void;
}

// ─── Store ────────────────────────────────────────────────

export const useContentLibraryStore = create<ContentLibraryState>((set) => ({
  search: "",
  statusFilter: null,
  sort: "-updatedAt",
  viewMode: "grid",
  groupByCampaign: false,
  showFavorites: false,
  campaignSubTab: "content",
  timelineGroupBy: "phase",
  timelineZoom: "week",
  filters: { ...EMPTY_FILTERS },
  selectedIds: [],

  setSearch: (search) => set({ search }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSort: (sort) => set({ sort }),
  setViewMode: (viewMode) => set({ viewMode }),
  toggleGroupByCampaign: () =>
    set((s) => ({ groupByCampaign: !s.groupByCampaign })),
  setShowFavorites: (showFavorites) => set({ showFavorites }),
  toggleShowFavorites: () =>
    set((s) => ({ showFavorites: !s.showFavorites })),
  setCampaignSubTab: (campaignSubTab) => set({ campaignSubTab }),
  setTimelineGroupBy: (timelineGroupBy) => set({ timelineGroupBy }),
  setTimelineZoom: (timelineZoom) => set({ timelineZoom }),

  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),

  toggleTypeFilter: (typeId) =>
    set((s) => ({
      filters: {
        ...s.filters,
        types: s.filters.types.includes(typeId)
          ? s.filters.types.filter((t) => t !== typeId)
          : [...s.filters.types, typeId],
      },
    })),

  toggleCampaignFilter: (campaignId) =>
    set((s) => ({
      filters: {
        ...s.filters,
        campaigns: s.filters.campaigns.includes(campaignId)
          ? s.filters.campaigns.filter((c) => c !== campaignId)
          : [...s.filters.campaigns, campaignId],
      },
    })),

  toggleCampaignTypeFilter: (type) =>
    set((s) => ({
      filters: {
        ...s.filters,
        campaignTypes: s.filters.campaignTypes.includes(type)
          ? s.filters.campaignTypes.filter((c) => c !== type)
          : [...s.filters.campaignTypes, type],
      },
    })),

  togglePhaseFilter: (phase) =>
    set((s) => ({
      filters: {
        ...s.filters,
        phases: s.filters.phases.includes(phase)
          ? s.filters.phases.filter((p) => p !== phase)
          : [...s.filters.phases, phase],
      },
    })),

  toggleReadinessFilter: (light) =>
    set((s) => ({
      filters: {
        ...s.filters,
        readiness: s.filters.readiness.includes(light)
          ? s.filters.readiness.filter((r) => r !== light)
          : [...s.filters.readiness, light],
      },
    })),

  toggleReadinessHintFilter: (hint) =>
    set((s) => ({
      filters: {
        ...s.filters,
        readinessHints: s.filters.readinessHints.includes(hint)
          ? s.filters.readinessHints.filter((h) => h !== hint)
          : [...s.filters.readinessHints, hint],
      },
    })),

  clearFilters: (options) =>
    set((s) => ({
      filters: options?.keepCampaigns
        ? { ...EMPTY_FILTERS, campaigns: s.filters.campaigns }
        : { ...EMPTY_FILTERS },
    })),

  toggleSelected: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id],
    })),
  clearSelection: () => set({ selectedIds: [] }),

  resetAll: () =>
    set({
      search: "",
      statusFilter: null,
      sort: "-updatedAt",
      showFavorites: false,
      filters: { ...EMPTY_FILTERS },
      selectedIds: [],
    }),
}));

// ─── Selectors ────────────────────────────────────────────

/** Count of active advanced filters — drives chip count on "+ Filters" button */
export function countActiveFilters(f: ContentLibraryFilters): number {
  let n = 0;
  n += f.types.length;
  n += f.campaigns.length;
  n += f.campaignTypes.length;
  n += f.phases.length;
  n += f.readiness.length;
  n += f.readinessHints.length;
  if (f.scheduledFrom || f.scheduledTo) n += 1;
  if (f.qualityMin != null) n += 1;
  return n;
}

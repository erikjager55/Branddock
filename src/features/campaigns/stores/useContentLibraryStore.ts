import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────

interface ContentLibraryState {
  search: string;
  typeFilter: string | null;
  campaignFilter: string | null;
  statusFilter: string | null;
  sort: string;
  viewMode: "grid" | "list";
  groupByCampaign: boolean;
  showFavorites: boolean;
  selectedIds: string[];
  setSearch: (s: string) => void;
  setTypeFilter: (f: string | null) => void;
  setCampaignFilter: (f: string | null) => void;
  setStatusFilter: (f: string | null) => void;
  setSort: (s: string) => void;
  setViewMode: (m: "grid" | "list") => void;
  toggleGroupByCampaign: () => void;
  toggleShowFavorites: () => void;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
  resetFilters: () => void;
}

// ─── Store ────────────────────────────────────────────────

export const useContentLibraryStore = create<ContentLibraryState>((set) => ({
  search: "",
  typeFilter: null,
  campaignFilter: null,
  statusFilter: null,
  sort: "updatedAt",
  viewMode: "grid",
  groupByCampaign: false,
  showFavorites: false,
  selectedIds: [],

  setSearch: (search) => set({ search }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),
  setCampaignFilter: (campaignFilter) => set({ campaignFilter }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSort: (sort) => set({ sort }),
  setViewMode: (viewMode) => set({ viewMode }),
  toggleGroupByCampaign: () =>
    set((s) => ({ groupByCampaign: !s.groupByCampaign })),
  toggleShowFavorites: () =>
    set((s) => ({ showFavorites: !s.showFavorites })),
  toggleSelected: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id],
    })),
  clearSelection: () => set({ selectedIds: [] }),
  resetFilters: () =>
    set({
      search: "",
      typeFilter: null,
      campaignFilter: null,
      statusFilter: null,
      sort: "updatedAt",
      showFavorites: false,
      selectedIds: [],
    }),
}));

import { create } from "zustand";
import type { AssetCategory, AssetStatus } from "@/types/brand-asset";

interface BrandAssetStore {
  searchQuery: string;
  categoryFilter: AssetCategory | null;
  statusFilter: AssetStatus | null;
  selectedAssetId: string | null;

  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: AssetCategory | null) => void;
  setStatusFilter: (status: AssetStatus | null) => void;
  setSelectedAssetId: (id: string | null) => void;
}

export const useBrandAssetStore = create<BrandAssetStore>((set) => ({
  searchQuery: "",
  categoryFilter: null,
  statusFilter: null,
  selectedAssetId: null,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setSelectedAssetId: (id) => set({ selectedAssetId: id }),
}));

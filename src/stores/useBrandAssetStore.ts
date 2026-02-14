import { create } from "zustand";
import type { AssetCategory, AssetStatus } from "@/types/brand-asset";

interface BrandAssetStore {
  searchQuery: string;
  categoryFilter: AssetCategory | null;
  statusFilter: AssetStatus | null;
  isCreateModalOpen: boolean;

  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: AssetCategory | null) => void;
  setStatusFilter: (status: AssetStatus | null) => void;
  setCreateModalOpen: (open: boolean) => void;
}

export const useBrandAssetStore = create<BrandAssetStore>((set) => ({
  searchQuery: "",
  categoryFilter: null,
  statusFilter: null,
  isCreateModalOpen: false,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
}));

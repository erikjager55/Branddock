import { create } from "zustand";
import type { BrandAssetDetail } from "@/types/brand-asset-detail";

interface BrandAssetDetailStore {
  asset: BrandAssetDetail | null;
  isEditing: boolean;
  editedContent: string;
  isDirty: boolean;
  isLocked: boolean;
  isRegenerating: boolean;
  frameworkCollapsed: boolean;

  setAsset: (asset: BrandAssetDetail | null) => void;
  startEditing: () => void;
  cancelEditing: () => void;
  setEditedContent: (content: string) => void;
  setLocked: (locked: boolean) => void;
  setRegenerating: (regenerating: boolean) => void;
  toggleFrameworkCollapse: () => void;
  reset: () => void;
}

export const useBrandAssetDetailStore = create<BrandAssetDetailStore>((set, get) => ({
  asset: null,
  isEditing: false,
  editedContent: "",
  isDirty: false,
  isLocked: false,
  isRegenerating: false,
  frameworkCollapsed: false,

  setAsset: (asset) => set({ asset }),
  startEditing: () => {
    const asset = get().asset;
    set({ isEditing: true, editedContent: asset?.content ?? "", isDirty: false });
  },
  cancelEditing: () => set({ isEditing: false, editedContent: "", isDirty: false }),
  setEditedContent: (content) => set({ editedContent: content, isDirty: true }),
  setLocked: (locked) => set({ isLocked: locked }),
  setRegenerating: (regenerating) => set({ isRegenerating: regenerating }),
  toggleFrameworkCollapse: () => set((s) => ({ frameworkCollapsed: !s.frameworkCollapsed })),
  reset: () => set({
    asset: null, isEditing: false, editedContent: "", isDirty: false,
    isLocked: false, isRegenerating: false, frameworkCollapsed: false,
  }),
}));

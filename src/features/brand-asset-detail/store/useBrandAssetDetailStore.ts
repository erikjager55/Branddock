import { create } from "zustand";

interface BrandAssetDetailState {
  selectedAssetId: string | null;
  isEditing: boolean;
  isFrameworkCollapsed: boolean;
  showDeleteDialog: boolean;
  showOverflowMenu: boolean;

  setSelectedAssetId: (id: string | null) => void;
  setIsEditing: (editing: boolean) => void;
  toggleFrameworkCollapsed: () => void;
  setShowDeleteDialog: (show: boolean) => void;
  setShowOverflowMenu: (show: boolean) => void;
  reset: () => void;
}

export const useBrandAssetDetailStore = create<BrandAssetDetailState>(
  (set) => ({
    selectedAssetId: null,
    isEditing: false,
    isFrameworkCollapsed: false,
    showDeleteDialog: false,
    showOverflowMenu: false,

    setSelectedAssetId: (id) => set({ selectedAssetId: id }),
    setIsEditing: (editing) => set({ isEditing: editing }),
    toggleFrameworkCollapsed: () =>
      set((s) => ({ isFrameworkCollapsed: !s.isFrameworkCollapsed })),
    setShowDeleteDialog: (show) => set({ showDeleteDialog: show }),
    setShowOverflowMenu: (show) => set({ showOverflowMenu: show }),
    reset: () =>
      set({
        isEditing: false,
        isFrameworkCollapsed: false,
        showDeleteDialog: false,
        showOverflowMenu: false,
      }),
  })
);

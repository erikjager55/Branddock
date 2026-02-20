import { create } from "zustand";

interface ResearchStoreState {
  activeViewTab: "overview" | "category" | "timeline";
  bundleSearch: string;
  bundleFilter: "all" | "recommended";
  selectedBundleId: string | null;
  selectedAssetIds: string[];
  methodQuantities: Record<string, number>;
  currentPlanId: string | null;

  setActiveViewTab: (tab: "overview" | "category" | "timeline") => void;
  setBundleSearch: (search: string) => void;
  setBundleFilter: (filter: "all" | "recommended") => void;
  setSelectedBundleId: (id: string | null) => void;
  toggleAsset: (id: string) => void;
  setMethodQuantity: (type: string, qty: number) => void;
  setCurrentPlanId: (id: string | null) => void;
  resetPlan: () => void;
}

export const useResearchStore = create<ResearchStoreState>((set) => ({
  activeViewTab: "overview",
  bundleSearch: "",
  bundleFilter: "all",
  selectedBundleId: null,
  selectedAssetIds: [],
  methodQuantities: { AI_EXPLORATION: 1, QUESTIONNAIRE: 0, INTERVIEWS: 0, WORKSHOP: 0 },
  currentPlanId: null,

  setActiveViewTab: (tab) => set({ activeViewTab: tab }),
  setBundleSearch: (search) => set({ bundleSearch: search }),
  setBundleFilter: (filter) => set({ bundleFilter: filter }),
  setSelectedBundleId: (id) => set({ selectedBundleId: id }),
  toggleAsset: (id) =>
    set((state) => ({
      selectedAssetIds: state.selectedAssetIds.includes(id)
        ? state.selectedAssetIds.filter((a) => a !== id)
        : [...state.selectedAssetIds, id],
    })),
  setMethodQuantity: (type, qty) =>
    set((state) => ({
      methodQuantities: { ...state.methodQuantities, [type]: qty },
    })),
  setCurrentPlanId: (id) => set({ currentPlanId: id }),
  resetPlan: () =>
    set({
      selectedAssetIds: [],
      methodQuantities: { AI_EXPLORATION: 1, QUESTIONNAIRE: 0, INTERVIEWS: 0, WORKSHOP: 0 },
      currentPlanId: null,
    }),
}));

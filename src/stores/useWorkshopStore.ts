import { create } from "zustand";
import type { Workshop, WorkshopBundle } from "@/types/workshop";
import { WORKSHOP_BASE_PRICE, FACILITATOR_PRICE, ASSET_PRICE } from "@/lib/constants/workshop";

type ResultsTab = "overview" | "canvas" | "workshop" | "notes" | "gallery";

interface WorkshopState {
  // Purchase
  selectionMode: "bundles" | "individual";
  selectedBundleId: string | null;
  selectedAssetIds: string[];
  workshopCount: number;
  hasFacilitator: boolean;
  totalPrice: number;

  // Session
  activeWorkshop: Workshop | null;
  currentStepNumber: number;
  stepResponses: Record<number, string>;
  timerRunning: boolean;
  timerSeconds: number;

  // Results
  activeTab: ResultsTab;
  canvasEditing: boolean;

  // Purchase Actions
  setSelectionMode: (mode: "bundles" | "individual") => void;
  selectBundle: (bundleId: string | null) => void;
  toggleAssetSelection: (assetId: string) => void;
  setWorkshopCount: (count: number) => void;
  setHasFacilitator: (value: boolean) => void;
  calculateTotalPrice: (bundles: WorkshopBundle[]) => void;

  // Session Actions
  setActiveWorkshop: (workshop: Workshop | null) => void;
  setCurrentStep: (step: number) => void;
  updateStepResponse: (stepNumber: number, response: string) => void;
  startTimer: () => void;
  stopTimer: () => void;
  tickTimer: () => void;

  // Results Actions
  setActiveTab: (tab: ResultsTab) => void;
  setCanvasEditing: (editing: boolean) => void;

  // Global
  reset: () => void;
}

const initialState = {
  // Purchase
  selectionMode: "bundles" as const,
  selectedBundleId: null as string | null,
  selectedAssetIds: [] as string[],
  workshopCount: 1,
  hasFacilitator: false,
  totalPrice: 0,

  // Session
  activeWorkshop: null as Workshop | null,
  currentStepNumber: 1,
  stepResponses: {} as Record<number, string>,
  timerRunning: false,
  timerSeconds: 0,

  // Results
  activeTab: "overview" as ResultsTab,
  canvasEditing: false,
};

export const useWorkshopStore = create<WorkshopState>((set, get) => ({
  ...initialState,

  // === Purchase Actions ===
  setSelectionMode: (mode) =>
    set({ selectionMode: mode, selectedBundleId: null, selectedAssetIds: [] }),

  selectBundle: (bundleId) => set({ selectedBundleId: bundleId }),

  toggleAssetSelection: (assetId) => {
    const current = get().selectedAssetIds;
    const next = current.includes(assetId)
      ? current.filter((id) => id !== assetId)
      : [...current, assetId];
    set({ selectedAssetIds: next });
  },

  setWorkshopCount: (count) => set({ workshopCount: Math.max(1, Math.min(10, count)) }),

  setHasFacilitator: (value) => set({ hasFacilitator: value }),

  calculateTotalPrice: (bundles) => {
    const s = get();
    let price = 0;
    if (s.selectionMode === "bundles" && s.selectedBundleId) {
      const bundle = bundles.find((b) => b.id === s.selectedBundleId);
      price = (bundle?.finalPrice ?? 0) * s.workshopCount;
    } else {
      price = (WORKSHOP_BASE_PRICE + s.selectedAssetIds.length * ASSET_PRICE) * s.workshopCount;
    }
    if (s.hasFacilitator) price += FACILITATOR_PRICE;
    set({ totalPrice: price });
  },

  // === Session Actions ===
  setActiveWorkshop: (workshop) =>
    set({
      activeWorkshop: workshop,
      currentStepNumber: workshop?.currentStep ?? 1,
      timerSeconds: workshop?.timerSeconds ?? 0,
      stepResponses: workshop
        ? Object.fromEntries(
            workshop.steps
              .filter((s) => s.response)
              .map((s) => [s.stepNumber, s.response!])
          )
        : {},
    }),

  setCurrentStep: (step) => set({ currentStepNumber: step }),

  updateStepResponse: (stepNumber, response) => {
    const current = get().stepResponses;
    set({ stepResponses: { ...current, [stepNumber]: response } });
  },

  startTimer: () => set({ timerRunning: true }),
  stopTimer: () => set({ timerRunning: false }),
  tickTimer: () => set((s) => ({ timerSeconds: s.timerSeconds + 1 })),

  // === Results Actions ===
  setActiveTab: (tab) => set({ activeTab: tab }),
  setCanvasEditing: (editing) => set({ canvasEditing: editing }),

  // === Global ===
  reset: () => set(initialState),
}));

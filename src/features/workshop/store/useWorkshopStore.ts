import { create } from "zustand";
import type { SelectionMode } from "../types/workshop-purchase.types";
import {
  WORKSHOP_BASE_PRICE,
  FACILITATOR_PRICE,
  ASSET_PRICE,
} from "../constants/workshop-pricing";

type ResultsTab = "overview" | "canvas" | "workshop" | "notes" | "gallery";

interface WorkshopStoreState {
  // Purchase state
  selectionMode: SelectionMode;
  selectedBundleId: string | null;
  selectedAssetIds: string[];
  workshopCount: number;
  hasFacilitator: boolean;
  totalPrice: number;

  // Session state
  activeWorkshopId: string | null;
  currentStepNumber: number;
  stepResponses: Record<number, string>;
  timerRunning: boolean;
  timerSeconds: number;

  // Results state
  activeTab: ResultsTab;
  canvasEditing: boolean;

  // Purchase actions
  setSelectionMode: (mode: SelectionMode) => void;
  selectBundle: (bundleId: string | null, bundlePrice?: number) => void;
  toggleAssetSelection: (assetId: string) => void;
  setWorkshopCount: (count: number) => void;
  setHasFacilitator: (value: boolean) => void;
  calculateTotalPrice: (bundlePrice?: number) => void;

  // Session actions
  setActiveWorkshopId: (id: string | null) => void;
  setCurrentStep: (step: number) => void;
  updateStepResponse: (step: number, response: string) => void;
  startTimer: () => void;
  stopTimer: () => void;
  tickTimer: () => void;
  setTimerSeconds: (seconds: number) => void;

  // Results actions
  setActiveTab: (tab: ResultsTab) => void;
  setCanvasEditing: (editing: boolean) => void;

  reset: () => void;
  resetSession: () => void;
}

const initialPurchaseState = {
  selectionMode: "bundles" as SelectionMode,
  selectedBundleId: null as string | null,
  selectedAssetIds: [] as string[],
  workshopCount: 1,
  hasFacilitator: false,
  totalPrice: WORKSHOP_BASE_PRICE,
};

const initialSessionState = {
  activeWorkshopId: null as string | null,
  currentStepNumber: 1,
  stepResponses: {} as Record<number, string>,
  timerRunning: false,
  timerSeconds: 0,
};

const initialResultsState = {
  activeTab: "overview" as ResultsTab,
  canvasEditing: false,
};

const initialState = {
  ...initialPurchaseState,
  ...initialSessionState,
  ...initialResultsState,
};

export const useWorkshopStore = create<WorkshopStoreState>((set, get) => ({
  ...initialState,

  // ─── Purchase Actions ──────────────────────────────────

  setSelectionMode: (mode) => {
    set({ selectionMode: mode, selectedBundleId: null, selectedAssetIds: [] });
    get().calculateTotalPrice();
  },

  selectBundle: (bundleId, bundlePrice) => {
    set({ selectedBundleId: bundleId });
    get().calculateTotalPrice(bundlePrice);
  },

  toggleAssetSelection: (assetId) => {
    const { selectedAssetIds } = get();
    const next = selectedAssetIds.includes(assetId)
      ? selectedAssetIds.filter((id) => id !== assetId)
      : [...selectedAssetIds, assetId];
    set({ selectedAssetIds: next });
    get().calculateTotalPrice();
  },

  setWorkshopCount: (count) => {
    set({ workshopCount: Math.max(1, count) });
    get().calculateTotalPrice();
  },

  setHasFacilitator: (value) => {
    set({ hasFacilitator: value });
    get().calculateTotalPrice();
  },

  calculateTotalPrice: (bundlePrice) => {
    const { selectionMode, selectedAssetIds, workshopCount, hasFacilitator } =
      get();

    let base: number;
    if (selectionMode === "bundles" && bundlePrice != null) {
      base = bundlePrice;
    } else if (selectionMode === "individual") {
      base = WORKSHOP_BASE_PRICE + selectedAssetIds.length * ASSET_PRICE;
    } else {
      base = WORKSHOP_BASE_PRICE;
    }

    let total = base * workshopCount;
    if (hasFacilitator) {
      total += FACILITATOR_PRICE * workshopCount;
    }

    set({ totalPrice: total });
  },

  // ─── Session Actions ───────────────────────────────────

  setActiveWorkshopId: (id) => set({ activeWorkshopId: id }),

  setCurrentStep: (step) => set({ currentStepNumber: step }),

  updateStepResponse: (step, response) =>
    set((s) => ({
      stepResponses: { ...s.stepResponses, [step]: response },
    })),

  startTimer: () => set({ timerRunning: true }),

  stopTimer: () => set({ timerRunning: false }),

  tickTimer: () => set((s) => ({ timerSeconds: s.timerSeconds + 1 })),

  setTimerSeconds: (seconds) => set({ timerSeconds: seconds }),

  // ─── Results Actions ───────────────────────────────────

  setActiveTab: (tab) => set({ activeTab: tab }),

  setCanvasEditing: (editing) => set({ canvasEditing: editing }),

  // ─── Reset ─────────────────────────────────────────────

  reset: () => set(initialState),

  resetSession: () => set({ ...initialSessionState, ...initialResultsState }),
}));

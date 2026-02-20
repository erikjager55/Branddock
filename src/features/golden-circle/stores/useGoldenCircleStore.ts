import { create } from "zustand";
import type { GoldenCircleRing } from "../types/golden-circle.types";

interface GoldenCircleStoreState {
  isEditing: boolean;
  editingRing: GoldenCircleRing | null;
  isLocked: boolean;

  // Actions
  openEdit: (ring: GoldenCircleRing) => void;
  closeEdit: () => void;
  setLocked: (locked: boolean) => void;
  reset: () => void;
}

const initialState = {
  isEditing: false,
  editingRing: null as GoldenCircleRing | null,
  isLocked: false,
};

export const useGoldenCircleStore = create<GoldenCircleStoreState>((set) => ({
  ...initialState,

  openEdit: (ring) => set({ isEditing: true, editingRing: ring }),
  closeEdit: () => set({ isEditing: false, editingRing: null }),
  setLocked: (locked) => set({ isLocked: locked }),
  reset: () => set(initialState),
}));

import { create } from "zustand";

interface BusinessStrategyStoreState {
  isCreateModalOpen: boolean;
  isAddObjectiveModalOpen: boolean;
  isAddMilestoneModalOpen: boolean;
  selectedStrategyId: string | null;

  // Actions
  setCreateModalOpen: (open: boolean) => void;
  setAddObjectiveModalOpen: (open: boolean) => void;
  setAddMilestoneModalOpen: (open: boolean) => void;
  setSelectedStrategyId: (id: string | null) => void;
}

export const useBusinessStrategyStore = create<BusinessStrategyStoreState>(
  (set) => ({
    isCreateModalOpen: false,
    isAddObjectiveModalOpen: false,
    isAddMilestoneModalOpen: false,
    selectedStrategyId: null,

    setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
    setAddObjectiveModalOpen: (open) => set({ isAddObjectiveModalOpen: open }),
    setAddMilestoneModalOpen: (open) => set({ isAddMilestoneModalOpen: open }),
    setSelectedStrategyId: (id) => set({ selectedStrategyId: id }),
  }),
);

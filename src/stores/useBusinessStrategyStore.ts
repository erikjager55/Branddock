import { create } from "zustand";
import type {
  StrategyListItem,
  StrategySummaryStats,
  BusinessStrategy,
} from "@/types/business-strategy";

interface BusinessStrategyStore {
  strategies: StrategyListItem[];
  stats: StrategySummaryStats | null;
  selectedStrategy: BusinessStrategy | null;

  // Modal state
  isCreateModalOpen: boolean;
  isAddObjectiveModalOpen: boolean;
  isAddMilestoneModalOpen: boolean;

  // Actions
  setStrategies: (strategies: StrategyListItem[]) => void;
  setStats: (stats: StrategySummaryStats) => void;
  setSelectedStrategy: (strategy: BusinessStrategy | null) => void;
  setCreateModalOpen: (open: boolean) => void;
  setAddObjectiveModalOpen: (open: boolean) => void;
  setAddMilestoneModalOpen: (open: boolean) => void;
  reset: () => void;
}

const initialState = {
  strategies: [] as StrategyListItem[],
  stats: null as StrategySummaryStats | null,
  selectedStrategy: null as BusinessStrategy | null,
  isCreateModalOpen: false,
  isAddObjectiveModalOpen: false,
  isAddMilestoneModalOpen: false,
};

export const useBusinessStrategyStore = create<BusinessStrategyStore>(
  (set) => ({
    ...initialState,

    setStrategies: (strategies) => set({ strategies }),
    setStats: (stats) => set({ stats }),
    setSelectedStrategy: (strategy) => set({ selectedStrategy: strategy }),
    setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
    setAddObjectiveModalOpen: (open) => set({ isAddObjectiveModalOpen: open }),
    setAddMilestoneModalOpen: (open) => set({ isAddMilestoneModalOpen: open }),
    reset: () => set(initialState),
  })
);

import { create } from "zustand";
import type { StrategyStatus, StrategyType } from "../types/business-strategy.types";

type SortBy = "name" | "updatedAt" | "progress" | "startDate";
type SortOrder = "asc" | "desc";

interface BusinessStrategyStoreState {
  isCreateModalOpen: boolean;
  isAddObjectiveModalOpen: boolean;
  isAddMilestoneModalOpen: boolean;
  isAiReviewOpen: boolean;
  selectedStrategyId: string | null;
  createWizardStep: number;

  // Filter state
  searchQuery: string;
  statusFilter: StrategyStatus | undefined;
  typeFilter: StrategyType | undefined;
  sortBy: SortBy;
  sortOrder: SortOrder;

  // Actions
  setCreateModalOpen: (open: boolean) => void;
  setAddObjectiveModalOpen: (open: boolean) => void;
  setAddMilestoneModalOpen: (open: boolean) => void;
  setAiReviewOpen: (open: boolean) => void;
  setSelectedStrategyId: (id: string | null) => void;
  setCreateWizardStep: (step: number) => void;

  // Filter actions
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: StrategyStatus | undefined) => void;
  setTypeFilter: (type: StrategyType | undefined) => void;
  setSortBy: (sort: SortBy) => void;
  setSortOrder: (order: SortOrder) => void;
  resetFilters: () => void;
}

export const useBusinessStrategyStore = create<BusinessStrategyStoreState>(
  (set) => ({
    isCreateModalOpen: false,
    isAddObjectiveModalOpen: false,
    isAddMilestoneModalOpen: false,
    isAiReviewOpen: false,
    selectedStrategyId: null,
    createWizardStep: 1,

    // Filter defaults
    searchQuery: "",
    statusFilter: undefined,
    typeFilter: undefined,
    sortBy: "updatedAt",
    sortOrder: "desc",

    setCreateModalOpen: (open) => set({ isCreateModalOpen: open, createWizardStep: open ? 1 : 1 }),
    setAddObjectiveModalOpen: (open) => set({ isAddObjectiveModalOpen: open }),
    setAddMilestoneModalOpen: (open) => set({ isAddMilestoneModalOpen: open }),
    setAiReviewOpen: (open) => set({ isAiReviewOpen: open }),
    setSelectedStrategyId: (id) => set({ selectedStrategyId: id }),
    setCreateWizardStep: (step) => set({ createWizardStep: step }),

    // Filter actions
    setSearchQuery: (query) => set({ searchQuery: query }),
    setStatusFilter: (status) => set({ statusFilter: status }),
    setTypeFilter: (type) => set({ typeFilter: type }),
    setSortBy: (sort) => set({ sortBy: sort }),
    setSortOrder: (order) => set({ sortOrder: order }),
    resetFilters: () =>
      set({
        searchQuery: "",
        statusFilter: undefined,
        typeFilter: undefined,
        sortBy: "updatedAt",
        sortOrder: "desc",
      }),
  }),
);

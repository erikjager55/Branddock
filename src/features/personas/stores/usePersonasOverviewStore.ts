import { create } from "zustand";

interface PersonasOverviewStoreState {
  searchQuery: string;
  filter: "all" | "ready" | "needs_work";

  setSearchQuery: (query: string) => void;
  setFilter: (filter: "all" | "ready" | "needs_work") => void;
}

export const usePersonasOverviewStore = create<PersonasOverviewStoreState>(
  (set) => ({
    searchQuery: "",
    filter: "all",

    setSearchQuery: (query) => set({ searchQuery: query }),
    setFilter: (filter) => set({ filter }),
  }),
);

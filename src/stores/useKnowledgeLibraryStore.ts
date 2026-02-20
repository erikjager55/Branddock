import { create } from "zustand";
import type { ResourceType } from "@prisma/client";
import type { ImportUrlResponse } from "@/features/knowledge-library/types/knowledge-library.types";

type ViewMode = "grid" | "list";
type AddTab = "manual" | "import" | "upload";

interface KnowledgeLibraryStore {
  // View
  viewMode: ViewMode;

  // Filters
  searchQuery: string;
  typeFilter: ResourceType | null;
  categoryFilter: string | null;

  // Add Modal
  isAddModalOpen: boolean;
  activeAddTab: AddTab;
  selectedResourceType: ResourceType;
  importedMetadata: ImportUrlResponse | null;
  isImporting: boolean;

  // Detail
  selectedResourceId: string | null;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (q: string) => void;
  setTypeFilter: (t: ResourceType | null) => void;
  setCategoryFilter: (c: string | null) => void;
  setAddModalOpen: (open: boolean) => void;
  setActiveAddTab: (tab: AddTab) => void;
  setSelectedResourceType: (type: ResourceType) => void;
  setImportedMetadata: (meta: ImportUrlResponse | null) => void;
  setIsImporting: (v: boolean) => void;
  setSelectedResourceId: (id: string | null) => void;
  resetFilters: () => void;
}

export const useKnowledgeLibraryStore = create<KnowledgeLibraryStore>((set) => ({
  viewMode: "grid",

  searchQuery: "",
  typeFilter: null,
  categoryFilter: null,

  isAddModalOpen: false,
  activeAddTab: "manual",
  selectedResourceType: "ARTICLE",
  importedMetadata: null,
  isImporting: false,

  selectedResourceId: null,

  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setTypeFilter: (t) => set({ typeFilter: t }),
  setCategoryFilter: (c) => set({ categoryFilter: c }),
  setAddModalOpen: (open) =>
    set(
      open
        ? { isAddModalOpen: true }
        : {
            isAddModalOpen: false,
            activeAddTab: "manual",
            selectedResourceType: "ARTICLE",
            importedMetadata: null,
            isImporting: false,
          }
    ),
  setActiveAddTab: (tab) => set({ activeAddTab: tab }),
  setSelectedResourceType: (type) => set({ selectedResourceType: type }),
  setImportedMetadata: (meta) => set({ importedMetadata: meta }),
  setIsImporting: (v) => set({ isImporting: v }),
  setSelectedResourceId: (id) => set({ selectedResourceId: id }),
  resetFilters: () =>
    set({ searchQuery: "", typeFilter: null, categoryFilter: null }),
}));

// Selectors
export const useViewMode = () => useKnowledgeLibraryStore((s) => s.viewMode);
export const useKnowledgeSearchQuery = () =>
  useKnowledgeLibraryStore((s) => s.searchQuery);
export const useTypeFilter = () =>
  useKnowledgeLibraryStore((s) => s.typeFilter);
export const useKnowledgeCategoryFilter = () =>
  useKnowledgeLibraryStore((s) => s.categoryFilter);
export const useIsKnowledgeAddModalOpen = () =>
  useKnowledgeLibraryStore((s) => s.isAddModalOpen);
export const useKnowledgeActiveAddTab = () =>
  useKnowledgeLibraryStore((s) => s.activeAddTab);
export const useSelectedResourceId = () =>
  useKnowledgeLibraryStore((s) => s.selectedResourceId);

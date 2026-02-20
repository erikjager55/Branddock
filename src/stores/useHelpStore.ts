import { create } from "zustand";

interface HelpStore {
  // Search
  searchQuery: string;
  activeTag: string | null;

  // Article detail
  selectedArticleSlug: string | null;

  // FAQ
  expandedFaqId: string | null;

  // Modals / panels
  isContactFormOpen: boolean;
  isFeatureRequestModalOpen: boolean;
  isChatOpen: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  setActiveTag: (tag: string | null) => void;
  setSelectedArticleSlug: (slug: string | null) => void;
  setExpandedFaqId: (id: string | null) => void;
  toggleFaqItem: (id: string) => void;
  openContactForm: () => void;
  closeContactForm: () => void;
  openFeatureRequestModal: () => void;
  closeFeatureRequestModal: () => void;
  openChat: () => void;
  closeChat: () => void;
  resetFilters: () => void;
}

export const useHelpStore = create<HelpStore>((set) => ({
  searchQuery: "",
  activeTag: null,
  selectedArticleSlug: null,
  expandedFaqId: null,
  isContactFormOpen: false,
  isFeatureRequestModalOpen: false,
  isChatOpen: false,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveTag: (tag) => set({ activeTag: tag }),
  setSelectedArticleSlug: (slug) => set({ selectedArticleSlug: slug }),
  setExpandedFaqId: (id) => set({ expandedFaqId: id }),
  toggleFaqItem: (id) =>
    set((s) => ({
      expandedFaqId: s.expandedFaqId === id ? null : id,
    })),
  openContactForm: () => set({ isContactFormOpen: true }),
  closeContactForm: () => set({ isContactFormOpen: false }),
  openFeatureRequestModal: () => set({ isFeatureRequestModalOpen: true }),
  closeFeatureRequestModal: () => set({ isFeatureRequestModalOpen: false }),
  openChat: () => set({ isChatOpen: true }),
  closeChat: () => set({ isChatOpen: false }),
  resetFilters: () => set({ searchQuery: "", activeTag: null }),
}));

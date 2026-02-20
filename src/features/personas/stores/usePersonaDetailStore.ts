import { create } from "zustand";

interface PersonaDetailStoreState {
  isEditing: boolean;
  activeTab: "overview" | "psychographics" | "background";
  selectedPersonaId: string | null;
  isChatModalOpen: boolean;

  setEditing: (editing: boolean) => void;
  setActiveTab: (tab: "overview" | "psychographics" | "background") => void;
  setSelectedPersonaId: (id: string | null) => void;
  setChatModalOpen: (open: boolean) => void;
}

export const usePersonaDetailStore = create<PersonaDetailStoreState>(
  (set) => ({
    isEditing: false,
    activeTab: "overview",
    selectedPersonaId: null,
    isChatModalOpen: false,

    setEditing: (editing) => set({ isEditing: editing }),
    setActiveTab: (tab) => set({ activeTab: tab }),
    setSelectedPersonaId: (id) => set({ selectedPersonaId: id }),
    setChatModalOpen: (open) => set({ isChatModalOpen: open }),
  }),
);

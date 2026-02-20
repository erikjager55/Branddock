import { create } from "zustand";

export interface ContextItem {
  id: string;
  sourceType: string;
  sourceId: string;
  sourceName: string;
}

interface PersonaChatStoreState {
  // UI-only state (stays in store)
  currentInput: string;
  activeTab: "chat" | "insights";
  isContextSelectorOpen: boolean;

  setCurrentInput: (input: string) => void;
  setActiveTab: (tab: "chat" | "insights") => void;
  openContextSelector: () => void;
  closeContextSelector: () => void;
}

export const usePersonaChatStore = create<PersonaChatStoreState>((set) => ({
  currentInput: "",
  activeTab: "chat",
  isContextSelectorOpen: false,

  setCurrentInput: (input) => set({ currentInput: input }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  openContextSelector: () => set({ isContextSelectorOpen: true }),
  closeContextSelector: () => set({ isContextSelectorOpen: false }),
}));

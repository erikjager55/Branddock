import { create } from "zustand";

export type VoiceguideTab = "voice-dna" | "vocabulary" | "channel-tones" | "references";

export type AnalyzerInputMode = "url" | "paste";

interface VoiceguideStore {
  // Tab state
  activeTab: VoiceguideTab;
  setActiveTab: (tab: VoiceguideTab) => void;

  // Edit state — per-tab inline editing (mirrors brandstyle pattern)
  editingTab: VoiceguideTab | null;
  setEditingTab: (tab: VoiceguideTab | null) => void;

  // Analyzer state
  analyzerInputMode: AnalyzerInputMode;
  setAnalyzerInputMode: (mode: AnalyzerInputMode) => void;
  analyzerJobId: string | null;
  setAnalyzerJobId: (jobId: string | null) => void;

  // Reset (used on workspace switch)
  reset: () => void;
}

const initial = {
  activeTab: "voice-dna" as VoiceguideTab,
  editingTab: null,
  analyzerInputMode: "url" as AnalyzerInputMode,
  analyzerJobId: null,
};

export const useVoiceguideStore = create<VoiceguideStore>((set) => ({
  ...initial,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setEditingTab: (tab) => set({ editingTab: tab }),
  setAnalyzerInputMode: (mode) => set({ analyzerInputMode: mode }),
  setAnalyzerJobId: (jobId) => set({ analyzerJobId: jobId }),
  reset: () => set(initial),
}));

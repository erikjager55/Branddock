import { create } from "zustand";
import type { PersonaInsightsData } from "../types/persona-analysis.types";

interface AIPersonaAnalysisStoreState {
  sessionId: string | null;
  status: string;
  progress: number;
  answeredDimensions: number;
  isAITyping: boolean;
  currentInput: string;
  insightsData: PersonaInsightsData | null;

  setSessionId: (id: string | null) => void;
  setStatus: (status: string) => void;
  setProgress: (progress: number) => void;
  setAnsweredDimensions: (count: number) => void;
  setAITyping: (typing: boolean) => void;
  setCurrentInput: (input: string) => void;
  setInsightsData: (data: PersonaInsightsData | null) => void;
  reset: () => void;
}

export const useAIPersonaAnalysisStore =
  create<AIPersonaAnalysisStoreState>((set) => ({
    sessionId: null,
    status: "NOT_STARTED",
    progress: 0,
    answeredDimensions: 0,
    isAITyping: false,
    currentInput: "",
    insightsData: null,

    setSessionId: (id) => set({ sessionId: id }),
    setStatus: (status) => set({ status }),
    setProgress: (progress) => set({ progress }),
    setAnsweredDimensions: (count) => set({ answeredDimensions: count }),
    setAITyping: (typing) => set({ isAITyping: typing }),
    setCurrentInput: (input) => set({ currentInput: input }),
    setInsightsData: (data) => set({ insightsData: data }),
    reset: () =>
      set({
        sessionId: null,
        status: "NOT_STARTED",
        progress: 0,
        answeredDimensions: 0,
        isAITyping: false,
        currentInput: "",
        insightsData: null,
      }),
  }));

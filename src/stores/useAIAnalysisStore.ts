import { create } from "zustand";
import type { AIAnalysisStatus, AIAnalysisMessage, AIAnalysisReportData } from "@/types/ai-analysis";

interface AIAnalysisStore {
  sessionId: string | null;
  status: AIAnalysisStatus;
  progress: number;
  totalQuestions: number;
  answeredQuestions: number;
  messages: AIAnalysisMessage[];
  isLocked: boolean;
  isAITyping: boolean;
  currentInputValue: string;
  reportData: AIAnalysisReportData | null;
  isGeneratingReport: boolean;

  setSessionId: (id: string | null) => void;
  setStatus: (status: AIAnalysisStatus) => void;
  setProgress: (progress: number, answered: number, total: number) => void;
  setMessages: (messages: AIAnalysisMessage[]) => void;
  addMessage: (message: AIAnalysisMessage) => void;
  setAITyping: (typing: boolean) => void;
  setCurrentInput: (value: string) => void;
  setReportData: (data: AIAnalysisReportData | null) => void;
  setGeneratingReport: (generating: boolean) => void;
  setLocked: (locked: boolean) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null as string | null,
  status: "NOT_STARTED" as AIAnalysisStatus,
  progress: 0,
  totalQuestions: 0,
  answeredQuestions: 0,
  messages: [] as AIAnalysisMessage[],
  isLocked: false,
  isAITyping: false,
  currentInputValue: "",
  reportData: null as AIAnalysisReportData | null,
  isGeneratingReport: false,
};

export const useAIAnalysisStore = create<AIAnalysisStore>((set) => ({
  ...initialState,
  setSessionId: (id) => set({ sessionId: id }),
  setStatus: (status) => set({ status }),
  setProgress: (progress, answered, total) => set({ progress, answeredQuestions: answered, totalQuestions: total }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  setAITyping: (typing) => set({ isAITyping: typing }),
  setCurrentInput: (value) => set({ currentInputValue: value }),
  setReportData: (data) => set({ reportData: data }),
  setGeneratingReport: (generating) => set({ isGeneratingReport: generating }),
  setLocked: (locked) => set({ isLocked: locked }),
  reset: () => set(initialState),
}));

import { create } from 'zustand';
import type { ExplorationInsightsData, ExplorationMessage } from '../types';

interface AIExplorationStoreState {
  // Session
  sessionId: string | null;
  status: string;
  progress: number;
  answeredDimensions: number;

  // Messages
  messages: ExplorationMessage[];

  // UI
  isAITyping: boolean;
  currentInput: string;

  // Results
  insightsData: ExplorationInsightsData | null;

  // Actions
  setSessionId: (id: string | null) => void;
  setStatus: (status: string) => void;
  setProgress: (progress: number) => void;
  setAnsweredDimensions: (count: number) => void;
  setAITyping: (typing: boolean) => void;
  setCurrentInput: (input: string) => void;
  setMessages: (messages: ExplorationMessage[]) => void;
  addMessage: (message: ExplorationMessage) => void;
  setInsightsData: (data: ExplorationInsightsData | null) => void;
  reset: () => void;
}

export const useAIExplorationStore = create<AIExplorationStoreState>((set) => ({
  sessionId: null,
  status: 'NOT_STARTED',
  progress: 0,
  answeredDimensions: 0,
  messages: [],
  isAITyping: false,
  currentInput: '',
  insightsData: null,

  setSessionId: (id) => set({ sessionId: id }),
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setAnsweredDimensions: (count) => set({ answeredDimensions: count }),
  setAITyping: (typing) => set({ isAITyping: typing }),
  setCurrentInput: (input) => set({ currentInput: input }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  setInsightsData: (data) => set({ insightsData: data }),
  reset: () =>
    set({
      sessionId: null,
      status: 'NOT_STARTED',
      progress: 0,
      answeredDimensions: 0,
      messages: [],
      isAITyping: false,
      currentInput: '',
      insightsData: null,
    }),
}));

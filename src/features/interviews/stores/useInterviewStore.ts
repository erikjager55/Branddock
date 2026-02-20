import { create } from "zustand";
import type { QuestionType } from "../types/interview.types";

interface NewQuestion {
  linkedAssetId: string | null;
  questionType: QuestionType;
  questionText: string;
  answerOptions: string[];
}

interface InterviewStoreState {
  selectedInterviewId: string | null;
  currentWizardStep: number;
  questionModalOpen: boolean;
  templatePanelOpen: boolean;
  newQuestion: NewQuestion;

  // Actions
  setSelectedInterview: (id: string | null) => void;
  setWizardStep: (step: number) => void;
  openQuestionModal: () => void;
  closeQuestionModal: () => void;
  toggleTemplatePanel: () => void;
  updateNewQuestion: (updates: Partial<NewQuestion>) => void;
  resetNewQuestion: () => void;
  reset: () => void;
}

const initialNewQuestion: NewQuestion = {
  linkedAssetId: null,
  questionType: "OPEN",
  questionText: "",
  answerOptions: [],
};

const initialState = {
  selectedInterviewId: null as string | null,
  currentWizardStep: 1,
  questionModalOpen: false,
  templatePanelOpen: false,
  newQuestion: { ...initialNewQuestion },
};

export const useInterviewStore = create<InterviewStoreState>((set) => ({
  ...initialState,

  setSelectedInterview: (id) =>
    set({ selectedInterviewId: id, currentWizardStep: 1 }),

  setWizardStep: (step) => set({ currentWizardStep: step }),

  openQuestionModal: () => set({ questionModalOpen: true }),

  closeQuestionModal: () =>
    set({ questionModalOpen: false, newQuestion: { ...initialNewQuestion } }),

  toggleTemplatePanel: () =>
    set((s) => ({ templatePanelOpen: !s.templatePanelOpen })),

  updateNewQuestion: (updates) =>
    set((s) => ({ newQuestion: { ...s.newQuestion, ...updates } })),

  resetNewQuestion: () => set({ newQuestion: { ...initialNewQuestion } }),

  reset: () => set(initialState),
}));

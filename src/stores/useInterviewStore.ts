import { create } from "zustand";
import type { Interview, InterviewOverviewStats, AnswerQuestionBody } from "@/types/interview";

interface InterviewState {
  // Overview
  interviews: Interview[];
  stats: InterviewOverviewStats | null;

  // Wizard
  activeInterview: Interview | null;
  currentWizardStep: number;
  completedWizardSteps: number[];

  // Step 3: Questions
  selectedAssetIds: string[];
  showTemplatePanel: boolean;
  templateFilter: string | null;

  // Step 4: Conduct
  currentQuestionIndex: number;
  conductAnswers: Record<string, AnswerQuestionBody>;

  // Actions — Overview
  setInterviews: (interviews: Interview[]) => void;
  setStats: (stats: InterviewOverviewStats) => void;

  // Actions — Wizard
  setActiveInterview: (interview: Interview | null) => void;
  setCurrentWizardStep: (step: number) => void;
  markStepCompleted: (step: number) => void;

  // Actions — Step 3: Questions
  toggleAssetSelection: (assetId: string) => void;
  setSelectedAssetIds: (ids: string[]) => void;
  setShowTemplatePanel: (show: boolean) => void;
  setTemplateFilter: (filter: string | null) => void;

  // Actions — Step 4: Conduct
  setCurrentQuestionIndex: (index: number) => void;
  updateConductAnswer: (questionId: string, answer: AnswerQuestionBody) => void;

  // Global
  reset: () => void;
}

const initialState = {
  // Overview
  interviews: [] as Interview[],
  stats: null as InterviewOverviewStats | null,

  // Wizard
  activeInterview: null as Interview | null,
  currentWizardStep: 1,
  completedWizardSteps: [] as number[],

  // Step 3: Questions
  selectedAssetIds: [] as string[],
  showTemplatePanel: false,
  templateFilter: null as string | null,

  // Step 4: Conduct
  currentQuestionIndex: 0,
  conductAnswers: {} as Record<string, AnswerQuestionBody>,
};

export const useInterviewStore = create<InterviewState>((set, get) => ({
  ...initialState,

  // === Overview Actions ===
  setInterviews: (interviews) => set({ interviews }),
  setStats: (stats) => set({ stats }),

  // === Wizard Actions ===
  setActiveInterview: (interview) => {
    if (!interview) {
      set({
        activeInterview: null,
        currentWizardStep: 1,
        completedWizardSteps: [],
        selectedAssetIds: [],
        currentQuestionIndex: 0,
        conductAnswers: {},
      });
      return;
    }

    // Initialize conduct answers from existing question answers
    const conductAnswers: Record<string, AnswerQuestionBody> = {};
    for (const q of interview.questions) {
      if (q.isAnswered) {
        conductAnswers[q.id] = {
          answerText: q.answerText ?? undefined,
          answerOptions: q.answerOptions.length > 0 ? q.answerOptions : undefined,
          answerRating: q.answerRating ?? undefined,
          answerRanking: q.answerRanking.length > 0 ? q.answerRanking : undefined,
        };
      }
    }

    set({
      activeInterview: interview,
      currentWizardStep: interview.currentStep,
      completedWizardSteps: [...interview.completedSteps],
      selectedAssetIds: interview.selectedAssets.map((link) => link.brandAssetId),
      currentQuestionIndex: 0,
      conductAnswers,
    });
  },

  setCurrentWizardStep: (step) => set({ currentWizardStep: step }),

  markStepCompleted: (step) => {
    const current = get().completedWizardSteps;
    if (!current.includes(step)) {
      set({ completedWizardSteps: [...current, step] });
    }
  },

  // === Step 3: Questions Actions ===
  toggleAssetSelection: (assetId) => {
    const current = get().selectedAssetIds;
    const next = current.includes(assetId)
      ? current.filter((id) => id !== assetId)
      : [...current, assetId];
    set({ selectedAssetIds: next });
  },

  setSelectedAssetIds: (ids) => set({ selectedAssetIds: ids }),

  setShowTemplatePanel: (show) => set({ showTemplatePanel: show }),

  setTemplateFilter: (filter) => set({ templateFilter: filter }),

  // === Step 4: Conduct Actions ===
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),

  updateConductAnswer: (questionId, answer) => {
    const current = get().conductAnswers;
    set({ conductAnswers: { ...current, [questionId]: answer } });
  },

  // === Global ===
  reset: () => set(initialState),
}));

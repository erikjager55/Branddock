import { create } from 'zustand';

interface DashboardStore {
  // Onboarding
  showOnboarding: boolean;
  onboardingStep: 1 | 2 | 3;
  dontShowAgain: boolean;

  // Quick Start
  showQuickStart: boolean;
  quickStartCollapsed: boolean;

  // Actions
  setOnboardingStep: (step: 1 | 2 | 3) => void;
  completeOnboarding: () => void;
  toggleDontShowAgain: () => void;
  dismissQuickStart: () => void;
  toggleQuickStartCollapse: () => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  showOnboarding: true,
  onboardingStep: 1,
  dontShowAgain: false,

  showQuickStart: true,
  quickStartCollapsed: false,

  setOnboardingStep: (step) => set({ onboardingStep: step }),
  completeOnboarding: () => set({ showOnboarding: false }),
  toggleDontShowAgain: () => set((s) => ({ dontShowAgain: !s.dontShowAgain })),
  dismissQuickStart: () => set({ showQuickStart: false }),
  toggleQuickStartCollapse: () => set((s) => ({ quickStartCollapsed: !s.quickStartCollapsed })),
}));

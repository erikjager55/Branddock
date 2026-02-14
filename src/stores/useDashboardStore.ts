import { create } from "zustand";

interface DashboardStore {
  // Onboarding
  showOnboarding: boolean;
  onboardingStep: 1 | 2 | 3;
  dontShowAgain: boolean;
  setOnboardingStep: (step: 1 | 2 | 3) => void;
  completeOnboarding: () => void;
  toggleDontShowAgain: () => void;
  setShowOnboarding: (show: boolean) => void;

  // Quick Start
  showQuickStart: boolean;
  quickStartCollapsed: boolean;
  dismissQuickStart: () => void;
  toggleQuickStartCollapse: () => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  // Onboarding
  showOnboarding: false,
  onboardingStep: 1,
  dontShowAgain: false,
  setOnboardingStep: (step) => set({ onboardingStep: step }),
  completeOnboarding: () => set({ showOnboarding: false }),
  toggleDontShowAgain: () => set((s) => ({ dontShowAgain: !s.dontShowAgain })),
  setShowOnboarding: (show) => set({ showOnboarding: show }),

  // Quick Start
  showQuickStart: true,
  quickStartCollapsed: false,
  dismissQuickStart: () => set({ showQuickStart: false }),
  toggleQuickStartCollapse: () => set((s) => ({ quickStartCollapsed: !s.quickStartCollapsed })),
}));

import { create } from "zustand";
import type { AppearanceData } from "@/types/settings";

export type SettingsTab = "account" | "team" | "billing" | "notifications" | "appearance" | "administrator";

interface SettingsStore {
  // Navigation
  activeTab: SettingsTab;

  // Account
  isEditingProfile: boolean;
  isChangingPassword: boolean;

  // Team
  isInviteModalOpen: boolean;
  isRolePermissionsExpanded: boolean;

  // Billing
  billingCycle: "monthly" | "yearly";
  isChangePlanModalOpen: boolean;
  selectedPlanId: string | null;
  isUpgradeModalOpen: boolean;

  // Appearance
  pendingAppearance: Partial<AppearanceData> | null;

  // Actions
  setActiveTab: (tab: SettingsTab) => void;
  setIsEditingProfile: (value: boolean) => void;
  setIsChangingPassword: (value: boolean) => void;
  setIsInviteModalOpen: (value: boolean) => void;
  setIsRolePermissionsExpanded: (value: boolean) => void;
  setBillingCycle: (cycle: "monthly" | "yearly") => void;
  setIsChangePlanModalOpen: (value: boolean) => void;
  setSelectedPlanId: (id: string | null) => void;
  setIsUpgradeModalOpen: (value: boolean) => void;
  setPendingAppearance: (value: Partial<AppearanceData> | null) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  activeTab: "account",

  isEditingProfile: false,
  isChangingPassword: false,

  isInviteModalOpen: false,
  isRolePermissionsExpanded: false,

  billingCycle: "monthly",
  isChangePlanModalOpen: false,
  selectedPlanId: null,
  isUpgradeModalOpen: false,

  pendingAppearance: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setIsEditingProfile: (value) => set({ isEditingProfile: value }),
  setIsChangingPassword: (value) => set({ isChangingPassword: value }),
  setIsInviteModalOpen: (value) => set({ isInviteModalOpen: value }),
  setIsRolePermissionsExpanded: (value) => set({ isRolePermissionsExpanded: value }),
  setBillingCycle: (cycle) => set({ billingCycle: cycle }),
  setIsChangePlanModalOpen: (value) => set({ isChangePlanModalOpen: value }),
  setSelectedPlanId: (id) => set({ selectedPlanId: id }),
  setIsUpgradeModalOpen: (value) => set({ isUpgradeModalOpen: value }),
  setPendingAppearance: (value) => set({ pendingAppearance: value }),

  reset: () =>
    set({
      activeTab: "account",
      isEditingProfile: false,
      isChangingPassword: false,
      isInviteModalOpen: false,
      isRolePermissionsExpanded: false,
      billingCycle: "monthly",
      isChangePlanModalOpen: false,
      selectedPlanId: null,
      isUpgradeModalOpen: false,
      pendingAppearance: null,
    }),
}));

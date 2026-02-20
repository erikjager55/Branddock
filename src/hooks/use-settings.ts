// =============================================================
// Settings TanStack Query hooks — 28+ hooks
// =============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  // Account
  fetchProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  changePassword,
  fetchEmailPreferences,
  updateEmailPreferences,
  fetchConnectedAccounts,
  connectAccount,
  disconnectAccount,
  deleteAccount,
  // Team
  fetchTeam,
  fetchTeamMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  fetchPendingInvites,
  resendInvite,
  cancelInvite,
  fetchTeamPermissions,
  // Billing
  fetchBilling,
  fetchPlans,
  changePlan,
  cancelSubscription,
  fetchUsage,
  fetchPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  fetchInvoices,
  downloadInvoice,
  // Notifications
  fetchNotificationPrefs,
  updateNotificationPrefs,
  connectNotificationChannel,
  // Appearance
  fetchAppearance,
  updateAppearance,
  resetAppearance,
} from "@/lib/api/settings";
import type {
  UpdateProfileRequest,
  UploadAvatarRequest,
  ChangePasswordRequest,
  UpdateEmailPreferencesRequest,
  InviteMemberRequest,
  UpdateMemberRoleRequest,
  ChangePlanRequest,
  AddPaymentMethodRequest,
  UpdateNotificationPrefsRequest,
  UpdateAppearanceRequest,
} from "@/types/settings";

// ─── Query Keys ────────────────────────────────────────────

export const settingsKeys = {
  all: ["settings"] as const,
  profile: () => ["settings", "profile"] as const,
  emailPrefs: () => ["settings", "email-prefs"] as const,
  connectedAccounts: () => ["settings", "connected-accounts"] as const,
  team: () => ["settings", "team"] as const,
  members: () => ["settings", "members"] as const,
  invites: () => ["settings", "invites"] as const,
  permissions: () => ["settings", "permissions"] as const,
  billing: () => ["settings", "billing"] as const,
  plans: () => ["settings", "plans"] as const,
  usage: () => ["settings", "usage"] as const,
  paymentMethods: () => ["settings", "payment-methods"] as const,
  invoices: () => ["settings", "invoices"] as const,
  notificationPrefs: () => ["settings", "notification-prefs"] as const,
  appearance: () => ["settings", "appearance"] as const,
};

// ─── Account Queries ────────────────────────────────────────

export function useProfile() {
  return useQuery({
    queryKey: settingsKeys.profile(),
    queryFn: fetchProfile,
  });
}

export function useEmailPreferences() {
  return useQuery({
    queryKey: settingsKeys.emailPrefs(),
    queryFn: fetchEmailPreferences,
  });
}

export function useConnectedAccounts() {
  return useQuery({
    queryKey: settingsKeys.connectedAccounts(),
    queryFn: fetchConnectedAccounts,
  });
}

// ─── Account Mutations ──────────────────────────────────────

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => updateProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.profile() });
    },
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UploadAvatarRequest) => uploadAvatar(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.profile() });
    },
  });
}

export function useDeleteAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAvatar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.profile() });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => changePassword(data),
  });
}

export function useUpdateEmailPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateEmailPreferencesRequest) =>
      updateEmailPreferences(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.emailPrefs() });
    },
  });
}

export function useConnectAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) => connectAccount(provider),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.connectedAccounts() });
    },
  });
}

export function useDisconnectAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) => disconnectAccount(provider),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.connectedAccounts() });
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: deleteAccount,
  });
}

// ─── Team Queries ───────────────────────────────────────────

export function useTeam() {
  return useQuery({
    queryKey: settingsKeys.team(),
    queryFn: fetchTeam,
  });
}

export function useTeamMembers() {
  return useQuery({
    queryKey: settingsKeys.members(),
    queryFn: fetchTeamMembers,
  });
}

export function usePendingInvites() {
  return useQuery({
    queryKey: settingsKeys.invites(),
    queryFn: fetchPendingInvites,
  });
}

export function useTeamPermissions() {
  return useQuery({
    queryKey: settingsKeys.permissions(),
    queryFn: fetchTeamPermissions,
  });
}

// ─── Team Mutations ─────────────────────────────────────────

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InviteMemberRequest) => inviteMember(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.team() });
      qc.invalidateQueries({ queryKey: settingsKeys.members() });
      qc.invalidateQueries({ queryKey: settingsKeys.invites() });
    },
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      data,
    }: {
      memberId: string;
      data: UpdateMemberRoleRequest;
    }) => updateMemberRole(memberId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.team() });
      qc.invalidateQueries({ queryKey: settingsKeys.members() });
      qc.invalidateQueries({ queryKey: settingsKeys.invites() });
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeMember(memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.team() });
      qc.invalidateQueries({ queryKey: settingsKeys.members() });
      qc.invalidateQueries({ queryKey: settingsKeys.invites() });
    },
  });
}

export function useResendInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => resendInvite(inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.team() });
      qc.invalidateQueries({ queryKey: settingsKeys.members() });
      qc.invalidateQueries({ queryKey: settingsKeys.invites() });
    },
  });
}

export function useCancelInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => cancelInvite(inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.team() });
      qc.invalidateQueries({ queryKey: settingsKeys.members() });
      qc.invalidateQueries({ queryKey: settingsKeys.invites() });
    },
  });
}

// ─── Billing Queries ────────────────────────────────────────

export function useBilling() {
  return useQuery({
    queryKey: settingsKeys.billing(),
    queryFn: fetchBilling,
  });
}

export function usePlans() {
  return useQuery({
    queryKey: settingsKeys.plans(),
    queryFn: fetchPlans,
  });
}

export function useUsage() {
  return useQuery({
    queryKey: settingsKeys.usage(),
    queryFn: fetchUsage,
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: settingsKeys.paymentMethods(),
    queryFn: fetchPaymentMethods,
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: settingsKeys.invoices(),
    queryFn: fetchInvoices,
  });
}

// ─── Billing Mutations ──────────────────────────────────────

export function useChangePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ChangePlanRequest) => changePlan(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.billing() });
      qc.invalidateQueries({ queryKey: settingsKeys.plans() });
      qc.invalidateQueries({ queryKey: settingsKeys.paymentMethods() });
    },
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.billing() });
      qc.invalidateQueries({ queryKey: settingsKeys.plans() });
      qc.invalidateQueries({ queryKey: settingsKeys.paymentMethods() });
    },
  });
}

export function useAddPaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AddPaymentMethodRequest) => addPaymentMethod(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.billing() });
      qc.invalidateQueries({ queryKey: settingsKeys.plans() });
      qc.invalidateQueries({ queryKey: settingsKeys.paymentMethods() });
    },
  });
}

export function useRemovePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removePaymentMethod(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.billing() });
      qc.invalidateQueries({ queryKey: settingsKeys.plans() });
      qc.invalidateQueries({ queryKey: settingsKeys.paymentMethods() });
    },
  });
}

export function useDownloadInvoice() {
  return useMutation({
    mutationFn: (id: string) => downloadInvoice(id),
  });
}

// ─── Notification Hooks ─────────────────────────────────────

export function useNotificationPrefs() {
  return useQuery({
    queryKey: settingsKeys.notificationPrefs(),
    queryFn: fetchNotificationPrefs,
  });
}

export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateNotificationPrefsRequest) =>
      updateNotificationPrefs(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.notificationPrefs() });
    },
  });
}

export function useConnectNotificationChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channel: string) => connectNotificationChannel(channel),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.notificationPrefs() });
    },
  });
}

// ─── Appearance Hooks ───────────────────────────────────────

export function useAppearance() {
  return useQuery({
    queryKey: settingsKeys.appearance(),
    queryFn: fetchAppearance,
  });
}

export function useUpdateAppearance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateAppearanceRequest) => updateAppearance(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.appearance() });
    },
  });
}

export function useResetAppearance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resetAppearance,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.appearance() });
    },
  });
}

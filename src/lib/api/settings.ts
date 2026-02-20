// =============================================================
// Settings API fetch functions — ~36 functions
// =============================================================

import type {
  ProfileResponse,
  UpdateProfileRequest,
  UploadAvatarRequest,
  ChangePasswordRequest,
  ChangePasswordResponse,
  EmailPreferencesResponse,
  UpdateEmailPreferencesRequest,
  ConnectedAccountsResponse,
  ConnectAccountResponse,
  DeleteAccountResponse,
  TeamResponse,
  TeamMembersResponse,
  InviteMemberRequest,
  InviteMemberResponse,
  PendingInvitesResponse,
  UpdateMemberRoleRequest,
  ResendInviteResponse,
  TeamPermissionsResponse,
  BillingResponse,
  PlansResponse,
  ChangePlanRequest,
  ChangePlanResponse,
  CancelSubscriptionResponse,
  UsageResponse,
  PaymentMethodsResponse,
  AddPaymentMethodRequest,
  PaymentMethodItem,
  InvoicesResponse,
  DownloadInvoiceResponse,
  NotificationPreferenceResponse,
  UpdateNotificationPrefsRequest,
  ConnectNotificationChannelResponse,
  AppearanceResponse,
  UpdateAppearanceRequest,
} from "@/types/settings";

const BASE = "/api/settings";

// ─── Account / Profile ──────────────────────────────────────

export async function fetchProfile(): Promise<ProfileResponse> {
  const res = await fetch(`${BASE}/profile`);
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function updateProfile(
  data: UpdateProfileRequest
): Promise<ProfileResponse> {
  const res = await fetch(`${BASE}/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
}

export async function uploadAvatar(
  data: UploadAvatarRequest
): Promise<ProfileResponse> {
  const res = await fetch(`${BASE}/profile/avatar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to upload avatar");
  return res.json();
}

export async function deleteAvatar(): Promise<ProfileResponse> {
  const res = await fetch(`${BASE}/profile/avatar`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete avatar");
  return res.json();
}

export async function changePassword(
  data: ChangePasswordRequest
): Promise<ChangePasswordResponse> {
  const res = await fetch(`${BASE}/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to change password");
  return res.json();
}

// ─── Email Preferences ──────────────────────────────────────

export async function fetchEmailPreferences(): Promise<EmailPreferencesResponse> {
  const res = await fetch(`${BASE}/email-preferences`);
  if (!res.ok) throw new Error("Failed to fetch email preferences");
  return res.json();
}

export async function updateEmailPreferences(
  data: UpdateEmailPreferencesRequest
): Promise<EmailPreferencesResponse> {
  const res = await fetch(`${BASE}/email-preferences`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update email preferences");
  return res.json();
}

// ─── Connected Accounts ─────────────────────────────────────

export async function fetchConnectedAccounts(): Promise<ConnectedAccountsResponse> {
  const res = await fetch(`${BASE}/connected-accounts`);
  if (!res.ok) throw new Error("Failed to fetch connected accounts");
  return res.json();
}

export async function connectAccount(
  provider: string
): Promise<ConnectAccountResponse> {
  const res = await fetch(
    `${BASE}/connected-accounts/${provider.toLowerCase()}/connect`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error(`Failed to connect ${provider}`);
  return res.json();
}

export async function disconnectAccount(
  provider: string
): Promise<ConnectAccountResponse> {
  const res = await fetch(
    `${BASE}/connected-accounts/${provider.toLowerCase()}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error(`Failed to disconnect ${provider}`);
  return res.json();
}

export async function deleteAccount(): Promise<DeleteAccountResponse> {
  const res = await fetch(`${BASE}/account/delete`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to delete account");
  return res.json();
}

// ─── Team ───────────────────────────────────────────────────

export async function fetchTeam(): Promise<TeamResponse> {
  const res = await fetch(`${BASE}/team`);
  if (!res.ok) throw new Error("Failed to fetch team");
  return res.json();
}

export async function fetchTeamMembers(): Promise<TeamMembersResponse> {
  const res = await fetch(`${BASE}/team/members`);
  if (!res.ok) throw new Error("Failed to fetch team members");
  return res.json();
}

export async function inviteMember(
  data: InviteMemberRequest
): Promise<InviteMemberResponse> {
  const res = await fetch(`${BASE}/team/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to invite member");
  return res.json();
}

export async function updateMemberRole(
  memberId: string,
  data: UpdateMemberRoleRequest
): Promise<{ member: import("@/types/settings").TeamMemberItem }> {
  const res = await fetch(`${BASE}/team/members/${memberId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update member role");
  return res.json();
}

export async function removeMember(
  memberId: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/team/members/${memberId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to remove member");
  return res.json();
}

export async function fetchPendingInvites(): Promise<PendingInvitesResponse> {
  const res = await fetch(`${BASE}/team/invites`);
  if (!res.ok) throw new Error("Failed to fetch pending invites");
  return res.json();
}

export async function resendInvite(
  inviteId: string
): Promise<ResendInviteResponse> {
  const res = await fetch(`${BASE}/team/invites/${inviteId}/resend`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to resend invite");
  return res.json();
}

export async function cancelInvite(
  inviteId: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/team/invites/${inviteId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to cancel invite");
  return res.json();
}

export async function fetchTeamPermissions(): Promise<TeamPermissionsResponse> {
  const res = await fetch(`${BASE}/team/permissions`);
  if (!res.ok) throw new Error("Failed to fetch team permissions");
  return res.json();
}

// ─── Billing ────────────────────────────────────────────────

export async function fetchBilling(): Promise<BillingResponse> {
  const res = await fetch(`${BASE}/billing`);
  if (!res.ok) throw new Error("Failed to fetch billing");
  return res.json();
}

export async function fetchPlans(): Promise<PlansResponse> {
  const res = await fetch(`${BASE}/billing/plans`);
  if (!res.ok) throw new Error("Failed to fetch plans");
  return res.json();
}

export async function changePlan(
  data: ChangePlanRequest
): Promise<ChangePlanResponse> {
  const res = await fetch(`${BASE}/billing/change-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to change plan");
  return res.json();
}

export async function cancelSubscription(): Promise<CancelSubscriptionResponse> {
  const res = await fetch(`${BASE}/billing/cancel`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to cancel subscription");
  return res.json();
}

// ─── Usage ──────────────────────────────────────────────────

export async function fetchUsage(): Promise<UsageResponse> {
  const res = await fetch(`${BASE}/billing/usage`);
  if (!res.ok) throw new Error("Failed to fetch usage");
  return res.json();
}

// ─── Payment Methods ────────────────────────────────────────

export async function fetchPaymentMethods(): Promise<PaymentMethodsResponse> {
  const res = await fetch(`${BASE}/billing/payment-methods`);
  if (!res.ok) throw new Error("Failed to fetch payment methods");
  return res.json();
}

export async function addPaymentMethod(
  data: AddPaymentMethodRequest
): Promise<PaymentMethodItem> {
  const res = await fetch(`${BASE}/billing/payment-methods`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add payment method");
  return res.json();
}

export async function removePaymentMethod(
  id: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/billing/payment-methods/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to remove payment method");
  return res.json();
}

// ─── Invoices ───────────────────────────────────────────────

export async function fetchInvoices(): Promise<InvoicesResponse> {
  const res = await fetch(`${BASE}/billing/invoices`);
  if (!res.ok) throw new Error("Failed to fetch invoices");
  return res.json();
}

export async function downloadInvoice(
  id: string
): Promise<DownloadInvoiceResponse> {
  const res = await fetch(`${BASE}/billing/invoices/${id}/download`);
  if (!res.ok) throw new Error("Failed to download invoice");
  return res.json();
}

// ─── Notifications ──────────────────────────────────────────

export async function fetchNotificationPrefs(): Promise<NotificationPreferenceResponse> {
  const res = await fetch(`${BASE}/notifications`);
  if (!res.ok) throw new Error("Failed to fetch notification preferences");
  return res.json();
}

export async function updateNotificationPrefs(
  data: UpdateNotificationPrefsRequest
): Promise<NotificationPreferenceResponse> {
  const res = await fetch(`${BASE}/notifications`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update notification preferences");
  return res.json();
}

export async function connectNotificationChannel(
  channel: string
): Promise<ConnectNotificationChannelResponse> {
  const res = await fetch(
    `${BASE}/notifications/channels/${channel}/connect`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error(`Failed to connect notification channel: ${channel}`);
  return res.json();
}

// ─── Appearance ─────────────────────────────────────────────

export async function fetchAppearance(): Promise<AppearanceResponse> {
  const res = await fetch(`${BASE}/appearance`);
  if (!res.ok) throw new Error("Failed to fetch appearance");
  return res.json();
}

export async function updateAppearance(
  data: UpdateAppearanceRequest
): Promise<AppearanceResponse> {
  const res = await fetch(`${BASE}/appearance`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update appearance");
  return res.json();
}

export async function resetAppearance(): Promise<AppearanceResponse> {
  const res = await fetch(`${BASE}/appearance/reset`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to reset appearance");
  return res.json();
}

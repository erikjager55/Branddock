// =============================================================
// Settings Types — derived from /api/settings/* response shapes
// =============================================================

// ─── Account / Profile ──────────────────────────────────────

export interface ProfileData {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  jobTitle: string | null;
  phone: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileResponse {
  profile: ProfileData;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  jobTitle?: string;
  phone?: string;
}

export interface UploadAvatarRequest {
  avatarUrl: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  lastChangedAt: string;
}

// ─── Email Preferences ──────────────────────────────────────

export interface EmailPreferencesData {
  id: string;
  userId: string;
  productUpdates: boolean;
  researchNotifications: boolean;
  teamActivity: boolean;
  marketing: boolean;
}

export interface EmailPreferencesResponse {
  preferences: EmailPreferencesData;
}

export interface UpdateEmailPreferencesRequest {
  productUpdates?: boolean;
  researchNotifications?: boolean;
  teamActivity?: boolean;
  marketing?: boolean;
}

// ─── Connected Accounts ─────────────────────────────────────

export interface ConnectedAccountItem {
  id: string;
  provider: string;
  status: string;
  connectedAt: string;
  providerUserId: string | null;
}

export interface ConnectedAccountsResponse {
  accounts: ConnectedAccountItem[];
}

export interface ConnectAccountResponse {
  account: ConnectedAccountItem;
}

export interface DeleteAccountResponse {
  success: boolean;
  message: string;
}

// ─── Team ───────────────────────────────────────────────────

export interface TeamData {
  name: string;
  memberCount: number;
  maxSeats: number;
  myRole: string;
  organizationId: string;
}

export interface TeamResponse {
  team: TeamData;
}

export interface TeamMemberItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  isActive: boolean;
  joinedAt: string;
}

export interface TeamMembersResponse {
  members: TeamMemberItem[];
}

export interface InviteMemberRequest {
  email: string;
  role?: string;
}

export interface InviteMemberResponse {
  invitation: PendingInvite;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface PendingInvitesResponse {
  invites: PendingInvite[];
}

export interface UpdateMemberRoleRequest {
  role: "admin" | "member" | "viewer";
}

export interface ResendInviteResponse {
  success: boolean;
  newExpiresAt: string;
}

// ─── Team Permissions ───────────────────────────────────────

export interface RolePermissions {
  canManageMembers: boolean;
  canManageBilling: boolean;
  canDeleteWorkspace: boolean;
  canInvite: boolean;
  canEditContent: boolean;
  canViewContent: boolean;
}

export interface TeamPermissions {
  owner: RolePermissions;
  admin: RolePermissions;
  member: RolePermissions;
  viewer: RolePermissions;
}

export interface TeamPermissionsResponse {
  permissions: TeamPermissions;
}

// ─── Billing ────────────────────────────────────────────────

export interface SubscriptionData {
  id: string;
  planName: string;
  planSlug: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  price: number;
}

export interface BillingData {
  subscription: SubscriptionData | null;
  nextInvoiceDate: string | null;
  defaultPaymentMethod: {
    type: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  } | null;
}

export interface BillingResponse {
  billing: BillingData;
}

export interface PlanItem {
  id: string;
  name: string;
  slug: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxSeats: number;
  maxAiGenerations: number;
  maxResearchStudies: number;
  maxStorageGb: number;
  features: unknown;
  isRecommended: boolean;
  isCurrentPlan: boolean;
}

export interface PlansResponse {
  plans: PlanItem[];
}

export interface ChangePlanRequest {
  planId: string;
  billingCycle?: "MONTHLY" | "YEARLY";
}

export interface ChangePlanResponse {
  subscription: SubscriptionData;
}

export interface CancelSubscriptionResponse {
  success: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string;
}

// ─── Usage ──────────────────────────────────────────────────

export interface UsageMeter {
  used: number;
  limit: number;
}

export interface StorageMeter {
  usedGb: number;
  limitGb: number;
}

export interface UsageData {
  seats: UsageMeter;
  aiGenerations: UsageMeter;
  researchStudies: UsageMeter;
  storage: StorageMeter;
}

export interface UsageResponse {
  usage: UsageData;
}

// ─── Payment Methods ────────────────────────────────────────

export interface PaymentMethodItem {
  id: string;
  type: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export interface PaymentMethodsResponse {
  paymentMethods: PaymentMethodItem[];
}

export interface AddPaymentMethodRequest {
  type: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault?: boolean;
}

// ─── Invoices ───────────────────────────────────────────────

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  pdfUrl: string | null;
  issuedAt: string;
}

export interface InvoicesResponse {
  invoices: InvoiceItem[];
}

export interface DownloadInvoiceResponse {
  downloadUrl: string;
}

// ─── Notifications ──────────────────────────────────────────

export interface NotificationMatrix {
  [category: string]: {
    [channel: string]: boolean;
  };
}

export interface NotificationPreferenceData {
  emailEnabled: boolean;
  browserEnabled: boolean;
  slackEnabled: boolean;
  matrix: NotificationMatrix;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursEnabled: boolean;
}

export interface NotificationPreferenceResponse {
  preferences: NotificationPreferenceData;
}

export interface UpdateNotificationPrefsRequest {
  emailEnabled?: boolean;
  browserEnabled?: boolean;
  slackEnabled?: boolean;
  matrix?: NotificationMatrix;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  quietHoursEnabled?: boolean;
}

export interface ConnectNotificationChannelResponse {
  success: boolean;
  channel?: string;
  connected?: boolean;
  message?: string;
  status?: string;
}

// ─── Appearance ─────────────────────────────────────────────

export type ThemeOption = "LIGHT" | "DARK" | "SYSTEM";
export type AccentColorOption = "BLUE" | "PURPLE" | "GREEN" | "ORANGE" | "PINK" | "TEAL";
export type FontSizeOption = "SMALL" | "MEDIUM" | "LARGE";
export type SidebarPositionOption = "LEFT" | "RIGHT";

export interface AppearanceData {
  theme: ThemeOption;
  accentColor: AccentColorOption;
  language: string;
  fontSize: FontSizeOption;
  sidebarPosition: SidebarPositionOption;
  compactMode: boolean;
  animations: boolean;
}

export interface AppearanceResponse {
  appearance: AppearanceData;
}

export interface UpdateAppearanceRequest {
  theme?: ThemeOption;
  accentColor?: AccentColorOption;
  language?: string;
  fontSize?: FontSizeOption;
  sidebarPosition?: SidebarPositionOption;
  compactMode?: boolean;
  animations?: boolean;
}

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
  /** Leeg = alle workspaces; alleen gevuld voor gescopede member/viewer-leden. */
  workspaceIds: string[];
}

export interface TeamMembersResponse {
  members: TeamMemberItem[];
}

export interface InviteMemberRequest {
  email: string;
  role?: string;
  organizationId: string;
  /** Leeg/afwezig = toegang tot alle workspaces (alleen member/viewer). */
  workspaceIds?: string[];
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
  /** Leeg = alle workspaces. */
  workspaceIds?: string[];
  workspaceNames?: string[];
}

export interface PendingInvitesResponse {
  invites: PendingInvite[];
}

export interface UpdateMemberRoleRequest {
  role: "admin" | "member" | "viewer";
}

export interface UpdateMemberWorkspaceAccessRequest {
  /** Leeg array = toegang tot alle workspaces. */
  workspaceIds: string[];
}

export interface ResendInviteResponse {
  success: boolean;
  newExpiresAt: string;
  /**
   * False wanneer de vervaldatum wél is verlengd maar de mail niet de deur
   * uit ging. De UI moet dit tonen — anders meldt de knop stil succes terwijl
   * de genodigde niets ontvangt (precies de bug die deze route had).
   */
  emailSent?: boolean;
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


// ─── Usage ──────────────────────────────────────────────────

export interface UsageMeter {
  used: number;
  limit: number;
}

export interface StorageMeter {
  usedGb: number;
  limitGb: number;
}

export interface CountMeter {
  used: number;
}

export interface UsageData {
  seats: UsageMeter;
  aiGenerations: UsageMeter;
  researchStudies: UsageMeter;
  storage: StorageMeter;
  // Real counts (getCurrentCount() — the same tally enforcePlanLimit() uses,
  // so displayed usage can't drift from what's actually enforced). Limits
  // come from billing.limits[feature] client-side, not from this response.
  personas: CountMeter;
  campaigns: CountMeter;
  brandAssets: CountMeter;
  products: CountMeter;
  knowledgeResources: CountMeter;
  workspaces: CountMeter;
  marketInsights: CountMeter;
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
  // Fase 5b — BTW-uitsplitsing (null op facturen van vóór Stripe Tax).
  taxAmount: number | null;
  taxRate: number | null;
  netAmount: number | null;
  reverseCharge: boolean;
  customerVatNumber: string | null;
  sellerVatNumber: string | null;
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

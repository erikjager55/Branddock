// =============================================================
// Dashboard Types (S8)
// =============================================================

export interface DashboardResponse {
  readiness: {
    percentage: number;
    breakdown: { ready: number; needAttention: number; inProgress: number };
  };
  stats: {
    readyToUse: number;
    needAttention: number;
    inProgress: number;
    activeCampaigns: number;
    contentCreated: number;
  };
  attention: AttentionItem[];
  recommended: RecommendedAction | null;
  campaignsPreview: CampaignPreviewItem[];
}

export interface AttentionItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  actionType: 'fix' | 'take_action';
  actionLabel: string;
  actionHref: string;
  coveragePercentage: number;
}

export interface RecommendedAction {
  id: string;
  badge: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}

export interface CampaignPreviewItem {
  id: string;
  title: string;
  type: 'Strategic' | 'Quick';
  status: string;
  deliverableProgress: number;
}

export interface DashboardPreferencesResponse {
  onboardingComplete: boolean;
  dontShowOnboarding: boolean;
  quickStartDismissed: boolean;
  quickStartItems: { key: string; label: string; completed: boolean; href: string }[];
}

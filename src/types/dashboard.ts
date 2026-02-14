export interface DashboardResponse {
  readiness: {
    percentage: number;
    breakdown: { ready: number; limited: number; unusable: number };
  };
  stats: {
    brandAssets: number;
    researchStudies: number;
    personas: number;
    products: number;
    marketInsights: number;
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
  iconBg: string;
  iconColor: string;
  actionType: "fix" | "take_action";
  actionLabel: string;
  actionHref: string;
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
  type: "Strategic" | "Quick";
  status: string;
  deliverableProgress: number;
}

export interface DashboardPreferencesResponse {
  onboardingComplete: boolean;
  dontShowOnboarding: boolean;
  quickStartDismissed: boolean;
  quickStartItems: {
    key: string;
    label: string;
    completed: boolean;
    href: string;
  }[];
}

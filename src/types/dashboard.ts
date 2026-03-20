// =============================================================
// Dashboard Types (S8 — Dashboard Overhaul)
// =============================================================

export type AttentionEntityType = 'brand-asset' | 'persona' | 'competitor' | 'trend' | 'campaign';

export interface AttentionItem {
  id: string;
  entityId: string;
  entityType: AttentionEntityType;
  priority: number;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  actionType: 'fix' | 'take_action';
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
  entityId?: string;
  entityType?: AttentionEntityType;
  icon: string;
}

export interface ModuleScores {
  brandAssets: number;
  personas: number;
  products: number;
  campaigns: number;
  trends: number;
}

export interface ReadinessResponse {
  percentage: number;
  breakdown: { ready: number; needAttention: number; inProgress: number };
  moduleScores: ModuleScores;
}

export interface DashboardStatsResponse {
  brandAssets: { ready: number; total: number };
  personas: number;
  products: number;
  campaigns: number;
  trends: number;
  competitors: number;
}

export interface ActivityItem {
  id: string;
  title: string;
  type: 'brand-asset' | 'persona' | 'campaign' | 'competitor';
  updatedAt: string;
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

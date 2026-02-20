import type {
  DashboardResponse,
  DashboardPreferencesResponse,
  AttentionItem,
  RecommendedAction,
  CampaignPreviewItem,
} from '@/types/dashboard';

export async function fetchDashboard(): Promise<DashboardResponse> {
  const res = await fetch('/api/dashboard');
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
}

export async function fetchReadiness(): Promise<DashboardResponse['readiness']> {
  const res = await fetch('/api/dashboard/readiness');
  if (!res.ok) throw new Error('Failed to fetch readiness');
  return res.json();
}

export async function fetchDashboardStats(): Promise<DashboardResponse['stats']> {
  const res = await fetch('/api/dashboard/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchAttention(): Promise<AttentionItem[]> {
  const res = await fetch('/api/dashboard/attention');
  if (!res.ok) throw new Error('Failed to fetch attention items');
  return res.json();
}

export async function fetchRecommended(): Promise<RecommendedAction | null> {
  const res = await fetch('/api/dashboard/recommended');
  if (!res.ok) throw new Error('Failed to fetch recommended');
  return res.json();
}

export async function fetchCampaignsPreview(): Promise<CampaignPreviewItem[]> {
  const res = await fetch('/api/dashboard/campaigns-preview');
  if (!res.ok) throw new Error('Failed to fetch campaigns preview');
  return res.json();
}

export async function fetchPreferences(): Promise<DashboardPreferencesResponse> {
  const res = await fetch('/api/dashboard/preferences');
  if (!res.ok) throw new Error('Failed to fetch preferences');
  return res.json();
}

export async function updatePreferences(
  body: Partial<Pick<DashboardPreferencesResponse, 'onboardingComplete' | 'dontShowOnboarding' | 'quickStartDismissed'>>
): Promise<DashboardPreferencesResponse> {
  const res = await fetch('/api/dashboard/preferences', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update preferences');
  return res.json();
}

export async function completeQuickStartItem(key: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/dashboard/quick-start/${key}/complete`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to complete quick start item');
  return res.json();
}

/**
 * Visual fidelity (G8) admin API client — workspace dashboard.
 *
 * Read-only. Mirrors the prompt-registry dashboard pattern.
 */

export interface VisualFidelityDimensionStat {
  key: string;
  averageScore: number;
  flaggedCount: number;
  flaggedRate: number;
  sampleSize: number;
}

export interface VisualFidelityLowScoreEntry {
  id: string;
  componentId: string;
  imageUrl: string;
  compositeScore: number;
  scoredAt: string;
}

export interface VisualFidelityDashboardData {
  window: string;
  generatedAt: string;
  totals: {
    count24h: number;
    count7d: number;
    count30d: number;
    countAllTime: number;
    avg24h: number;
    avg7d: number;
    avg30d: number;
    metRate24h: number;
    metRate7d: number;
    metRate30d: number;
  };
  distribution: {
    good: number;
    warn: number;
    bad: number;
  };
  averageColorAlignment: number;
  dimensions: VisualFidelityDimensionStat[];
  topLowScores: VisualFidelityLowScoreEntry[];
}

export async function fetchVisualFidelityDashboard(): Promise<VisualFidelityDashboardData> {
  const res = await fetch('/api/admin/visual-fidelity/dashboard');
  if (!res.ok) {
    throw new Error(`Failed to fetch visual fidelity dashboard: ${res.status}`);
  }
  return res.json();
}

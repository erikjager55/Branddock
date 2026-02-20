// =============================================================
// Dashboard Thresholds (S8)
// =============================================================

export const THRESHOLDS = {
  low: { min: 0, max: 49, color: 'red', label: 'In progress' },
  medium: { min: 50, max: 79, color: 'yellow', label: 'Need attention' },
  high: { min: 80, max: 100, color: 'green', label: 'Ready' },
} as const;

export type ThresholdLevel = keyof typeof THRESHOLDS;

export function getThresholdLevel(percentage: number): ThresholdLevel {
  if (percentage >= 80) return 'high';
  if (percentage >= 50) return 'medium';
  return 'low';
}

export function getThresholdColor(percentage: number): string {
  const level = getThresholdLevel(percentage);
  switch (level) {
    case 'high':
      return 'text-green-600';
    case 'medium':
      return 'text-yellow-500';
    case 'low':
      return 'text-red-500';
  }
}

export function getThresholdBgColor(percentage: number): string {
  const level = getThresholdLevel(percentage);
  switch (level) {
    case 'high':
      return 'bg-green-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-red-500';
  }
}

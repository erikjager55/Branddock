import type { IssueSeverity } from '@/types/brand-alignment';

export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-500';
  if (score >= 70) return 'text-green-400';
  if (score >= 50) return 'text-orange-400';
  return 'text-red-500';
}

export function getScoreBarColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 70) return 'bg-green-400';
  if (score >= 50) return 'bg-orange-400';
  return 'bg-red-500';
}

export function getSeverityConfig(severity: IssueSeverity): { bg: string; text: string; label: string } {
  switch (severity) {
    case 'CRITICAL':
      return { bg: 'bg-red-100', text: 'text-red-700', label: 'Critical' };
    case 'WARNING':
      return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Warning' };
    case 'SUGGESTION':
      return { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Suggestion' };
  }
}

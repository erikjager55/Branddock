export const DEMOGRAPHIC_FIELDS: {
  key: string;
  icon: string;
  label: string;
}[] = [
  { key: 'age', icon: 'Calendar', label: 'AGE' },
  { key: 'location', icon: 'MapPin', label: 'LOCATION' },
  { key: 'occupation', icon: 'Building2', label: 'OCCUPATION' },
  { key: 'income', icon: 'DollarSign', label: 'INCOME' },
  { key: 'familyStatus', icon: 'Users', label: 'FAMILY STATUS' },
  { key: 'education', icon: 'GraduationCap', label: 'EDUCATION' },
];

export const CONFIDENCE_LEVELS: Record<
  string,
  { range: [number, number]; color: string; label: string }
> = {
  critical: { range: [0, 0], color: 'text-red-500', label: 'At risk' },
  low: { range: [1, 49], color: 'text-amber-500', label: 'Low' },
  medium: { range: [50, 79], color: 'text-yellow-500', label: 'Medium' },
  ready: { range: [80, 100], color: 'text-emerald-500', label: 'Ready' },
};

export function getConfidenceLevel(percentage: number) {
  if (percentage <= 0) return CONFIDENCE_LEVELS.critical;
  if (percentage < 50) return CONFIDENCE_LEVELS.low;
  if (percentage < 80) return CONFIDENCE_LEVELS.medium;
  return CONFIDENCE_LEVELS.ready;
}

export const IMPACT_BADGES: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  high: { bg: 'bg-transparent', color: 'text-emerald-600', border: 'border border-emerald-200' },
  medium: { bg: 'bg-transparent', color: 'text-amber-600', border: 'border border-amber-200' },
  low: { bg: 'bg-transparent', color: 'text-gray-600', border: 'border border-gray-200' },
};

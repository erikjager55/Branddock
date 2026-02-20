export function getQualityColor(score: number): string {
  if (score >= 85) return "text-emerald-600";
  if (score >= 65) return "text-amber-500";
  return "text-red-500";
}

export function getQualityBgColor(score: number): string {
  if (score >= 85) return "bg-emerald-50";
  if (score >= 65) return "bg-amber-50";
  return "bg-red-50";
}

export function getQualityLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 65) return "Good";
  return "Needs Work";
}

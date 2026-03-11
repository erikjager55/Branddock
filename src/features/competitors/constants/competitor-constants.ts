// =============================================================
// Competitor Constants
// =============================================================

/** Steps displayed during AI analysis animation */
export const COMPETITOR_ANALYZE_STEPS = [
  "Connecting to website",
  "Scraping page content",
  "Extracting brand signals",
  "Analyzing positioning",
  "Identifying offerings",
  "Assessing strengths & weaknesses",
  "Calculating competitive score",
  "Finalizing analysis",
];

/** Tier configuration */
export const TIER_OPTIONS = [
  { value: "DIRECT", label: "Direct" },
  { value: "INDIRECT", label: "Indirect" },
  { value: "ASPIRATIONAL", label: "Aspirational" },
] as const;

export const TIER_BADGES: Record<string, { variant: "info" | "warning" | "default"; label: string }> = {
  DIRECT: { variant: "info", label: "Direct" },
  INDIRECT: { variant: "warning", label: "Indirect" },
  ASPIRATIONAL: { variant: "default", label: "Aspirational" },
};

/** Status configuration */
export const STATUS_BADGES: Record<string, { variant: "success" | "default" | "warning"; label: string }> = {
  ANALYZED: { variant: "success", label: "Analyzed" },
  DRAFT: { variant: "default", label: "Draft" },
  ARCHIVED: { variant: "warning", label: "Archived" },
};

/** Score color thresholds */
export function getScoreColor(score: number | null): string {
  if (score === null || score === undefined) return "text-gray-400";
  if (score >= 70) return "text-red-600";
  if (score >= 40) return "text-amber-600";
  return "text-emerald-600";
}

export function getScoreBgColor(score: number | null): string {
  if (score === null || score === undefined) return "bg-gray-100";
  if (score >= 70) return "bg-red-50";
  if (score >= 40) return "bg-amber-50";
  return "bg-emerald-50";
}

export function getScoreLabel(score: number | null): string {
  if (score === null || score === undefined) return "Not scored";
  if (score >= 70) return "High threat";
  if (score >= 40) return "Moderate";
  return "Low threat";
}

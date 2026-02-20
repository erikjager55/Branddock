export const RESEARCH_STATS_CONFIG = {
  activeStudies: { icon: "Zap", bg: "bg-blue-50", iconColor: "text-blue-600", label: "Active Studies" },
  completed: { icon: "CheckCircle", bg: "bg-green-50", iconColor: "text-green-600", label: "Completed" },
  pendingReview: { icon: "Clock", bg: "bg-orange-50", iconColor: "text-orange-500", label: "Pending Review" },
  totalInsights: { icon: "Lightbulb", bg: "bg-purple-50", iconColor: "text-purple-600", label: "Total Insights" },
} as const;

export const METHOD_STATUS_CONFIG = [
  { type: "WORKSHOP", icon: "Building2", label: "Workshop", color: "text-blue-600" },
  { type: "INTERVIEWS", icon: "MessageSquare", label: "1-on-1 Interviews", color: "text-green-600" },
  { type: "QUESTIONNAIRE", icon: "ClipboardList", label: "Questionnaire", color: "text-orange-500" },
  { type: "AI_EXPLORATION", icon: "Bot", label: "AI Exploration", color: "text-purple-600" },
] as const;

export const METHOD_PRICING: Record<string, { price: number; unit: string; confidence: string; name: string; description: string }> = {
  AI_EXPLORATION: { price: 0, unit: "analysis", confidence: "Low", name: "AI Exploration", description: "Automated AI-driven analysis of your brand elements" },
  QUESTIONNAIRE: { price: 10, unit: "response", confidence: "Medium", name: "Questionnaire", description: "Structured surveys to gather quantitative feedback" },
  INTERVIEWS: { price: 80, unit: "interview", confidence: "High", name: "1-on-1 Interviews", description: "In-depth qualitative interviews with target audience" },
  WORKSHOP: { price: 1200, unit: "session", confidence: "Medium-High", name: "Workshop Session", description: "Collaborative workshop sessions with stakeholders" },
};

export const CONFIDENCE_BADGES = {
  Low: { bg: "bg-red-100", text: "text-red-700" },
  Medium: { bg: "bg-yellow-100", text: "text-yellow-700" },
  "Medium-High": { bg: "bg-green-100", text: "text-green-700" },
  High: { bg: "bg-green-100", text: "text-green-700" },
} as const;

export const BUNDLE_BADGES = {
  recommended: { bg: "bg-green-100", text: "text-green-700", label: "Recommended" },
  popular: { bg: "bg-purple-100", text: "text-purple-700", label: "Popular" },
} as const;

export const VIEW_TABS = ["Overview", "By Category", "Timeline"] as const;

export const VALUE_PROPOSITIONS = ["Expert-Led Research", "Data-Driven Insights", "Actionable Results"] as const;

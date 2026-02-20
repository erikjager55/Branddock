import type { ImpactLevel, InsightCategory, InsightTimeframe, ImportProvider } from "../types/market-insight.types";

export const IMPACT_BADGE_COLORS: Record<ImpactLevel, { bg: string; text: string; label: string }> = {
  HIGH: { bg: "bg-red-100", text: "text-red-700", label: "High Impact" },
  MEDIUM: { bg: "bg-amber-100", text: "text-amber-700", label: "Medium Impact" },
  LOW: { bg: "bg-green-100", text: "text-green-700", label: "Low Impact" },
};

export const CATEGORY_COLORS: Record<InsightCategory, string> = {
  TECHNOLOGY: "bg-green-100 text-green-700",
  ENVIRONMENTAL: "bg-green-100 text-green-700",
  SOCIAL: "bg-purple-100 text-purple-700",
  CONSUMER: "bg-orange-100 text-orange-700",
  BUSINESS: "bg-yellow-100 text-yellow-700",
};

export const CATEGORY_LABELS: Record<InsightCategory, string> = {
  TECHNOLOGY: "Technology",
  ENVIRONMENTAL: "Environmental",
  SOCIAL: "Social",
  CONSUMER: "Consumer",
  BUSINESS: "Business",
};

export const SCOPE_VALUES = ["Micro", "Meso", "Macro"] as const;

export const TIMEFRAME_BADGES: Record<InsightTimeframe, { bg: string; text: string; label: string }> = {
  SHORT_TERM: { bg: "bg-green-100", text: "text-green-700", label: "Short-Term" },
  MEDIUM_TERM: { bg: "bg-amber-100", text: "text-amber-700", label: "Medium-Term" },
  LONG_TERM: { bg: "bg-red-100", text: "text-red-700", label: "Long-Term" },
};

export const FOCUS_AREAS = [
  "Technology",
  "Consumer Behavior",
  "Social Trends",
  "Sustainability",
  "Business Models",
  "Marketing Trends",
] as const;

export const IMPORT_PROVIDERS: ImportProvider[] = [
  {
    id: "wgsn",
    name: "WGSN",
    tier: "Enterprise",
    description: "Global trend forecasting for fashion, beauty, interiors, and lifestyle",
    categories: ["Fashion", "Beauty", "Lifestyle"],
    websiteUrl: "https://wgsn.com",
    isConnected: false,
  },
  {
    id: "mintel",
    name: "Mintel",
    tier: "Enterprise",
    description: "Market intelligence covering consumer trends, competitive landscapes, and product innovation",
    categories: ["Consumer", "Food & Drink", "Beauty"],
    websiteUrl: "https://mintel.com",
    isConnected: false,
  },
  {
    id: "gartner",
    name: "Gartner",
    tier: "Enterprise",
    description: "Technology and business insights for enterprise decision-makers",
    categories: ["Technology", "Business", "IT"],
    websiteUrl: "https://gartner.com",
    isConnected: false,
  },
  {
    id: "forrester",
    name: "Forrester",
    tier: "Custom",
    description: "Research and advisory services focusing on customer experience and digital transformation",
    categories: ["CX", "Digital", "Marketing"],
    websiteUrl: "https://forrester.com",
    isConnected: false,
  },
];

import type { Trend } from "@/data/mock-trends";
import type { TrendWithMeta } from "@/types/trend";

export function apiTrendToMockFormat(t: TrendWithMeta): Trend {
  return {
    id: t.id, title: t.title, description: t.description,
    category: t.category as Trend["category"], impact: t.impact as Trend["impact"],
    timeframe: t.timeframe as Trend["timeframe"],
    relevantIndustries: t.relevantIndustries,
    keyInsights: t.keyInsights ?? undefined,
    direction: (t.direction as Trend["direction"]) ?? undefined,
    relevance: t.relevance ?? undefined,
    sources: t.sources ?? undefined,
    dateAdded: t.createdAt,
    tags: t.tags,
    level: (t.level as Trend["level"]) ?? undefined,
  };
}

export function apiTrendsToMockFormat(trends: TrendWithMeta[]): Trend[] {
  return trends.map(apiTrendToMockFormat);
}

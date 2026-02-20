import { NextResponse } from "next/server";
import { withCache } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";

// =============================================================
// GET /api/insights/categories
// Returns InsightCategory enum values as array.
// =============================================================
const _GET = async () => {
  return NextResponse.json({
    categories: ["TECHNOLOGY", "ENVIRONMENTAL", "SOCIAL", "CONSUMER", "BUSINESS"],
  });
};

export const GET = withCache(cacheKeys.static.insightCategories, CACHE_TTL.STATIC)(_GET);

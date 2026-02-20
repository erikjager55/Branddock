import { NextResponse } from "next/server";
import { withCache } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";

// =============================================================
// GET /api/insights/providers
// Returns static IMPORT_PROVIDERS list (no DB).
// =============================================================
const _GET = async () => {
  return NextResponse.json({
    providers: [
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
    ],
  });
};

export const GET = withCache(cacheKeys.static.insightProviders, CACHE_TTL.STATIC)(_GET);

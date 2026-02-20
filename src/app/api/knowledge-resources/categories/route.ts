import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { cachedJson, setCache } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";

const CATEGORIES = [
  "Brand Strategy",
  "Research",
  "Content",
  "Marketing",
  "Design",
  "Technology",
  "Psychology",
  "User Experience",
  "Trends",
];

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 403 }
      );
    }

    const hit = cachedJson(cacheKeys.static.resourceCategories);
    if (hit) return hit;

    setCache(cacheKeys.static.resourceCategories, CATEGORIES, CACHE_TTL.STATIC);
    return NextResponse.json(CATEGORIES);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

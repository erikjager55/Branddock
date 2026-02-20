import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { cachedJson, setCache } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";

const RESOURCE_TYPES = [
  "BOOK",
  "ARTICLE",
  "RESEARCH",
  "GUIDE",
  "TEMPLATE",
  "CASE_STUDY",
  "WORKSHOP_RESOURCE",
  "MASTERCLASS",
  "PODCAST",
  "WEBSITE",
  "DESIGN",
  "VIDEO",
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

    const hit = cachedJson(cacheKeys.static.resourceTypes);
    if (hit) return hit;

    setCache(cacheKeys.static.resourceTypes, RESOURCE_TYPES, CACHE_TTL.STATIC);
    return NextResponse.json(RESOURCE_TYPES);
  } catch (error) {
    console.error("Error fetching resource types:", error);
    return NextResponse.json(
      { error: "Failed to fetch resource types" },
      { status: 500 }
    );
  }
}

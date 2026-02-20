import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// Content type → category mapping
const TYPE_CATEGORY_MAP: Record<string, string> = {
  "Blog Post": "Written",
  Article: "Written",
  Whitepaper: "Written",
  "Case Study": "Written",
  "LinkedIn Post": "Social Media",
  "Twitter Thread": "Social Media",
  "Instagram Post": "Social Media",
  "Facebook Post": "Social Media",
  Infographic: "Visual Assets",
  Banner: "Visual Assets",
  Presentation: "Visual Assets",
  "Brand Guidelines": "Visual Assets",
  Newsletter: "Email",
  "Welcome Email": "Email",
  "Promotional Email": "Email",
  "Drip Campaign": "Email",
};

function getTypeCategory(contentType: string): string {
  return TYPE_CATEGORY_MAP[contentType] ?? "Written";
}

function computeWordCount(text: string | null): number | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

// GET /api/content-library
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const campaignType = searchParams.get("campaignType");
    const status = searchParams.get("status");
    const sort = searchParams.get("sort") ?? "updatedAt";
    const favorites = searchParams.get("favorites") === "true";
    const search = searchParams.get("search");

    // Build deliverable where clause
    const deliverableWhere: Record<string, unknown> = {
      campaign: {
        workspaceId,
        isArchived: false,
      },
    };

    if (type) {
      deliverableWhere.contentType = type;
    }
    if (status) {
      deliverableWhere.status = status;
    }
    if (favorites) {
      deliverableWhere.isFavorite = true;
    }
    if (search) {
      deliverableWhere.title = { contains: search, mode: "insensitive" };
    }

    // Campaign type filter needs to be in the campaign relation
    if (campaignType) {
      (deliverableWhere.campaign as Record<string, unknown>).type =
        campaignType;
    }

    // Sort mapping
    const sortMap: Record<string, Record<string, string>> = {
      updatedAt: { updatedAt: "desc" },
      qualityScore: { qualityScore: "desc" },
      title: { title: "asc" },
    };
    const orderBy = sortMap[sort] ?? { updatedAt: "desc" };

    const deliverables = await prisma.deliverable.findMany({
      where: deliverableWhere,
      orderBy,
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
    });

    const items = deliverables.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.contentType,
      typeCategory: getTypeCategory(d.contentType),
      status: d.status as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED",
      qualityScore: d.qualityScore,
      campaignId: d.campaign.id,
      campaignName: d.campaign.title,
      campaignType: d.campaign.type as "STRATEGIC" | "QUICK",
      isFavorite: d.isFavorite,
      wordCount: computeWordCount(d.generatedText),
      updatedAt: d.updatedAt.toISOString(),
    }));

    return NextResponse.json(items);
  } catch (error) {
    console.error("[GET /api/content-library]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

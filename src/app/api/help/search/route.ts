import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") ?? "";
    const tag = searchParams.get("tag");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 50);

    if (!query.trim()) {
      return NextResponse.json({ articles: [], faqMatches: [] });
    }

    const q = query.toLowerCase();

    // Search articles
    const articleWhere: Record<string, unknown> = {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
      ],
    };

    if (tag) {
      articleWhere.category = { slug: tag };
    }

    const articles = await prisma.helpArticle.findMany({
      where: articleWhere,
      take: limit,
      orderBy: { helpfulYes: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        subtitle: true,
        readTimeMinutes: true,
        helpfulYes: true,
        helpfulNo: true,
        publishedAt: true,
        category: {
          select: { name: true, slug: true, icon: true, iconColor: true },
        },
      },
    });

    // Search FAQ items
    const faqMatches = await prisma.faqItem.findMany({
      where: {
        isPublished: true,
        OR: [
          { question: { contains: q, mode: "insensitive" } },
          { answer: { contains: q, mode: "insensitive" } },
        ],
      },
      take: limit,
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        question: true,
        answer: true,
        helpfulYes: true,
        helpfulNo: true,
      },
    });

    return NextResponse.json({ articles, faqMatches });
  } catch (error) {
    console.error("[GET /api/help/search]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Parse markdown content to generate a Table of Contents.
 * Extracts ## and ### headers.
 */
function generateToc(
  content: string
): { id: string; title: string; level: number }[] {
  const lines = content.split("\n");
  const toc: { id: string; title: string; level: number }[] = [];

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length; // 2 or 3
      const title = match[2].trim();
      const id = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
      toc.push({ id, title, level });
    }
  }

  return toc;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const article = await prisma.helpArticle.findUnique({
      where: { slug },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            iconBg: true,
            iconColor: true,
          },
        },
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    // Generate TOC from markdown content
    const toc = generateToc(article.content);

    // Fetch related articles
    const relatedArticles =
      article.relatedArticleIds.length > 0
        ? await prisma.helpArticle.findMany({
            where: { id: { in: article.relatedArticleIds } },
            select: {
              id: true,
              title: true,
              slug: true,
              subtitle: true,
              readTimeMinutes: true,
            },
          })
        : [];

    return NextResponse.json({
      ...article,
      toc,
      relatedArticles,
    });
  } catch (error) {
    console.error("[GET /api/help/articles/[slug]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const category = await prisma.helpCategory.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        iconBg: true,
        iconColor: true,
        articleCount: true,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    const articles = await prisma.helpArticle.findMany({
      where: { categoryId: category.id },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        subtitle: true,
        readTimeMinutes: true,
        helpfulYes: true,
        helpfulNo: true,
        publishedAt: true,
      },
    });

    return NextResponse.json({ category, articles });
  } catch (error) {
    console.error("[GET /api/help/categories/[slug]/articles]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

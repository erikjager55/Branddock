import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const feedbackSchema = z.object({
  helpful: z.boolean(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const article = await prisma.helpArticle.findUnique({ where: { slug } });
    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.helpArticle.update({
      where: { slug },
      data: parsed.data.helpful
        ? { helpfulYes: { increment: 1 } }
        : { helpfulNo: { increment: 1 } },
      select: { id: true, helpfulYes: true, helpfulNo: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[POST /api/help/articles/[slug]/feedback]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const items = await prisma.faqItem.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        question: true,
        answer: true,
        helpfulYes: true,
        helpfulNo: true,
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("[GET /api/help/faq]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

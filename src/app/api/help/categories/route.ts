import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.helpCategory.findMany({
      orderBy: { sortOrder: "asc" },
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

    return NextResponse.json(categories);
  } catch (error) {
    console.error("[GET /api/help/categories]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

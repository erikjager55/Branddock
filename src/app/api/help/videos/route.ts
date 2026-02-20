import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const videos = await prisma.videoTutorial.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        videoUrl: true,
        duration: true,
        categoryBadge: true,
        categoryColor: true,
      },
    });

    return NextResponse.json(videos);
  } catch (error) {
    console.error("[GET /api/help/videos]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

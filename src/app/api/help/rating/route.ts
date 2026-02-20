import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-server";
import { z } from "zod";

const ratingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ratingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Upsert: one rating per user
    const rating = await prisma.platformRating.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        rating: parsed.data.rating,
        feedback: parsed.data.feedback ?? null,
      },
      update: {
        rating: parsed.data.rating,
        feedback: parsed.data.feedback ?? null,
      },
      select: {
        id: true,
        rating: true,
        feedback: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(rating);
  } catch (error) {
    console.error("[POST /api/help/rating]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

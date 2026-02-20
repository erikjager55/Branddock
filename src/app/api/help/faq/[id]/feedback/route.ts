import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const feedbackSchema = z.object({
  helpful: z.boolean(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const item = await prisma.faqItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json(
        { error: "FAQ item not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.faqItem.update({
      where: { id },
      data: parsed.data.helpful
        ? { helpfulYes: { increment: 1 } }
        : { helpfulNo: { increment: 1 } },
      select: { id: true, helpfulYes: true, helpfulNo: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[POST /api/help/faq/[id]/feedback]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { checkGenericRateLimit } from "@/lib/ai/rate-limiter";

const feedbackSchema = z.object({
  helpful: z.boolean(),
});

// Allow 5 votes per IP per FAQ item per hour. Prevents a trivial
// script from pumping helpfulYes/helpfulNo counters without needing
// an authenticated account.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const ip = getClientIp(request);
    const rate = await checkGenericRateLimit(
      `faq-feedback:${id}:${ip}`,
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MS,
    );
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many votes from this IP — try again later" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rate.resetAt.getTime() - Date.now()) / 1000)),
          },
        },
      );
    }

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

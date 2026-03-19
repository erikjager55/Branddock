import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { requireUnlocked } from "@/lib/lock-guard";

type RouteParams = { params: Promise<{ id: string }> };

const swotSchema = z.object({
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  opportunities: z.array(z.string()).optional(),
  threats: z.array(z.string()).optional(),
});

// =============================================================
// PATCH /api/strategies/[id]/swot — update SWOT analysis
// =============================================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.businessStrategy.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    const lockResponse = await requireUnlocked("businessStrategy", id);
    if (lockResponse) return lockResponse;

    const body = await request.json();
    const parsed = swotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data: Record<string, string[]> = {};
    if (parsed.data.strengths !== undefined) data.strengths = parsed.data.strengths;
    if (parsed.data.weaknesses !== undefined) data.weaknesses = parsed.data.weaknesses;
    if (parsed.data.opportunities !== undefined) data.opportunities = parsed.data.opportunities;
    if (parsed.data.threats !== undefined) data.threats = parsed.data.threats;

    await prisma.businessStrategy.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/strategies/[id]/swot]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

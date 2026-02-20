import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/strategies/stats — { active, onTrack, atRisk, currentPeriod }
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const strategies = await prisma.businessStrategy.findMany({
      where: { workspaceId },
      include: {
        objectives: { select: { status: true } },
      },
    });

    const active = strategies.filter((s) => s.status === "ACTIVE").length;

    // On track = active strategies where no objectives are AT_RISK or BEHIND
    const onTrack = strategies.filter(
      (s) =>
        s.status === "ACTIVE" &&
        s.objectives.length > 0 &&
        s.objectives.every((o) => o.status === "ON_TRACK" || o.status === "COMPLETED"),
    ).length;

    // At risk = active strategies with at least one AT_RISK or BEHIND objective
    const atRisk = strategies.filter(
      (s) =>
        s.status === "ACTIVE" &&
        s.objectives.some((o) => o.status === "AT_RISK" || o.status === "BEHIND"),
    ).length;

    const now = new Date();
    const currentPeriod = `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`;

    return NextResponse.json({ active, onTrack, atRisk, currentPeriod });
  } catch (error) {
    console.error("[GET /api/strategies/stats]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/research/method-status — per-method study counts
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const methodTypes = ["AI_EXPLORATION", "WORKSHOP", "INTERVIEWS", "QUESTIONNAIRE"] as const;

    const methods = await Promise.all(
      methodTypes.map(async (type) => {
        const [active, done, total] = await Promise.all([
          prisma.researchStudy.count({
            where: { workspaceId, method: type, status: "IN_PROGRESS" },
          }),
          prisma.researchStudy.count({
            where: { workspaceId, method: type, status: "COMPLETED" },
          }),
          prisma.researchStudy.count({
            where: { workspaceId, method: type },
          }),
        ]);

        return { type, active, done, unlocked: total };
      })
    );

    return NextResponse.json({ methods });
  } catch (error) {
    console.error("[GET /api/research/method-status]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
